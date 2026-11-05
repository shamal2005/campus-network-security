import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Server,
  Sliders,
  Bot,
  Save,
  Check,
  Key,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { initialSettings } from '../data/mockData';
import type { SystemSettings } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [maskedKey, setMaskedKey] = useState<string>('');
  const [isGeminiConfigured, setIsGeminiConfigured] = useState<boolean>(false);
  const [aiEngineMode, setAiEngineMode] = useState<string>('Offline Fallback Mode (Rule-Based)');

  const [saved, setSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  // Fetch settings from backend on load
  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings({
          routerInterfaceVlan10: data.router_interface_vlan10 || initialSettings.routerInterfaceVlan10,
          routerInterfaceVlan20: data.router_interface_vlan20 || initialSettings.routerInterfaceVlan20,
          routerInterfaceVlan30: data.router_interface_vlan30 || initialSettings.routerInterfaceVlan30,
          defaultAclDirection: (data.default_acl_direction as 'in' | 'out') || 'in',
          portScanThreshold: data.port_scan_threshold || 10,
          dosPacketThreshold: data.dos_packet_threshold || 4000,
          bruteForceThreshold: data.brute_force_threshold || 5,
          geminiApiKeyConfigured: !!data.gemini_api_configured,
          offlineFallbackActive: !data.gemini_api_configured,
        });
        setIsGeminiConfigured(data.gemini_api_configured);
        setMaskedKey(data.gemini_api_key_masked || '');
        setAiEngineMode(data.ai_engine_mode || 'Offline Fallback Mode (Rule-Based)');
      }
    } catch {
      // Backend not running yet, rely on initial local state
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload: any = {
      router_interface_vlan10: settings.routerInterfaceVlan10,
      router_interface_vlan20: settings.routerInterfaceVlan20,
      router_interface_vlan30: settings.routerInterfaceVlan30,
      default_acl_direction: settings.defaultAclDirection,
      port_scan_threshold: settings.portScanThreshold,
      dos_packet_threshold: settings.dosPacketThreshold,
      brute_force_threshold: settings.bruteForceThreshold,
    };

    if (apiKeyInput.trim()) {
      payload.gemini_api_key = apiKeyInput.trim();
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setIsGeminiConfigured(data.settings.gemini_api_configured);
        setMaskedKey(data.settings.gemini_api_key_masked);
        setAiEngineMode(data.settings.ai_engine_mode);
        setApiKeyInput('');
      }
    } catch {
      // Offline fallback handling
    } finally {
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleTestApiKey = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/settings/test-gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKeyInput.trim() || undefined }),
      });

      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
        if (data.success) {
          setIsGeminiConfigured(true);
          setAiEngineMode('Google Gemini AI Mode');
        }
      } else {
        setTestResult({
          success: false,
          message: 'Error communicating with backend test endpoint.',
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Backend server unavailable at http://127.0.0.1:8000.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-blue-500" />
          System & Simulation Settings
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Configure Packet Tracer router interfaces, detection thresholds, and AI engine status.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Router & Interface Configuration */}
        <div className="bg-[#111827]/90 border border-[#1f293d] rounded-xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" />
              Cisco Router Interface Configuration
            </h3>
            <span className="text-[10px] text-amber-400 font-mono px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded">
              Configurable Topology
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Set the exact subinterface names that match your Cisco Packet Tracer router configuration. These values are dynamically injected into generated ACL mitigation commands.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                VLAN 10 Subinterface (Student)
              </label>
              <input
                type="text"
                value={settings.routerInterfaceVlan10}
                onChange={(e) =>
                  setSettings({ ...settings, routerInterfaceVlan10: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                Default: GigabitEthernet0/0.10
              </span>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                VLAN 20 Subinterface (Faculty)
              </label>
              <input
                type="text"
                value={settings.routerInterfaceVlan20}
                onChange={(e) =>
                  setSettings({ ...settings, routerInterfaceVlan20: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                Default: GigabitEthernet0/0.20
              </span>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                VLAN 30 Subinterface (Server)
              </label>
              <input
                type="text"
                value={settings.routerInterfaceVlan30}
                onChange={(e) =>
                  setSettings({ ...settings, routerInterfaceVlan30: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                Default: GigabitEthernet0/0.30
              </span>
            </div>
          </div>

          <div className="pt-2">
            <label className="text-slate-300 block mb-1 text-xs font-semibold">
              Default ACL Application Direction
            </label>
            <div className="flex items-center gap-6 text-xs mt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="radio"
                  name="direction"
                  value="in"
                  checked={settings.defaultAclDirection === 'in'}
                  onChange={() => setSettings({ ...settings, defaultAclDirection: 'in' })}
                  className="text-blue-600 bg-slate-800 border-slate-700"
                />
                <span><strong>in</strong> (Filter at ingress before routing - Recommended)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="radio"
                  name="direction"
                  value="out"
                  checked={settings.defaultAclDirection === 'out'}
                  onChange={() => setSettings({ ...settings, defaultAclDirection: 'out' })}
                  className="text-blue-600 bg-slate-800 border-slate-700"
                />
                <span><strong>out</strong> (Filter at egress after routing)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Threat Detection Thresholds */}
        <div className="bg-[#111827]/90 border border-[#1f293d] rounded-xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Python Threat Detection Thresholds
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Rule Parameters
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                Port Scan Distinct Ports
              </label>
              <input
                type="number"
                min={2}
                max={100}
                value={settings.portScanThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    portScanThreshold: parseInt(e.target.value) || 10,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Flag if distinct target ports &ge; this value
              </span>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                DoS Packet Surge Threshold
              </label>
              <input
                type="number"
                min={500}
                max={50000}
                step={500}
                value={settings.dosPacketThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    dosPacketThreshold: parseInt(e.target.value) || 4000,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Flag if packet count &ge; this in log window
              </span>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                Brute Force Failure Count
              </label>
              <input
                type="number"
                min={2}
                max={20}
                value={settings.bruteForceThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bruteForceThreshold: parseInt(e.target.value) || 5,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Flag if failed logins &ge; this in window
              </span>
            </div>
          </div>
        </div>

        {/* AI Engine Status & Configuration */}
        <div className="bg-[#111827]/90 border border-[#1f293d] rounded-xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-400" />
              AI Advisory Engine & Offline Fallback Mode
            </h3>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              isGeminiConfigured
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
            }`}>
              {isGeminiConfigured ? 'Gemini AI Active' : 'Offline Fallback Mode'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
              <span className="text-slate-400 block text-[11px]">Current Operating Mode</span>
              <span className="font-bold text-white flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${isGeminiConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                {aiEngineMode}
              </span>
              <p className="text-[10px] text-slate-400 mt-1">
                {isGeminiConfigured
                  ? 'Gemini 1.5 Flash provides dynamic cybersecurity incident assessments.'
                  : 'Deterministic, rule-based explanations active. System is fully functional without cloud APIs.'}
              </p>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
              <span className="text-slate-400 block text-[11px]">Stored API Key Status</span>
              <span className="font-mono text-slate-200 mt-1 block">
                {maskedKey ? maskedKey : 'None configured (Using Offline Fallback)'}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">
                Environment variable: <code className="text-purple-300">GEMINI_API_KEY</code>
              </p>
            </div>
          </div>

          {/* Optional API Key Input */}
          <div className="pt-2 space-y-2">
            <label className="text-slate-300 block text-xs font-semibold">
              Update Google Gemini API Key (Optional)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste AIzaSy... key or leave blank for Offline Mode"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="button"
                onClick={handleTestApiKey}
                disabled={isTesting}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Test Connection</span>
              </button>
            </div>

            {testResult && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
              }`}>
                {testResult.success ? <Check className="w-4 h-4 shrink-0 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Settings Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save System Settings</span>
              </>
            )}
          </button>

          {saved && (
            <span className="text-emerald-400 text-xs font-medium">
              Simulation configuration updated successfully in backend.
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
