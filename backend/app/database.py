import os
import json
from pathlib import Path
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Database file in backend root
DB_PATH = Path(__file__).resolve().parent.parent / "campus_security.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initializes tables and seeds initial campus demonstration incidents if empty."""
    from .models.db import IncidentModel, AuditLogModel

    Base.metadata.create_all(bind=engine)

    # Seed baseline incidents if table is empty
    db = SessionLocal()
    try:
        existing_count = db.query(IncidentModel).count()
        if existing_count == 0:
            seed_initial_incidents(db)
    finally:
        db.close()


def seed_initial_incidents(db):
    """Seeds the 3 initial Packet Tracer demonstration incidents into SQLite."""
    from .models.db import IncidentModel, AuditLogModel

    initial_seeds = [
        {
            "id": "INC-2026-001",
            "title": "High-Volume Port Reconnaissance Detected",
            "attack_type": "PORT_SCAN",
            "severity": "HIGH",
            "status": "MITIGATION_PROPOSED",
            "detected_at": "2026-10-22 10:14:06",
            "source_ip": "192.168.10.45",
            "destination_ip": "192.168.30.10",
            "source_vlan": "VLAN 10 (Student Network)",
            "target_vlan": "VLAN 30 (Server Farm)",
            "time_window": "5 seconds",
            "metrics_json": json.dumps([
                {"label": "Distinct Ports Probed", "value": 16, "threshold": ">= 10 ports"},
                {"label": "Sample Ports Hit", "value": "21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 1433, 3306, 3389, 8080"},
                {"label": "Protocol", "value": "TCP SYN"},
            ]),
            "raw_summary": "Host 192.168.10.45 initiated TCP SYN connections to 16 distinct ports on target 192.168.30.10 within 5 seconds.",
            "ai_summary": "Host 192.168.10.45 is actively sweeping the campus server for open network services. This is a classic pre-attack reconnaissance phase used to discover vulnerable applications.",
            "ai_impact": "Allows an adversary to identify vulnerable services (such as unpatched SSH or Telnet) to target with exploit payloads.",
            "ai_recommended_action": "Apply an Extended Access Control List on the Student Gateway subinterface to restrict ingress traffic from 192.168.10.45.",
            "is_ai_generated": False,
            "ai_provider": "Offline Rule-Based Engine",
            "router_interface": "GigabitEthernet0/0.10",
            "acl_name": "BLOCK_ATTACKER_VLAN10",
            "acl_direction": "in",
            "cisco_command": """configure terminal
ip access-list extended BLOCK_ATTACKER_VLAN10
 remark Block suspicious source IP: 192.168.10.45
 deny ip host 192.168.10.45 any
 permit ip any any
exit
interface GigabitEthernet0/0.10
 ip access-group BLOCK_ATTACKER_VLAN10 in
end
write memory""",
        },
        {
            "id": "INC-2026-002",
            "title": "DoS-Like Volumetric Traffic Spike",
            "attack_type": "DOS_FLOOD",
            "severity": "CRITICAL",
            "status": "INVESTIGATING",
            "detected_at": "2026-10-22 11:30:30",
            "source_ip": "192.168.10.45",
            "destination_ip": "192.168.30.10",
            "source_vlan": "VLAN 10 (Student Network)",
            "target_vlan": "VLAN 30 (Server Farm)",
            "time_window": "30 seconds",
            "metrics_json": json.dumps([
                {"label": "Total Packets Transmitted", "value": "51,800 pkts", "threshold": ">= 4,000 pkts"},
                {"label": "Total Data Volume", "value": "31.62 MB", "threshold": ">= 4.8 MB"},
                {"label": "Estimated Packet Rate", "value": "1,726 pkts/sec"},
            ]),
            "raw_summary": "Host 192.168.10.45 generated a volumetric traffic spike of 51,800 packets (31.62 MB) towards 192.168.30.10 within 30 seconds.",
            "ai_summary": "A sustained high-volume traffic surge (51,800 packets) was detected from 192.168.10.45 directed at 192.168.30.10. This signature is an indicator of potential Denial-of-Service (DoS) flooding.",
            "ai_impact": "High volumetric traffic can exhaust server socket queues, saturate switch trunk links, and cause significant packet drop for legitimate student and faculty portals.",
            "ai_recommended_action": "Apply an Extended ACL on the router gateway interface for VLAN 10 to immediately drop packets from source 192.168.10.45.",
            "is_ai_generated": False,
            "ai_provider": "Offline Rule-Based Engine",
            "router_interface": "GigabitEthernet0/0.10",
            "acl_name": "BLOCK_ATTACKER_VLAN10",
            "acl_direction": "in",
            "cisco_command": """configure terminal
ip access-list extended BLOCK_ATTACKER_VLAN10
 deny ip host 192.168.10.45 any
 permit ip any any
exit
interface GigabitEthernet0/0.10
 ip access-group BLOCK_ATTACKER_VLAN10 in
end
write memory""",
        },
        {
            "id": "INC-2026-003",
            "title": "SSH / Service Brute-Force Attack",
            "attack_type": "BRUTE_FORCE",
            "severity": "HIGH",
            "status": "NEW",
            "detected_at": "2026-10-22 14:05:19",
            "source_ip": "192.168.10.45",
            "destination_ip": "192.168.30.10",
            "source_vlan": "VLAN 10 (Student Network)",
            "target_vlan": "VLAN 30 (Server Farm)",
            "time_window": "18 seconds",
            "metrics_json": json.dumps([
                {"label": "Failed Login Attempts", "value": 10, "threshold": ">= 5 failures"},
                {"label": "Targeted Service", "value": "SSH (Port 22)"},
                {"label": "Targeted User Accounts", "value": "admin, root, administrator, user, test, guest, faculty, sysadmin, oracle, support"},
            ]),
            "raw_summary": "Host 192.168.10.45 recorded 10 sequential authentication failures targeting SSH on 192.168.30.10 within 18 seconds.",
            "ai_summary": "Host 192.168.10.45 failed 10 consecutive authentication attempts against SSH on 192.168.30.10 using dictionary/default usernames. This matches a brute-force or dictionary attack.",
            "ai_impact": "Possibility of unauthorized administrative login if default or weak passwords exist, in addition to server authentication log bloat and resource exhaustion.",
            "ai_recommended_action": "Block 192.168.10.45 at the router subinterface and enforce public-key authentication for SSH.",
            "is_ai_generated": False,
            "ai_provider": "Offline Rule-Based Engine",
            "router_interface": "GigabitEthernet0/0.10",
            "acl_name": "BLOCK_ATTACKER_VLAN10",
            "acl_direction": "in",
            "cisco_command": """configure terminal
ip access-list extended BLOCK_ATTACKER_VLAN10
 deny ip host 192.168.10.45 any
 permit ip any any
exit
interface GigabitEthernet0/0.10
 ip access-group BLOCK_ATTACKER_VLAN10 in
end
write memory""",
        },
    ]

    for item in initial_seeds:
        inc = IncidentModel(**item)
        db.add(inc)
        audit = AuditLogModel(
            incident_id=item["id"],
            action="INCIDENT_INITIALIZED",
            details=f"System initialized baseline demonstration incident for {item['title']}.",
            performed_by="System Setup",
        )
        db.add(audit)

    db.commit()
