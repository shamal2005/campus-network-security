from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey
from ..database import Base


def utc_now():
    return datetime.now(timezone.utc)


class IncidentModel(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    attack_type = Column(String, nullable=False, index=True)  # 'PORT_SCAN' | 'DOS_FLOOD' | 'BRUTE_FORCE'
    severity = Column(String, nullable=False, index=True)     # 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    status = Column(String, default="NEW", index=True)        # 'NEW' | 'INVESTIGATING' | 'MITIGATION_PROPOSED' | 'MITIGATED' | 'RESOLVED'
    detected_at = Column(String, nullable=False)
    source_ip = Column(String, nullable=False, index=True)
    destination_ip = Column(String, nullable=False)
    source_vlan = Column(String, nullable=False)
    target_vlan = Column(String, nullable=False)
    time_window = Column(String, nullable=False)
    metrics_json = Column(Text, nullable=False)
    raw_summary = Column(Text, nullable=False)
    ai_summary = Column(Text, nullable=False)
    ai_impact = Column(Text, nullable=False)
    ai_recommended_action = Column(Text, nullable=False)
    is_ai_generated = Column(Boolean, default=False)
    ai_provider = Column(String, default="Offline Rule-Based Engine")
    
    # Mitigation and verification state
    cisco_command = Column(Text, nullable=True)
    router_interface = Column(String, nullable=True)
    acl_name = Column(String, nullable=True)
    acl_direction = Column(String, default="in")
    verified_at = Column(String, nullable=True)
    verified_by = Column(String, nullable=True)
    verification_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)


class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=True, index=True)
    action = Column(String, nullable=False)  # 'INCIDENT_CREATED' | 'STATUS_CHANGED' | 'ACL_GENERATED' | 'VERIFIED'
    details = Column(Text, nullable=False)
    performed_by = Column(String, default="Security Administrator")
    timestamp = Column(DateTime, default=utc_now)
