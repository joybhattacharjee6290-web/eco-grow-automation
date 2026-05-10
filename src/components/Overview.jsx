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
  const tempPercent = formattedData.temperature;
  const humidityPercent = formattedData.humidity;
  const soilPercent = formattedData.soilMoisture;
  //const waterLevel = formattedData.waterLevel;
  const sunlightPercent = formattedData.sunlight;
  //const airQualityPercent = formattedData.airQuality;
  const co2Percent = formattedData.co2;
  const no2Percent = formattedData.no2;

  const getAQIStatus = (aqi) => {
    if (aqi <= 100) return "Good Air Quality";
    if (aqi <= 200) return "Moderate Air Quality";
    return "Poor Air Quality";
  };

  const getRainStatus = (rainPct) => {
    if (rainPct <= 0) return "No Rain";
    if (rainPct <= 5) return "Humid Rain";
    if (rainPct <= 20) return "Light Mist";
    if (rainPct <= 50) return "Light Rain";
    if (rainPct <= 85) return "Heavy Rain";
    return "Strom";
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
              center={`${formattedData.humidity}%`}
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
              center={`${formattedData.sunlight}%`}
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
        <div className="card rainfall-card">
          <div className="rainfall-header">
            <h3 className="card-label">Rainfall</h3>
          </div>
          <div className="rainfall-content">
            <div>
              {formattedData.rainfall <= 5 ? (
                <span className="rain-icon">☀️</span>
              ) : formattedData.rainfall <= 50 ? (
                <span className="rain-icon">🌦️</span>
              ) : formattedData.rainfall <= 85 ? (
                <span className="rain-icon">🌧️</span>
              ) : (
                <span className="rain-icon">⛈️</span>
              )}
            </div>

            <div className="rainfall-status">
              {getRainStatus(formattedData.rainfall)}
            </div>
          </div>
        </div>

        <div className="card co2-card">
          <h3 className="card-label">Carbon Dioxide</h3>
          <div className="donut-wrapper">
            <Donut
              size={110}
              stroke={11}
              value={co2Percent}
              isDark={false}
              center={`${formattedData.co2.toFixed(3)}%`}
            />
          </div>
        </div>
        <div className="card air-quality-card">
          <h3 className="card-label">Ammonia</h3>
          <div className="donut-wrapper">
            <Donut
              size={110}
              stroke={12}
              value={no2Percent}
              isDark={true}
              center={`${formattedData.no2.toFixed(3)}%`}
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
