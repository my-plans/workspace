const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_D7tgkMPZw4KJ@ep-falling-field-aiaz8s71-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

// Initialize database tables
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        priority INTEGER DEFAULT 3,
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS decisions (
        id SERIAL PRIMARY KEY,
        decision TEXT NOT NULL,
        context TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_logs (
        id SERIAL PRIMARY KEY,
        bot_name TEXT,
        level TEXT,
        message TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS objectives (
        id SERIAL PRIMARY KEY,
        month INTEGER,
        year INTEGER,
        title TEXT,
        description TEXT,
        status TEXT DEFAULT 'active',
        progress INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS costs (
        id SERIAL PRIMARY KEY,
        category TEXT,
        description TEXT,
        amount REAL,
        estimated_amount REAL,
        month INTEGER,
        year INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS tools (
        id SERIAL PRIMARY KEY,
        name TEXT,
        description TEXT,
        status TEXT DEFAULT 'active',
        url TEXT,
        category TEXT,
        error_count INTEGER DEFAULT 0,
        last_error TEXT,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS habits (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        frequency TEXT DEFAULT 'daily',
        streak INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS habit_logs (
        id SERIAL PRIMARY KEY,
        habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE,
        completed_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(habit_id, completed_date)
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS habits (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        frequency TEXT DEFAULT 'daily',
        streak INTEGER DEFAULT 0,
        completed_today BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS habit_logs (
        id SERIAL PRIMARY KEY,
        habit_id INTEGER REFERENCES habits(id),
        date DATE DEFAULT CURRENT_DATE,
        completed BOOLEAN DEFAULT false
      )
    `);
    
    // Seed sample data if empty
    const todoCount = await client.query('SELECT COUNT(*) FROM todos');
    if (parseInt(todoCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO todos (title, description, status, priority) VALUES 
        ('Optimize backtesting module', 'Improve performance of historical data analysis', 'active', 1),
        ('Add risk management rules', 'Implement stop-loss and position sizing', 'active', 2),
        ('Update API documentation', 'Document all endpoints for client integration', 'active', 3),
        ('Deploy dashboard to Vercel', 'Make dashboard live and accessible', 'done', 1)
      `);
      
      await client.query(`
        INSERT INTO decisions (decision, context) VALUES 
        ('Use SQLite for MVP', 'Fastest to implement, will migrate to Postgres later'),
        ('Deploy on Vercel', 'Free tier, auto-deploy from GitHub'),
        ('Switch to Neon Postgres', 'Persistent database with free tier')
      `);
    }
    
    console.log('Database initialized');
  } finally {
    client.release();
  }
}

// Health check
app.get('/health', (req, res) => res.json({status: 'ok', time: new Date().toISOString()}));

// Dashboard stats
app.get('/api/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const todos = await pool.query("SELECT COUNT(*) as c FROM todos WHERE status='active'");
    const decisions = await pool.query("SELECT COUNT(*) as c FROM decisions");
    const costs = await pool.query("SELECT SUM(amount) as total FROM costs WHERE month=$1 AND year=$2", [currentMonth, currentYear]);
    const estimated = await pool.query("SELECT SUM(estimated_amount) as estimated FROM costs WHERE month=$1 AND year=$2", [currentMonth, currentYear]);
    const tools = await pool.query("SELECT COUNT(*) as c FROM tools WHERE status='active'");
    const errors = await pool.query("SELECT SUM(error_count) as errors FROM tools");
    
    res.json({
      active_todos: parseInt(todos.rows[0].c) || 0,
      pending_decisions: parseInt(decisions.rows[0].c) || 0,
      monthly_costs: parseFloat(costs.rows[0].total) || 0,
      estimated_costs: parseFloat(estimated.rows[0].estimated) || 0,
      active_tools: parseInt(tools.rows[0].c) || 0,
      total_errors: parseInt(errors.rows[0].errors) || 0,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Todos API
app.get('/api/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todos ORDER BY priority ASC, created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.post('/api/todos', async (req, res) => {
  const {title, description, priority, due_date} = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO todos (title, description, priority, due_date) VALUES ($1, $2, $3, $4) RETURNING id',
      [title, description || '', priority || 3, due_date || null]
    );
    res.json({id: result.rows[0].id, status: 'created'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.patch('/api/todos/:id', async (req, res) => {
  const {status} = req.body;
  try {
    const result = await pool.query('UPDATE todos SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
    res.json({updated: result.rowCount});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM todos WHERE id=$1', [req.params.id]);
    res.json({deleted: result.rowCount});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Objectives API
app.get('/api/objectives', async (req, res) => {
  const {month, year} = req.query;
  const now = new Date();
  const targetMonth = month || (now.getMonth() + 1);
  const targetYear = year || now.getFullYear();
  
  try {
    const result = await pool.query(
      'SELECT * FROM objectives WHERE month=$1 AND year=$2 ORDER BY created_at DESC',
      [targetMonth, targetYear]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.post('/api/objectives', async (req, res) => {
  const {title, description, month, year} = req.body;
  const now = new Date();
  try {
    const result = await pool.query(
      'INSERT INTO objectives (title, description, month, year) VALUES ($1, $2, $3, $4) RETURNING id',
      [title, description, month || (now.getMonth() + 1), year || now.getFullYear()]
    );
    res.json({id: result.rows[0].id, status: 'created'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.patch('/api/objectives/:id', async (req, res) => {
  const {status, progress} = req.body;
  try {
    const result = await pool.query(
      'UPDATE objectives SET status=$1, progress=$2 WHERE id=$3 RETURNING *',
      [status, progress, req.params.id]
    );
    res.json({updated: result.rowCount});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Costs API
app.get('/api/costs', async (req, res) => {
  const {month, year} = req.query;
  const now = new Date();
  const targetMonth = month || (now.getMonth() + 1);
  const targetYear = year || now.getFullYear();
  
  try {
    const result = await pool.query(
      'SELECT * FROM costs WHERE month=$1 AND year=$2 ORDER BY category',
      [targetMonth, targetYear]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.post('/api/costs', async (req, res) => {
  const {category, description, amount, estimated_amount, month, year} = req.body;
  const now = new Date();
  try {
    const result = await pool.query(
      'INSERT INTO costs (category, description, amount, estimated_amount, month, year) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [category, description, amount || 0, estimated_amount || 0, month || (now.getMonth() + 1), year || now.getFullYear()]
    );
    res.json({id: result.rows[0].id, status: 'created'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.delete('/api/costs/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM costs WHERE id=$1', [req.params.id]);
    res.json({deleted: result.rowCount});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Habits API
app.get('/api/habits', async (req, res) => {
  try {
    // Get all habits with their completion status for the current week
    const result = await pool.query(`
      SELECT h.*, 
        COALESCE(json_agg(hl.completed_date) FILTER (WHERE hl.completed_date IS NOT NULL), '[]') as completed_dates
      FROM habits h
      LEFT JOIN habit_logs hl ON h.id = hl.habit_id 
        AND hl.completed_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY h.id
      ORDER BY h.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.post('/api/habits', async (req, res) => {
  const {name, description, frequency} = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO habits (name, description, frequency) VALUES ($1, $2, $3) RETURNING id',
      [name, description || '', frequency || 'daily']
    );
    res.json({id: result.rows[0].id, status: 'created'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.post('/api/habits/:id/checkin', async (req, res) => {
  const {date} = req.body;
  const checkDate = date || new Date().toISOString().split('T')[0];
  try {
    // Insert habit log
    await pool.query(
      'INSERT INTO habit_logs (habit_id, completed_date) VALUES ($1, $2) ON CONFLICT (habit_id, completed_date) DO NOTHING',
      [req.params.id, checkDate]
    );
    
    // Calculate new streak
    await pool.query(`
      UPDATE habits SET streak = (
        SELECT COUNT(DISTINCT completed_date) FROM habit_logs 
        WHERE habit_id = $1 
        AND completed_date >= CURRENT_DATE - INTERVAL '30 days'
      ) WHERE id = $1
    `, [req.params.id]);
    
    res.json({status: 'checked in'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.delete('/api/habits/:id/checkin', async (req, res) => {
  const {date} = req.body;
  const checkDate = date || new Date().toISOString().split('T')[0];
  try {
    await pool.query(
      'DELETE FROM habit_logs WHERE habit_id=$1 AND completed_date=$2',
      [req.params.id, checkDate]
    );
    
    // Recalculate streak
    await pool.query(`
      UPDATE habits SET streak = (
        SELECT COUNT(DISTINCT completed_date) FROM habit_logs 
        WHERE habit_id = $1 
        AND completed_date >= CURRENT_DATE - INTERVAL '30 days'
      ) WHERE id = $1
    `, [req.params.id]);
    
    res.json({status: 'unchecked'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.delete('/api/habits/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM habits WHERE id=$1', [req.params.id]);
    res.json({status: 'deleted'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Tools API
app.get('/api/tools', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tools ORDER BY category, name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.post('/api/tools', async (req, res) => {
  const {name, description, url, category} = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO tools (name, description, url, category) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, description, url || '', category || 'general']
    );
    res.json({id: result.rows[0].id, status: 'created'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.post('/api/tools/:id/error', async (req, res) => {
  const {error_message} = req.body;
  try {
    const result = await pool.query(
      'UPDATE tools SET error_count = error_count + 1, last_error = $1, last_updated = CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',
      [error_message || 'Unknown error', req.params.id]
    );
    res.json({updated: result.rowCount});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.patch('/api/tools/:id', async (req, res) => {
  const {status} = req.body;
  try {
    const result = await pool.query(
      'UPDATE tools SET status=$1, last_updated=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    res.json({updated: result.rowCount});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Bot logs API
app.get('/api/bot-logs', async (req, res) => {
  const {bot_name, level} = req.query;
  let query = 'SELECT * FROM bot_logs WHERE 1=1';
  let params = [];
  let paramCount = 0;
  
  if (bot_name) {
    paramCount++;
    query += ` AND bot_name=$${paramCount}`;
    params.push(bot_name);
  }
  if (level) {
    paramCount++;
    query += ` AND level=$${paramCount}`;
    params.push(level);
  }
  query += ' ORDER BY timestamp DESC LIMIT 100';
  
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.post('/api/bot-logs', async (req, res) => {
  const {bot_name, level, message} = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO bot_logs (bot_name, level, message) VALUES ($1, $2, $3) RETURNING id',
      [bot_name, level || 'info', message]
    );
    res.json({id: result.rows[0].id, status: 'created'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Habits API
app.get('/api/habits', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM habits ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.post('/api/habits', async (req, res) => {
  const {name, frequency} = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO habits (name, frequency) VALUES ($1, $2) RETURNING id',
      [name, frequency || 'daily']
    );
    res.json({id: result.rows[0].id, status: 'created'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.post('/api/habits/:id/complete', async (req, res) => {
  const {date} = req.body;
  const habitId = req.params.id;
  try {
    // Mark habit as completed for today
    await pool.query(
      'INSERT INTO habit_logs (habit_id, date, completed) VALUES ($1, $2, true) ON CONFLICT (habit_id, date) DO UPDATE SET completed=true',
      [habitId, date || new Date().toISOString().split('T')[0]]
    );
    
    // Update streak
    await pool.query(
      'UPDATE habits SET streak = streak + 1, completed_today = true WHERE id = $1',
      [habitId]
    );
    
    res.json({status: 'completed'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.delete('/api/habits/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM habit_logs WHERE habit_id = $1', [req.params.id]);
    await pool.query('DELETE FROM habits WHERE id = $1', [req.params.id]);
    res.json({deleted: 1});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Habits API
app.get('/api/habits', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM habits ORDER BY created_at DESC');
    const habits = result.rows;
    
    // Get completion data for current week
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    for (let habit of habits) {
      const logs = await pool.query(
        'SELECT completed_date FROM habit_logs WHERE habit_id=$1 AND completed_date >= $2',
        [habit.id, weekStart.toISOString().split('T')[0]]
      );
      habit.week_completion = {};
      days.forEach(d => habit.week_completion[d] = false);
      logs.rows.forEach(log => {
        const dayIdx = new Date(log.completed_date).getDay();
        habit.week_completion[days[dayIdx]] = true;
      });
    }
    
    res.json(habits);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.post('/api/habits', async (req, res) => {
  const {name, description} = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO habits (name, description) VALUES ($1, $2) RETURNING id',
      [name, description || '']
    );
    res.json({id: result.rows[0].id, status: 'created'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.delete('/api/habits/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM habit_logs WHERE habit_id=$1', [req.params.id]);
    const result = await pool.query('DELETE FROM habits WHERE id=$1', [req.params.id]);
    res.json({deleted: result.rowCount});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.post('/api/habits/:id/toggle', async (req, res) => {
  const {day} = req.body; // day is 'mon', 'tue', etc.
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayIdx = days.indexOf(day);
  if (dayIdx === -1) return res.status(400).json({error: 'Invalid day'});
  
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() - (today.getDay() - dayIdx));
  const dateStr = targetDate.toISOString().split('T')[0];
  
  try {
    // Check if already completed
    const existing = await pool.query(
      'SELECT id FROM habit_logs WHERE habit_id=$1 AND completed_date=$2',
      [req.params.id, dateStr]
    );
    
    if (existing.rows.length > 0) {
      // Delete (uncomplete)
      await pool.query('DELETE FROM habit_logs WHERE id=$1', [existing.rows[0].id]);
      // Update streak
      await pool.query('UPDATE habits SET streak = GREATEST(0, streak - 1) WHERE id=$1', [req.params.id]);
    } else {
      // Add completion
      await pool.query(
        'INSERT INTO habit_logs (habit_id, completed_date) VALUES ($1, $2)',
        [req.params.id, dateStr]
      );
      // Update streak
      await pool.query('UPDATE habits SET streak = streak + 1 WHERE id=$1', [req.params.id]);
    }
    
    res.json({status: 'toggled'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.delete('/api/objectives/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM objectives WHERE id=$1', [req.params.id]);
    res.json({deleted: result.rowCount});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Start server
initDB().then(() => {
  app.listen(PORT, () => console.log(`Crovest API on port ${PORT}`));
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
