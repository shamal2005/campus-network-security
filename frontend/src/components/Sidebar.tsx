import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldAlert,
  Network,
  UploadCloud,
  AlertTriangle,
  Terminal,
  History,
  Settings,
  ShieldCheck,
  Radio,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { to: '/', label: 'Security Overview', icon: ShieldAlert },
    { to: '/network', label: 'Network Map', icon: Network },
    { to: '/detection', label: 'Threat Detection', icon: UploadCloud },
    { to: '/incidents', label: 'Incidents', icon: AlertTriangle },
    { to: '/mitigation', label: 'Mitigation Center', icon: Terminal },
    { to: '/history', label: 'Audit History', icon: History },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0b0f19] border-r border-[#1f293d] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[#1f293d] gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">
              CAMPUS DEFENDER
            </h1>
            <p className="text-[10px] text-blue-400 font-mono tracking-wider uppercase">
              AI Security Lab
            </p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            Operations
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Cisco Packet Tracer lab status card */}
        <div className="p-4 border-t border-[#1f293d]">
          <div className="bg-[#111827] border border-blue-900/30 rounded-lg p-3 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Packet Tracer Lab
              </span>
              <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                READY
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              VLAN 10, 20, 30 Topology configured.
            </p>
            <div className="text-[10px] text-slate-500 font-mono">
              Gateway: 192.168.10.1 (ROAS)
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
