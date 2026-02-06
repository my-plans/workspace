import React, { useState, useEffect } from 'react';

function HealthMonitor({ apiUrl, compact = false }) {
  const [bots, setBots] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/health`);
      const data = await res.json();
      setBots(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch health:', err);
    }
  };

  const formatUptime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Never';
    const diff = (new Date() - new Date(timestamp)) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'online': return '🟢';
      case 'offline': return '🔴';
      case 'error': return '🟠';
      default: return '⚪';
    }
  };

  const onlineCount = bots.filter(b => b.status === 'online').length;
  const totalCount = bots.length;

  if (compact) {
    return (
      <div className="health-monitor compact">
        <h3>❤️ Bot Health</h3>
        <div className="health-summary">
          <div className="health-stat">
            <span className="health-number" style={{ color: 'var(--color-success)' }}>
              {onlineCount}
            </span>
            <span>/{totalCount} online</span>
          </div>
        </div>
        <div className="health-bots">
          {bots.slice(0, 3).map(bot => (
            <div key={bot.bot_name} className="health-dot" title={bot.bot_name}>
              {getStatusIcon(bot.status)}
            </div>
          ))}
          {bots.length > 3 && <span>+{bots.length - 3}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="health-monitor">
      <div className="section-header">
        <h3>❤️ Health Monitor</h3>
        <div className="header-actions">
          <span className="refresh-time">Updated: {lastRefresh.toLocaleTimeString()}</span>
          <button onClick={fetchHealth}>🔄 Refresh</button>
        </div>
      </div>

      <div className="health-overview">
        <div className="health-card">
          <div className="health-number">{onlineCount}/{totalCount}</div>
          <div className="health-label">Bots Online</div>
        </div>
        <div className="health-card">
          <div className="health-number">{bots.filter(b => b.status === 'error').length}</div>
          <div className="health-label">Errors</div>
        </div>
        <div className="health-card">
          <div className="health-number">{bots.filter(b => b.status === 'offline').length}</div>
          <div className="health-label">Offline</div>
        </div>
      </div>

      <div className="bots-grid">
        {bots.length === 0 ? (
          <div className="empty-state">No bots registered.</div>
        ) : (
          bots.map(bot => (
            <div key={bot.bot_name} className={`bot-card ${bot.status}`}>
              <div className="bot-header">
                <span className="bot-status-icon">{getStatusIcon(bot.status)}</span>
                <h4>{bot.bot_name}</h4>
              </div>
              <div className="bot-stats">
                <div className="bot-stat">
                  <span className="stat-label">Status</span>
                  <span className={`stat-value status-${bot.status}`}>{bot.status}</span>
                </div>
                <div className="bot-stat">
                  <span className="stat-label">Last Seen</span>
                  <span className="stat-value">{formatLastSeen(bot.last_seen)}</span>
                </div>
                <div className="bot-stat">
                  <span className="stat-label">Uptime</span>
                  <span className="stat-value">{formatUptime(bot.uptime_seconds)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default HealthMonitor;
