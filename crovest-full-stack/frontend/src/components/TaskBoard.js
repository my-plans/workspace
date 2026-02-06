import React, { useState, useEffect } from 'react';

function TaskBoard({ apiUrl, compact = false }) {
  const [tasks, setTasks] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' });

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/tasks`);
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${apiUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, status: 'todo' })
      });
      setNewTask({ title: '', description: '', priority: 'medium' });
      setShowAddForm(false);
      fetchTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const moveTask = async (taskId, newStatus) => {
    try {
      await fetch(`${apiUrl}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchTasks();
    } catch (err) {
      console.error('Failed to move task:', err);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await fetch(`${apiUrl}/api/tasks/${taskId}`, { method: 'DELETE' });
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const getPriorityColor = (p) => {
    switch(p) {
      case 'high': return 'var(--color-error)';
      case 'medium': return 'var(--color-warning)';
      default: return 'var(--color-success)';
    }
  };

  const columns = [
    { id: 'todo', title: 'To Do', color: '#64748b' },
    { id: 'in_progress', title: 'In Progress', color: '#3b82f6' },
    { id: 'done', title: 'Done', color: '#10b981' }
  ];

  if (compact) {
    const todoCount = tasks.filter(t => t.status === 'todo').length;
    const progressCount = tasks.filter(t => t.status === 'in_progress').length;
    const doneCount = tasks.filter(t => t.status === 'done').length;
    
    return (
      <div className="task-board compact">
        <h3>✓ Tasks</h3>
        <div className="task-summary">
          <div className="task-count" style={{ color: '#64748b' }}>{todoCount} todo</div>
          <div className="task-count" style={{ color: '#3b82f6' }}>{progressCount} in progress</div>
          <div className="task-count" style={{ color: '#10b981' }}>{doneCount} done</div>
        </div>
      </div>
    );
  }

  return (
    <div className="task-board">
      <div className="section-header">
        <h3>✓ Task Board</h3>
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>+ Add Task</button>
      </div>

      {showAddForm && (
        <form className="add-form" onSubmit={createTask}>
          <input
            type="text"
            placeholder="Task title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          />
          <select
            value={newTask.priority}
            onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button type="submit">Create</button>
          <button type="button" onClick={() => setShowAddForm(false)}>Cancel</button>
        </form>
      )}

      <div className="kanban-board">
        {columns.map(col => (
          <div key={col.id} className="kanban-column">
            <div className="column-header" style={{ backgroundColor: col.color }}>
              {col.title}
              <span className="task-count">{tasks.filter(t => t.status === col.id).length}</span>
            </div>
            <div className="column-content">
              {tasks.filter(t => t.status === col.id).map(task => (
                <div key={task.id} className="task-card">
                  <div className="task-header">
                    <span className="priority-dot" style={{ backgroundColor: getPriorityColor(task.priority) }}></span>
                    <h4>{task.title}</h4>
                    <button className="delete-btn" onClick={() => deleteTask(task.id)}>×</button>
                  </div>
                  <p>{task.description}</p>
                  <div className="task-actions">
                    {col.id !== 'todo' && (
                      <button onClick={() => moveTask(task.id, col.id === 'done' ? 'in_progress' : 'todo')}>
                        ← {col.id === 'done' ? 'Progress' : 'Todo'}
                      </button>
                    )}
                    {col.id !== 'done' && (
                      <button onClick={() => moveTask(task.id, col.id === 'todo' ? 'in_progress' : 'done')}>
                        {col.id === 'todo' ? 'Progress' : 'Done'} →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TaskBoard;
