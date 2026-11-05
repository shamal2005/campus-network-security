import React, { useState, useEffect } from 'react';
import { Menu, Bot, Server, Info } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  geminiActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  geminiActive = false,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-[#0b0f19]/90 border-b border-[#1f293d] sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Lab simulation banner */}
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-md text-amber-300 text-xs">
          <Info className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
          <span className="font-semibold hidden sm:inline">LAB SIMULATION:</span>
          <span>Sample Data / Packet Tracer Environment</span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* AI Mode indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border font-medium ${
            geminiActive
              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
          title={
            geminiActive
              ? 'Connected to Google Gemini API'
              : 'Running in deterministic rule-based offline explanation mode'
          }
        >
          <Bot className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">AI Engine:</span>
          <span>
            {geminiActive ? 'Gemini 1.5' : 'Offline Rule Mode'}
          </span>
        </div>

        {/* Network Gateway Target */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md font-mono">
          <Server className="w-3.5 h-3.5 text-blue-400" />
          <span>GW: 192.168.10.1</span>
        </div>

        {/* Live System Time */}
        <div className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 hidden sm:block">
          {timeStr || '00:00:00'}
        </div>
      </div>
    </header>
  );
};
