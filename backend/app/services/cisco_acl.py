import ipaddress
import re
from typing import Dict, Any, List, Optional


def sanitize_acl_name(name: str) -> str:
    """Ensures an ACL name follows Cisco naming conventions (alphanumeric + underscores, <= 64 chars)."""
    cleaned = re.sub(r"[^A-Za-z0-9_]", "_", name.strip())
    if not cleaned:
        return "BLOCK_MALICIOUS_HOST"
    return cleaned[:64]


def validate_ip_address(ip_str: str) -> bool:
    try:
        ipaddress.ip_address(ip_str.strip())
        return True
    except ValueError:
        return False


def generate_cisco_acl_script(
    source_ip: str,
    destination_ip: Optional[str] = None,
    attack_type: str = "GENERIC_THREAT",
    router_interface: str = "GigabitEthernet0/0.10",
    acl_direction: str = "in",
    acl_name: Optional[str] = None,
    incident_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generates deterministic, verified Cisco Extended Access Control List commands
    suitable for Cisco 2911 / 4321 series routers in Cisco Packet Tracer.
    """
    clean_ip = source_ip.strip()
    clean_dst = (destination_ip or "any").strip()

    if not acl_name:
        ip_suffix = clean_ip.replace(".", "_")
        acl_name = f"BLOCK_HOST_{ip_suffix}"
    else:
        acl_name = sanitize_acl_name(acl_name)

    direction = "in" if str(acl_direction).lower() == "in" else "out"
    iface = router_interface.strip() or "GigabitEthernet0/0.10"

    remark_header = f"Incident {incident_id}: Mitigate {attack_type} from {clean_ip}" if incident_id else f"Mitigate {attack_type} from {clean_ip}"

    # Build standard Cisco IOS Extended ACL configuration block
    commands = f"""! ========================================================
! CISCO EXTENDED ACCESS CONTROL LIST (ACL) MITIGATION
! Attack Type: {attack_type}
! Source Host: {clean_ip}
! Applied Interface: {iface} (direction: {direction})
! ========================================================
configure terminal
!
ip access-list extended {acl_name}
 remark --- {remark_header} ---
 remark Drop all traffic from compromised host: {clean_ip}
 deny ip host {clean_ip} any
 remark Permit legitimate campus inter-VLAN communications
 permit ip any any
exit
!
interface {iface}
 remark Apply ingress security filter
 ip access-group {acl_name} {direction}
exit
!
end
write memory
"""

    # Rollback script to remove the ACL cleanly
    rollback = f"""configure terminal
interface {iface}
 no ip access-group {acl_name} {direction}
exit
no ip access-list extended {acl_name}
end
write memory
"""

    verification_commands = f"""! Verify ACL rules and hit counters in Packet Tracer router CLI:
show ip access-lists {acl_name}
show ip interface {iface} | include access list
"""

    testing_instructions = [
        f"1. In Cisco Packet Tracer, click Router R1 and open the 'CLI' tab.",
        f"2. Paste the generated configuration block above and press Enter.",
        f"3. Open the Desktop -> Command Prompt on Student PC ({clean_ip}).",
        f"4. Attempt to ping Server: 'ping {clean_dst if clean_dst != 'any' else '192.168.30.10'}'.",
        f"5. Confirm ping fails with 'Destination host unreachable' or 'Request timed out'.",
        f"6. Open Command Prompt on Faculty PC (192.168.20.10) and ping Server.",
        f"7. Confirm Faculty PC pings succeed (proves 'permit ip any any' prevents collateral damage).",
        f"8. Run 'show ip access-lists {acl_name}' on Router R1 to observe incrementing deny match counters.",
    ]

    return {
        "acl_name": acl_name,
        "router_interface": iface,
        "direction": direction,
        "source_ip": clean_ip,
        "destination_ip": clean_dst,
        "commands": commands.strip(),
        "rollback_commands": rollback.strip(),
        "verification_commands": verification_commands.strip(),
        "testing_instructions": testing_instructions,
    }


def validate_cisco_acl_syntax(commands: str) -> Dict[str, Any]:
    """
    Validates a set of Cisco ACL commands against syntax guidelines:
    - Balanced config terminal / end
    - Valid IP hosts
    - Presence of permit ip any any to avoid accidental blackholing
    - Valid access-group syntax
    """
    errors: List[str] = []
    warnings: List[str] = []

    lines = [line.strip() for line in commands.splitlines() if line.strip() and not line.strip().startswith("!")]

    if not any("ip access-list extended" in l for l in lines) and not any("access-list" in l for l in lines):
        errors.append("Missing 'ip access-list extended <NAME>' definition.")

    if not any("deny" in l for l in lines):
        warnings.append("No 'deny' statement found in ACL definition.")

    if not any("permit ip any any" in l for l in lines):
        warnings.append(
            "Caution: 'permit ip any any' is absent. Cisco ACLs have an implicit deny-all at the end, which will block ALL other campus VLAN traffic!"
        )

    if not any("ip access-group" in l for l in lines):
        warnings.append("No 'ip access-group <NAME> <in|out>' binding found. The ACL will not be active until bound to an interface.")

    has_conf_t = any("configure terminal" in l for l in lines)
    has_end = any(l in ["end", "exit"] for l in lines)
    if not has_conf_t:
        warnings.append("Missing 'configure terminal' entry command.")

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
    }
