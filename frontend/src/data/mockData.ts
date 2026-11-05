import type { SecurityIncident, NetworkDevice, SystemSettings } from '../types';

export const initialSettings: SystemSettings = {
  routerInterfaceVlan10: 'GigabitEthernet0/0.10',
  routerInterfaceVlan20: 'GigabitEthernet0/0.20',
  routerInterfaceVlan30: 'GigabitEthernet0/0.30',
  defaultAclDirection: 'in',
  portScanThreshold: 10,
  dosPacketThreshold: 4000,
  bruteForceThreshold: 5,
  geminiApiKeyConfigured: false,
  offlineFallbackActive: true,
};

export const campusDevices: NetworkDevice[] = [
  {
    id: 'dev-router-1',
    name: 'Campus Gateway Router (2911)',
    ip: '192.168.10.1 / 20.1 / 30.1',
    vlan: 10,
    vlanName: 'Student',
    deviceType: 'ROUTER',
    macAddress: '0001.42A1.B101',
    status: 'ONLINE',
    interface: 'GigabitEthernet0/0',
  },
  {
    id: 'dev-switch-1',
    name: 'Main Distribution Switch (2960)',
    ip: 'Management VLAN 99',
    vlan: 10,
    vlanName: 'Student',
    deviceType: 'SWITCH',
    macAddress: '000A.F411.39A2',
    status: 'ONLINE',
    interface: 'GigabitEthernet0/1 (Trunk)',
  },
  {
    id: 'dev-pc-student',
    name: 'Student Lab Workstation PC-1',
    ip: '192.168.10.20',
    vlan: 10,
    vlanName: 'Student',
    deviceType: 'PC',
    macAddress: '0060.2F12.8A01',
    status: 'ONLINE',
    interface: 'FastEthernet0/2',
  },
  {
    id: 'dev-pc-attacker',
    name: 'Suspicious Device / Test Attacker PC',
    ip: '192.168.10.45',
    vlan: 10,
    vlanName: 'Student',
    deviceType: 'PC',
    macAddress: '0060.2F99.45CC',
    status: 'SUSPICIOUS',
    interface: 'FastEthernet0/5',
  },
  {
    id: 'dev-pc-faculty',
    name: 'Faculty Office PC-1',
    ip: '192.168.20.10',
    vlan: 20,
    vlanName: 'Faculty',
    deviceType: 'PC',
    macAddress: '00E0.B033.4411',
    status: 'ONLINE',
    interface: 'FastEthernet0/11',
  },
  {
    id: 'dev-server-web',
    name: 'Campus Web & Auth Server',
    ip: '192.168.30.10',
    vlan: 30,
    vlanName: 'Server',
    deviceType: 'SERVER',
    macAddress: '00D0.BA99.8822',
    status: 'ONLINE',
    interface: 'FastEthernet0/16',
  },
];

