# 🌱 Eco Grow Automation

An IoT-based web application for monitoring and analyzing soil and environmental data from agricultural sensors.

## 🎯 Features

### Overview Section
- Real-time display of sensor data in card format
- Displays 8 key metrics:
  - Temperature (°C)
  - Humidity (%)
  - Soil Moisture (%)
  - pH Level
  - Rainfall (%)
  - Sunlight (lux)
  - Air Quality (AQI)
  - Water Level (%)
- Visual status indicators (Good/Warning/Critical)
- System status information

### Sensors Section
- Individual sensor status monitoring
- Battery level tracking with visual indicators
- Signal strength monitoring
- Location information for each sensor
- Last reading timestamps
- Maintenance alerts
- Quick action buttons (Configure/View Data)
- Summary dashboard showing active sensors and alerts

### Analytics Section
- Trend analysis for 7 key parameters
- Mini charts showing historical data
- Time range selection (24h, 7d, 30d, 1y)
- Trend indicators (up/down/stable)
- Key insights and recommendations
- Visual data representation

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 🎨 Design Features

- **Dark Theme**: Modern dark UI optimized for reduced eye strain
- **Green Accent Colors**: Eco-friendly color scheme with #22c55e primary color
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Smooth Animations**: Fade-in effects and hover transitions
- **Card-based Layout**: Clean, organized data presentation
- **Visual Indicators**: Color-coded status badges and trend arrows

## 📁 Project Structure

```
src/
├── App.jsx                 # Main app component with navigation
├── App.css                 # Global app styles
├── main.jsx               # App entry point
├── index.css              # Global CSS reset and variables
├── components/
│   ├── Overview.jsx       # Overview section component
│   ├── Overview.css       # Overview styles
│   ├── Sensors.jsx        # Sensors section component
│   ├── Sensors.css        # Sensors styles
│   ├── Analytics.jsx      # Analytics section component
│   └── Analytics.css      # Analytics styles
└── assets/
    └── eco Grow automation.png  # UI design reference
```

## 🔧 Technologies Used

- **React 19.2.0** - UI library
- **Vite 7.2.2** - Build tool and dev server
- **CSS3** - Styling with modern features
- **ES6+** - Modern JavaScript

## 📊 Data Integration

Currently, the app displays mock data for demonstration purposes. To integrate with real IoT sensors:

1. Replace the static data in each component with API calls to your sensor backend
2. Set up WebSocket connections for real-time updates
3. Implement data refresh intervals
4. Add error handling for sensor connectivity issues

## 🎯 Future Enhancements

- Real-time data updates via WebSocket
- Historical data export (CSV/PDF)
- Alert notifications system
- User authentication and profiles
- Multiple field/zone management
- Advanced chart libraries (Chart.js/D3.js)
- Mobile app companion
- Sensor configuration interface
- Automated irrigation control

## 📝 License

This project is part of an IoT system development for agricultural monitoring.

## 👥 Team

Built for agricultural IoT monitoring and automation.
