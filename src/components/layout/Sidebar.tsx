import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Sprout, Radar, Gamepad2, Settings2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'radar', label: 'Radar', icon: Radar },
    { id: 'control', label: 'Rover Control', icon: Gamepad2 },
    { id: 'settings', label: 'Settings', icon: Settings2 },
  ];

  return (
    <div className="w-64 bg-industrial-900 border-r border-industrial-800 flex flex-col h-full z-20 sticky top-0">
      <div className="p-6">
        <h2 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
          <Sprout className="w-6 h-6 text-neon-green" />
          AgriSync
        </h2>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={cn(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-industrial-800 text-neon-green border border-neon-green/20" 
                  : "text-slate-400 hover:bg-industrial-800/50 hover:text-slate-200 border border-transparent"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]")} />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 w-1 h-8 bg-neon-green rounded-r-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-industrial-800">
        <div className="bg-industrial-800/50 rounded-lg p-4 border border-industrial-700/50">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">System Status</p>
          <div className="flex items-center space-x-2 text-sm text-neon-green">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
            </span>
            <span>Online & Optimal</span>
          </div>
        </div>
      </div>
    </div>
  );
};
