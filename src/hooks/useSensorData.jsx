import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// Utility to clamp value within bounds
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Simulate small fluctuation around a base value
const fluctuate = (current, min, max, volatility = 0.1) => {
    const change = (Math.random() - 0.5) * 2 * volatility * (max - min);
    return clamp(current + change, min, max);
};

// Initial dummy sensor data
const generateInitialData = () => ({
    temperature: 28 + Math.random() * 10,
    humidity: 50 + Math.random() * 30,
    soilMoisture: 30 + Math.random() * 40,
    phLevel: 6 + Math.random() * 2,
    rainfall: 40 + Math.random() * 40,
    sunlight: 500 + Math.random() * 500,
    airQuality: 60 + Math.random() * 30,
    waterLevel: 60 + Math.random() * 30,
});

// Generate historical data for charts (last 8 readings)
const generateHistoricalData = (currentValue, min, max, points = 8) => {
    const data = [];
    let value = currentValue - (Math.random() * (max - min) * 0.3);

    for (let i = 0; i < points; i++) {
        value = fluctuate(value, min, max, 0.15);
        data.push(Math.round(value * 10) / 10);
    }

    data[data.length - 1] = Math.round(currentValue * 10) / 10;
    return data;
};

// Custom hook for sensor data management
export function useSensorData(updateInterval = 3000) {
    const [sensorData, setSensorData] = useState(generateInitialData);
    const [historicalData, setHistoricalData] = useState({});
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [isConnected, setIsConnected] = useState(true);

    const [sensorStates, setSensorStates] = useState({
        waterPump: true,
        phSensor: true,
        ldrSensor: true,
        airQuality: true,
        temperature: true,
        moisture: true,
        rainfall: true,
    });

    const [notifications, setNotifications] = useState([]);

    const generateNotifications = useCallback((data) => {
        const newNotifications = [];
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
    }, []);

    useEffect(() => {
        setHistoricalData({
            temperature: generateHistoricalData(sensorData.temperature, 20, 40),
            humidity: generateHistoricalData(sensorData.humidity, 40, 90),
            soilMoisture: generateHistoricalData(sensorData.soilMoisture, 20, 80),
            phLevel: generateHistoricalData(sensorData.phLevel, 5, 9),
            rainfall: generateHistoricalData(sensorData.rainfall, 0, 100),
            sunlight: generateHistoricalData(sensorData.sunlight, 200, 1200),
            airQuality: generateHistoricalData(sensorData.airQuality, 40, 100),
        });

        setNotifications(generateNotifications(sensorData));
    }, [sensorData, generateNotifications]);

    useEffect(() => {
        const interval = setInterval(() => {
            setSensorData(prev => ({
                temperature: fluctuate(prev.temperature, 20, 40, 0.05),
                humidity: fluctuate(prev.humidity, 40, 90, 0.08),
                soilMoisture: fluctuate(prev.soilMoisture, 20, 80, 0.06),
                phLevel: fluctuate(prev.phLevel, 5.5, 8.5, 0.02),
                rainfall: fluctuate(prev.rainfall, 0, 100, 0.1),
                sunlight: fluctuate(prev.sunlight, 200, 1200, 0.12),
                airQuality: fluctuate(prev.airQuality, 40, 100, 0.07),
                waterLevel: fluctuate(prev.waterLevel, 20, 100, 0.04),
            }));
            setLastUpdated(new Date());
        }, updateInterval);

        return () => clearInterval(interval);
    }, [updateInterval]);

    const toggleSensor = useCallback((sensorId) => {
        setSensorStates(prev => ({
            ...prev,
            [sensorId]: !prev[sensorId]
        }));
    }, []);

    const toggleWaterPump = useCallback(() => {
        setSensorStates(prev => ({
            ...prev,
            waterPump: !prev.waterPump
        }));
    }, []);

    const formattedData = {
        temperature: Math.round(sensorData.temperature),
        humidity: Math.round(sensorData.humidity),
        soilMoisture: Math.round(sensorData.soilMoisture),
        phLevel: sensorData.phLevel.toFixed(1),
        rainfall: Math.round(sensorData.rainfall),
        sunlight: Math.round(sensorData.sunlight),
        airQuality: Math.round(sensorData.airQuality),
        waterLevel: Math.round(sensorData.waterLevel),
    };

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
    };
}

// React Context for sharing data across components
const SensorDataContext = createContext(null);

export function SensorDataProvider({ children, updateInterval = 3000 }) {
    const sensorData = useSensorData(updateInterval);

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
