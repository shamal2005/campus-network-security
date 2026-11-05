export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type AttackType = 
  | 'PORT_SCAN' 
  | 'DOS_FLOOD' 
  | 'BRUTE_FORCE' 
  | 'ANOMALOUS_TRAFFIC';

export type IncidentStatus = 
  | 'NEW' 
  | 'INVESTIGATING' 
  | 'MITIGATION_PROPOSED' 
  | 'MITIGATED' 
  | 'RESOLVED';

export interface IncidentEvidence {
  sourceIp: string;
  destinationIp: string;
  sourceVlan: string;
  targetVlan: string;
  timeWindow: string;
  metrics: {
    label: string;
    value: string | number;
    threshold?: string | number;
  }[];
  rawSummary: string;
}

export interface SecurityIncident {
  id: string;
  title: string;
  attackType: AttackType;
  severity: Severity;
  status: IncidentStatus;
  detectedAt: string;
  sourceIp: string;
  destinationIp: string;
  evidence: IncidentEvidence;
  aiExplanation?: {
    summary: string;
    impact: string;
    recommendedAction: string;
    isAiGenerated: boolean;
    provider: 'Google Gemini 1.5' | 'Offline Rule-Based Engine';
  };
  mitigation?: {
    aclName: string;
    routerInterface: string;
    direction: 'in' | 'out';
    ciscoCommand: string;
    generatedAt: string;
    appliedAt?: string;
    verifiedAt?: string;
    verifiedBy?: string;
    verificationNotes?: string;
  };
}

export interface BackendIncidentItem {
  id: string;
  title: string;
  attack_type: AttackType;
  severity: Severity;
  status: IncidentStatus;
  detected_at: string;
  source_ip: string;
  destination_ip: string;
  evidence: {
    source_ip: string;
    destination_ip: string;
    source_vlan: string;
    target_vlan: string;
    time_window: string;
    metrics: {
      label: string;
      value: string | number;
      threshold?: string | number;
    }[];
    raw_summary: string;
  };
  ai_explanation: {
    summary: string;
    impact: string;
    recommended_action: string;
    is_ai_generated: boolean;
    provider: string;
  };
}

export interface UploadApiResponse {
  filename: string;
  log_type: 'network_traffic' | 'auth_events';
  total_records_processed: number;
  valid_records: number;
  incidents_count: number;
  incidents: BackendIncidentItem[];
  status: 'THREATS_DETECTED' | 'NORMAL_TRAFFIC_CLEAN';
  message: string;
}

export interface NetworkDevice {
  id: string;
  name: string;
  ip: string;
  vlan: 10 | 20 | 30;
  vlanName: 'Student' | 'Faculty' | 'Server';
  deviceType: 'PC' | 'SERVER' | 'ROUTER' | 'SWITCH';
  macAddress: string;
  status: 'ONLINE' | 'SUSPICIOUS' | 'BLOCKED';
  interface: string;
}

export interface SystemSettings {
  routerInterfaceVlan10: string;
  routerInterfaceVlan20: string;
  routerInterfaceVlan30: string;
  defaultAclDirection: 'in' | 'out';
  portScanThreshold: number;
  dosPacketThreshold: number;
  bruteForceThreshold: number;
  geminiApiKeyConfigured: boolean;
  offlineFallbackActive: boolean;
}
