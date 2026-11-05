import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: 'rose' | 'amber' | 'emerald' | 'blue';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  badge,
  badgeColor = 'blue',
}) => {
  const badgeClasses = {
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <div className="bg-[#111827]/80 border border-[#1f293d] rounded-xl p-5 shadow-lg relative overflow-hidden backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700/50 text-slate-300">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        <span className="text-3xl font-bold font-mono tracking-tight text-white">
          {value}
        </span>
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded border ${badgeClasses[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
          {subtext}
        </p>
      )}
    </div>
  );
};
