import { useState } from 'react';
import './App.css';
import Overview from './components/Overview';
import Sensors from './components/Sensors';
import Analytics from './components/Analytics';

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">
            <span className="logo-icon">🌱</span>
            Eco Grow Automation
          </h1>
          <nav className="nav">
            <button 
              className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`nav-btn ${activeTab === 'sensors' ? 'active' : ''}`}
              onClick={() => setActiveTab('sensors')}
            >
              Sensors
            </button>
            <button 
              className={`nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
          </nav>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'sensors' && <Sensors />}
        {activeTab === 'analytics' && <Analytics />}
      </main>
    </div>
  );
}

export default App;
