import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { onValue, set, query, limitToLast, off } from 'firebase/database';
import {
  db,
  liveFeedRef,
  historyLogsRef,
  settingsRef,
  notificationsRef,
  connectedRef,
  alertsRef,
  getSettingRef,
  authReady,
  SENSOR_KEY_TO_RTDB,
} from '../firebase.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const FIFO_CAP = 50;           // max points kept in historical arrays
const HISTORY_BOOTSTRAP = 100; // entries fetched from /history_logs on mount
const LIVE_INTERVAL_MS = 1000; // live data update cadence (Overview: 1s)
const CHART_INTERVAL_MS = 10000; // chart data update cadence (Analytics: 10s)

// ─── Utility helpers ─────────────────────────────────────────────────────────
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const fluctuate = (current, min, max, volatility = 0.1) => {
  const change = (Math.random() - 0.5) * 2 * volatility * (max - min);
  return clamp(current + change, min, max);
};

// ─── Key mapping: Firebase JSON → React state ────────────────────────────────
const mapLiveFeedToState = (fb) => {
  if (!fb) return null;
  return {
    temperature: fb.temp ?? 0,
    humidity: fb.hum ?? 0,
    soilMoisture: fb.moist ?? 0,
    sunlight: fb.sun ?? 0,
    airQuality: fb.air ?? 0,
    rainfall: fb.rain ?? 0,
    waterLevel: fb.water_level ?? 0,
    co2: fb.co2 ?? 0,
    nh3: fb.nh3 ?? 0,
  };
};

// Reverse mapping: React sensorStates key → RTDB settings key (imported from firebase.js)
const RTDB_TO_SENSOR_KEY = Object.fromEntries(
  Object.entries(SENSOR_KEY_TO_RTDB).map(([k, v]) => [v, k])
);

// ─── Default sensor states ──────────────────────────────────────────────────
const DEFAULT_SENSOR_STATES = {
  waterPump: true,
  waterLevel: true,
  ldrSensor: true,
  airQuality: true,
  temperature: true,
  moisture: true,
  rainfall: true,
};

// ─── Mock data generators (preserved from original) ─────────────────────────
const generateInitialData = () => ({
  temperature: 28 + Math.random() * 10,
  humidity: 50 + Math.random() * 30,
  soilMoisture: 30 + Math.random() * 40,
  rainfall: 40 + Math.random() * 40,
  sunlight: 10 + Math.random() * 10,
  airQuality: 60 + Math.random() * 30,
  waterLevel: 60 + Math.random() * 30,
  co2: 0.05 + Math.random() * 0.2,
  nh3: 0.001 + Math.random() * 0.01,
});

const generateHistoricalData = (currentValue, min, max, points = 11) => {
  const data = [];
  let value = currentValue - Math.random() * (max - min) * 0.3;

  for (let i = 0; i < points; i++) {
    value = fluctuate(value, min, max, 0.15);
    //data.push(Math.round(value * 10) / 10);
    data.push(Number(value.toFixed(3)));
  }

  //data[data.length - 1] = Math.round(currentValue * 10) / 10;
  data[data.length - 1] = Number(currentValue.toFixed(3));
  return data;
};

// ─── Append to FIFO-buffered array ──────────────────────────────────────────
const appendFIFO = (arr, value, cap = FIFO_CAP) => {
  const next = [...arr, Math.round(value * 10) / 10];
  return next.length > cap ? next.slice(next.length - cap) : next;
};

