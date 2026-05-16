// ─── Firebase Initialization ─────────────────────────────────────────────────
// Eco Grow Automation — Firebase Realtime Database utility
// Provides: app, db, auth, pre-built refs, anonymous sign-in promise
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app';
import { getDatabase, ref } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// ── Config ───────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBAQRlo2yvj4UZk2jKqpNDlPpeX_sgTbRA",
  authDomain: "soil-iot-system.firebaseapp.com",
  databaseURL: "https://soil-iot-system-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "soil-iot-system",
  storageBucket: "soil-iot-system.firebasestorage.app",
  messagingSenderId: "90996517263",
  appId: "1:90996517263:web:dfb864b5375382162583fa",
  measurementId: "G-T4C05DD80B",
};

// ── Initialise ───────────────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// ── Pre-built Database References ────────────────────────────────────────────
const liveFeedRef = ref(db, 'live_feed');
const historyLogsRef = ref(db, 'history_logs');
const settingsRef = ref(db, 'settings');
const notificationsRef = ref(db, 'notifications');
const connectedRef = ref(db, '.info/connected');
const alertsRef = ref(db, 'Alerts');

/**
 * Returns a ref for a specific setting key, e.g. "water_pump"
 * Usage: getSettingRef('water_pump')
 */
const getSettingRef = (key) => ref(db, `settings/${key}`);

// ── Sensor state key → RTDB settings path mapping ───────────────────────────
const SENSOR_KEY_TO_RTDB = {
  waterPump: 'water_pump',
  waterLevel: 'water_level_sensor',
  ldrSensor: 'ldr_sensor',
  airQuality: 'air_quality_sensor',
  temperature: 'temp_sensor',
  moisture: 'moisture_sensor',
  rainfall: 'rainfall_sensor',
  
};

// ── Anonymous Auth Promise ───────────────────────────────────────────────────
// Resolves once the user is authenticated (or rejects on failure).
// Components can `await authReady` before subscribing to protected paths.
const authReady = new Promise((resolve, reject) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      unsubscribe();
      resolve(user);
    }
  });

  // Kick off anonymous sign-in
  signInAnonymously(auth).catch((err) => {
    console.error('[Firebase] Anonymous auth failed:', err);
    reject(err);
  });
});

// ── Exports ──────────────────────────────────────────────────────────────────
export {
  app,
  db,
  auth,
  liveFeedRef,
  historyLogsRef,
  settingsRef,
  notificationsRef,
  connectedRef,
  alertsRef,
  getSettingRef,
  authReady,
  SENSOR_KEY_TO_RTDB,
};
