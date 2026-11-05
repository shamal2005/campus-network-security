import React from 'react';
import type { IncidentStatus } from '../types';

interface StatusBadgeProps {
  status: IncidentStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config: Record<IncidentStatus, { label: string; style: string }> = {
    NEW: {
      label: 'New Alert',
      style: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    },
    INVESTIGATING: {
      label: 'Investigating',
      style: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    },
    MITIGATION_PROPOSED: {
      label: 'Mitigation Ready',
      style: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    },
    MITIGATED: {
      label: 'ACL Applied',
      style: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    },
    RESOLVED: {
      label: 'Resolved',
      style: 'bg-slate-700/50 text-slate-300 border-slate-600/30',
    },
  };

  const item = config[status] || { label: status, style: 'bg-slate-700 text-slate-300' };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${item.style}`}
    >
      {item.label}
    </span>
  );
};
