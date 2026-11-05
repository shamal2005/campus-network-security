import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  geminiActive?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ geminiActive = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          geminiActive={geminiActive}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Global Footer */}
        <footer className="border-t border-[#1f293d] py-4 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            AI-Powered Campus Network Security System &bull; Cisco Packet Tracer Simulation Lab
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Packet Tracer Subnet: 192.168.10.0/24, 20.0/24, 30.0/24
          </div>
        </footer>
      </div>
    </div>
  );
};