// ─── Notification generator (preserved) ─────────────────────────────────────
const generateNotifications = (data) => {
  const newNotifications = [];
  const timestamp = new Date().toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  if (data.soilMoisture < 35) {
    newNotifications.push({ id: 1, message: 'Soil Moisture is low', type: 'warning', time: timestamp });
  }
  if (data.temperature > 35) {
    newNotifications.push({ id: 2, message: 'Temperature is high', type: 'warning', time: timestamp });
  }
  if (data.waterLevel < 30) {
    newNotifications.push({ id: 3, message: 'Water level is critical', type: 'critical', time: timestamp });
  }
  if (data.airQuality < 50) {
    newNotifications.push({ id: 4, message: 'Air quality is poor', type: 'warning', time: timestamp });
  }
  if (data.soilMoisture >= 35 && data.soilMoisture <= 60) {
    newNotifications.push({ id: 5, message: 'Soil moisture is optimal', type: 'success', time: timestamp });
  }

  return newNotifications.slice(0, 6);
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═════════════════════════════════════════════════════════════════════════════
export function useSensorData(liveInterval = LIVE_INTERVAL_MS, chartInterval = CHART_INTERVAL_MS) {
  // ── Core state ─────────────────────────────────────────────────────────────
  const [sensorData, setSensorData] = useState(generateInitialData);
  const [historicalData, setHistoricalData] = useState({});
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const [sensorStates, setSensorStates] = useState(DEFAULT_SENSOR_STATES);
  const [notifications, setNotifications] = useState([]);
  const [demoMode, setDemoMode] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [fireAlert, setFireAlert] = useState(false);

  // Refs to avoid stale closures in listeners
  const historicalRef = useRef(historicalData);
  historicalRef.current = historicalData;

  // Track whether settings have been initialised in RTDB
  const settingsInitialised = useRef(false);

  // Throttle: track last time historicalData was appended (for chart interval)
  const lastHistAppendRef = useRef(0);

  // ── Notifications (derived from sensorData — demo mode only) ───────────────
  useEffect(() => {
    if (demoMode) {
      setNotifications(generateNotifications(sensorData));
    }
  }, [sensorData, demoMode]);

  // ══════════════════════════════════════════════════════════════════════════
  // MODE 1: FIREBASE LIVE
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (demoMode) return; // skip Firebase when in demo mode

    const unsubscribers = [];

    const bootstrap = async () => {
      // ── 1. Wait for anonymous auth ─────────────────────────────────────
      try {
        await authReady;
        setAuthError(null);
      } catch (err) {
        console.error('[useSensorData] Auth failed, switching to demo mode:', err);
        setAuthError(err);
        setDemoMode(true);
        return;
      }

      // ── 2. Connection status (.info/connected) ─────────────────────────
      const unsubConnected = onValue(connectedRef, (snap) => {
        setIsConnected(!!snap.val());
      });
      unsubscribers.push(() => off(connectedRef, 'value', unsubConnected));

      // ── 3. Live feed listener (/live_feed) ─────────────────────────────
      // sensorData (Overview) updates INSTANTLY on every push (~1s latency).
      // historicalData (Analytics charts) is throttled to chartInterval (10s).
      const unsubLive = onValue(liveFeedRef, (snap) => {
        const raw = snap.val();
        const mapped = mapLiveFeedToState(raw);
        if (!mapped) return;

        // Always update live sensor data immediately (Overview = 1s)
        setSensorData(mapped);
        setLastUpdated(new Date());

        // Throttle FIFO-append to historical arrays (Analytics = 10s)
        const now = Date.now();
        if (now - lastHistAppendRef.current >= chartInterval) {
          lastHistAppendRef.current = now;
          setHistoricalData((prev) => {
            const next = {};
            for (const key of Object.keys(mapped)) {
              next[key] = appendFIFO(prev[key] || [], mapped[key]);
            }
            return next;
          });
        }
      });
      unsubscribers.push(() => off(liveFeedRef, 'value', unsubLive));

      // ── 4. Bootstrap historical data (/history_logs last 100) ──────────
      const histQuery = query(historyLogsRef, limitToLast(HISTORY_BOOTSTRAP));
      const unsubHist = onValue(histQuery, (snap) => {
        const raw = snap.val();
        if (!raw) return;

        // raw is an object keyed by push-ids; convert to ordered array
        const entries = Object.values(raw).sort(
          (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
        );

        const built = {
          temperature: [],
          humidity: [],
          soilMoisture: [],
          sunlight: [],
          airQuality: [],
          rainfall: [],
          waterLevel: [],
          co2: [],
          nh3: [],
        };

        for (const entry of entries) {
          const mapped = mapLiveFeedToState(entry);
          if (!mapped) continue;
          for (const key of Object.keys(built)) {
            built[key].push(Math.round((mapped[key] ?? 0) * 10) / 10);
          }
        }

        // Cap to FIFO limit
        for (const key of Object.keys(built)) {
          if (built[key].length > FIFO_CAP) {
            built[key] = built[key].slice(built[key].length - FIFO_CAP);
          }
        }

        setHistoricalData(built);
      }, { onlyOnce: true }); // fetch once on mount
      unsubscribers.push(() => { }); // onlyOnce auto-detaches

      // ── 5. Settings listener (/settings) ───────────────────────────────
      const unsubSettings = onValue(settingsRef, (snap) => {
        const raw = snap.val();

        if (!raw && !settingsInitialised.current) {
          // First time: write defaults to RTDB
          settingsInitialised.current = true;
          const defaults = {};
          for (const [stateKey, rtdbKey] of Object.entries(SENSOR_KEY_TO_RTDB)) {
            defaults[rtdbKey] = DEFAULT_SENSOR_STATES[stateKey];
          }
          set(settingsRef, defaults).catch(console.error);
          return;
        }

        if (!raw) return;

        settingsInitialised.current = true;
        const mapped = {};
        for (const [rtdbKey, stateKey] of Object.entries(RTDB_TO_SENSOR_KEY)) {
          mapped[stateKey] = raw[rtdbKey] ?? true;
        }
        setSensorStates(mapped);
      });
      unsubscribers.push(() => off(settingsRef, 'value', unsubSettings));

      // ── 6. Notifications listener (/notifications last 10) ────────────

      // Firebase push keys encode a timestamp in the first 8 characters
      // using a base-64 alphabet. Decode it to get epoch ms.
      const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
      const decodePushKeyTime = (key) => {
        let ts = 0;
        for (let i = 0; i < 8; i++) {
          ts = ts * 64 + PUSH_CHARS.indexOf(key[i]);
        }
        return ts;
      };

      const notifQuery = query(notificationsRef, limitToLast(10));
      const unsubNotif = onValue(notifQuery, (snap) => {
        const raw = snap.val();
        if (!raw) {
          setNotifications([]);
          return;
        }
        const entries = Object.entries(raw)
          .map(([key, val]) => {
            // Parse timestamp: number (epoch ms), date string, or broken value
            let ts = val.timestamp;

            if (typeof ts === 'number' && ts > 0) {
              // Already epoch ms — use as is
            } else if (typeof ts === 'string') {
              // Try as plain number first
              const asNum = Number(ts);
              if (!isNaN(asNum) && asNum > 1e12) {
                ts = asNum;
              } else {
                // Parse hardware date strings:
                // "DD/MM/YYYY HH:MM:SS" or "DD-MM-YYYY HH:MMAM"
                const m = ts.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
                if (m) {
                  let [, day, mon, year, hr, min, sec, ampm] = m;
                  hr = parseInt(hr);
                  if (ampm) {
                    if (ampm.toUpperCase() === 'PM' && hr !== 12) hr += 12;
                    if (ampm.toUpperCase() === 'AM' && hr === 12) hr = 0;
                  }
                  ts = new Date(year, mon - 1, day, hr, parseInt(min), parseInt(sec || 0)).getTime();
                } else {
                  // Unparseable string (e.g. '{ ".sv": "timestamp" }') —
                  // fall back to the timestamp encoded in the Firebase push key
                  ts = 0;
                }
              }
            } else {
              ts = 0;
            }

            // If we couldn't parse the stored timestamp, extract time from
            // the Firebase push key so the entry still sorts chronologically
            if (!ts || ts <= 0) {
              ts = decodePushKeyTime(key);
            }

            return {
              id: key,
              message: val.message || '',
              type: val.type || 'info',
              timestamp: ts,
              time: ts > 0
                ? new Date(ts).toLocaleString([], {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                : '',
            };
          })
          .sort((a, b) => b.timestamp - a.timestamp || b.id.localeCompare(a.id));
        setNotifications(entries);
      });
      unsubscribers.push(() => off(notificationsRef, 'value', unsubNotif));

      // ── 7. Fire alert listener (/Alerts) — ZERO DELAY, instant push ─────
      const unsubAlerts = onValue(alertsRef, (snap) => {
        const raw = snap.val();
        console.log('[FireAlert] /Alerts changed:', JSON.stringify(raw));
        // Handle all possible truthy representations from hardware:
        // boolean true, string "true"/"1", or number 1
        const fireValue = raw?.Fire;
        const isFireActive = fireValue === true
          || fireValue === 'true'
          || fireValue === 1
          || fireValue === '1';
        console.log('[FireAlert] Fire value:', fireValue, '→ active:', isFireActive);
        setFireAlert(isFireActive);
      });
      unsubscribers.push(() => off(alertsRef, 'value', unsubAlerts));
    };

    bootstrap();

    // Cleanup: unsubscribe all listeners
    return () => {
      for (const unsub of unsubscribers) {
        try { unsub(); } catch (e) { /* already detached */ }
      }
    };
  }, [demoMode]);

  // ══════════════════════════════════════════════════════════════════════════
  // MODE 2: DEMO MODE (mock data engine)
  // Two separate intervals:
  //   • liveInterval  (1s) → updates sensorData (Overview cards)
  //   • chartInterval (10s) → appends to historicalData (Analytics charts)
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!demoMode) return;

    setIsConnected(true); // simulate connected

    // Generate initial historical data for demo
    const initial = generateInitialData();
    setSensorData(initial);
    setHistoricalData({
      temperature: generateHistoricalData(initial.temperature, 20, 40),
      humidity: generateHistoricalData(initial.humidity, 40, 90),
      soilMoisture: generateHistoricalData(initial.soilMoisture, 20, 80),
      waterLevel: generateHistoricalData(initial.waterLevel, 0, 100),
      rainfall: generateHistoricalData(initial.rainfall, 0, 100),
      sunlight: generateHistoricalData(initial.sunlight, 200, 1200),
      airQuality: generateHistoricalData(initial.airQuality, 40, 100),
      co2: generateHistoricalData(initial.co2, 350, 1200),
      nh3: generateHistoricalData(initial.nh3, 10, 80),
    });

    // ── Fast interval (1s): update live sensor values (Overview) ──────────
    const generateNextData = (prev) => ({
      temperature: fluctuate(prev.temperature, 20, 40, 0.05),
      humidity: fluctuate(prev.humidity, 40, 90, 0.08),
      soilMoisture: fluctuate(prev.soilMoisture, 20, 80, 0.06),
      rainfall: fluctuate(prev.rainfall, 0, 100, 0.1),
      sunlight: fluctuate(prev.sunlight, 200, 1200, 0.12),
      airQuality: fluctuate(prev.airQuality, 40, 100, 0.07),
      waterLevel: fluctuate(prev.waterLevel, 20, 100, 0.04),
      co2: fluctuate(prev.co2, 350, 1200, 0.06),
      nh3: fluctuate(prev.nh3, 10, 80, 0.08),
    });

    const liveTimer = setInterval(() => {
      setSensorData((prev) => generateNextData(prev));
      setLastUpdated(new Date());
    }, liveInterval);

    // ── Slow interval (10s): append to historical data (Analytics charts) ─
    const chartTimer = setInterval(() => {
      setSensorData((current) => {
        // Read current sensorData and append to historical
        setHistoricalData((prevHist) => {
          const updated = {};
          for (const key of Object.keys(current)) {
            updated[key] = appendFIFO(prevHist[key] || [], current[key]);
          }
          return updated;
        });
        return current; // don't modify sensorData
      });
    }, chartInterval);

    return () => {
      clearInterval(liveTimer);
      clearInterval(chartTimer);
    };
  }, [demoMode, liveInterval, chartInterval]);

  // ── Toggle handlers ────────────────────────────────────────────────────────

  const toggleSensor = useCallback((sensorId) => {
    if (demoMode) {
      // Demo mode: local-only toggle
      setSensorStates((prev) => ({
        ...prev,
        [sensorId]: !prev[sensorId],
      }));
      return;
    }

    // Firebase mode: write to RTDB (listener will sync state back)
    const rtdbKey = SENSOR_KEY_TO_RTDB[sensorId];
    if (!rtdbKey) {
      console.warn(`[useSensorData] Unknown sensor ID: ${sensorId}`);
      return;
    }
    setSensorStates((prev) => {
      const newVal = !prev[sensorId];
      set(getSettingRef(rtdbKey), newVal).catch(console.error);
      return { ...prev, [sensorId]: newVal }; // optimistic update
    });
  }, [demoMode]);

  const toggleWaterPump = useCallback(() => {
    toggleSensor('waterPump');
  }, [toggleSensor]);

  const toggleDemoMode = useCallback(() => {
    setDemoMode((prev) => !prev);
  }, []);

  const formattedData = {
    temperature: Number(sensorData.temperature.toFixed(1)),
    humidity: Number(sensorData.humidity.toFixed(1)),
    soilMoisture: Number(sensorData.soilMoisture.toFixed(0)),
    rainfall: Number(sensorData.rainfall.toFixed(0)),
    sunlight: Number(sensorData.sunlight.toFixed(0)),
    airQuality: Number(sensorData.airQuality.toFixed(0)),
    waterLevel: Number(sensorData.waterLevel.toFixed(0)),
    co2: Number(sensorData.co2.toFixed(3)),
    nh3: Number(sensorData.nh3.toFixed(3)),
  };

  // ── Return ─────────────────────────────────────────────────────────────────
  return {
    sensorData,
    formattedData,
    historicalData,
    sensorStates,
    toggleSensor,
    toggleWaterPump,
    notifications,
    isConnected,
    lastUpdated,
    demoMode,
    toggleDemoMode,
    authError,
    fireAlert,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// React Context (unchanged API surface)
// ═════════════════════════════════════════════════════════════════════════════
const SensorDataContext = createContext(null);

export function SensorDataProvider({ children, liveInterval = LIVE_INTERVAL_MS, chartInterval = CHART_INTERVAL_MS }) {
  const sensorData = useSensorData(liveInterval, chartInterval);

  return (
    <SensorDataContext.Provider value={sensorData}>
      {children}
    </SensorDataContext.Provider>
  );
}

export function useSensorDataContext() {
  const context = useContext(SensorDataContext);
  if (!context) {
    throw new Error('useSensorDataContext must be used within a SensorDataProvider');
  }
  return context;
}

export default useSensorData;
