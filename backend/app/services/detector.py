import uuid
from datetime import datetime
from typing import List
import pandas as pd

from ..models.schemas import (
    IncidentItem,
    IncidentEvidence,
    MetricItem,
    RuleExplanation,
    DetectionConfig,
)


def resolve_vlan_name(ip_str: str) -> str:
    """Helper to map IP addresses to simulated campus VLAN segments."""
    parts = str(ip_str).strip().split(".")
    if len(parts) == 4 and parts[0] == "192" and parts[1] == "168":
        if parts[2] == "10":
            return "VLAN 10 (Student Network)"
        elif parts[2] == "20":
            return "VLAN 20 (Faculty Network)"
        elif parts[2] == "30":
            return "VLAN 30 (Server Farm)"
    return "External / Other Subnet"


def format_duration(seconds: float) -> str:
    if seconds < 1:
        return "< 1 second"
    elif seconds < 60:
        return f"{int(seconds)} seconds"
    else:
        mins = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{mins}m {secs}s"


def run_detections(
    log_type: str, df: pd.DataFrame, config: DetectionConfig = DetectionConfig()
) -> List[IncidentItem]:
    """
    Executes deterministic Python detection rules against validated logs.
    Returns a list of structured IncidentItem objects.
    """
    incidents: List[IncidentItem] = []

    if log_type == "network_traffic":
        # Rule 1: Port Scanning Detection
        incidents.extend(_detect_port_scanning(df, config))

        # Rule 2: DoS-Like Volumetric Flood Detection
        incidents.extend(_detect_dos_flood(df, config))

    elif log_type == "auth_events":
        # Rule 3: SSH / Authentication Brute Force Detection
        incidents.extend(_detect_brute_force(df, config))

    return incidents


def _detect_port_scanning(df: pd.DataFrame, config: DetectionConfig) -> List[IncidentItem]:
    incidents: List[IncidentItem] = []
    
    # Group by source IP and destination IP
    grouped = df.groupby(["source_ip", "destination_ip"])

    for (src_ip, dst_ip), group in grouped:
        distinct_ports = group["destination_port"].dropna().unique()
        distinct_port_count = len(distinct_ports)

        if distinct_port_count >= config.port_scan_threshold:
            # Calculate time window
            timestamps = pd.to_datetime(group["timestamp"], errors="coerce").dropna().sort_values()
            if not timestamps.empty:
                time_diff = (timestamps.iloc[-1] - timestamps.iloc[0]).total_seconds()
                time_window_str = format_duration(time_diff)
                detected_timestamp = str(timestamps.iloc[-1])
            else:
                time_window_str = "Unknown"
                detected_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            sorted_ports = sorted([int(p) for p in distinct_ports])
            port_sample = ", ".join(str(p) for p in sorted_ports[:16])
            if len(sorted_ports) > 16:
                port_sample += f", ... (+{len(sorted_ports) - 16} more)"

            raw_summary = (
                f"Host {src_ip} initiated connections to {distinct_port_count} distinct ports "
                f"on target {dst_ip} within {time_window_str}."
            )

            evidence = IncidentEvidence(
                source_ip=src_ip,
                destination_ip=dst_ip,
                source_vlan=resolve_vlan_name(src_ip),
                target_vlan=resolve_vlan_name(dst_ip),
                time_window=time_window_str,
                metrics=[
                    MetricItem(
                        label="Distinct Ports Probed",
                        value=distinct_port_count,
                        threshold=f">= {config.port_scan_threshold} ports",
                    ),
                    MetricItem(label="Sample Ports Hit", value=port_sample),
                    MetricItem(label="Total Flow Records", value=len(group)),
                ],
                raw_summary=raw_summary,
            )

            explanation = RuleExplanation(
                summary=(
                    f"Host {src_ip} attempted connections to {distinct_port_count} distinct ports on {dst_ip}. "
                    "This behavior matches the signature of automated port sweeping or network reconnaissance."
                ),
                impact=(
                    "Reconnaissance allows an attacker to discover available network services "
                    "and search for unpatched vulnerabilities before launching targeted exploits."
                ),
                recommended_action=(
                    f"Generate a Cisco Extended ACL on the {resolve_vlan_name(src_ip)} router subinterface "
                    f"to restrict ingress traffic from {src_ip}."
                ),
                is_ai_generated=False,
                provider="Offline Rule-Based Engine",
            )

            incidents.append(
                IncidentItem(
                    id=f"INC-{uuid.uuid4().hex[:6].upper()}",
                    title="Port Reconnaissance Sweep Detected",
                    attack_type="PORT_SCAN",
                    severity="HIGH",
                    status="NEW",
                    detected_at=detected_timestamp,
                    source_ip=src_ip,
                    destination_ip=dst_ip,
                    evidence=evidence,
                    ai_explanation=explanation,
                )
            )

    return incidents


