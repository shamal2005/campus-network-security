import pytest
from app.services.cisco_acl import (
    generate_cisco_acl_script,
    validate_cisco_acl_syntax,
    sanitize_acl_name,
)
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_sanitize_acl_name():
    assert sanitize_acl_name("BLOCK STUDENT-10!") == "BLOCK_STUDENT_10_"
    assert sanitize_acl_name("") == "BLOCK_MALICIOUS_HOST"


def test_generate_cisco_acl_script():
    plan = generate_cisco_acl_script(
        source_ip="192.168.10.45",
        destination_ip="192.168.30.10",
        attack_type="PORT_SCAN",
        router_interface="GigabitEthernet0/0.10",
        acl_direction="in",
        incident_id="INC-TEST01",
    )

    assert plan["acl_name"] == "BLOCK_HOST_192_168_10_45"
    assert plan["router_interface"] == "GigabitEthernet0/0.10"
    assert plan["direction"] == "in"
    assert "ip access-list extended BLOCK_HOST_192_168_10_45" in plan["commands"]
    assert "deny ip host 192.168.10.45 any" in plan["commands"]
    assert "permit ip any any" in plan["commands"]
    assert "interface GigabitEthernet0/0.10" in plan["commands"]
    assert "ip access-group BLOCK_HOST_192_168_10_45 in" in plan["commands"]
    assert "no ip access-group" in plan["rollback_commands"]
    assert len(plan["testing_instructions"]) > 4


def test_validate_cisco_acl_syntax():
    valid_script = """
    configure terminal
    ip access-list extended BLOCK_TEST
     deny ip host 192.168.10.45 any
     permit ip any any
    exit
    interface GigabitEthernet0/0.10
     ip access-group BLOCK_TEST in
    end
    """
    res = validate_cisco_acl_syntax(valid_script)
    assert res["is_valid"] is True
    assert len(res["errors"]) == 0

    missing_permit_script = """
    configure terminal
    ip access-list extended BLOCK_TEST
     deny ip host 192.168.10.45 any
    exit
    interface GigabitEthernet0/0.10
     ip access-group BLOCK_TEST in
    end
    """
    res2 = validate_cisco_acl_syntax(missing_permit_script)
    assert res2["is_valid"] is True
    assert any("permit ip any any" in w for w in res2["warnings"])


def test_generate_acl_api_endpoint():
    # First get an incident
    incidents_resp = client.get("/api/incidents")
    assert incidents_resp.status_code == 200
    incidents = incidents_resp.json()
    assert len(incidents) > 0
    inc_id = incidents[0]["id"]

    resp = client.post(
        f"/api/incidents/{inc_id}/generate-acl",
        json={"router_interface": "GigabitEthernet0/0.10", "direction": "in"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "acl_plan" in data
    assert data["acl_plan"]["router_interface"] == "GigabitEthernet0/0.10"
    assert "deny ip host" in data["acl_plan"]["commands"]


def test_validate_acl_api_endpoint():
    resp = client.post(
        "/api/incidents/validate-acl",
        json={"commands": "ip access-list extended TEST\n deny ip host 1.2.3.4 any\n permit ip any any\n"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "is_valid" in data
