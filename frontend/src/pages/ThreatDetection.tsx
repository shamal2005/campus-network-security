import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  Play,
  Database,
  ArrowRight,
  Info,
  Loader2,
  XCircle,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SeverityBadge } from '../components/SeverityBadge';
import type { UploadApiResponse, BackendIncidentItem } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000';

export const ThreatDetection: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string>('port_scan');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<UploadApiResponse | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server returned status ${res.status}`);
      }

      const data: UploadApiResponse = await res.json();
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect to threat detection backend.';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleRunSampleScenario = async (scenario: string) => {
    setSelectedScenario(scenario);
    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload-sample?scenario=${scenario}`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${res.status}`);
      }

      const data: UploadApiResponse = await res.json();
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error testing sample file.';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-blue-500" />
          Threat Detection & Log Ingestion
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Upload network traffic flows or authentication logs to evaluate deterministic Python detection rules in real time.
        </p>
      </div>

      {/* Main Grid: Upload Area on Left, Pre-Loaded Sample Tests on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload Dropzone (7 cols) */}
        <div className="lg:col-span-7 bg-[#111827]/90 border border-[#1f293d] rounded-xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Upload Traffic / Event Logs
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              FastAPI Endpoint: /api/upload
            </span>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />

          {/* Interactive Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              isDragOver
                ? 'border-blue-400 bg-blue-500/10'
                : 'border-slate-700 hover:border-blue-500/60 bg-slate-900/40'
            }`}
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-3" />
                <p className="text-sm font-semibold text-white">
                  Evaluating Python Detection Rules...
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Parsing CSV headers, validating IP addresses, and testing thresholds
                </p>
              </div>
            ) : (
              <>
                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-200">
                  Drag & Drop your CSV log file here
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports <span className="font-mono text-blue-400">network_traffic.csv</span> and{' '}
                  <span className="font-mono text-purple-400">auth_events.csv</span>
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Browse Local Files
                </button>
              </>
            )}
          </div>

          {/* Validation or Server Error Banner */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-rose-200">CSV Validation Error</span>
                <p className="text-[11px] text-rose-300 mt-0.5 whitespace-pre-line font-mono">
                  {errorMsg}
                </p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {result && !errorMsg && (
            <div
              className={`p-3.5 rounded-lg text-xs flex items-center justify-between border ${
                result.status === 'THREATS_DETECTED'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {result.status === 'THREATS_DETECTED' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                )}
                <span>{result.message}</span>
              </div>
              <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-current">
                {result.status}
              </span>
            </div>
          )}

          {/* Supported Format Specification */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              Required CSV Column Specifications
            </div>
            <div className="space-y-1.5 font-mono text-[11px] text-slate-400">
              <div>
                <span className="text-blue-400 font-bold">Network Traffic:</span>{' '}
                timestamp, source_ip, destination_ip, source_port, destination_port, protocol, packet_count, byte_count
              </div>
              <div>
                <span className="text-purple-400 font-bold">Authentication:</span>{' '}
                timestamp, source_ip, destination_ip, service, username, auth_status
              </div>
            </div>
          </div>
        </div>

        {/* Ready Demonstration Scenarios (5 cols) */}
        <div className="lg:col-span-5 bg-[#111827]/90 border border-[#1f293d] rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                Pre-Packaged Sample Scenarios
              </h3>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                Live Backend Test
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Click any scenario to test the Python detection engine with realistic Packet Tracer log data:
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleRunSampleScenario('port_scan')}
                disabled={isLoading}
                className={`w-full p-3 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                  selectedScenario === 'port_scan'
                    ? 'bg-blue-600/15 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <span className="font-bold text-white block">
                    Scenario 1: Port Scanning Attack
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    port_scan_attack.csv &rarr; Probes 16 ports on Server
                  </span>
                </div>
                <Play className="w-4 h-4 text-blue-400" />
              </button>

              <button
                onClick={() => handleRunSampleScenario('dos_flood')}
                disabled={isLoading}
                className={`w-full p-3 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                  selectedScenario === 'dos_flood'
                    ? 'bg-rose-600/15 border-rose-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <span className="font-bold text-white block">
                    Scenario 2: DoS-Like Traffic Flood
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    dos_flood_attack.csv &rarr; 51,800 packets in 30s
                  </span>
                </div>
                <Play className="w-4 h-4 text-rose-400" />
              </button>

              <button
                onClick={() => handleRunSampleScenario('brute_force')}
                disabled={isLoading}
                className={`w-full p-3 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                  selectedScenario === 'brute_force'
                    ? 'bg-amber-600/15 border-amber-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <span className="font-bold text-white block">
                    Scenario 3: SSH Brute-Force Logins
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    auth_brute_force.csv &rarr; 10 failed login attempts
                  </span>
                </div>
                <Play className="w-4 h-4 text-amber-400" />
              </button>

              <button
                onClick={() => handleRunSampleScenario('normal')}
                disabled={isLoading}
                className={`w-full p-3 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                  selectedScenario === 'normal'
                    ? 'bg-emerald-600/15 border-emerald-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <span className="font-bold text-white block">
                    Scenario 4: Normal Traffic Baseline
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    normal_traffic.csv &rarr; Safe student/faculty traffic
                  </span>
                </div>
                <Play className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            Files stored in: <code className="text-slate-400">sample_data/*.csv</code>
          </div>
        </div>
      </div>

      {/* Detection Results Container */}
      {result && (
        <div className="bg-[#111827]/90 border border-[#1f293d] rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                Detection Output: {result.filename}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Type: <span className="font-mono text-slate-300">{result.log_type}</span> &bull; Scanned Records: <span className="font-mono text-slate-300">{result.total_records_processed}</span> &bull; Identified Incidents: <span className="font-mono text-rose-400 font-bold">{result.incidents_count}</span>
              </p>
            </div>

            {result.incidents_count > 0 && (
              <Link
                to="/mitigation"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Go to Mitigation Center <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {result.incidents_count === 0 ? (
            <div className="p-6 text-center space-y-2 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">Clean Traffic Baseline</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All records evaluated in {result.filename} fall within baseline campus thresholds. No port sweeps, volumetric packet spikes, or brute-force logins were identified.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {result.incidents.map((inc: BackendIncidentItem) => (
                <div
                  key={inc.id}
                  className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-blue-400 font-bold">
                        {inc.id}
                      </span>
                      <SeverityBadge severity={inc.severity} size="sm" />
                      <span className="text-xs font-bold text-white">
                        {inc.title}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400">
                      Timestamp: {inc.detected_at}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800/80">
                      <span className="text-slate-400 block text-[11px]">Suspicious Source</span>
                      <span className="font-mono text-rose-400 font-bold">
                        {inc.source_ip}
                      </span>
                      <span className="text-slate-500 block text-[10px]">
                        {inc.evidence.source_vlan}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800/80">
                      <span className="text-slate-400 block text-[11px]">Target Destination</span>
                      <span className="font-mono text-slate-200 font-bold">
                        {inc.destination_ip}
                      </span>
                      <span className="text-slate-500 block text-[10px]">
                        {inc.evidence.target_vlan}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800/80">
                      <span className="text-slate-400 block text-[11px]">Time Window</span>
                      <span className="font-mono text-amber-300 font-bold">
                        {inc.evidence.time_window}
                      </span>
                    </div>
                  </div>

                  {/* Metrics list */}
                  <div className="p-3 bg-slate-950/40 rounded border border-slate-800/60 text-xs space-y-1.5">
                    <span className="font-semibold text-slate-300 block text-[11px]">
                      Detection Evidence:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {inc.evidence.metrics.map((m, mIdx) => (
                        <div key={mIdx} className="bg-slate-900/80 p-2 rounded border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">{m.label}</span>
                          <span className="font-mono font-bold text-white text-xs">{m.value}</span>
                          {m.threshold && (
                            <span className="text-[10px] text-rose-400 block mt-0.5">
                              {m.threshold}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono pt-1">
                      {inc.evidence.raw_summary}
                    </p>
                  </div>

                  {/* Rule explanation */}
                  <div className="p-3 bg-purple-950/10 border border-purple-500/20 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-purple-300">
                        Rule Advisory ({inc.ai_explanation.provider}):
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {inc.ai_explanation.summary}
                    </p>
                    <p className="text-emerald-300 text-[11px] font-semibold pt-0.5">
                      Recommended: {inc.ai_explanation.recommended_action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
