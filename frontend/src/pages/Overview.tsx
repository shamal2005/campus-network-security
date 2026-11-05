import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Flame,
  CheckCircle2,
  Network,
  ArrowRight,
  UploadCloud,
  Terminal,
  Activity,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { StatCard } from '../components/StatCard';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import {
  sampleIncidents,
  attackDistributionData,
  incidentTrendData,
} from '../data/mockData';
import type { SecurityIncident, Severity, IncidentStatus } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000';

export const Overview: React.FC = () => {
  const [incidents, setIncidents] = useState<SecurityIncident[]>(sampleIncidents);
  const [isLiveDb, setIsLiveDb] = useState<boolean>(false);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/incidents`);
        if (res.ok) {
          const data = await res.json();
          const formatted: SecurityIncident[] = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            attackType: item.attack_type,
            severity: item.severity as Severity,
            status: item.status as IncidentStatus,
            detectedAt: item.detected_at,
            sourceIp: item.source_ip,
            destinationIp: item.destination_ip,
            evidence: {
              sourceIp: item.evidence.source_ip,
              destinationIp: item.evidence.destination_ip,
              sourceVlan: item.evidence.source_vlan,
              targetVlan: item.evidence.target_vlan,
              timeWindow: item.evidence.time_window,
              metrics: item.evidence.metrics,
              rawSummary: item.evidence.raw_summary,
            },
            aiExplanation: {
              summary: item.ai_explanation.summary,
              impact: item.ai_explanation.impact,
              recommendedAction: item.ai_explanation.recommended_action,
              isAiGenerated: item.ai_explanation.is_ai_generated,
              provider: item.ai_explanation.provider,
            },
            mitigation: item.mitigation ? {
              aclName: item.mitigation.acl_name,
              routerInterface: item.mitigation.router_interface,
              direction: item.mitigation.direction,
              ciscoCommand: item.mitigation.cisco_command,
              generatedAt: item.created_at,
              verifiedAt: item.mitigation.verified_at,
              verifiedBy: item.mitigation.verified_by,
              verificationNotes: item.mitigation.verification_notes,
            } : undefined,
          }));
          setIncidents(formatted);
          setIsLiveDb(true);
        }
      } catch {
        // Fallback to sample data if backend is offline
        setIsLiveDb(false);
      }
    };
    fetchIncidents();
  }, []);

  const criticalCount = incidents.filter(
    (i) => i.severity === 'CRITICAL' || i.severity === 'HIGH'
  ).length;

  const mitigatedCount = incidents.filter(
    (i) => i.status === 'MITIGATED' || i.status === 'MITIGATION_PROPOSED'
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-blue-500" />
            Campus Security Operations Center
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time threat detection and Cisco ACL mitigation pipeline for simulated campus network.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/detection"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Traffic Logs
          </Link>
          <Link
            to="/mitigation"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            Mitigation Center
          </Link>
        </div>
      </div>

      {/* Top Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Incidents"
          value={incidents.length}
          subtext="Simulated detection events recorded"
          icon={AlertCircle}
          badge={isLiveDb ? 'SQLite Live' : 'Sample Dataset'}
          badgeColor="blue"
        />
        <StatCard
          title="Critical & High Alerts"
          value={criticalCount}
          subtext="Require immediate ACL mitigation"
          icon={Flame}
          badge="Action Needed"
          badgeColor="rose"
        />
        <StatCard
          title="Mitigations Prepared"
          value={mitigatedCount}
          subtext="Cisco ACL commands staged"
          icon={CheckCircle2}
          badge="Packet Tracer"
          badgeColor="emerald"
        />
        <StatCard
          title="Campus Segments"
          value="3 VLANs"
          subtext="VLAN 10, VLAN 20, VLAN 30"
          icon={Network}
          badge="192.168.0.0/16"
          badgeColor="blue"
        />
      </div>

      {/* Charts Section: Attack Distribution & Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Incident Trend Chart (8 cols) */}
        <div className="lg:col-span-8 bg-[#111827]/90 border border-[#1f293d] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                Network Flow & Threat Detection Timeline
              </h3>
              <p className="text-xs text-slate-400">
                Log analysis volume and detected attack events over time
              </p>
            </div>
            <span className="text-[11px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">
              Sample Run: 2026-10-22
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={incidentTrendData}>
                <defs>
                  <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorThreat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="normalFlows"
                  name="Normal Flows (pkts/100)"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorNormal)"
                />
                <Area
                  type="monotone"
                  dataKey="portScan"
                  name="Port Scans"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="dosFlood"
                  name="DoS Traffic Spike"
                  stroke="#f43f5e"
                  fillOpacity={1}
                  fill="url(#colorThreat)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attack Type Breakdown (4 cols) */}
        <div className="lg:col-span-4 bg-[#111827]/90 border border-[#1f293d] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Attack Classification
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Breakdown of detected suspicious patterns
            </p>
          </div>

          <div className="h-52 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attackDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {attackDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>Primary Attacker IP:</span>
            <span className="font-mono text-rose-400 font-semibold">192.168.10.45</span>
          </div>
        </div>
      </div>

      {/* Recent Security Alerts Table */}
      <div className="bg-[#111827]/90 border border-[#1f293d] rounded-xl shadow-lg overflow-hidden">
        <div className="p-5 border-b border-[#1f293d] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              Active Security Alerts
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Detections generated from simulated flow logs and authentication events
            </p>
          </div>

          <Link
            to="/incidents"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
          >
            View all incidents <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-[#1f293d] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Threat Type</th>
                <th className="py-3 px-4">Attacker IP (Source)</th>
                <th className="py-3 px-4">Target (Destination)</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {incidents.slice(0, 5).map((incident) => (
                <tr
                  key={incident.id}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono text-blue-400 font-medium">
                    {incident.id}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-white">
                    {incident.title}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-rose-300">
                    {incident.sourceIp}
                    <span className="block text-[10px] text-slate-500">
                      {incident.evidence.sourceVlan}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {incident.destinationIp}
                    <span className="block text-[10px] text-slate-500">
                      {incident.evidence.targetVlan}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <SeverityBadge severity={incident.severity} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={incident.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to={`/incidents/${incident.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition-colors"
                    >
                      Investigate <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
