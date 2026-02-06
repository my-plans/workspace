const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 8000;
const DB_PATH = path.join(__dirname, '..', 'crovest.db');

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, status TEXT DEFAULT 'active', priority INTEGER DEFAULT 3, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS decisions (id INTEGER PRIMARY KEY AUTOINCREMENT, decision TEXT, context TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS bot_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, bot_name TEXT, level TEXT, message TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
});

app.get('/health', (req, res) => res.json({status: 'ok', time: new Date().toISOString()}));
app.get('/api/dashboard', (req, res) => {
  db.all("SELECT COUNT(*) as c FROM todos WHERE status='active'", [], (e1, r1) => {
    db.all("SELECT COUNT(*) as c FROM decisions", [], (e2, r2) => {
      res.json({active_todos: r1[0]?.c||0, pending_decisions: r2[0]?.c||0, timestamp: new Date().toISOString()});
    });
  });
});
app.get('/api/todos', (req, res) => db.all("SELECT * FROM todos ORDER BY priority", [], (e,r) => res.json(r||[])));
app.post('/api/todos', (req, res) => {
  const {title, priority} = req.body;
  db.run("INSERT INTO todos (title, priority) VALUES (?, ?)", [title, priority||3], function(e) {
    res.json({id: this.lastID, status: 'created'});
  });
});
app.listen(PORT, () => console.log(`Crovest API on port ${PORT}`));
