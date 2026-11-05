import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.db import IncidentModel, AuditLogModel
from ..models.schemas import RuleExplanation
from ..services.gemini_ai import generate_gemini_explanation
from ..services.cisco_acl import generate_cisco_acl_script, validate_cisco_acl_syntax

router = APIRouter(prefix="/api/incidents", tags=["Incident Management"])


def utc_now():
    return datetime.now(timezone.utc)


class StatusUpdateRequest(BaseModel):
    status: str  # 'NEW' | 'INVESTIGATING' | 'MITIGATION_PROPOSED' | 'MITIGATED' | 'RESOLVED'
    notes: Optional[str] = None
    performed_by: Optional[str] = "Security Administrator"


class MitigationSaveRequest(BaseModel):
    router_interface: str
    acl_name: str
    direction: str = "in"
    cisco_command: str


class GenerateAclRequest(BaseModel):
    router_interface: Optional[str] = None
    direction: Optional[str] = "in"
    acl_name: Optional[str] = None


class CiscoSyntaxCheckRequest(BaseModel):
    commands: str


class VerificationRequest(BaseModel):
    notes: str
    verified_by: Optional[str] = "Security Administrator"


def format_incident_dict(inc: IncidentModel):
    """Converts an IncidentModel ORM instance to a frontend-compatible dictionary."""
    metrics = []
    if inc.metrics_json:
        try:
            metrics = json.loads(inc.metrics_json)
        except Exception:
            metrics = []

    return {
        "id": inc.id,
        "title": inc.title,
        "attack_type": inc.attack_type,
        "severity": inc.severity,
        "status": inc.status,
        "detected_at": inc.detected_at,
        "source_ip": inc.source_ip,
        "destination_ip": inc.destination_ip,
        "evidence": {
            "source_ip": inc.source_ip,
            "destination_ip": inc.destination_ip,
            "source_vlan": inc.source_vlan,
            "target_vlan": inc.target_vlan,
            "time_window": inc.time_window,
            "metrics": metrics,
            "raw_summary": inc.raw_summary,
        },
        "ai_explanation": {
            "summary": inc.ai_summary,
            "impact": inc.ai_impact,
            "recommended_action": inc.ai_recommended_action,
            "is_ai_generated": inc.is_ai_generated,
            "provider": inc.ai_provider,
        },
        "mitigation": {
            "acl_name": inc.acl_name or "BLOCK_ATTACKER_VLAN10",
            "router_interface": inc.router_interface or "GigabitEthernet0/0.10",
            "direction": inc.acl_direction or "in",
            "cisco_command": inc.cisco_command or "",
            "verified_at": inc.verified_at,
            "verified_by": inc.verified_by,
            "verification_notes": inc.verification_notes,
        },
        "created_at": inc.created_at.isoformat() if inc.created_at else None,
        "updated_at": inc.updated_at.isoformat() if inc.updated_at else None,
    }


@router.get("")
def list_incidents(
    severity: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    attack_type: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """Retrieves all security incidents with optional filtering and search."""
    query = db.query(IncidentModel)

    if severity and severity.upper() != "ALL":
        query = query.filter(IncidentModel.severity == severity.upper())

    if status and status.upper() != "ALL":
        query = query.filter(IncidentModel.status == status.upper())

    if attack_type and attack_type.upper() != "ALL":
        query = query.filter(IncidentModel.attack_type == attack_type.upper())

    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            (IncidentModel.id.ilike(search_filter))
            | (IncidentModel.source_ip.ilike(search_filter))
            | (IncidentModel.title.ilike(search_filter))
        )

    incidents = query.order_by(IncidentModel.created_at.desc()).all()
    return [format_incident_dict(inc) for inc in incidents]


@router.get("/{incident_id}")
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    """Retrieves detailed information for a single incident, including its audit trail."""
    incident = db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")

    audit_logs = (
        db.query(AuditLogModel)
        .filter(AuditLogModel.incident_id == incident_id)
        .order_by(AuditLogModel.timestamp.desc())
        .all()
    )

    data = format_incident_dict(incident)
    data["audit_history"] = [
        {
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "performed_by": log.performed_by,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        }
        for log in audit_logs
    ]
    return data


@router.patch("/{incident_id}/status")
def update_incident_status(
    incident_id: str,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_db),
):
    """Updates the lifecycle status of an incident and writes an audit record."""
    valid_statuses = ["NEW", "INVESTIGATING", "MITIGATION_PROPOSED", "MITIGATED", "RESOLVED"]
    target_status = payload.status.upper()
    if target_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Must be one of {valid_statuses}.",
        )

    incident = db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")

    old_status = incident.status
    incident.status = target_status
    incident.updated_at = utc_now()

    details = f"Status changed from {old_status} to {target_status}."
    if payload.notes:
        details += f" Notes: {payload.notes}"

    audit = AuditLogModel(
        incident_id=incident_id,
        action="STATUS_CHANGED",
        details=details,
        performed_by=payload.performed_by or "Security Administrator",
    )
    db.add(audit)
    db.commit()

    return {
        "incident_id": incident_id,
        "old_status": old_status,
        "new_status": target_status,
        "message": f"Incident {incident_id} status updated to {target_status}.",
    }


@router.post("/{incident_id}/mitigation")
def save_mitigation_command(
    incident_id: str,
    payload: MitigationSaveRequest,
    db: Session = Depends(get_db),
):
    """Saves generated Cisco Extended ACL commands to the incident."""
    incident = db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")

    incident.router_interface = payload.router_interface
    incident.acl_name = payload.acl_name
    incident.acl_direction = payload.direction
    incident.cisco_command = payload.cisco_command
    if incident.status == "NEW":
        incident.status = "MITIGATION_PROPOSED"
    incident.updated_at = utc_now()

    audit = AuditLogModel(
        incident_id=incident_id,
        action="ACL_GENERATED",
        details=f"Generated Cisco Extended ACL '{payload.acl_name}' bound to {payload.router_interface} ({payload.direction}).",
        performed_by="Mitigation Engine",
    )
    db.add(audit)
    db.commit()

    return {"message": "Mitigation configuration saved successfully.", "incident_id": incident_id}


