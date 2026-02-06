const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;
// Use /tmp for SQLite on Vercel (read-only filesystem), local path for dev
const DB_PATH = process.env.VERCEL ? '/tmp/crovest.db' : path.join(__dirname, '..', 'crovest.db');

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('Database open error:', err.message);
  else console.log('Connected to SQLite at', DB_PATH);
});
db.serialize(() => {
  // Todos table
  db.run(`CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    title TEXT, 
    description TEXT,
    status TEXT DEFAULT 'active', 
    priority INTEGER DEFAULT 3, 
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Decisions table
  db.run(`CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    decision TEXT, 
    context TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Bot logs table
  db.run(`CREATE TABLE IF NOT EXISTS bot_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    bot_name TEXT, 
    level TEXT, 
    message TEXT, 
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Monthly objectives table
  db.run(`CREATE TABLE IF NOT EXISTS objectives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month INTEGER,
    year INTEGER,
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'active',
    progress INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Costs table
  db.run(`CREATE TABLE IF NOT EXISTS costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    description TEXT,
    amount REAL,
    estimated_amount REAL,
    month INTEGER,
    year INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Tools registry table
  db.run(`CREATE TABLE IF NOT EXISTS tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    status TEXT DEFAULT 'active',
    url TEXT,
    category TEXT,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Seed sample data if empty
  db.get("SELECT COUNT(*) as c FROM todos", [], (e, r) => {
    if (r && r.c === 0) {
      db.run(`INSERT INTO todos (title, description, status, priority) VALUES 
        ('Optimize backtesting module', 'Improve performance of historical data analysis', 'active', 1),
        ('Add risk management rules', 'Implement stop-loss and position sizing', 'active', 2),
        ('Update API documentation', 'Document all endpoints for client integration', 'active', 3),
        ('Deploy dashboard to Vercel', 'Make dashboard live and accessible', 'active', 1)`);
      db.run(`INSERT INTO decisions (decision, context) VALUES 
        ('Use SQLite for MVP', 'Fastest to implement, will migrate to Postgres later'),
        ('Deploy on Vercel', 'Free tier, auto-deploy from GitHub')`);
    }
  });
});

// Health check
app.get('/health', (req, res) => res.json({status: 'ok', time: new Date().toISOString()}));

// Dashboard stats
app.get('/api/dashboard', (req, res) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  db.all("SELECT COUNT(*) as c FROM todos WHERE status='active'", [], (e1, r1) => {
    db.all("SELECT COUNT(*) as c FROM decisions", [], (e2, r2) => {
      db.all("SELECT SUM(amount) as total FROM costs WHERE month=? AND year=?", [currentMonth, currentYear], (e3, r3) => {
        db.all("SELECT SUM(estimated_amount) as estimated FROM costs WHERE month=? AND year=?", [currentMonth, currentYear], (e4, r4) => {
          db.all("SELECT COUNT(*) as c FROM tools WHERE status='active'", [], (e5, r5) => {
            db.all("SELECT SUM(error_count) as errors FROM tools", [], (e6, r6) => {
              res.json({
                active_todos: r1[0]?.c || 0,
                pending_decisions: r2[0]?.c || 0,
                monthly_costs: r3[0]?.total || 0,
                estimated_costs: r4[0]?.estimated || 0,
                active_tools: r5[0]?.c || 0,
                total_errors: r6[0]?.errors || 0,
                timestamp: new Date().toISOString()
              });
            });
          });
        });
      });
    });
  });
});

// Todos API
app.get('/api/todos', (req, res) => {
  db.all("SELECT * FROM todos ORDER BY priority ASC, created_at DESC", [], (e, r) => {
    if (e) return res.status(500).json({error: e.message});
    res.json(r || []);
  });
});

app.post('/api/todos', (req, res) => {
  const {title, description, priority, due_date} = req.body;
  db.run(
    "INSERT INTO todos (title, description, priority, due_date) VALUES (?, ?, ?, ?)",
    [title, description || '', priority || 3, due_date || null],
    function(e) {
      if (e) return res.status(500).json({error: e.message});
      res.json({id: this.lastID, status: 'created'});
    }
  );
});

app.patch('/api/todos/:id', (req, res) => {
  const {status} = req.body;
  db.run("UPDATE todos SET status=? WHERE id=?", [status, req.params.id], function(e) {
    if (e) return res.status(500).json({error: e.message});
    res.json({updated: this.changes});
  });
});

app.delete('/api/todos/:id', (req, res) => {
  db.run("DELETE FROM todos WHERE id=?", [req.params.id], function(e) {
    if (e) return res.status(500).json({error: e.message});
    res.json({deleted: this.changes});
  });
});

// Objectives API
app.get('/api/objectives', (req, res) => {
  const {month, year} = req.query;
  const now = new Date();
  const targetMonth = month || (now.getMonth() + 1);
  const targetYear = year || now.getFullYear();
  
  db.all("SELECT * FROM objectives WHERE month=? AND year=? ORDER BY created_at DESC", 
    [targetMonth, targetYear], (e, r) => {
      if (e) return res.status(500).json({error: e.message});
      res.json(r || []);
    }
  );
});

app.post('/api/objectives', (req, res) => {
  const {title, description, month, year} = req.body;
  const now = new Date();
  db.run(
    "INSERT INTO objectives (title, description, month, year) VALUES (?, ?, ?, ?)",
    [title, description, month || (now.getMonth() + 1), year || now.getFullYear()],
    function(e) {
      if (e) return res.status(500).json({error: e.message});
      res.json({id: this.lastID, status: 'created'});
    }
  );
});

app.patch('/api/objectives/:id', (req, res) => {
  const {status, progress} = req.body;
  db.run("UPDATE objectives SET status=?, progress=? WHERE id=?", 
    [status, progress, req.params.id], function(e) {
      if (e) return res.status(500).json({error: e.message});
      res.json({updated: this.changes});
    }
  );
});

// Costs API
app.get('/api/costs', (req, res) => {
  const {month, year} = req.query;
  const now = new Date();
  const targetMonth = month || (now.getMonth() + 1);
  const targetYear = year || now.getFullYear();
  
  db.all("SELECT * FROM costs WHERE month=? AND year=? ORDER BY category", 
    [targetMonth, targetYear], (e, r) => {
      if (e) return res.status(500).json({error: e.message});
      res.json(r || []);
    }
  );
});

app.post('/api/costs', (req, res) => {
  const {category, description, amount, estimated_amount, month, year} = req.body;
  const now = new Date();
  db.run(
    "INSERT INTO costs (category, description, amount, estimated_amount, month, year) VALUES (?, ?, ?, ?, ?, ?)",
    [category, description, amount || 0, estimated_amount || 0, month || (now.getMonth() + 1), year || now.getFullYear()],
    function(e) {
      if (e) return res.status(500).json({error: e.message});
      res.json({id: this.lastID, status: 'created'});
    }
  );
});

// Tools API
app.get('/api/tools', (req, res) => {
  db.all("SELECT * FROM tools ORDER BY category, name", [], (e, r) => {
    if (e) return res.status(500).json({error: e.message});
    res.json(r || []);
  });
});

app.post('/api/tools', (req, res) => {
  const {name, description, url, category} = req.body;
  db.run(
    "INSERT INTO tools (name, description, url, category) VALUES (?, ?, ?, ?)",
    [name, description, url || '', category || 'general'],
    function(e) {
      if (e) return res.status(500).json({error: e.message});
      res.json({id: this.lastID, status: 'created'});
    }
  );
});

app.post('/api/tools/:id/error', (req, res) => {
  const {error_message} = req.body;
  db.run(
    "UPDATE tools SET error_count = error_count + 1, last_error = ?, last_updated = CURRENT_TIMESTAMP WHERE id=?",
    [error_message || 'Unknown error', req.params.id],
    function(e) {
      if (e) return res.status(500).json({error: e.message});
      res.json({updated: this.changes});
    }
  );
});

app.patch('/api/tools/:id', (req, res) => {
  const {status} = req.body;
  db.run("UPDATE tools SET status=?, last_updated=CURRENT_TIMESTAMP WHERE id=?", 
    [status, req.params.id], function(e) {
      if (e) return res.status(500).json({error: e.message});
      res.json({updated: this.changes});
    }
  );
});

// Bot logs API
app.get('/api/bot-logs', (req, res) => {
  const {bot_name, level} = req.query;
  let query = "SELECT * FROM bot_logs WHERE 1=1";
  let params = [];
  
  if (bot_name) {
    query += " AND bot_name=?";
    params.push(bot_name);
  }
  if (level) {
    query += " AND level=?";
    params.push(level);
  }
  query += " ORDER BY timestamp DESC LIMIT 100";
  
  db.all(query, params, (e, r) => {
    if (e) return res.status(500).json({error: e.message});
    res.json(r || []);
  });
});

app.post('/api/bot-logs', (req, res) => {
  const {bot_name, level, message} = req.body;
  db.run(
    "INSERT INTO bot_logs (bot_name, level, message) VALUES (?, ?, ?)",
    [bot_name, level || 'info', message],
    function(e) {
      if (e) return res.status(500).json({error: e.message});
      res.json({id: this.lastID, status: 'created'});
    }
  );
});

// Start server
app.listen(PORT, () => console.log(`Crovest API on port ${PORT}`));
