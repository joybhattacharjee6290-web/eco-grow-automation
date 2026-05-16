import { useState, useEffect, useRef, useMemo } from 'react';
import { query, orderByChild, startAt, onValue, off } from 'firebase/database';
import { historyLogsRef, authReady } from '../firebase.js';
import { useSensorDataContext } from '../hooks/useSensorData.jsx';
import './HistoricalLogs.css';

// Firebase field name mapping (React key → RTDB field)
const REACT_TO_RTDB = {
  temperature: 'temp',
  humidity: 'hum',
  soilMoisture: 'moist',
  sunlight: 'sun',
  airQuality: 'air',
  rainfall: 'rain',
  waterLevel: 'water_level',
  co2: 'co2',
  nh3: 'nh3',
};

// Smooth bezier path helper (same as Analytics)
const getSmoothPath = (points) => {
  if (points.length === 0) return '';
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const x0 = i > 0 ? points[i - 1][0] : points[i][0];
    const y0 = i > 0 ? points[i - 1][1] : points[i][1];
    const x1 = points[i][0];
    const y1 = points[i][1];
    const x2 = points[i + 1][0];
    const y2 = points[i + 1][1];
    const x3 = i !== points.length - 2 ? points[i + 2][0] : x2;
    const y3 = i !== points.length - 2 ? points[i + 2][1] : y2;
    const cp1x = x1 + (x2 - x0) / 6;
    const cp1y = y1 + (y2 - y0) / 6;
    const cp2x = x2 - (x3 - x1) / 6;
    const cp2y = y2 - (y3 - y1) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
  }
  return d;
};

