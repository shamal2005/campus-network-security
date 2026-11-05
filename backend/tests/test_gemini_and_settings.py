import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.gemini_ai import set_gemini_api_key, is_gemini_configured

client = TestClient(app)


def test_offline_fallback_mode():
    """Confirms that without an API key, the system uses Offline Fallback and never claims AI generation."""
    set_gemini_api_key("")
    assert not is_gemini_configured()

    incidents_resp = client.get("/api/incidents")
    assert incidents_resp.status_code == 200
    incidents = incidents_resp.json()
    assert len(incidents) > 0
    inc_id = incidents[0]["id"]

    resp = client.post(f"/api/incidents/{inc_id}/explain-gemini")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ai_explanation"]["is_ai_generated"] is False
    assert "Offline" in data["ai_explanation"]["provider"]
    assert len(data["ai_explanation"]["summary"]) > 0


def test_settings_api_lifecycle():
    # Test getting settings
    get_res = client.get("/api/settings")
    assert get_res.status_code == 200
    settings = get_res.json()
    assert "router_interface_vlan10" in settings
    assert "gemini_api_configured" in settings

    # Test updating settings
    update_res = client.post(
        "/api/settings",
        json={
            "router_interface_vlan10": "GigabitEthernet0/1.10",
            "port_scan_threshold": 15,
        },
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["settings"]["router_interface_vlan10"] == "GigabitEthernet0/1.10"
    assert updated_data["settings"]["port_scan_threshold"] == 15

    # Revert back to original
    client.post(
        "/api/settings",
        json={"router_interface_vlan10": "GigabitEthernet0/0.10", "port_scan_threshold": 10},
    )


def test_test_gemini_connection_endpoint():
    resp = client.post("/api/settings/test-gemini", json={"api_key": ""})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is False
    assert "Offline Fallback Mode" in data["message"]
