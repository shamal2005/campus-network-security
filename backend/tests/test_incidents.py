import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_list_incidents():
    """Verify that seeded incidents are returned from SQLite."""
    response = client.get("/api/incidents")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3, "Expected at least 3 seeded baseline incidents in SQLite"
    
    first = data[0]
    assert "id" in first
    assert "severity" in first
    assert "evidence" in first


def test_filter_incidents_by_severity():
    """Verify filtering by severity."""
    response = client.get("/api/incidents?severity=CRITICAL")
    assert response.status_code == 200
    data = response.json()
    for inc in data:
        assert inc["severity"] == "CRITICAL"


def test_get_incident_details_and_audit():
    """Verify retrieving specific incident with audit history."""
    response = client.get("/api/incidents/INC-2026-001")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "INC-2026-001"
    assert "audit_history" in data
    assert len(data["audit_history"]) >= 1


def test_update_incident_status():
    """Verify status update PATCH endpoint and audit trail creation."""
    payload = {
        "status": "INVESTIGATING",
        "notes": "Security analyst reviewing Packet Tracer capture.",
        "performed_by": "SecOps Team",
    }
    response = client.patch("/api/incidents/INC-2026-003/status", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["new_status"] == "INVESTIGATING"

    # Confirm status persisted
    get_res = client.get("/api/incidents/INC-2026-003")
    assert get_res.status_code == 200
    assert get_res.json()["status"] == "INVESTIGATING"


def test_verify_mitigation():
    """Verify recording Packet Tracer manual verification."""
    payload = {
        "notes": "Tested in Cisco Packet Tracer: Attacker PC 192.168.10.45 received 100% loss. Verified blocked.",
        "verified_by": "Lab Administrator",
    }
    response = client.post("/api/incidents/INC-2026-001/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "MITIGATED"

    # Verify audit log entry
    audit_res = client.get("/api/audit-logs")
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert any(log["action"] == "MITIGATION_VERIFIED" for log in logs)
