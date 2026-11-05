from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import init_db, get_db
from .models.db import AuditLogModel
from .routers import detection_router, incidents_router, settings_router
from .services.gemini_ai import is_gemini_configured

# Ensure tables and seed data exist on load
init_db()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Campus Network Security System - Threat Detection API",
    description="Backend API for ingesting simulated campus traffic CSV logs, applying Python threat detection rules, managing incidents in SQLite, and generating Cisco ACL mitigations.",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS to permit local React/Vite development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(detection_router)
app.include_router(incidents_router)
app.include_router(settings_router)


@app.get("/api/health", tags=["System Health"])
async def health_check():
    """Returns system status, active timestamp, and AI fallback status."""
    configured = is_gemini_configured()
    return {
        "status": "ONLINE",
        "service": "Campus Network Security Threat Engine",
        "timestamp": datetime.now().isoformat(),
        "database": "SQLite (campus_security.db)",
        "ai_engine": {
            "mode": "Google Gemini 1.5 Flash" if configured else "Offline Fallback Mode (Rule-Based)",
            "gemini_api_configured": configured,
        },
        "simulation_environment": "Cisco Packet Tracer Campus Lab (VLAN 10, 20, 30)",
    }


@app.get("/api/audit-logs", tags=["Audit Trail"])
def get_all_audit_logs(limit: int = 50, db: Session = Depends(get_db)):
    """Returns global system audit logs sorted by newest first."""
    logs = db.query(AuditLogModel).order_by(AuditLogModel.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "incident_id": log.incident_id,
            "action": log.action,
            "details": log.details,
            "performed_by": log.performed_by,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        }
        for log in logs
    ]
