import React, { useState } from 'react';
import {
  Network,
  Server,
  Laptop,
  Shield,
  Radio,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { campusDevices, sampleIncidents } from '../data/mockData';
import type { NetworkDevice } from '../types';

export const NetworkMap: React.FC = () => {
  const [selectedIncidentFilter, setSelectedIncidentFilter] = useState<string>('INC-2026-001');
  const [isAclApplied, setIsAclApplied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'topology' | 'verification' | 'setup_script'>('topology');
  const [copiedCli, setCopiedCli] = useState<boolean>(false);

  const selectedIncident = sampleIncidents.find((i) => i.id === selectedIncidentFilter);

  const attackerDevice = campusDevices.find((d) => d.id === 'dev-pc-attacker')!;
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice>(attackerDevice);

  const vlan10Devices = campusDevices.filter((d) => d.vlan === 10 && d.deviceType === 'PC');
  const vlan20Devices = campusDevices.filter((d) => d.vlan === 20 && d.deviceType === 'PC');
  const vlan30Devices = campusDevices.filter((d) => d.vlan === 30);

  const initialPacketTracerRouterConfig = `! Cisco Packet Tracer Router Configuration (2911 or similar)
enable
configure terminal
hostname Campus-Router

! Enable physical trunk port
interface GigabitEthernet0/0
 no shutdown
exit

! Student Gateway (VLAN 10)
interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
 no shutdown
exit

! Faculty Gateway (VLAN 20)
interface GigabitEthernet0/0.20
 encapsulation dot1Q 20
 ip address 192.168.20.1 255.255.255.0
 no shutdown
exit

! Server Farm Gateway (VLAN 30)
interface GigabitEthernet0/0.30
 encapsulation dot1Q 30
 ip address 192.168.30.1 255.255.255.0
 no shutdown
exit
end
write memory`;

  const handleCopyCli = () => {
    navigator.clipboard.writeText(initialPacketTracerRouterConfig);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="w-6 h-6 text-blue-500" />
            Campus Network Topology (Packet Tracer Lab)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Visual map of simulated subnets, VLAN boundaries, router interfaces, and endpoint security states.
          </p>
        </div>

        {/* View switcher tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('topology')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'topology'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Visual Topology
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'verification'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Packet Tracer Testing
          </button>
          <button
            onClick={() => setActiveTab('setup_script')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'setup_script'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cisco Setup Script
          </button>
        </div>
      </div>

      {/* Incident Selection & Simulation Controls Bar */}
      <div className="bg-[#111827]/90 border border-[#1f293d] rounded-xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 whitespace-nowrap">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Active Threat Simulation:
          </span>
          <select
            value={selectedIncidentFilter}
            onChange={(e) => setSelectedIncidentFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:border-blue-500 w-full sm:w-auto"
          >
            <option value="NONE">None (Normal Baseline Network State)</option>
            {sampleIncidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.id} - {inc.title} ({inc.sourceIp})
              </option>
            ))}
          </select>
        </div>

        {selectedIncidentFilter !== 'NONE' && (
          <div className="flex items-center gap-3 w-full md:w-auto justify-between sm:justify-end">
            <span className="text-xs text-slate-400 font-mono">
              Cisco ACL Mitigation:
            </span>
            <button
              onClick={() => setIsAclApplied(!isAclApplied)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                isAclApplied
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
              }`}
            >
              {isAclApplied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ACL Applied (Traffic Blocked)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>No ACL (Attack Traffic Active)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {activeTab === 'topology' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Visual Topology Diagram (8 cols) */}
          <div className="lg:col-span-8 bg-[#111827]/90 border border-[#1f293d] rounded-xl p-6 shadow-lg space-y-6">
            <div className="text-xs text-slate-400 flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="font-semibold text-slate-200">
                INTER-VLAN ROUTER-ON-A-STICK TOPOLOGY
              </span>
              <span className="text-[11px] text-amber-400 font-mono">
                Cisco Catalyst 2960 + Cisco 2911 Router
              </span>
            </div>

            {/* Central Router Tier */}
            <div className="flex flex-col items-center">
              <div
                onClick={() => setSelectedDevice(campusDevices[0])}
                className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center w-72 text-center transition-all relative ${
                  selectedDevice.id === campusDevices[0].id
                    ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                }`}
              >
                {/* Visual ACL Shield if applied */}
                {isAclApplied && (
                  <div className="absolute -top-3 right-3 bg-emerald-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md animate-bounce">
                    <Shield className="w-3 h-3" />
                    ACL ACTIVE
                  </div>
                )}

                <div className="w-11 h-11 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2">
                  <Shield className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-white">Central Campus Gateway Router</span>
                <span className="text-[11px] font-mono text-blue-400">Cisco 2911</span>
                
                {/* Router Subinterfaces */}
                <div className="mt-2 pt-2 border-t border-slate-800/80 w-full grid grid-cols-3 gap-1 text-[9px] font-mono text-slate-400">
                  <div>
                    <span className="text-blue-300 font-semibold block">Gi0/0.10</span>
                    <span>10.1 (GW)</span>
                  </div>
                  <div>
                    <span className="text-emerald-300 font-semibold block">Gi0/0.20</span>
                    <span>20.1 (GW)</span>
                  </div>
                  <div>
                    <span className="text-purple-300 font-semibold block">Gi0/0.30</span>
                    <span>30.1 (GW)</span>
                  </div>
                </div>
              </div>

              {/* Trunk line representation */}
              <div className="h-8 w-0.5 bg-blue-500/40 relative flex items-center justify-center">
                <span className="absolute -left-28 text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  802.1Q Trunk Link (Gi0/0 &harr; Gi0/1)
                </span>
              </div>

              {/* Core Catalyst Switch */}
              <div
                onClick={() => setSelectedDevice(campusDevices[1])}
                className={`cursor-pointer p-3.5 rounded-xl border flex flex-col items-center w-72 text-center transition-all ${
                  selectedDevice.id === campusDevices[1].id
                    ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-1.5">
                  <Radio className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white">Main Access/Distribution Switch</span>
                <span className="text-[11px] font-mono text-indigo-400">Cisco Catalyst 2960-24TT</span>
                <span className="text-[10px] text-slate-400 mt-1">
                  VLANs 10, 20, 30 Trunked
                </span>
              </div>
            </div>

            {/* Three Segment Clusters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              {/* VLAN 10: Student Network */}
              <div className="bg-slate-900/70 border border-blue-500/30 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      VLAN 10: Student
                    </span>
                    <span className="text-[10px] font-mono bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20">
                      192.168.10.0/24
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mb-3 space-y-0.5">
                    <div>Gateway: <code className="text-slate-300">192.168.10.1</code></div>
                    <div>Switch Ports: <code className="text-slate-300">Fa0/1 - Fa0/10</code></div>
                  </div>

                  <div className="space-y-2.5">
                    {vlan10Devices.map((dev) => {
                      const isAttacker = dev.id === 'dev-pc-attacker';
                      const isTargetActive =
                        isAttacker && selectedIncidentFilter !== 'NONE';

                      return (
                        <div
                          key={dev.id}
                          onClick={() => setSelectedDevice(dev)}
                          className={`cursor-pointer p-2.5 rounded-lg border text-xs flex items-center gap-2.5 transition-all ${
                            isTargetActive
                              ? isAclApplied
                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                                : 'bg-rose-500/15 border-rose-500/50 text-rose-200 animate-pulse'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-200 hover:border-slate-500'
                          } ${selectedDevice.id === dev.id ? 'ring-2 ring-blue-400' : ''}`}
                        >
                          <Laptop className={`w-4 h-4 flex-shrink-0 ${isTargetActive ? 'text-rose-400' : ''}`} />
                          <div className="overflow-hidden flex-1">
                            <div className="font-semibold truncate text-[11px] flex items-center justify-between">
                              <span>{dev.name}</span>
                              {isTargetActive && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                  isAclApplied
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-rose-500/30 text-rose-300'
                                }`}>
                                  {isAclApplied ? 'BLOCKED' : 'ATTACKING'}
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                              <span>{dev.ip}</span>
                              <span className="text-slate-500">{dev.interface}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* VLAN 20: Faculty Network */}
              <div className="bg-slate-900/70 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      VLAN 20: Faculty
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      192.168.20.0/24
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mb-3 space-y-0.5">
                    <div>Gateway: <code className="text-slate-300">192.168.20.1</code></div>
                    <div>Switch Ports: <code className="text-slate-300">Fa0/11 - Fa0/15</code></div>
                  </div>

                  <div className="space-y-2.5">
                    {vlan20Devices.map((dev) => (
                      <div
                        key={dev.id}
                        onClick={() => setSelectedDevice(dev)}
                        className={`cursor-pointer p-2.5 rounded-lg border text-xs flex items-center gap-2.5 transition-all bg-slate-800/60 border-slate-700/60 text-slate-200 hover:border-slate-500 ${
                          selectedDevice.id === dev.id ? 'ring-2 ring-emerald-400' : ''
                        }`}
                      >
                        <Laptop className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                        <div className="overflow-hidden flex-1">
                          <div className="font-semibold truncate text-[11px]">
                            {dev.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                            <span>{dev.ip}</span>
                            <span className="text-slate-500">{dev.interface}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* VLAN 30: Server Farm */}
              <div className="bg-slate-900/70 border border-purple-500/30 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      VLAN 30: Server
                    </span>
                    <span className="text-[10px] font-mono bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20">
                      192.168.30.0/24
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mb-3 space-y-0.5">
                    <div>Gateway: <code className="text-slate-300">192.168.30.1</code></div>
                    <div>Switch Ports: <code className="text-slate-300">Fa0/16 - Fa0/24</code></div>
                  </div>

                  <div className="space-y-2.5">
                    {vlan30Devices.map((dev) => (
                      <div
                        key={dev.id}
                        onClick={() => setSelectedDevice(dev)}
                        className={`cursor-pointer p-2.5 rounded-lg border text-xs flex items-center gap-2.5 transition-all bg-slate-800/60 border-slate-700/60 text-slate-200 hover:border-slate-500 ${
                          selectedDevice.id === dev.id ? 'ring-2 ring-purple-400' : ''
                        }`}
                      >
                        <Server className="w-4 h-4 flex-shrink-0 text-purple-400" />
                        <div className="overflow-hidden flex-1">
                          <div className="font-semibold truncate text-[11px]">
                            {dev.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                            <span>{dev.ip}</span>
                            <span className="text-slate-500">{dev.interface}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Threat Flow Line if incident selected */}
            {selectedIncident && selectedIncidentFilter !== 'NONE' && (
              <div className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
                isAclApplied
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>
                    <strong>Attack Path:</strong> <code className="font-mono text-white">192.168.10.45</code> &rarr; Switch Fa0/5 &rarr; Router Gi0/0.10 &rarr; <code className="font-mono text-white">192.168.30.10</code>
                  </span>
                </div>
                <span className="font-mono font-bold text-[11px]">
                  {isAclApplied ? '🛑 BLOCKED AT GATEWAY' : '⚠️ TRAFFIC TRANSMITTING'}
                </span>
              </div>
            )}
          </div>

          {/* Device Inspection & Subnet Details (4 cols) */}
          <div className="lg:col-span-4 bg-[#111827]/90 border border-[#1f293d] rounded-xl p-6 shadow-lg flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Device Configuration
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                    selectedDevice.status === 'SUSPICIOUS'
                      ? isAclApplied
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  }`}
                >
                  {selectedDevice.status === 'SUSPICIOUS' && isAclApplied
                    ? 'BLOCKED BY ACL'
                    : selectedDevice.status}
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Device Identifier</span>
                  <span className="font-bold text-white text-sm">{selectedDevice.name}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Assigned IPv4 Address</span>
                  <span className="font-mono font-bold text-blue-400 text-sm">
                    {selectedDevice.ip}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[11px]">VLAN Membership</span>
                    <span className="font-semibold text-white">
                      VLAN {selectedDevice.vlan} ({selectedDevice.vlanName})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Switch Interface</span>
                    <span className="font-mono text-slate-300">
                      {selectedDevice.interface}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Hardware MAC</span>
                  <span className="font-mono text-slate-300">{selectedDevice.macAddress}</span>
                </div>

                {selectedDevice.id === 'dev-pc-attacker' && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-xs text-rose-300 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      Designated Attacker PC
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Used in Packet Tracer to launch simulated attacks (ping flood / port sweep / brute-force) against the campus web server.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
              Matches Packet Tracer Lab device names and IP configurations.
            </div>
          </div>
        </div>
      )}

      {/* Packet Tracer Testing Tab */}
      {activeTab === 'verification' && (
        <div className="bg-[#111827]/90 border border-[#1f293d] rounded-xl p-6 shadow-lg space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              How to Test and Demonstrate in Cisco Packet Tracer
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Step-by-step instructions to demonstrate the threat and verify the ACL mitigation live.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Step 1: Before ACL */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                  Before Mitigation (Baseline Test)
                </span>
                <span className="text-emerald-400 font-mono text-[10px]">Ping Allowed</span>
              </div>
              <p className="text-slate-300 text-xs">
                Open <strong>Attacker PC (192.168.10.45)</strong> &rarr; <strong>Desktop</strong> &rarr; <strong>Command Prompt</strong>:
              </p>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded font-mono text-emerald-400 text-[11px] overflow-x-auto">
{`PC> ping 192.168.30.10
Pinging 192.168.30.10 with 32 bytes of data:
Reply from 192.168.30.10: bytes=32 time<1ms TTL=127
Reply from 192.168.30.10: bytes=32 time<1ms TTL=127

Ping statistics for 192.168.30.10:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`}
              </pre>
              <p className="text-[11px] text-slate-400">
                &check; Confirms normal student VLAN routing to the Server Farm before applying the defensive ACL.
              </p>
            </div>

            {/* Step 2: After ACL */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">2</span>
                  After Mitigation (Blocked Test)
                </span>
                <span className="text-rose-400 font-mono text-[10px]">Traffic Dropped</span>
              </div>
              <p className="text-slate-300 text-xs">
                In the Router CLI, paste the generated ACL. Then test from Attacker PC again:
              </p>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded font-mono text-rose-400 text-[11px] overflow-x-auto">
{`PC> ping 192.168.30.10
Pinging 192.168.30.10 with 32 bytes of data:
Reply from 192.168.10.1: Destination host unreachable.
Reply from 192.168.10.1: Destination host unreachable.

Ping statistics for 192.168.30.10:
    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)`}
              </pre>
              <p className="text-[11px] text-slate-400">
                &check; The router drops all packets from 192.168.10.45 right at the gateway!
              </p>
            </div>
          </div>

          {/* Step 3: Legitimate user test */}
          <div className="p-4 bg-slate-900/60 border border-blue-500/30 rounded-xl text-xs space-y-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              Verifying Legitimate Users (No Service Disruption)
            </span>
            <p className="text-slate-300">
              Open <strong>Student PC (192.168.10.20)</strong> or <strong>Faculty PC (192.168.20.10)</strong> and ping <code className="text-blue-400">192.168.30.10</code>. Because of the <code className="text-emerald-400">permit ip any any</code> rule at the end of the ACL, all non-malicious traffic continues to pass uninterrupted!
            </p>
          </div>
        </div>
      )}

      {/* Cisco Setup Script Tab */}
      {activeTab === 'setup_script' && (
        <div className="bg-[#111827]/90 border border-[#1f293d] rounded-xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">
                Initial Packet Tracer Router Setup Commands
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Copy and paste these commands into your Packet Tracer Router CLI to configure the subinterfaces.
              </p>
            </div>

            <button
              onClick={handleCopyCli}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              {copiedCli ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Commands</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 bg-[#0a0e17] border border-slate-800 rounded-xl font-mono text-emerald-400 text-xs leading-relaxed overflow-x-auto whitespace-pre">
            {initialPacketTracerRouterConfig}
          </pre>
        </div>
      )}
    </div>
  );
};
