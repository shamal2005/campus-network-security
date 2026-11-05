import io
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.validator import validate_and_parse_csv
from app.services.detector import run_detections, DetectionConfig

client = TestClient(app)
SAMPLE_DIR = Path(__file__).resolve().parent.parent.parent / "sample_data"


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ONLINE"
    assert "ai_engine" in data


def test_normal_traffic_produces_no_alerts():
    """Verify that legitimate baseline campus traffic does NOT trigger false positive alerts."""
    file_path = SAMPLE_DIR / "normal_traffic.csv"
    with open(file_path, "rb") as f:
        content = f.read()

    log_type, df = validate_and_parse_csv(content, "normal_traffic.csv")
    assert log_type == "network_traffic"
    assert len(df) == 8

    incidents = run_detections(log_type, df, DetectionConfig())
    assert len(incidents) == 0, f"Expected 0 alerts for normal traffic, got {len(incidents)}"


def test_port_scan_detection():
    """Verify port sweep detection triggers correctly with appropriate evidence."""
    file_path = SAMPLE_DIR / "port_scan_attack.csv"
    with open(file_path, "rb") as f:
        content = f.read()

    log_type, df = validate_and_parse_csv(content, "port_scan_attack.csv")
    assert log_type == "network_traffic"

    incidents = run_detections(log_type, df, DetectionConfig(port_scan_threshold=10))
    assert len(incidents) == 1
    inc = incidents[0]
    assert inc.attack_type == "PORT_SCAN"
    assert inc.source_ip == "192.168.10.45"
    assert inc.destination_ip == "192.168.30.10"
    assert inc.severity == "HIGH"
    assert "16 distinct ports" in inc.evidence.raw_summary


def test_dos_flood_detection():
    """Verify volumetric packet spike detection triggers correctly."""
    file_path = SAMPLE_DIR / "dos_flood_attack.csv"
    with open(file_path, "rb") as f:
        content = f.read()

    log_type, df = validate_and_parse_csv(content, "dos_flood_attack.csv")
    assert log_type == "network_traffic"

    incidents = run_detections(log_type, df, DetectionConfig(dos_packet_threshold=4000))
    assert len(incidents) == 1
    inc = incidents[0]
    assert inc.attack_type == "DOS_FLOOD"
    assert inc.source_ip == "192.168.10.45"
    assert inc.destination_ip == "192.168.30.10"
    assert inc.severity == "CRITICAL"
    assert "51,800 packets" in inc.evidence.raw_summary


def test_brute_force_detection():
    """Verify SSH brute-force login detection triggers correctly."""
    file_path = SAMPLE_DIR / "auth_brute_force.csv"
    with open(file_path, "rb") as f:
        content = f.read()

    log_type, df = validate_and_parse_csv(content, "auth_brute_force.csv")
    assert log_type == "auth_events"

    incidents = run_detections(log_type, df, DetectionConfig(brute_force_threshold=5))
    assert len(incidents) == 1
    inc = incidents[0]
    assert inc.attack_type == "BRUTE_FORCE"
    assert inc.source_ip == "192.168.10.45"
    assert inc.destination_ip == "192.168.30.10"
    assert inc.severity == "HIGH"
    assert "10 sequential authentication failures" in inc.evidence.raw_summary


def test_upload_api_port_scan():
    """Test full HTTP POST /api/upload flow for port scanning."""
    file_path = SAMPLE_DIR / "port_scan_attack.csv"
    with open(file_path, "rb") as f:
        response = client.post(
            "/api/upload",
            files={"file": ("port_scan_attack.csv", f, "text/csv")},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "THREATS_DETECTED"
    assert data["incidents_count"] == 1
    assert data["incidents"][0]["attack_type"] == "PORT_SCAN"


def test_upload_api_normal_traffic():
    """Test full HTTP POST /api/upload flow for normal clean traffic."""
    file_path = SAMPLE_DIR / "normal_traffic.csv"
    with open(file_path, "rb") as f:
        response = client.post(
            "/api/upload",
            files={"file": ("normal_traffic.csv", f, "text/csv")},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "NORMAL_TRAFFIC_CLEAN"
    assert data["incidents_count"] == 0


def test_validation_rejects_missing_columns():
    """Verify that a malformed CSV missing required columns is rejected with 400 Bad Request."""
    invalid_csv = b"col1,col2,col3\n1,2,3\n4,5,6"
    response = client.post(
        "/api/upload",
        files={"file": ("malformed.csv", io.BytesIO(invalid_csv), "text/csv")},
    )
    assert response.status_code == 400
    assert "Unrecognized CSV format" in response.json()["detail"]


def test_validation_rejects_invalid_ip():
    """Verify that a CSV with an invalid IP address is rejected with 400 Bad Request."""
    bad_ip_csv = (
        b"timestamp,source_ip,destination_ip,source_port,destination_port,protocol,packet_count,byte_count\n"
        b"2026-10-22 10:00:00,999.999.999.999,192.168.30.10,5000,80,TCP,10,500\n"
    )
    response = client.post(
        "/api/upload",
        files={"file": ("bad_ip.csv", io.BytesIO(bad_ip_csv), "text/csv")},
    )
    assert response.status_code == 400
    assert "Invalid IPv4 address" in response.json()["detail"]
