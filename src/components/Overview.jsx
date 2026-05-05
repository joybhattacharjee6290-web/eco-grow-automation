import "./Overview.css";
import { useMemo } from "react";
import { useSensorDataContext } from "../hooks/useSensorData.jsx";

// Donut chart component
function Donut({
  size = 120,
  stroke = 12,
  value = 65,
  isDark = false,
  center,
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = useMemo(
    () => circumference - (value / 100) * circumference,
    [circumference, value]
  );
  const gradId = useMemo(
    () => `donut-${Math.random().toString(36).substr(2, 9)}`,
    []
  );

  return (
    <svg
      className="donut"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          {isDark ? (
            <>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#d1fae5" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#14b8a6" />
            </>
          )}
        </linearGradient>
      </defs>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle
          r={radius}
          fill="none"
          stroke={isDark ? "#1e5d5a" : "#d1fae5"}
          strokeWidth={stroke}
        />
        <circle
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform="rotate(-90)"
          style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
        />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          className="donut-text"
          fill={isDark ? "#ffffff" : "#1f2937"}
        >
          {center}
        </text>
      </g>
    </svg>
  );
}

// Simple line chart placeholder with dynamic data
function ChartPlaceholder({ data }) {
  const points = useMemo(() => {
    if (!data || data.length === 0) return "0,70 280,70";
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    return data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * 280;
        const y = 90 - ((value - min) / range) * 70;
        return `${x},${y}`;
      })
      .join(" ");
  }, [data]);

  return (
    <svg
      className="chart-placeholder"
      viewBox="0 0 280 100"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke="#10b981"
        strokeWidth="1.5"
        points={points}
        style={{ transition: "all 0.5s ease-out" }}
      />
    </svg>
  );
}

export default function Overview() {
  const {
    formattedData,
    sensorStates,
    toggleWaterPump,
    notifications,
    historicalData,
    lastUpdated,
  } = useSensorDataContext();

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = `${now.getDate()}- ${now.toLocaleString("default", {
    month: "long",
  })}-${now.getFullYear()}`;

  // Convert values to percentages for donut charts
  const tempPercent = Math.min(100, (formattedData.temperature / 50) * 100);
  const humidityPercent = formattedData.humidity;
  const soilPercent = formattedData.soilMoisture;
  const waterLevel = formattedData.waterLevel;
  const sunlightPercent = Math.min(100, (formattedData.sunlight / 1200) * 100);
  const airQualityPercent = formattedData.airQuality;
  const co2Percent = Math.min(100, (formattedData.co2 / 1200) * 100);
  const no2Percent = Math.min(100, (formattedData.no2 / 80) * 100);

  const getAQIStatus = (aqi) => {
    if (aqi <= 50) return "Good Air Quality";
    if (aqi <= 100) return "Moderate Air Quality";
    if (aqi <= 200) return "Unhealthy for Sensitive";
    if (aqi <= 300) return "Poor Air Quality";
    return "Very Poor / Hazardous";
  };

  return (
    <div className="overview">
      <div className="overview-grid">
        {/* Row 1 */}
        <div className="card time-date-card">
          <h3 className="card-label">Time & Date</h3>
          <div className="time-display">
            <div className="time-value">{timeStr}</div>
            <div className="time-icon">⏳</div>
          </div>
          <div className="date-value">{dateStr}</div>
          <div className="last-update">
            Last update: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
        <div className="card temp-card">
          <h3 className="card-label">Temperature</h3>
          <div className="donut-wrapper">
            <Donut
              size={100}
              stroke={12}
              value={tempPercent}
              isDark={true}
              center={`${formattedData.temperature}°`}
            />
          </div>
        </div>
        <div className="card humidity-card">
          <h3 className="card-label">Humidity</h3>
          <div className="donut-wrapper">
            <Donut
              size={100}
              stroke={12}
              value={humidityPercent}
              isDark={false}
              center={formattedData.humidity}
            />
          </div>
        </div>
        <div className="card notifications-card">
          <h3 className="card-label">Notifications</h3>
          <ul className="notification-list">
            {notifications.length > 0 ? (
              notifications.map((notification, index) => (
                <li
                  key={notification.id || index}
                  className={`notification-${notification.type}`}
                >
                  {notification.message}
                </li>
              ))
            ) : (
              <>
                <li>All systems normal</li>
                <li>Sensors operating correctly</li>
              </>
            )}
            {sensorStates.waterPump && <li>Waterpump is active</li>}
            {!sensorStates.waterPump && <li>Waterpump is turned off</li>}
          </ul>
        </div>
        {/* Row 2 */}
        <div className="card sunlight-card">
          <h3 className="card-label">Sunlight</h3>
          <div className="donut-wrapper">
            <Donut
              size={95}
              stroke={11}
              value={sunlightPercent}
              isDark={false}
              center={`${Math.round(sunlightPercent)}%`}
            />
          </div>
        </div>
        <div className="card soil-card">
          <h3 className="card-label">Soil Moisture</h3>
          <div className="donut-wrapper">
            <Donut
              size={100}
              stroke={12}
              value={soilPercent}
              isDark={true}
              center={`${formattedData.soilMoisture}%`}
            />
          </div>
        </div>

        <div className="card aqi-card">
          <h1 className="card-label aqi-label">AQI Level</h1>

          <div className="aqi-content">
            <div>
              <div className="aqi-value">{formattedData.airQuality}</div>
              <div className="aqi-status">
                {getAQIStatus(formattedData.airQuality)}
              </div>
            </div>
            <div className="aqi-icon">🍃</div>
          </div>
        </div>

        {/* Row 3 */}
        <div className="card analytics-card">
          <div className="analytics-header">
            <h3 className="card-label">Analytics</h3>
            <span className="analytics-subtitle">Live data</span>
          </div>
          <ChartPlaceholder data={historicalData.temperature || []} />
        </div>
        <div className="card co2-card">
          <h3 className="card-label">Co2 Level</h3>
          <div className="donut-wrapper">
            <Donut
              size={100}
              stroke={11}
              value={co2Percent}
              isDark={false}
              center={`${co2Percent.toFixed(1)}%`}
            />
          </div>
        </div>
        <div className="card air-quality-card">
          <h3 className="card-label">No2 Level</h3>
          <div className="donut-wrapper">
            <Donut
              size={100}
              stroke={12}
              value={no2Percent}
              isDark={true}
              center={`${no2Percent.toFixed(1)}%`}
            />
          </div>
        </div>
        <div className="card water-card">
          <h3 className="card-label">Water</h3>
          <div className="water-content">
            <div className="water-metric">
              <span className="water-label">Water level</span>
              <div className="water-bar-wrapper">
                <div className="water-bar">
                  <div
                    className="water-fill"
                    style={{ width: `${formattedData.waterLevel}%` }}
                  ></div>
                </div>
                <span className="water-value">{formattedData.waterLevel}%</span>
              </div>
            </div>
            <div className="water-metric">
              <span className="water-label">Water Pump</span>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="pump-toggle"
                  checked={sensorStates.waterPump}
                  onChange={toggleWaterPump}
                />
                <label htmlFor="pump-toggle"></label>
                <span className="toggle-label">
                  {sensorStates.waterPump ? "ON" : "OFF"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
