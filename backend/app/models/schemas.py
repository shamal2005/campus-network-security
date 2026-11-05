from typing import List, Optional, Union
from pydantic import BaseModel, Field


class MetricItem(BaseModel):
    label: str
    value: Union[str, int, float]
    threshold: Optional[str] = None


class IncidentEvidence(BaseModel):
    source_ip: str
    destination_ip: str
    source_vlan: str
    target_vlan: str
    time_window: str
    metrics: List[MetricItem]
    raw_summary: str


class RuleExplanation(BaseModel):
    summary: str
    impact: str
    recommended_action: str
    is_ai_generated: bool = False
    provider: str = "Offline Rule-Based Engine"


class IncidentItem(BaseModel):
    id: str
    title: str
    attack_type: str  # 'PORT_SCAN' | 'DOS_FLOOD' | 'BRUTE_FORCE'
    severity: str     # 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    status: str = "NEW"
    detected_at: str
    source_ip: str
    destination_ip: str
    evidence: IncidentEvidence
    ai_explanation: RuleExplanation


class UploadResponse(BaseModel):
    filename: str
    log_type: str  # 'network_traffic' | 'auth_events'
    total_records_processed: int
    valid_records: int
    incidents_count: int
    incidents: List[IncidentItem]
    status: str  # 'THREATS_DETECTED' | 'NORMAL_TRAFFIC_CLEAN'
    message: str


class DetectionConfig(BaseModel):
    port_scan_threshold: int = Field(default=10, description="Minimum distinct destination ports hit to trigger port scan alert")
    dos_packet_threshold: int = Field(default=4000, description="Minimum packet count within window to trigger DoS traffic surge alert")
    dos_byte_threshold: int = Field(default=5000000, description="Minimum byte volume (5MB) to flag as high-bandwidth flow")
    brute_force_threshold: int = Field(default=5, description="Minimum failed login attempts to trigger brute-force alert")
