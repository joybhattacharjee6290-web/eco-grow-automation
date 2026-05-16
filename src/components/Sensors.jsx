import './Sensors.css';
import { useSensorDataContext } from '../hooks/useSensorData.jsx';
import smartGreenhouse from '../assets/white_bg_greenhouse.png';

export default function Sensors() {
  const { sensorStates, toggleSensor, formattedData, isConnected } = useSensorDataContext();

  const sensors = [
    { id: 'waterPump', name: 'Water Pump', icon: '💧', status: sensorStates.waterPump ? 'Active' : 'Inactive' },
    { id: 'waterLevel', name: 'Lights', icon: '💡', value: `${formattedData.waterLevel} L` },
    { id: 'ldrSensor', name: 'LDR Sensor', icon: '☀️', value: `${formattedData.sunlight}%` },
    { id: 'airQuality', name: 'Air Quality Sensor', icon: '🌬️', value: `${formattedData.airQuality} AQI` },
    { id: 'temperature', name: 'Temperature Sensor', icon: '🌡️', value: `${formattedData.temperature}°C` },
    { id: 'moisture', name: 'Moisture Sensor', icon: '🌱', value: `${formattedData.soilMoisture}%` },
    { id: 'rainfall', name: 'Rainfall Sensor', icon: '🌧️', value: `${formattedData.rainfall}%` },
  ];

  return (
    <div className="sensors">
      <div className="sensors-wrapper">
        <div className="sensors-left">
          <h1 className="sensors-title">All Connected Sensors</h1>
          <div className="connection-statusSensor">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>

          <div className="sensors-list">
            {sensors.map((sensor) => (
              <div key={sensor.id} className={`sensor-item ${!sensorStates[sensor.id] ? 'disabled' : ''}`}>
                <div className="sensor-info">
                  <span className="sensor-icon">{sensor.icon}</span>
                  <div className="sensor-details">
                    <span className="sensor-name">{sensor.name}</span>
                    {sensor.value && sensorStates[sensor.id] && (
                      <span className="sensor-value">{sensor.value}</span>
                    )}
                    {sensor.status && (
                      <span className={`sensor-status ${sensorStates[sensor.id] ? 'active' : 'inactive'}`}>
                        {sensor.status}
                      </span>
                    )}
                  </div>
                </div>

                <div className="sensor-toggle">
                  <input
                    type="checkbox"
                    id={`toggle-${sensor.id}`}
                    checked={sensorStates[sensor.id]}
                    onChange={() => toggleSensor(sensor.id)}
                  />
                  <label htmlFor={`toggle-${sensor.id}`}></label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sensors-right">
          <div className="illustration-placeholder">
            <img src='/cuate.png' alt="Smart Greenhouse" className="sensor-illustration" />
          </div>
        </div>
      </div>
    </div>
  );
}
