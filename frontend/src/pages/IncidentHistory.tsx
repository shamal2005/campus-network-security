import React, { useState, useEffect } from 'react';
import { History, Search, Filter, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sampleIncidents } from '../data/mockData';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import type { SecurityIncident, Severity, IncidentStatus } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000';

export const IncidentHistory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLiveDb, setIsLiveDb] = useState<boolean>(false);

  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (severityFilter !== 'ALL') params.append('severity', severityFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`${API_BASE_URL}/api/incidents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Map backend format to SecurityIncident format
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
      } else {
        throw new Error('Backend returned non-200');
      }
    } catch {
      // Fallback to local client data if backend is offline
      const filtered = sampleIncidents.filter((incident) => {
        const matchesSearch =
          incident.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          incident.sourceIp.includes(searchTerm) ||
          incident.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSeverity = severityFilter === 'ALL' || incident.severity === severityFilter;
        const matchesStatus = statusFilter === 'ALL' || incident.status === statusFilter;
        return matchesSearch && matchesSeverity && matchesStatus;
      });
      setIncidents(filtered);
      setIsLiveDb(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [severityFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIncidents();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-blue-500" />
            Security Incident & Audit History
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Persisted incidents from SQLite database showing detections, AI explanations, and mitigation statuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2.5 py-1 rounded-md border font-mono ${
              isLiveDb
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
          >
            {isLiveDb ? 'SQLite: campus_security.db' : 'Client Simulation'}
          </span>
          <button
            onClick={fetchIncidents}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <form
        onSubmit={handleSearchSubmit}
        className="bg-[#111827]/90 border border-[#1f293d] rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by ID, IP, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Severity & Status Dropdowns */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="MITIGATION_PROPOSED">Mitigation Proposed</option>
              <option value="MITIGATED">Mitigated</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>
      </form>

      {/* Audit History Table */}
      <div className="bg-[#111827]/90 border border-[#1f293d] rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-[#1f293d] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Threat Classification</th>
                <th className="py-3 px-4">Source &rarr; Target</th>
                <th className="py-3 px-4">Detected Timestamp</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                    Loading incidents from SQLite database...
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                    No incidents match your filter criteria.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-blue-400 font-bold">
                      {inc.id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">
                      {inc.title}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <span className="text-rose-300">{inc.sourceIp}</span>
                      <span className="text-slate-500 mx-1.5">&rarr;</span>
                      <span className="text-slate-300">{inc.destinationIp}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {inc.detectedAt}
                    </td>
                    <td className="py-3.5 px-4">
                      <SeverityBadge severity={inc.severity} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={inc.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/incidents/${inc.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition-colors"
                      >
                        Inspect <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
