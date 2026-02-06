import React, { useState, useEffect, useRef } from 'react';

function LogStream({ apiUrl, compact = false }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isConnected, setIsConnected] = useState(false);
  const [logPath, setLogPath] = useState('~/logs');
  const logsEndRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/logs`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'log') {
        setLogs(prev => {
          const newLogs = [...prev, data];
          return newLogs.slice(-500); // Keep last 500 logs
        });
      }
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (!compact) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, compact]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level.toLowerCase() === filter.toLowerCase();
  });

  const getLevelColor = (level) => {
    switch(level.toLowerCase()) {
      case 'error': return 'var(--color-error)';
      case 'warning': return 'var(--color-warning)';
      case 'debug': return 'var(--color-info)';
      case 'critical': return '#ff0000';
      default: return 'var(--color-success)';
    }
  };

  return (
    <div className={`log-stream ${compact ? 'compact' : ''}`}>
      <div className="section-header">
        <h3>📜 Live Log Stream</h3>
        {!compact && (
          <div className="log-controls">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
            <button onClick={() => setLogs([])}>Clear</button>
          </div>
        )}
      </div>
      
      {!compact && (
        <div className="log-config">
          <input
            type="text"
            value={logPath}
            onChange={(e) => setLogPath(e.target.value)}
            placeholder="Log directory path"
          />
          <span className="connection-badge">
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      )}
      
      <div className="log-container">
        {filteredLogs.length === 0 ? (
          <div className="empty-state">No logs yet. Waiting for data...</div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div key={idx} className="log-line" style={{ borderLeftColor: getLevelColor(log.level) }}>
              <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span className="log-level" style={{ color: getLevelColor(log.level) }}>{log.level}</span>
              <span className="log-source">{log.source}</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
      
      {compact && (
        <div className="compact-footer">
          <span>{logs.length} log entries</span>
          <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
        </div>
      )}
    </div>
  );
}

export default LogStream;
