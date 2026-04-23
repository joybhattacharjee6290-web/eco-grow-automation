import { useMemo } from 'react';
import './Analytics.css';
import { useSensorDataContext } from '../hooks/useSensorData.jsx';

// Helper to create smooth bezier curves
const getSmoothPath = (points, height, padding) => {
  if (points.length === 0) return '';

  // Move to first point
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

function LineChart({ data, color, showBars = false }) {
  if (showBars) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    return (
      <div className="bar-chart">
        {data.map((value, index) => {
          const height = ((value - min) / range) * 80 + 20; // Min 20% height
          return (
            <div key={index} className="bar-wrapper">
              <div
                className={`bar ${color}`}
                style={{ height: `${height}%`, transition: 'height 0.5s ease-out' }}
              />
            </div>
          );
        })}
      </div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const width = 300;
  const height = 120;
  const padding = 15;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = height - padding - ((value - min) / range) * chartHeight;
    return [x, y];
  });

  const pathD = getSmoothPath(points, height, padding);
  const fillPathD = `${pathD} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="line-chart-svg">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className={`stop-${color}-top`} />
          <stop offset="100%" className={`stop-${color}-bottom`} />
        </linearGradient>
      </defs>

      <path
        d={fillPathD}
        className={`chart-fill ${color}`}
        fill={`url(#gradient-${color})`}
        style={{ transition: 'all 0.5s ease-out' }}
      />

      <path
        d={pathD}
        fill="none"
        className={`chart-line ${color}`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: 'all 0.5s ease-out' }}
      />
    </svg>
  );
}

export default function Analytics() {
  const { formattedData, historicalData, lastUpdated } = useSensorDataContext();

  const analyticsData = useMemo(() => [
    {
      id: 1,
      name: 'Soil Moisture',
      value: `${formattedData.soilMoisture}%`,
      unit: '',
      color: 'green',
      chartData: historicalData.soilMoisture || [45, 48, 46, 50, 52, 49, 48, 47],
      grid: 'top-left',
      showBars: false
    },
    {
      id: 2,
      name: 'Sunlight',
      value: formattedData.sunlight.toString(),
      unit: 'lx',
      color: 'yellow',
      chartData: historicalData.sunlight || [600, 650, 700, 680, 720, 760, 750, 800],
      grid: 'top-right',
      showBars: false
    },
    {
      id: 3,
      name: 'PH Level',
      value: formattedData.phLevel,
      unit: 'pH',
      color: 'blue',
      chartData: historicalData.phLevel || [5, 6, 5, 7, 6, 5, 6, 7],
      grid: 'middle-left',
      showBars: true
    },
    {
      id: 4,
      name: 'Temperature',
      value: `${formattedData.temperature}°`,
      unit: 'C',
      color: 'orange',
      chartData: historicalData.temperature || [22, 23, 24, 25, 26, 25, 24, 23],
      grid: 'middle-center',
      showBars: false
    },
    {
      id: 5,
      name: 'Humidity',
      value: `${formattedData.humidity}%`,
      unit: '',
      color: 'teal',
      chartData: historicalData.humidity || [60, 62, 65, 63, 64, 66, 65, 64],
      grid: 'middle-right',
      showBars: true
    },
    {
      id: 6,
      name: 'Air Quality',
      value: formattedData.airQuality.toString(),
      unit: 'AQI',
      color: 'purple',
      chartData: historicalData.airQuality || [85, 86, 88, 87, 89, 90, 88, 87],
      grid: 'bottom-left',
      showBars: false
    },
    {
      id: 7,
      name: 'Rainfall',
      value: formattedData.rainfall.toString(),
      unit: 'mm',
      color: 'cyan',
      chartData: historicalData.rainfall || [2, 3, 5, 4, 6, 7, 6, 8],
      grid: 'bottom-right',
      showBars: false
    },
  ], [formattedData, historicalData]);

  const getGridClass = (grid) => {
    return `analytics-card ${grid}`;
  };

  return (
    <div className="analytics">
      <div className="analytics-header-bar">
        <span className="live-indicator">
          <span className="live-dot"></span>
          LIVE
        </span>
        <span className="last-update">Updated: {lastUpdated.toLocaleTimeString()}</span>
      </div>
      <div className="analytics-grid">
        {analyticsData.map((item) => (
          <div key={item.id} className={`${getGridClass(item.grid)} card-glass`}>
            <div className="card-header">
              <h3 className="analytics-title">{item.name}</h3>
              <div className={`current-value ${item.color}`}>
                {item.value}<span className="unit">{item.unit}</span>
              </div>
            </div>
            <div className="chart-wrapper">
              <LineChart data={item.chartData} color={item.color} showBars={item.showBars} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
