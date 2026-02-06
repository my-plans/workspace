import asyncio
import os
import glob
from datetime import datetime
from typing import List, Set
from fastapi import WebSocket

class LogStreamer:
    def __init__(self, log_dir: str = None):
        self.log_dir = log_dir or os.path.expanduser("~/logs")
        self.connections: Set[WebSocket] = set()
        self.file_positions = {}
        self.running = False
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.add(websocket)
        # Send initial connection message
        await websocket.send_json({
            "type": "system",
            "message": "Connected to log stream",
            "timestamp": datetime.now().isoformat()
        })
        
    def disconnect(self, websocket: WebSocket):
        self.connections.discard(websocket)
        
    async def broadcast(self, message: dict):
        disconnected = set()
        for conn in self.connections:
            try:
                await conn.send_json(message)
            except:
                disconnected.add(conn)
        self.connections -= disconnected
        
    def get_log_files(self):
        if not os.path.exists(self.log_dir):
            return []
        return glob.glob(os.path.join(self.log_dir, "*.log"))
        
    async def tail_logs(self):
        self.running = True
        while self.running:
            try:
                log_files = self.get_log_files()
                for log_file in log_files:
                    await self.read_new_lines(log_file)
                await asyncio.sleep(1)  # Check every second
            except Exception as e:
                print(f"Error tailing logs: {e}")
                await asyncio.sleep(5)
                
    async def read_new_lines(self, filepath: str):
        try:
            current_size = os.path.getsize(filepath)
            last_pos = self.file_positions.get(filepath, 0)
            
            if current_size < last_pos:
                # File was rotated/truncated
                last_pos = 0
                
            if current_size > last_pos:
                with open(filepath, 'r') as f:
                    f.seek(last_pos)
                    new_lines = f.readlines()
                    self.file_positions[filepath] = f.tell()
                    
                for line in new_lines:
                    line = line.strip()
                    if line:
                        parsed = self.parse_log_line(line, os.path.basename(filepath))
                        await self.broadcast(parsed)
        except FileNotFoundError:
            pass
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
            
    def parse_log_line(self, line: str, source: str) -> dict:
        # Try to parse standard log formats
        timestamp = datetime.now().isoformat()
        level = "INFO"
        message = line
        
        # Simple heuristic parsing
        line_lower = line.lower()
        if "error" in line_lower:
            level = "ERROR"
        elif "warn" in line_lower:
            level = "WARNING"
        elif "debug" in line_lower:
            level = "DEBUG"
        elif "critical" in line_lower or "fatal" in line_lower:
            level = "CRITICAL"
            
        # Try to extract timestamp if present
        if line.startswith("20") and " " in line:
            # Likely starts with date
            parts = line.split(" ", 2)
            if len(parts) >= 2:
                timestamp = parts[0] + " " + parts[1][:8] if ":" in parts[1] else timestamp
                if len(parts) > 2:
                    message = parts[2]
                    
        return {
            "type": "log",
            "timestamp": timestamp,
            "level": level,
            "source": source,
            "message": message
        }

log_streamer = LogStreamer()