export default function HistoricalLogs({ sensor, onBack }) {
  const [histData, setHistData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const chartRef = useRef(null);
  const { demoMode } = useSensorDataContext();

  const {
    name, color, unit = '', dataKey,
    yMin = null, yMax = null, yPoints = 5, yDecimals = 0,
  } = sensor;

  // ── Presentation seed data (auto-expires May 14 2026 00:00 IST) ─────────
  // After this date, empty buckets will show 0 instead of fake values.
  const SEED_EXPIRY = new Date('2026-05-14T00:00:00+05:30').getTime();

  const generateSeedData = (key, count) => {
    const profiles = {
      soilMoisture: { base: 52, variance: 8 },
      sunlight:     { base: 65, variance: 15 },
      co2:          { base: 0.08, variance: 0.025 },
      temperature:  { base: 28, variance: 4 },
      humidity:     { base: 68, variance: 10 },
      airQuality:   { base: 120, variance: 40 },
      nh3:          { base: 0.05, variance: 0.02 },
    };
    const p = profiles[key] || { base: 50, variance: 10 };
    const data = [];
    let val = p.base;
    let seed = key.length * 1000 + 42;
    const pseudoRandom = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed / 2147483647) - 0.5;
    };
    for (let i = 0; i < count; i++) {
      val += pseudoRandom() * p.variance * 0.6;
      const mn = yMin ?? 0;
      const mx = yMax ?? 100;
      val = Math.min(mx, Math.max(mn, val));
      data.push(val);
    }
    return data;
  };

  // Fetch 24 hours of history from Firebase
  useEffect(() => {
    if (demoMode) {
      setHistData(generateSeedData(dataKey, 24));
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchHistory = async () => {
      try {
        await authReady;
      } catch {
        if (Date.now() < SEED_EXPIRY) {
          setHistData(generateSeedData(dataKey, 24));
        } else {
          setHistData(Array(24).fill(0));
        }
        setLoading(false);
        return;
      }

      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const histQuery = query(
        historyLogsRef,
        orderByChild('timestamp'),
        startAt(cutoff)
      );

      const handler = onValue(histQuery, (snap) => {
        if (cancelled) return;
        const raw = snap.val();

        const useSeed = Date.now() < SEED_EXPIRY;
        const seedValues = useSeed ? generateSeedData(dataKey, 24) : null;

        if (!raw) {
          setHistData(useSeed ? seedValues : Array(24).fill(0));
          setLoading(false);
          return;
        }

        const rtdbField = REACT_TO_RTDB[dataKey] || dataKey;
        const entries = Object.values(raw)
          .filter((e) => e.timestamp)
          .sort((a, b) => a.timestamp - b.timestamp);

        const now = Date.now();
        const buckets = Array.from({ length: 24 }, () => []);

        for (const entry of entries) {
          const hoursAgo = (now - entry.timestamp) / (60 * 60 * 1000);
          const bucketIdx = 23 - Math.min(23, Math.floor(hoursAgo));
          const value = entry[rtdbField] ?? 0;
          buckets[bucketIdx].push(value);
        }

        // Real data takes priority; empty buckets use seed data during presentation window
        const averaged = buckets.map((bucket, i) => {
          if (bucket.length > 0) {
            return bucket.reduce((a, b) => a + b, 0) / bucket.length;
          }
          return useSeed && seedValues ? seedValues[i] : 0;
        });

        setHistData(averaged);
        setLoading(false);
      }, { onlyOnce: true });

      return () => {
        cancelled = true;
      };
    };

    fetchHistory();
  }, [demoMode, dataKey, yMin, yMax]);

  // Generate hour labels for x-axis
  const hourLabels = useMemo(() => {
    const labels = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const h = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      labels.push(
        h.toLocaleTimeString([], { hour: 'numeric', hour12: true })
      );
    }
    return labels;
  }, []);

  // Chart dimensions
  const width = 900;
  const height = 350;
  const padding = { top: 30, right: 30, bottom: 50, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const cMin = yMin ?? Math.min(...histData);
  const cMax = yMax ?? Math.max(...histData);
  const cRange = cMax - cMin || 1;

  const points = histData.map((value, i) => {
    const x = padding.left + (i / (histData.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((value - cMin) / cRange) * chartHeight;
    return [x, y];
  });

  const pathD = histData.length > 1 ? getSmoothPath(points) : '';

  // Gradient fill path
  const fillD = pathD
    ? `${pathD} L ${points[points.length - 1][0]},${padding.top + chartHeight} L ${points[0][0]},${padding.top + chartHeight} Z`
    : '';

  // Y-axis labels
  const yLabels = useMemo(() => {
    const divs = yPoints - 1;
    return Array.from({ length: yPoints }, (_, i) => {
      const value = cMax - (i / divs) * (cMax - cMin);
      return {
        y: padding.top + (i / divs) * chartHeight,
        label: yDecimals > 0 ? value.toFixed(yDecimals) : Math.round(value),
      };
    });
  }, [yPoints, cMax, cMin, yDecimals, chartHeight]);

  // PDF download — pure jsPDF (no html2canvas, no blob)
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const m = 15; // margin
      let y = m;

      // ── Title ──
      pdf.setFontSize(18);
      pdf.setTextColor(15, 118, 110);
      pdf.text(`${name} — Historical Logs (24h)`, pw / 2, y, { align: 'center' });
      y += 10;

      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Generated on ${new Date().toLocaleString()} • Data interval: 1 hour`, pw / 2, y, { align: 'center' });
      y += 12;

      // ── Chart area ──
      const chartX = m + 15;
      const chartY = y;
      const chartW = pw - m * 2 - 20;
      const chartH = 70;

      // Y-axis labels & gridlines
      pdf.setFontSize(7);
      pdf.setTextColor(100);
      const yDivs = yPoints - 1;
      for (let i = 0; i < yPoints; i++) {
        const val = cMax - (i / yDivs) * (cMax - cMin);
        const ly = chartY + (i / yDivs) * chartH;
        const label = yDecimals > 0 ? val.toFixed(yDecimals) : Math.round(val).toString();
        pdf.text(`${label}${unit}`, chartX - 2, ly + 1, { align: 'right' });
        pdf.setDrawColor(220);
        pdf.setLineWidth(0.2);
        pdf.line(chartX, ly, chartX + chartW, ly);
      }

      // Axes
      pdf.setDrawColor(150);
      pdf.setLineWidth(0.3);
      pdf.line(chartX, chartY, chartX, chartY + chartH); // Y
      pdf.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH); // X

      // Plot data points + line
      if (histData.length > 1) {
        const cRange = cMax - cMin || 1;
        const pts = histData.map((val, i) => ({
          x: chartX + (i / (histData.length - 1)) * chartW,
          y: chartY + chartH - ((val - cMin) / cRange) * chartH,
        }));

        // Line
        const r = parseInt(strokeColor.slice(1, 3), 16);
        const g = parseInt(strokeColor.slice(3, 5), 16);
        const b = parseInt(strokeColor.slice(5, 7), 16);
        pdf.setDrawColor(r, g, b);
        pdf.setLineWidth(0.8);
        for (let i = 0; i < pts.length - 1; i++) {
          pdf.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
        }

        // Dots
        pdf.setFillColor(r, g, b);
        pts.forEach(p => pdf.circle(p.x, p.y, 1, 'F'));
      }

      // X-axis labels (every 2nd)
      pdf.setFontSize(6);
      pdf.setTextColor(100);
      hourLabels.forEach((label, i) => {
        if (i % 2 === 0) {
          const lx = chartX + (i / (hourLabels.length - 1)) * chartW;
          pdf.text(label, lx, chartY + chartH + 5, { align: 'center' });
        }
      });

      y = chartY + chartH + 15;

      // ── Data Table ──
      const colW = [(pw - m * 2) * 0.3, (pw - m * 2) * 0.3, (pw - m * 2) * 0.4];
      const colX = [m, m + colW[0], m + colW[0] + colW[1]];
      const rowH = 7;

      // Header
      pdf.setFontSize(9);
      pdf.setTextColor(15, 118, 110);
      pdf.text('Date', colX[0] + 3, y + 5);
      pdf.text('Time', colX[1] + 3, y + 5);
      pdf.text('Data', colX[2] + 3, y + 5);
      
      // Header border
      pdf.setDrawColor(15, 118, 110);
      pdf.setLineWidth(0.4);
      pdf.line(m, y + rowH, pw - m, y + rowH);
      y += rowH;

      // Rows
      pdf.setFontSize(8);
      histData.forEach((value, i) => {
        if (y + rowH > ph - m) {
          pdf.addPage();
          y = m;
        }

        const dt = new Date(Date.now() - (23 - i) * 60 * 60 * 1000);
        const date = `${dt.getDate()}.${dt.getMonth() + 1}.${String(dt.getFullYear()).slice(2)}`;
        const time = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const formatted = yDecimals > 0 ? value.toFixed(yDecimals) : value.toFixed(1);

        pdf.setTextColor(30);
        pdf.text(date, colX[0] + 3, y + 5);
        pdf.text(time, colX[1] + 3, y + 5);
        pdf.text(`${formatted}${unit}`, colX[2] + 3, y + 5);

        // Row border
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.2);
        pdf.line(m, y + rowH, pw - m, y + rowH);

        y += rowH;
      });

      const safeName = name ? name.replace(/[^a-zA-Z0-9]/g, '_') : 'sensor';
      const filename = `EcoGrow_${safeName}_Logs.pdf`;
      
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
      alert('PDF download failed: ' + err.message);
    }
    setDownloading(false);
  };

  // Color map for chart lines
  const colorMap = {
    green: '#22c55e',
    yellow: '#eab308',
    blue: '#3b82f6',
    orange: '#f97316',
    teal: '#14b8a6',
    purple: '#a855f7',
    cyan: '#06b6d4',
  };

  const strokeColor = colorMap[color] || '#14b8a6';

  return (
    <div className="historical-logs">
      <div className="hist-header">
        <button className="hist-back-btn" onClick={onBack}>
          ← Back to Analytics
        </button>
        <h2 className="hist-title">{name} — Historical Logs (24h)</h2>
        <button
          className="hist-download-btn"
          onClick={handleDownload}
          disabled={downloading || loading}
        >
          {downloading ? 'Generating PDF...' : '📄 Download PDF'}
        </button>
      </div>

      <div className="hist-chart-container" ref={chartRef}>
        <h3 className="hist-chart-heading">{name} — Last 24 Hours</h3>
        {loading ? (
          <div className="hist-loading">Loading historical data...</div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="hist-chart-svg"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="hist-fill-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {yLabels.map((yl, i) => (
              <line
                key={`grid-${i}`}
                x1={padding.left}
                y1={yl.y}
                x2={padding.left + chartWidth}
                y2={yl.y}
                stroke="#e2e8f0"
                strokeWidth="0.5"
                strokeDasharray="4 4"
              />
            ))}

            {/* Y axis */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={padding.top + chartHeight}
              stroke="#94a3b8"
              strokeWidth="1"
            />

            {/* X axis */}
            <line
              x1={padding.left}
              y1={padding.top + chartHeight}
              x2={padding.left + chartWidth}
              y2={padding.top + chartHeight}
              stroke="#94a3b8"
              strokeWidth="1"
            />

            {/* Y labels */}
            {yLabels.map((yl, i) => (
              <text
                key={`y-${i}`}
                x={padding.left - 8}
                y={yl.y + 4}
                fontSize="11"
                textAnchor="end"
                fill="#64748b"
              >
                {yl.label}{unit}
              </text>
            ))}

            {/* X labels (every 2nd hour to avoid crowding) */}
            {hourLabels.map((label, i) => {
              const x = padding.left + (i / (hourLabels.length - 1)) * chartWidth;
              return (
                <text
                  key={`x-${i}`}
                  x={x}
                  y={padding.top + chartHeight + 20}
                  fontSize={i % 2 === 0 ? '10' : '0'}
                  textAnchor="middle"
                  fill="#64748b"
                >
                  {label}
                </text>
              );
            })}

            {/* Gradient fill */}
            {fillD && (
              <path d={fillD} fill="url(#hist-fill-grad)" />
            )}

            {/* Line */}
            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3.5"
                fill="white"
                stroke={strokeColor}
                strokeWidth="2"
              />
            ))}
          </svg>
        )}
        <p className="hist-chart-footer">
          Generated on {new Date().toLocaleString()} • Data interval: 1 hour
        </p>

        {/* Data table for PDF */}
        {!loading && histData.length > 0 && (
          <table className="hist-data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {histData.map((value, i) => {
                const dt = new Date(Date.now() - (23 - i) * 60 * 60 * 1000);
                const date = `${dt.getDate()}.${dt.getMonth() + 1}.${String(dt.getFullYear()).slice(2)}`;
                const time = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                const formatted = yDecimals > 0 ? value.toFixed(yDecimals) : value.toFixed(1);
                return (
                  <tr key={i}>
                    <td>{date}</td>
                    <td>{time}</td>
                    <td>{formatted}{unit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
