import React, { useState, useEffect } from 'react';

function ObjectivesTracker({ apiUrl, compact = false }) {
  const [objectives, setObjectives] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newObjective, setNewObjective] = useState({
    title: '',
    description: '',
    deadline: '',
    progress: 0,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  useEffect(() => {
    fetchObjectives();
  }, []);

  const fetchObjectives = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/objectives`);
      const data = await res.json();
      setObjectives(data);
    } catch (err) {
      console.error('Failed to fetch objectives:', err);
    }
  };

  const createObjective = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${apiUrl}/api/objectives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newObjective)
      });
      setNewObjective({
        title: '',
        description: '',
        deadline: '',
        progress: 0,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      });
      setShowAddForm(false);
      fetchObjectives();
    } catch (err) {
      console.error('Failed to create objective:', err);
    }
  };

  const updateProgress = async (id, progress) => {
    try {
      await fetch(`${apiUrl}/api/objectives/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: parseInt(progress) })
      });
      fetchObjectives();
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const deleteObjective = async (id) => {
    if (!window.confirm('Delete this objective?')) return;
    try {
      await fetch(`${apiUrl}/api/objectives/${id}`, { method: 'DELETE' });
      fetchObjectives();
    } catch (err) {
      console.error('Failed to delete objective:', err);
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'var(--color-success)';
    if (progress >= 50) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const daysUntil = (deadline) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="objectives-tracker">
      <div className="section-header">
        <h3>🎯 Monthly Objectives</h3>
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>+ Add Objective</button>
      </div>

      {showAddForm && (
        <form className="add-form" onSubmit={createObjective}>
          <input
            type="text"
            placeholder="Objective title"
            value={newObjective.title}
            onChange={(e) => setNewObjective({ ...newObjective, title: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={newObjective.description}
            onChange={(e) => setNewObjective({ ...newObjective, description: e.target.value })}
          />
          <input
            type="date"
            value={newObjective.deadline}
            onChange={(e) => setNewObjective({ ...newObjective, deadline: e.target.value })}
          />
          <div className="form-row">
            <input
              type="number"
              min="1"
              max="12"
              placeholder="Month"
              value={newObjective.month}
              onChange={(e) => setNewObjective({ ...newObjective, month: parseInt(e.target.value) })}
            />
            <input
              type="number"
              placeholder="Year"
              value={newObjective.year}
              onChange={(e) => setNewObjective({ ...newObjective, year: parseInt(e.target.value) })}
            />
          </div>
          <button type="submit">Create</button>
          <button type="button" onClick={() => setShowAddForm(false)}>Cancel</button>
        </form>
      )}

      <div className="objectives-list">
        {objectives.length === 0 ? (
          <div className="empty-state">No objectives set for this month.</div>
        ) : (
          objectives.map(obj => {
            const days = daysUntil(obj.deadline);
            return (
              <div key={obj.id} className="objective-card">
                <div className="objective-header">
                  <h4>{obj.title}</h4>
                  <button className="delete-btn" onClick={() => deleteObjective(obj.id)}>×</button>
                </div>
                <p>{obj.description}</p>
                {obj.deadline && (
                  <div className={`deadline ${days < 3 ? 'urgent' : ''}`}>
                    📅 {obj.deadline} {days !== null && `(${days} days)`}
                  </div>
                )}
                <div className="progress-section">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${obj.progress}%`, backgroundColor: getProgressColor(obj.progress) }}
                    ></div>
                  </div>
                  <div className="progress-controls">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={obj.progress}
                      onChange={(e) => updateProgress(obj.id, e.target.value)}
                    />
                    <span className="progress-text">{obj.progress}%</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ObjectivesTracker;
