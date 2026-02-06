import React, { useState, useEffect } from 'react';

function ClientPortal({ apiUrl, compact = false }) {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    project_status: 'active',
    last_contact: '',
    notes: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/clients`);
      const data = await res.json();
      setClients(data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const createClient = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${apiUrl}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      });
      setNewClient({ name: '', email: '', project_status: 'active', last_contact: '', notes: '' });
      setShowAddForm(false);
      fetchClients();
    } catch (err) {
      console.error('Failed to create client:', err);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await fetch(`${apiUrl}/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_status: status, last_contact: new Date().toISOString().split('T')[0] })
      });
      fetchClients();
    } catch (err) {
      console.error('Failed to update client:', err);
    }
  };

  const deleteClient = async (id) => {
    if (!window.confirm('Delete this client?')) return;
    try {
      await fetch(`${apiUrl}/api/clients/${id}`, { method: 'DELETE' });
      fetchClients();
    } catch (err) {
      console.error('Failed to delete client:', err);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'var(--color-success)',
      on_hold: 'var(--color-warning)',
      completed: '#64748b'
    };
    return (
      <span className="status-badge" style={{ backgroundColor: colors[status] || '#64748b' }}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (compact) {
    return (
      <div className="client-portal compact">
        <h3>👥 Clients</h3>
        <div className="client-summary">
          <div className="client-count">{clients.length} total</div>
          <div className="client-count" style={{ color: 'var(--color-success)' }}>
            {clients.filter(c => c.project_status === 'active').length} active
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="client-portal">
      <div className="section-header">
        <h3>👥 Client Portal</h3>
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>+ Add Client</button>
      </div>

      <input
        type="text"
        className="search-input"
        placeholder="Search clients..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {showAddForm && (
        <form className="add-form" onSubmit={createClient}>
          <input
            type="text"
            placeholder="Client name"
            value={newClient.name}
            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={newClient.email}
            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
          />
          <select
            value={newClient.project_status}
            onChange={(e) => setNewClient({ ...newClient, project_status: e.target.value })}
          >
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
          <input
            type="date"
            placeholder="Last contact"
            value={newClient.last_contact}
            onChange={(e) => setNewClient({ ...newClient, last_contact: e.target.value })}
          />
          <input
            type="text"
            placeholder="Notes"
            value={newClient.notes}
            onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
          />
          <button type="submit">Create</button>
          <button type="button" onClick={() => setShowAddForm(false)}>Cancel</button>
        </form>
      )}

      <div className="clients-grid">
        {filteredClients.length === 0 ? (
          <div className="empty-state">No clients found.</div>
        ) : (
          filteredClients.map(client => (
            <div key={client.id} className="client-card">
              <div className="client-header">
                <h4>{client.name}</h4>
                {getStatusBadge(client.project_status)}
              </div>
              <div className="client-details">
                {client.email && <div>📧 {client.email}</div>}
                {client.last_contact && <div>📅 Last contact: {client.last_contact}</div>}
                {client.notes && <div className="client-notes">{client.notes}</div>}
              </div>
              <div className="client-actions">
                <select
                  value={client.project_status}
                  onChange={(e) => updateStatus(client.id, e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
                <button className="delete-btn" onClick={() => deleteClient(client.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ClientPortal;
