from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from ..services.gemini_ai import (
    get_gemini_api_key,
    set_gemini_api_key,
    is_gemini_configured,
    test_gemini_key,
)

router = APIRouter(prefix="/api/settings", tags=["System Settings"])

# In-memory settings state with configurable router interfaces & thresholds
system_settings_state = {
    "router_interface_vlan10": "GigabitEthernet0/0.10",
    "router_interface_vlan20": "GigabitEthernet0/0.20",
    "router_interface_vlan30": "GigabitEthernet0/0.30",
    "default_acl_direction": "in",
    "port_scan_threshold": 10,
    "dos_packet_threshold": 4000,
    "dos_byte_threshold": 5000000,
    "brute_force_threshold": 5,
}


class UpdateSettingsRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    router_interface_vlan10: Optional[str] = None
    router_interface_vlan20: Optional[str] = None
    router_interface_vlan30: Optional[str] = None
    default_acl_direction: Optional[str] = "in"
    port_scan_threshold: Optional[int] = None
    dos_packet_threshold: Optional[int] = None
    dos_byte_threshold: Optional[int] = None
    brute_force_threshold: Optional[int] = None


class TestGeminiRequest(BaseModel):
    api_key: Optional[str] = None


def mask_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return "********"
    return key[:4] + "..." + key[-4:]


@router.get("")
def get_system_settings():
    """Returns current active system configuration, router subinterfaces, and AI status."""
    configured = is_gemini_configured()
    raw_key = get_gemini_api_key()

    return {
        **system_settings_state,
        "gemini_api_configured": configured,
        "gemini_api_key_masked": mask_key(raw_key),
        "ai_engine_mode": "Google Gemini AI Mode" if configured else "Offline Fallback Mode (Rule-Based)",
        "active_model": "gemini-1.5-flash",
    }


@router.post("")
def update_system_settings(payload: UpdateSettingsRequest):
    """Updates router interface mapping, detection thresholds, and AI API key."""
    if payload.gemini_api_key is not None:
        set_gemini_api_key(payload.gemini_api_key)

    if payload.router_interface_vlan10 is not None:
        system_settings_state["router_interface_vlan10"] = payload.router_interface_vlan10.strip()
    if payload.router_interface_vlan20 is not None:
        system_settings_state["router_interface_vlan20"] = payload.router_interface_vlan20.strip()
    if payload.router_interface_vlan30 is not None:
        system_settings_state["router_interface_vlan30"] = payload.router_interface_vlan30.strip()
    if payload.default_acl_direction is not None:
        system_settings_state["default_acl_direction"] = payload.default_acl_direction.strip()

    if payload.port_scan_threshold is not None:
        system_settings_state["port_scan_threshold"] = payload.port_scan_threshold
    if payload.dos_packet_threshold is not None:
        system_settings_state["dos_packet_threshold"] = payload.dos_packet_threshold
    if payload.dos_byte_threshold is not None:
        system_settings_state["dos_byte_threshold"] = payload.dos_byte_threshold
    if payload.brute_force_threshold is not None:
        system_settings_state["brute_force_threshold"] = payload.brute_force_threshold

    return {
        "status": "SUCCESS",
        "message": "System and simulation settings updated successfully.",
        "settings": get_system_settings(),
    }


@router.post("/test-gemini")
async def test_gemini_connection(payload: Optional[TestGeminiRequest] = None):
    """Tests connection to Google Gemini API using provided or stored key."""
    key = payload.api_key if payload and payload.api_key else None
    success, message = await test_gemini_key(key)
    return {
        "success": success,
        "message": message,
        "configured": is_gemini_configured() if not key else success,
    }
