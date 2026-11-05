import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  Terminal,
  Clock,
  Activity,
  Layers,
  History,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { sampleIncidents } from '../data/mockData';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import type { SecurityIncident, IncidentStatus, Severity } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000';

interface AuditItem {
  id: number;
  action: string;
  details: string;
  performed_by: string;
  timestamp: string;
}

export const IncidentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [incidentData, setIncidentData] = useState<SecurityIncident | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditItem[]>([]);
  const [currentStatus, setCurrentStatus] = useState<IncidentStatus>('NEW');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState<boolean>(false);

  const handleTriggerGemini = async () => {
    if (!id) return;
    setIsAnalyzingAI(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/${id}/explain-gemini`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchIncidentDetails();
      }
    } catch {
      // offline handling
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const fetchIncidentDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/${id}`);
      if (res.ok) {
        const item = await res.json();
        const formatted: SecurityIncident = {
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
        };
        setIncidentData(formatted);
        setCurrentStatus(formatted.status);
        setAuditHistory(item.audit_history || []);
      } else {
        throw new Error('Not found in backend');
      }
    } catch {
      // Fallback to local sample dataset
      const local = sampleIncidents.find((i) => i.id === id) || sampleIncidents[0];
      setIncidentData(local);
      setCurrentStatus(local.status);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentDetails();
  }, [id]);

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    setStatusUpdating(true);
    setStatusMessage(null);
    setCurrentStatus(newStatus);

    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes: `Updated status via Security Operations Center to ${newStatus}.`,
          performed_by: 'Security Administrator',
        }),
      });

      if (res.ok) {
        setStatusMessage(`Status updated to ${newStatus} in database.`);
        fetchIncidentDetails();
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch {
      setStatusMessage(`Status locally set to ${newStatus} (backend offline).`);
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setStatusUpdating(false);
    }
  };

  if (isLoading || !incidentData) {
    return (
      <div className="py-16 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading incident details from database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Incident History
        </Link>

        {/* Status update switcher */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Status:</span>
          <select
            value={currentStatus}
            disabled={statusUpdating}
            onChange={(e) => handleStatusChange(e.target.value as IncidentStatus)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="NEW">NEW</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="MITIGATION_PROPOSED">MITIGATION_PROPOSED</option>
            <option value="MITIGATED">MITIGATED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
          {statusUpdating && <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Incident Header Banner */}
      <div className="bg-[#111827]/90 border border-[#1f293d] rounded-xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-blue-400 font-bold">
                {incidentData.id}
              </span>
              <SeverityBadge severity={incidentData.severity} size="sm" />
              <StatusBadge status={currentStatus} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {incidentData.title}
            </h2>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5" />
                Detected: {incidentData.detectedAt}
              </span>
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                Category: {incidentData.attackType}
              </span>
            </div>
          </div>

          <Link
            to="/mitigation"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <Terminal className="w-4 h-4 text-emerald-300" />
            Review Cisco Mitigation
          </Link>
        </div>
      </div>

      {/* Two-Column Grid: Evidence on Left, AI Explanation on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Detection Evidence Panel (6 cols) */}
        <div className="lg:col-span-6 bg-[#111827]/90 border border-[#1f293d] rounded-xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Empirical Evidence (Python Rules Engine)
            </h3>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              Deterministic Output
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg">
              <span className="text-[11px] text-slate-400 block">Attacker IP (Source)</span>
              <span className="font-mono text-sm font-bold text-rose-400">
                {incidentData.sourceIp}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {incidentData.evidence.sourceVlan}
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg">
              <span className="text-[11px] text-slate-400 block">Target Server (Destination)</span>
              <span className="font-mono text-sm font-bold text-slate-200">
                {incidentData.destinationIp}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {incidentData.evidence.targetVlan}
              </span>
            </div>
          </div>

          {/* Metric breakdown */}
          <div className="space-y-2 text-xs">
            <span className="font-semibold text-slate-300 block">Measurement Metrics:</span>
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg divide-y divide-slate-800/80">
              {incidentData.evidence.metrics.map((metric, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <span className="text-slate-400">{metric.label}</span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-white">
                      {metric.value}
                    </span>
                    {metric.threshold && (
                      <span className="text-[10px] text-rose-400 block">
                        Threshold: {metric.threshold}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Raw log summary */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-xs">
            <span className="font-semibold text-slate-300 block mb-1">
              Log Signature Summary:
            </span>
            <p className="font-mono text-[11px] text-slate-300">
              {incidentData.evidence.rawSummary}
            </p>
          </div>
        </div>

        {/* AI Threat Explanation Panel (6 cols) */}
        <div className="lg:col-span-6 bg-[#111827]/90 border border-[#1f293d] rounded-xl p-6 shadow-lg space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                AI Security Analysis & Advisory
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerGemini}
                  disabled={isAnalyzingAI}
                  className="px-2.5 py-1 text-[11px] bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Run or re-evaluate assessment with Google Gemini AI"
                >
                  {isAnalyzingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-purple-400" />}
                  <span>{isAnalyzingAI ? 'Evaluating...' : 'Run Gemini Assessment'}</span>
                </button>
                {/* Provider Badge */}
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    incidentData.aiExplanation?.isAiGenerated
                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {incidentData.aiExplanation?.provider || 'Offline Rule-Based Engine'}
                </span>
              </div>
            </div>

            {/* Offline fallback disclaimer if not live AI */}
            {!incidentData.aiExplanation?.isAiGenerated && (
              <div className="bg-amber-500/10 border border-amber-500/25 p-2.5 rounded-lg text-[11px] text-amber-200">
                <strong>Offline Fallback Mode:</strong> Deterministic rule-based threat advisory active. (Dynamic Gemini explanation is configured in Layer 5).
              </div>
            )}

            {/* Explanation section 1: Threat Summary */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                1. What Was Detected & Why It Is Suspicious
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                {incidentData.aiExplanation?.summary}
              </p>
            </div>

            {/* Explanation section 2: Potential Impact */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                2. Potential Impact on Campus Network
              </h4>
              <p className="text-xs text-rose-300 leading-relaxed bg-rose-500/5 p-3 rounded-lg border border-rose-500/20">
                {incidentData.aiExplanation?.impact}
              </p>
            </div>

            {/* Explanation section 3: Recommended Defense */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                3. Recommended Defensive Response
              </h4>
              <p className="text-xs text-emerald-300 leading-relaxed bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/20">
                {incidentData.aiExplanation?.recommendedAction}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Stored persistently in SQLite database (<code className="text-slate-400">campus_security.db</code>).
          </div>
        </div>
      </div>

      {/* Audit History Timeline Panel */}
      {auditHistory.length > 0 && (
        <div className="bg-[#111827]/90 border border-[#1f293d] rounded-xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />
              Incident Audit Trail & Activity Log
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {auditHistory.length} Record(s) in SQLite
            </span>
          </div>

          <div className="space-y-3">
            {auditHistory.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-400 font-bold uppercase text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                      {item.action}
                    </span>
                    <span className="text-slate-300">{item.details}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Performed by: {item.performed_by}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-slate-400 whitespace-nowrap">
                  {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