@router.post("/{incident_id}/verify")
def record_mitigation_verification(
    incident_id: str,
    payload: VerificationRequest,
    db: Session = Depends(get_db),
):
    """Records manual verification of the applied ACL in Cisco Packet Tracer."""
    incident = db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")

    incident.verified_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    incident.verified_by = payload.verified_by or "Security Administrator"
    incident.verification_notes = payload.notes
    incident.status = "MITIGATED"
    incident.updated_at = utc_now()

    audit = AuditLogModel(
        incident_id=incident_id,
        action="MITIGATION_VERIFIED",
        details=f"Manually tested and verified in Cisco Packet Tracer. Notes: {payload.notes}",
        performed_by=incident.verified_by,
    )
    db.add(audit)
    db.commit()

    return {
        "message": "Mitigation verification successfully recorded.",
        "incident_id": incident_id,
        "status": "MITIGATED",
        "verified_at": incident.verified_at,
    }


@router.post("/{incident_id}/explain-gemini")
async def trigger_gemini_analysis(
    incident_id: str,
    db: Session = Depends(get_db),
):
    """
    Triggers on-demand AI analysis using Google Gemini.
    Gracefully reverts to offline rule-based explanation if the API key is not configured or fails.
    """
    incident = db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")

    metrics = []
    if incident.metrics_json:
        try:
            metrics = json.loads(incident.metrics_json)
        except Exception:
            metrics = []

    fallback_explanation = RuleExplanation(
        summary=incident.ai_summary or f"Suspicious activity detected from {incident.source_ip}.",
        impact=incident.ai_impact or "Potential disruption to campus network services.",
        recommended_action=incident.ai_recommended_action or "Apply Cisco Extended ACL to isolate host.",
        is_ai_generated=False,
        provider="Offline Rule-Based Engine",
    )

    evidence_dict = {
        "source_ip": incident.source_ip,
        "destination_ip": incident.destination_ip,
        "source_vlan": incident.source_vlan,
        "target_vlan": incident.target_vlan,
        "time_window": incident.time_window,
        "raw_summary": incident.raw_summary,
        "metrics": metrics,
    }

    ai_result = await generate_gemini_explanation(
        attack_type=incident.attack_type,
        source_ip=incident.source_ip,
        destination_ip=incident.destination_ip,
        evidence=evidence_dict,
        fallback=fallback_explanation,
    )

    incident.ai_summary = ai_result.summary
    incident.ai_impact = ai_result.impact
    incident.ai_recommended_action = ai_result.recommended_action
    incident.is_ai_generated = ai_result.is_ai_generated
    incident.ai_provider = ai_result.provider
    incident.updated_at = utc_now()

    audit = AuditLogModel(
        incident_id=incident_id,
        action="AI_EXPLANATION_GENERATED",
        details=f"Analysis executed via {ai_result.provider} (AI Generated: {ai_result.is_ai_generated}).",
        performed_by=ai_result.provider,
    )
    db.add(audit)
    db.commit()

    return format_incident_dict(incident)


@router.post("/{incident_id}/generate-acl")
def generate_mitigation_acl(
    incident_id: str,
    payload: Optional[GenerateAclRequest] = None,
    db: Session = Depends(get_db),
):
    """
    Generates tailored Cisco Extended ACL commands for Packet Tracer mitigation,
    saving the configuration to the incident and returning complete deployment and testing steps.
    """
    incident = db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")

    # Determine default subinterface based on source VLAN
    default_iface = "GigabitEthernet0/0.10"
    if incident.source_vlan and "20" in incident.source_vlan:
        default_iface = "GigabitEthernet0/0.20"
    elif incident.source_vlan and "30" in incident.source_vlan:
        default_iface = "GigabitEthernet0/0.30"

    chosen_iface = (payload.router_interface if payload and payload.router_interface else incident.router_interface) or default_iface
    chosen_direction = (payload.direction if payload and payload.direction else incident.acl_direction) or "in"
    chosen_acl_name = (payload.acl_name if payload and payload.acl_name else incident.acl_name) or None

    acl_plan = generate_cisco_acl_script(
        source_ip=incident.source_ip,
        destination_ip=incident.destination_ip,
        attack_type=incident.attack_type,
        router_interface=chosen_iface,
        acl_direction=chosen_direction,
        acl_name=chosen_acl_name,
        incident_id=incident.id,
    )

    incident.router_interface = chosen_iface
    incident.acl_direction = chosen_direction
    incident.acl_name = acl_plan["acl_name"]
    incident.cisco_command = acl_plan["commands"]
    if incident.status == "NEW":
        incident.status = "MITIGATION_PROPOSED"
    incident.updated_at = utc_now()

    audit = AuditLogModel(
        incident_id=incident_id,
        action="ACL_CONFIGURED",
        details=f"Generated Cisco Extended ACL '{acl_plan['acl_name']}' for {chosen_iface} ({chosen_direction}).",
        performed_by="Mitigation Engine",
    )
    db.add(audit)
    db.commit()

    return {
        "incident_id": incident.id,
        "acl_plan": acl_plan,
        "incident": format_incident_dict(incident),
    }


@router.post("/validate-acl")
def validate_acl_endpoint(payload: CiscoSyntaxCheckRequest):
    """Validates arbitrary Cisco Extended ACL commands against campus topology syntax standards."""
    return validate_cisco_acl_syntax(payload.commands)