def _detect_dos_flood(df: pd.DataFrame, config: DetectionConfig) -> List[IncidentItem]:
    incidents: List[IncidentItem] = []

    grouped = df.groupby(["source_ip", "destination_ip"])

    for (src_ip, dst_ip), group in grouped:
        total_packets = group["packet_count"].astype(int).sum()
        total_bytes = group["byte_count"].astype(int).sum()

        if total_packets >= config.dos_packet_threshold or total_bytes >= config.dos_byte_threshold:
            timestamps = pd.to_datetime(group["timestamp"], errors="coerce").dropna().sort_values()
            if not timestamps.empty:
                time_diff = (timestamps.iloc[-1] - timestamps.iloc[0]).total_seconds()
                time_window_str = format_duration(time_diff)
                detected_timestamp = str(timestamps.iloc[-1])
                rate = int(total_packets / max(1.0, time_diff))
            else:
                time_window_str = "Unknown"
                detected_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                rate = total_packets

            mb_volume = round(total_bytes / (1024 * 1024), 2)

            raw_summary = (
                f"Host {src_ip} generated a volumetric traffic spike of {total_packets:,} packets "
                f"({mb_volume} MB) towards {dst_ip} within {time_window_str}."
            )

            evidence = IncidentEvidence(
                source_ip=src_ip,
                destination_ip=dst_ip,
                source_vlan=resolve_vlan_name(src_ip),
                target_vlan=resolve_vlan_name(dst_ip),
                time_window=time_window_str,
                metrics=[
                    MetricItem(
                        label="Total Packets Transmitted",
                        value=f"{total_packets:,} pkts",
                        threshold=f">= {config.dos_packet_threshold:,} pkts",
                    ),
                    MetricItem(
                        label="Total Data Volume",
                        value=f"{mb_volume} MB",
                        threshold=f">= {config.dos_byte_threshold / (1024*1024):.1f} MB",
                    ),
                    MetricItem(label="Estimated Packet Rate", value=f"{rate:,} pkts/sec"),
                ],
                raw_summary=raw_summary,
            )

            explanation = RuleExplanation(
                summary=(
                    f"A sustained high-volume traffic surge ({total_packets:,} packets) was detected from {src_ip} "
                    f"directed at {dst_ip}. This signature is an indicator of potential Denial-of-Service (DoS) flooding."
                ),
                impact=(
                    "High volumetric traffic can exhaust server socket queues, saturate switch trunk links, "
                    "and cause significant packet drop for legitimate student and faculty portals."
                ),
                recommended_action=(
                    f"Apply an Extended ACL on the router gateway interface for {resolve_vlan_name(src_ip)} "
                    f"to immediately drop packets from source {src_ip}."
                ),
                is_ai_generated=False,
                provider="Offline Rule-Based Engine",
            )

            incidents.append(
                IncidentItem(
                    id=f"INC-{uuid.uuid4().hex[:6].upper()}",
                    title="DoS-Like Volumetric Traffic Spike",
                    attack_type="DOS_FLOOD",
                    severity="CRITICAL",
                    status="NEW",
                    detected_at=detected_timestamp,
                    source_ip=src_ip,
                    destination_ip=dst_ip,
                    evidence=evidence,
                    ai_explanation=explanation,
                )
            )

    return incidents


def _detect_brute_force(df: pd.DataFrame, config: DetectionConfig) -> List[IncidentItem]:
    incidents: List[IncidentItem] = []

    # Filter for failed authentication records
    failures_df = df[df["auth_status"].astype(str).str.strip().str.upper() == "FAILURE"]

    if failures_df.empty:
        return incidents

    grouped = failures_df.groupby(["source_ip", "destination_ip"])

    for (src_ip, dst_ip), group in grouped:
        failure_count = len(group)

        if failure_count >= config.brute_force_threshold:
            timestamps = pd.to_datetime(group["timestamp"], errors="coerce").dropna().sort_values()
            if not timestamps.empty:
                time_diff = (timestamps.iloc[-1] - timestamps.iloc[0]).total_seconds()
                time_window_str = format_duration(time_diff)
                detected_timestamp = str(timestamps.iloc[-1])
            else:
                time_window_str = "Unknown"
                detected_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            services = group["service"].dropna().unique()
            service_str = ", ".join(str(s) for s in services) if len(services) > 0 else "Authentication Service"

            unique_users = group["username"].dropna().unique()
            user_sample = ", ".join(str(u) for u in unique_users[:8])
            if len(unique_users) > 8:
                user_sample += f", ... (+{len(unique_users) - 8} more)"

            raw_summary = (
                f"Host {src_ip} recorded {failure_count} sequential authentication failures "
                f"targeting {service_str} on {dst_ip} within {time_window_str}."
            )

            evidence = IncidentEvidence(
                source_ip=src_ip,
                destination_ip=dst_ip,
                source_vlan=resolve_vlan_name(src_ip),
                target_vlan=resolve_vlan_name(dst_ip),
                time_window=time_window_str,
                metrics=[
                    MetricItem(
                        label="Failed Login Attempts",
                        value=failure_count,
                        threshold=f">= {config.brute_force_threshold} failures",
                    ),
                    MetricItem(label="Targeted Service", value=service_str),
                    MetricItem(label="Targeted User Accounts", value=user_sample),
                ],
                raw_summary=raw_summary,
            )

            explanation = RuleExplanation(
                summary=(
                    f"Host {src_ip} failed {failure_count} consecutive authentication attempts against {service_str} "
                    f"on {dst_ip} using dictionary/default usernames. This matches a brute-force or dictionary attack."
                ),
                impact=(
                    "Possibility of unauthorized administrative login if default or weak passwords exist, "
                    "in addition to server authentication log bloat and resource exhaustion."
                ),
                recommended_action=(
                    f"Block {src_ip} at the router subinterface and enforce public-key authentication for SSH."
                ),
                is_ai_generated=False,
                provider="Offline Rule-Based Engine",
            )

            incidents.append(
                IncidentItem(
                    id=f"INC-{uuid.uuid4().hex[:6].upper()}",
                    title="SSH / Service Brute-Force Attack",
                    attack_type="BRUTE_FORCE",
                    severity="HIGH",
                    status="NEW",
                    detected_at=detected_timestamp,
                    source_ip=src_ip,
                    destination_ip=dst_ip,
                    evidence=evidence,
                    ai_explanation=explanation,
                )
            )

    return incidents
