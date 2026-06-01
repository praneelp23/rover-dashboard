import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TopNavbarProps {
  pageTitle: string;
  isConnected: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ pageTitle, isConnected }) => {
  return (
    <header className="h-20 bg-industrial-900/80 backdrop-blur-md border-b border-industrial-800 sticky top-0 z-20 flex items-center justify-between px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
          {pageTitle}
        </h1>
        <p className="text-sm text-slate-400 font-medium">Soil Rover Dashboard</p>
      </div>

      <div className="flex items-center space-x-6">
        {/* Connection Status */}
        <div className={cn(
          "flex items-center space-x-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors",
          isConnected 
            ? "bg-neon-green/10 border-neon-green/20 text-neon-green" 
            : "bg-neon-red/10 border-neon-red/20 text-neon-red"
        )}>
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4" />
              <span>Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 animate-pulse" />
              <span>Offline</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
