import React from 'react';

function Sidebar({ currentView, setCurrentView, isOpen, setIsOpen, wsConnected }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'logs', label: 'Log Stream', icon: '📜' },
    { id: 'tasks', label: 'Task Board', icon: '✓' },
    { id: 'objectives', label: 'Objectives', icon: '🎯' },
    { id: 'clients', label: 'Clients', icon: '👥' },
    { id: 'health', label: 'Health Monitor', icon: '❤️' },
  ];

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Crovest</h2>
          <span className="version">v1.0</span>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentView(item.id);
                setIsOpen(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="ws-status">
            <span className={`status-dot ${wsConnected ? 'online' : 'offline'}`}></span>
            {wsConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </aside>
      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)}></div>}
    </>
  );
}

export default Sidebar;
