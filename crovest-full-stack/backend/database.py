import sqlite3
import os
from datetime import datetime

DATABASE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "crovest.db")

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Tasks table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done')),
            priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Clients table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            project_status TEXT DEFAULT 'active' CHECK(project_status IN ('active', 'on_hold', 'completed')),
            last_contact DATE,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Objectives table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS objectives (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            deadline DATE,
            progress INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Health logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS health_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot_name TEXT NOT NULL UNIQUE,
            status TEXT DEFAULT 'offline' CHECK(status IN ('online', 'offline', 'error')),
            last_seen TIMESTAMP,
            uptime_seconds INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()
    print("Database initialized successfully")

def seed_sample_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if already has data
    cursor.execute("SELECT COUNT(*) FROM tasks")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return
    
    # Sample tasks
    tasks = [
        ("Set up trading algorithm", "Initial configuration of the main trading bot", "done", "high"),
        ("Optimize backtesting module", "Improve performance of historical data analysis", "in_progress", "high"),
        ("Add risk management rules", "Implement stop-loss and position sizing", "todo", "medium"),
        ("Update API documentation", "Document all endpoints for client integration", "todo", "low"),
    ]
    cursor.executemany(
        "INSERT INTO tasks (title, description, status, priority) VALUES (?, ?, ?, ?)",
        tasks
    )
    
    # Sample clients
    clients = [
        ("Alpha Capital", "contact@alphacap.com", "active", "2025-02-01", "High volume client"),
        ("Beta Investments", "info@betainv.com", "active", "2025-02-05", "New client onboarding"),
        ("Gamma Trading", "ops@gammatrad.com", "on_hold", "2025-01-15", "Waiting for compliance"),
        ("Delta Fund", "admin@deltafund.com", "completed", "2025-01-30", "Project delivered"),
    ]
    cursor.executemany(
        "INSERT INTO clients (name, email, project_status, last_contact, notes) VALUES (?, ?, ?, ?, ?)",
        clients
    )
    
    # Sample objectives
    current_month = datetime.now().month
    current_year = datetime.now().year
    objectives = [
        ("Increase trading volume by 20%", "Target: $50M monthly volume", "2025-02-28", 65, current_month, current_year),
        ("Reduce latency to <10ms", "Optimize infrastructure", "2025-02-15", 40, current_month, current_year),
        ("Onboard 3 new clients", "Sales target for February", "2025-02-28", 33, current_month, current_year),
        ("Pass security audit", "Complete SOC2 compliance", "2025-02-20", 80, current_month, current_year),
    ]
    cursor.executemany(
        "INSERT INTO objectives (title, description, deadline, progress, month, year) VALUES (?, ?, ?, ?, ?, ?)",
        objectives
    )
    
    # Sample health data
    bots = [
        ("Main Trading Bot", "online", datetime.now().isoformat(), 86400 * 5),
        ("Risk Manager", "online", datetime.now().isoformat(), 86400 * 3),
        ("Data Feed Handler", "online", datetime.now().isoformat(), 86400 * 5),
        ("Backup Bot", "offline", "2025-02-04T10:00:00", 0),
        ("Reporting Service", "error", "2025-02-05T15:30:00", 3600),
    ]
    cursor.executemany(
        "INSERT INTO health_logs (bot_name, status, last_seen, uptime_seconds) VALUES (?, ?, ?, ?)",
        bots
    )
    
    conn.commit()
    conn.close()
    print("Sample data seeded")

if __name__ == "__main__":
    init_database()
    seed_sample_data()
