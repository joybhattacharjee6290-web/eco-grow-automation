import { useState } from 'react';
import './App.css';
import Overview from './components/Overview';
import Sensors from './components/Sensors';
import Analytics from './components/Analytics';
import { SensorDataProvider } from './hooks/useSensorData.jsx';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false); // Close menu when tab is selected
  };

  return (
    <SensorDataProvider updateInterval={3000}>
      <div className="app">
        <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="logo">
              <span className="logo-icon">🌱</span>
              <span className="logo-text">Eco Grow Automation</span>
            </div>
            <button
              className="menu-close-btn"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => handleTabClick('overview')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-label">Overview</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'sensors' ? 'active' : ''}`}
              onClick={() => handleTabClick('sensors')}
            >
              <span className="nav-icon">📡</span>
              <span className="nav-label">Sensors</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => handleTabClick('analytics')}
            >
              <span className="nav-icon">📈</span>
              <span className="nav-label">Analytics</span>
            </button>
          </nav>
        </aside>

        {/* Mobile overlay */}
        {isMobileMenuOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <main className="main-content">
          {/* Mobile header with hamburger */}
          <header className="mobile-header">
            <button
              className="hamburger-btn"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
            <h1 className="mobile-title">
              {activeTab === 'overview' && '📊 Overview'}
              {activeTab === 'sensors' && '📡 Sensors'}
              {activeTab === 'analytics' && '📈 Analytics'}
            </h1>
          </header>

          {activeTab === 'overview' && <Overview />}
          {activeTab === 'sensors' && <Sensors />}
          {activeTab === 'analytics' && <Analytics />}
        </main>
      </div>
    </SensorDataProvider>
  );
}

export default App;
