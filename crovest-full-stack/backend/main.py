from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import asyncio
from datetime import datetime
import os

from database import get_db_connection, init_database, seed_sample_data
from models import (
    Task, TaskCreate, TaskUpdate,
    Client, ClientCreate, ClientUpdate,
    Objective, ObjectiveCreate, ObjectiveUpdate,
    HealthLog, HealthLogCreate
)
from websocket import log_streamer

# Path to frontend build
FRONTEND_BUILD_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_database()
    seed_sample_data()
    # Start log tailing in background
    asyncio.create_task(log_streamer.tail_logs())
    yield
    # Shutdown
    log_streamer.running = False

app = FastAPI(title="Crovest Command Center", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket endpoint
@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    await log_streamer.connect(websocket)
    try:
        while True:
            # Keep connection alive, handle client messages if needed
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except:
        log_streamer.disconnect(websocket)

# Health check
@app.get("/api/health")
def get_health():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM health_logs ORDER BY last_seen DESC")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r["id"], "bot_name": r["bot_name"], "status": r["status"],
             "last_seen": r["last_seen"], "uptime_seconds": r["uptime_seconds"]} for r in rows]

@app.post("/api/health/log")
def log_health(entry: HealthLogCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO health_logs (bot_name, status, last_seen, uptime_seconds)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(bot_name) DO UPDATE SET
            status = excluded.status,
            last_seen = excluded.last_seen,
            uptime_seconds = excluded.uptime_seconds,
            updated_at = ?
    """, (entry.bot_name, entry.status, now, entry.uptime_seconds, now))
    conn.commit()
    conn.close()
    return {"status": "ok"}

# Tasks endpoints
@app.get("/api/tasks")
def get_tasks():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/tasks")
def create_task(task: TaskCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO tasks (title, description, status, priority)
        VALUES (?, ?, ?, ?)
    """, (task.title, task.description, task.status, task.priority))
    conn.commit()
    task_id = cursor.lastrowid
    conn.close()
    return {"id": task_id, **task.dict()}

@app.put("/api/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    updates = []
    values = []
    if task.title is not None:
        updates.append("title = ?")
        values.append(task.title)
    if task.description is not None:
        updates.append("description = ?")
        values.append(task.description)
    if task.status is not None:
        updates.append("status = ?")
        values.append(task.status)
    if task.priority is not None:
        updates.append("priority = ?")
        values.append(task.priority)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = CURRENT_TIMESTAMP")
    values.append(task_id)
    
    cursor.execute(f"UPDATE tasks SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    conn.close()
    return {"id": task_id, **task.dict(exclude_unset=True)}

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}

# Clients endpoints
@app.get("/api/clients")
def get_clients():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clients ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/clients")
def create_client(client: ClientCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO clients (name, email, project_status, last_contact, notes)
        VALUES (?, ?, ?, ?, ?)
    """, (client.name, client.email, client.project_status, client.last_contact, client.notes))
    conn.commit()
    client_id = cursor.lastrowid
    conn.close()
    return {"id": client_id, **client.dict()}

@app.put("/api/clients/{client_id}")
def update_client(client_id: int, client: ClientUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    updates = []
    values = []
    if client.name is not None:
        updates.append("name = ?")
        values.append(client.name)
    if client.email is not None:
        updates.append("email = ?")
        values.append(client.email)
    if client.project_status is not None:
        updates.append("project_status = ?")
        values.append(client.project_status)
    if client.last_contact is not None:
        updates.append("last_contact = ?")
        values.append(client.last_contact)
    if client.notes is not None:
        updates.append("notes = ?")
        values.append(client.notes)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    values.append(client_id)
    cursor.execute(f"UPDATE clients SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    conn.close()
    return {"id": client_id, **client.dict(exclude_unset=True)}

@app.delete("/api/clients/{client_id}")
def delete_client(client_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM clients WHERE id = ?", (client_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}

# Objectives endpoints
@app.get("/api/objectives")
def get_objectives(month: int = None, year: int = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if month and year:
        cursor.execute("SELECT * FROM objectives WHERE month = ? AND year = ? ORDER BY deadline", (month, year))
    else:
        cursor.execute("SELECT * FROM objectives ORDER BY year DESC, month DESC, deadline")
    
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/objectives")
def create_objective(obj: ObjectiveCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO objectives (title, description, deadline, progress, month, year)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (obj.title, obj.description, obj.deadline, obj.progress, obj.month, obj.year))
    conn.commit()
    obj_id = cursor.lastrowid
    conn.close()
    return {"id": obj_id, **obj.dict()}

@app.put("/api/objectives/{obj_id}")
def update_objective(obj_id: int, obj: ObjectiveUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    updates = []
    values = []
    if obj.title is not None:
        updates.append("title = ?")
        values.append(obj.title)
    if obj.description is not None:
        updates.append("description = ?")
        values.append(obj.description)
    if obj.deadline is not None:
        updates.append("deadline = ?")
        values.append(obj.deadline)
    if obj.progress is not None:
        updates.append("progress = ?")
        values.append(obj.progress)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = CURRENT_TIMESTAMP")
    values.append(obj_id)
    
    cursor.execute(f"UPDATE objectives SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    conn.close()
    return {"id": obj_id, **obj.dict(exclude_unset=True)}

@app.delete("/api/objectives/{obj_id}")
def delete_objective(obj_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM objectives WHERE id = ?", (obj_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}

# Mount static files from frontend build
if os.path.exists(FRONTEND_BUILD_DIR):
    app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND_BUILD_DIR, "static")), name="static")

@app.get("/")
def serve_root():
    if os.path.exists(os.path.join(FRONTEND_BUILD_DIR, "index.html")):
        return FileResponse(os.path.join(FRONTEND_BUILD_DIR, "index.html"))
    return {"message": "Crovest Command Center API"}

@app.get("/{path:path}")
def serve_spa(path: str):
    # Serve index.html for all non-API routes (SPA support)
    if not path.startswith("api") and not path.startswith("ws"):
        index_file = os.path.join(FRONTEND_BUILD_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
