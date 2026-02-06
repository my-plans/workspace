from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Task(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = ""
    status: str = "todo"  # todo, in_progress, done
    priority: str = "medium"  # low, medium, high
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    status: str = "todo"
    priority: str = "medium"

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None

class Client(BaseModel):
    id: Optional[int] = None
    name: str
    email: Optional[str] = ""
    project_status: str = "active"  # active, on_hold, completed
    last_contact: Optional[str] = None
    notes: Optional[str] = ""
    created_at: Optional[str] = None

class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    project_status: str = "active"
    last_contact: Optional[str] = None
    notes: Optional[str] = ""

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    project_status: Optional[str] = None
    last_contact: Optional[str] = None
    notes: Optional[str] = None

class Objective(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = ""
    deadline: Optional[str] = None
    progress: int = 0
    month: int
    year: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class ObjectiveCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    deadline: Optional[str] = None
    progress: int = 0
    month: int
    year: int

class ObjectiveUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[str] = None
    progress: Optional[int] = None

class HealthLog(BaseModel):
    id: Optional[int] = None
    bot_name: str
    status: str = "offline"  # online, offline, error
    last_seen: Optional[str] = None
    uptime_seconds: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class HealthLogCreate(BaseModel):
    bot_name: str
    status: str
    uptime_seconds: int = 0

class LogEntry(BaseModel):
    timestamp: str
    level: str
    source: str
    message: str