export const sampleIncidents: SecurityIncident[] = [
  {
    id: 'INC-2026-001',
    title: 'High-Volume Port Reconnaissance Detected',
    attackType: 'PORT_SCAN',
    severity: 'HIGH',
    status: 'MITIGATION_PROPOSED',
    detectedAt: '2026-10-22 10:14:06',
    sourceIp: '192.168.10.45',
    destinationIp: '192.168.30.10',
    evidence: {
      sourceIp: '192.168.10.45',
      destinationIp: '192.168.30.10',
      sourceVlan: 'VLAN 10 (Student)',
      targetVlan: 'VLAN 30 (Server)',
      timeWindow: '5 seconds',
      metrics: [
        { label: 'Distinct Ports Probed', value: 16, threshold: '>= 10 ports' },
        { label: 'Protocols', value: 'TCP SYN' },
        { label: 'Target Ports Hit', value: '21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 1433, 3306, 3389, 8080' },
      ],
      rawSummary: 'Host 192.168.10.45 initiated TCP SYN connections to 16 distinct ports on 192.168.30.10 within 5 seconds.',
    },
    aiExplanation: {
      summary: 'Host 192.168.10.45 is actively sweeping the campus server for open network services. This is a classic pre-attack reconnaissance phase used to discover vulnerable applications.',
      impact: 'Allows an adversary to identify vulnerable services (such as unpatched SSH or Telnet) to target with exploit payloads.',
      recommendedAction: 'Apply an Extended Access Control List on the Student Gateway subinterface to restrict ingress traffic from 192.168.10.45.',
      isAiGenerated: false,
      provider: 'Offline Rule-Based Engine',
    },
    mitigation: {
      aclName: 'BLOCK_ATTACKER_VLAN10',
      routerInterface: 'GigabitEthernet0/0.10',
      direction: 'in',
      ciscoCommand: `configure terminal
ip access-list extended BLOCK_ATTACKER_VLAN10
 deny ip host 192.168.10.45 any
 permit ip any any
exit
interface GigabitEthernet0/0.10
 ip access-group BLOCK_ATTACKER_VLAN10 in
end`,
      generatedAt: '2026-10-22 10:14:20',
    },
  },
  {
    id: 'INC-2026-002',
    title: 'DoS-Like Volumetric Traffic Spike',
    attackType: 'DOS_FLOOD',
    severity: 'CRITICAL',
    status: 'INVESTIGATING',
    detectedAt: '2026-10-22 11:30:30',
    sourceIp: '192.168.10.45',
    destinationIp: '192.168.30.10',
    evidence: {
      sourceIp: '192.168.10.45',
      destinationIp: '192.168.30.10',
      sourceVlan: 'VLAN 10 (Student)',
      targetVlan: 'VLAN 30 (Server)',
      timeWindow: '30 seconds',
      metrics: [
        { label: 'Total Packets Transmitted', value: '51,800 pkts', threshold: '> 4,000 pkts' },
        { label: 'Cumulative Bandwidth', value: '33.1 MB', threshold: '> 5.0 MB' },
        { label: 'Average Packet Rate', value: '1,726 pkts/sec' },
      ],
      rawSummary: 'Host 192.168.10.45 transmitted 51,800 packets to 192.168.30.10:80 within 30 seconds, exceeding configured rate threshold.',
    },
    aiExplanation: {
      summary: 'A dramatic, sustained surge of TCP SYN packets was detected directed at port 80 of the campus server. This matches the signature of a Denial-of-Service volumetric flood.',
      impact: 'Server socket exhaustion, severe latency for legitimate student and faculty portals, potential service outage.',
      recommendedAction: 'Immediately filter traffic from host 192.168.10.45 at the router ingress interface before it saturates switch trunk links.',
      isAiGenerated: false,
      provider: 'Offline Rule-Based Engine',
    },
    mitigation: {
      aclName: 'BLOCK_ATTACKER_VLAN10',
      routerInterface: 'GigabitEthernet0/0.10',
      direction: 'in',
      ciscoCommand: `configure terminal
ip access-list extended BLOCK_ATTACKER_VLAN10
 deny ip host 192.168.10.45 any
 permit ip any any
exit
interface GigabitEthernet0/0.10
 ip access-group BLOCK_ATTACKER_VLAN10 in
end`,
      generatedAt: '2026-10-22 11:30:45',
    },
  },
  {
    id: 'INC-2026-003',
    title: 'Repeated SSH Authentication Failures (Brute-Force)',
    attackType: 'BRUTE_FORCE',
    severity: 'HIGH',
    status: 'NEW',
    detectedAt: '2026-10-22 14:05:19',
    sourceIp: '192.168.10.45',
    destinationIp: '192.168.30.10',
    evidence: {
      sourceIp: '192.168.10.45',
      destinationIp: '192.168.30.10',
      sourceVlan: 'VLAN 10 (Student)',
      targetVlan: 'VLAN 30 (Server)',
      timeWindow: '18 seconds',
      metrics: [
        { label: 'Failed Login Attempts', value: 10, threshold: '>= 5 failures' },
        { label: 'Target Service', value: 'SSH (Port 22)' },
        { label: 'Targeted Usernames', value: 'admin, root, administrator, user, test, guest, faculty, sysadmin, oracle, support' },
      ],
      rawSummary: 'Host 192.168.10.45 generated 10 sequential authentication failures over SSH in 18 seconds using dictionary usernames.',
    },
    aiExplanation: {
      summary: '10 consecutive failed login attempts were logged from 192.168.10.45 targeting the server SSH daemon. The rapid trial of default administrative usernames indicates an automated credential stuffing or dictionary attack.',
      impact: 'Risk of unauthorized administrative access if an account has a weak password; log bloating and account lockout of legitimate users.',
      recommendedAction: 'Block inbound SSH or all traffic from 192.168.10.45 at the router subinterface and enforce key-based SSH authentication.',
      isAiGenerated: false,
      provider: 'Offline Rule-Based Engine',
    },
  },
];

export const attackDistributionData = [
  { name: 'Port Scanning', count: 8, color: '#3b82f6' },
  { name: 'DoS Traffic Flood', count: 4, color: '#f43f5e' },
  { name: 'SSH Brute Force', count: 6, color: '#f59e0b' },
  { name: 'Normal / Benign', count: 142, color: '#10b981' },
];

export const incidentTrendData = [
  { time: '08:00', portScan: 1, dosFlood: 0, bruteForce: 0, normalFlows: 25 },
  { time: '09:00', portScan: 0, dosFlood: 0, bruteForce: 1, normalFlows: 38 },
  { time: '10:00', portScan: 4, dosFlood: 1, bruteForce: 0, normalFlows: 42 },
  { time: '11:00', portScan: 2, dosFlood: 2, bruteForce: 1, normalFlows: 48 },
  { time: '12:00', portScan: 1, dosFlood: 0, bruteForce: 2, normalFlows: 35 },
  { time: '13:00', portScan: 0, dosFlood: 1, bruteForce: 0, normalFlows: 29 },
  { time: '14:00', portScan: 0, dosFlood: 0, bruteForce: 2, normalFlows: 31 },
];
