import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.schemas import UploadResponse, DetectionConfig
from ..models.db import IncidentModel, AuditLogModel
from ..services.validator import validate_and_parse_csv
from ..services.detector import run_detections

router = APIRouter(prefix="/api", tags=["Threat Detection"])

# Path to sample data directory
SAMPLE_DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "sample_data"


def persist_incidents_to_db(incidents, filename: str, db: Session):
    """Saves detected incidents and audit log records to SQLite database."""
    for inc in incidents:
        # Check if already exists by ID
        existing = db.query(IncidentModel).filter(IncidentModel.id == inc.id).first()
        if existing:
            continue

        metrics_list = [m.model_dump() for m in inc.evidence.metrics]

        # Generate standard default Cisco Extended ACL
        router_iface = "GigabitEthernet0/0.10" if "VLAN 10" in inc.evidence.source_vlan else "GigabitEthernet0/0"
        acl_name = f"BLOCK_{inc.source_ip.replace('.', '_')}"
        cisco_cmd = f"""configure terminal
ip access-list extended {acl_name}
 remark --- Auto-Generated Mitigation for {inc.title} ---
 remark Block suspicious source IP: {inc.source_ip}
 deny ip host {inc.source_ip} any
 permit ip any any
exit
interface {router_iface}
 ip access-group {acl_name} in
end
write memory"""

        db_incident = IncidentModel(
            id=inc.id,
            title=inc.title,
            attack_type=inc.attack_type,
            severity=inc.severity,
            status=inc.status,
            detected_at=inc.detected_at,
            source_ip=inc.source_ip,
            destination_ip=inc.destination_ip,
            source_vlan=inc.evidence.source_vlan,
            target_vlan=inc.evidence.target_vlan,
            time_window=inc.evidence.time_window,
            metrics_json=json.dumps(metrics_list),
            raw_summary=inc.evidence.raw_summary,
            ai_summary=inc.ai_explanation.summary,
            ai_impact=inc.ai_explanation.impact,
            ai_recommended_action=inc.ai_explanation.recommended_action,
            is_ai_generated=inc.ai_explanation.is_ai_generated,
            ai_provider=inc.ai_explanation.provider,
            cisco_command=cisco_cmd,
            router_interface=router_iface,
            acl_name=acl_name,
            acl_direction="in",
        )
        db.add(db_incident)

        audit = AuditLogModel(
            incident_id=inc.id,
            action="INCIDENT_DETECTED",
            details=f"Threat detected from analysis of uploaded log '{filename}'. Severity: {inc.severity}.",
            performed_by="Python Threat Detection Engine",
        )
        db.add(audit)

    db.commit()


@router.post("/upload", response_model=UploadResponse)
async def upload_csv_log(
    file: UploadFile = File(...),
    port_scan_threshold: Optional[int] = Query(default=10),
    dos_packet_threshold: Optional[int] = Query(default=4000),
    dos_byte_threshold: Optional[int] = Query(default=5000000),
    brute_force_threshold: Optional[int] = Query(default=5),
    db: Session = Depends(get_db),
):
    """
    Receives and validates uploaded CSV logs, runs Python detection rules,
    persists detected security incidents to SQLite, and returns structured results.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded or file name is missing.")

    try:
        content = await file.read()
        log_type, df = validate_and_parse_csv(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error processing CSV: {str(e)}")

    config = DetectionConfig(
        port_scan_threshold=port_scan_threshold or 10,
        dos_packet_threshold=dos_packet_threshold or 4000,
        dos_byte_threshold=dos_byte_threshold or 5000000,
        brute_force_threshold=brute_force_threshold or 5,
    )

    incidents = run_detections(log_type, df, config)

    if incidents:
        persist_incidents_to_db(incidents, file.filename, db)
        status = "THREATS_DETECTED"
        message = (
            f"Analysis complete: Detected {len(incidents)} suspicious event(s) across "
            f"{len(df)} records in {file.filename}. Saved to database."
        )
    else:
        status = "NORMAL_TRAFFIC_CLEAN"
        message = (
            f"Analysis complete: All {len(df)} records in {file.filename} are within "
            f"normal baseline parameters. No malicious signatures identified."
        )

    return UploadResponse(
        filename=file.filename,
        log_type=log_type,
        total_records_processed=len(df),
        valid_records=len(df),
        incidents_count=len(incidents),
        incidents=incidents,
        status=status,
        message=message,
    )


@router.post("/upload-sample", response_model=UploadResponse)
async def upload_prepackaged_sample(
    scenario: str = Query(..., description="'normal' | 'port_scan' | 'dos_flood' | 'brute_force'"),
    port_scan_threshold: Optional[int] = Query(default=10),
    dos_packet_threshold: Optional[int] = Query(default=4000),
    dos_byte_threshold: Optional[int] = Query(default=5000000),
    brute_force_threshold: Optional[int] = Query(default=5),
    db: Session = Depends(get_db),
):
    """
    Runs the detection pipeline directly against one of the pre-packaged demonstration datasets
    stored in sample_data/*.csv, persisting findings to SQLite.
    """
    scenario_files = {
        "normal": "normal_traffic.csv",
        "port_scan": "port_scan_attack.csv",
        "dos_flood": "dos_flood_attack.csv",
        "brute_force": "auth_brute_force.csv",
    }

    if scenario not in scenario_files:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown scenario '{scenario}'. Choose from {list(scenario_files.keys())}.",
        )

    filename = scenario_files[scenario]
    file_path = SAMPLE_DATA_DIR / filename

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Sample file '{filename}' was not found in {SAMPLE_DATA_DIR}.",
        )

    try:
        with open(file_path, "rb") as f:
            content = f.read()
        log_type, df = validate_and_parse_csv(content, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading sample file: {str(e)}")

    config = DetectionConfig(
        port_scan_threshold=port_scan_threshold or 10,
        dos_packet_threshold=dos_packet_threshold or 4000,
        dos_byte_threshold=dos_byte_threshold or 5000000,
        brute_force_threshold=brute_force_threshold or 5,
    )

    incidents = run_detections(log_type, df, config)

    if incidents:
        persist_incidents_to_db(incidents, filename, db)
        status = "THREATS_DETECTED"
        message = (
            f"Simulated test complete: Detected {len(incidents)} suspicious event(s) in "
            f"{filename}. Saved to database."
        )
    else:
        status = "NORMAL_TRAFFIC_CLEAN"
        message = (
            f"Simulated test complete: Normal traffic validated ({len(df)} records in {filename}). "
            "No thresholds exceeded."
        )

    return UploadResponse(
        filename=filename,
        log_type=log_type,
        total_records_processed=len(df),
        valid_records=len(df),
        incidents_count=len(incidents),
        incidents=incidents,
        status=status,
        message=message,
    )
