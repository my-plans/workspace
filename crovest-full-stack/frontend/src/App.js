import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LogStream from './components/LogStream';
import TaskBoard from './components/TaskBoard';
import ObjectivesTracker from './components/ObjectivesTracker';
import ClientPortal from './components/ClientPortal';
import HealthMonitor from './components/HealthMonitor';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // WebSocket connection status
    const ws = new WebSocket(`ws://localhost:8000/ws/logs`);
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    return () => ws.close();
  }, []);

  const renderView = () => {
    switch(currentView) {
      case 'logs':
        return <LogStream apiUrl={API_URL} />;
      case 'tasks':
        return <TaskBoard apiUrl={API_URL} />;
      case 'objectives':
        return <ObjectivesTracker apiUrl={API_URL} />;
      case 'clients':
        return <ClientPortal apiUrl={API_URL} />;
      case 'health':
        return <HealthMonitor apiUrl={API_URL} />;
      default:
        return (
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <HealthMonitor apiUrl={API_URL} compact />
            </div>
            <div className="dashboard-card">
              <TaskBoard apiUrl={API_URL} compact />
            </div>
            <div className="dashboard-card full-width">
              <LogStream apiUrl={API_URL} compact />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        wsConnected={wsConnected}
      />
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <header className="app-header">
          <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <h1>Crovest Command Center</h1>
          <div className="connection-status">
            <span className={`status-dot ${wsConnected ? 'online' : 'offline'}`}></span>
            {wsConnected ? 'Live' : 'Offline'}
          </div>
        </header>
        <div className="content">
          {renderView()}
        </div>
      </main>
    </div>
  );
}

export default App;
