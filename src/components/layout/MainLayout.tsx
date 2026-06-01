import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cpu, Network } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MainLayoutProps {
  isConnected: boolean;
  roverIp: string;
  setRoverIp: (ip: string) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  isConnected,
  roverIp,
  setRoverIp,
  children 
}) => {
  const [localIp, setLocalIp] = useState(roverIp);

  useEffect(() => {
    setLocalIp(roverIp);
  }, [roverIp]);

  const handleConnect = () => {
    setRoverIp(localIp);
    localStorage.setItem('roverIp', localIp);
  };

  return (
    <div className="flex flex-col min-h-screen bg-industrial-900 overflow-x-hidden selection:bg-neon-blue/30 selection:text-neon-blue">
      {/* Premium abstract grid overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.12] pointer-events-none z-0" />
      
      {/* Abstract background neon glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-15%] w-[45%] h-[45%] bg-neon-blue/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[35%] h-[35%] bg-neon-purple/8 rounded-full blur-[120px]" />
      </div>

      {/* Premium Widescreen Header */}
      <header className="h-20 bg-industrial-950/90 backdrop-blur-lg border-b border-industrial-800/80 relative z-20 flex items-center justify-between px-6 md:px-10 flex-shrink-0 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-gradient-to-br from-industrial-800 to-industrial-900 rounded-2xl border border-industrial-700/60 shadow-[0_0_15px_rgba(59,130,246,0.15)] flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-neon-blue/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Cpu className="w-6 h-6 text-neon-blue animate-pulse relative z-10" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent drop-shadow-sm font-mono uppercase">
              SOIL ROVER COMMAND
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-blue animate-ping" />
              <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Grid-Based Precision Farming System</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 md:space-x-6 relative z-10">
          
          {/* IP ENTRY CONNECTION PANEL */}
          <div className="flex items-center space-x-2 bg-industrial-900/90 border border-industrial-800/80 rounded-full px-3 py-1.5 shadow-[inset_0_0_8px_rgba(0,0,0,0.6)] focus-within:border-neon-blue/50 transition-all duration-300">
            <Network className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">ROVER IP:</span>
            <input
              type="text"
              value={localIp}
              onChange={(e) => setLocalIp(e.target.value)}
              placeholder="e.g. 192.168.4.1"
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              className="bg-transparent text-xs text-white font-mono focus:outline-none w-28 md:w-36 placeholder:text-slate-600"
            />
            <button
              onClick={handleConnect}
              className="px-3 py-1 bg-neon-blue/20 hover:bg-neon-blue hover:shadow-[0_0_8px_rgba(59,130,246,0.5)] border border-neon-blue/30 text-neon-blue hover:text-white rounded-full text-[9px] font-mono font-bold uppercase transition-all duration-200"
            >
              Connect
            </button>
          </div>

          {/* Connection Status */}
          <div className={cn(
            "flex items-center space-x-2 px-4 py-2 rounded-full border text-xs font-mono font-bold transition-all duration-300 shadow-md",
            isConnected 
              ? "bg-neon-green/10 border-neon-green/30 text-neon-green shadow-neon-green/5" 
              : "bg-neon-red/10 border-neon-red/30 text-neon-red shadow-neon-red/5"
          )}>
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 animate-pulse" />
                <span>ROVER CONNECTED</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-neon-red animate-pulse" />
                <span>ROVER OFFLINE</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative z-10">
        <div className="max-w-[1700px] mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
};
