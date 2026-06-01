import React, { useEffect, useRef } from 'react';
import { Terminal, Trash2 } from 'lucide-react';

interface TerminalLogPanelProps {
  logs: string[];
  onClear?: () => void;
}

export const TerminalLogPanel: React.FC<TerminalLogPanelProps> = ({ logs, onClear }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="glass-panel p-6 flex flex-col h-full min-h-[250px] relative overflow-hidden">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-industrial-800 pb-4 mb-4 select-none">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-industrial-900 rounded-lg border border-industrial-800">
            <Terminal className="w-5 h-5 text-neon-green" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-wide text-slate-100">Rover Diagnostics</h2>
            <p className="text-xs text-slate-400">Live Serial & Blynk console logs</p>
          </div>
        </div>

        {onClear && (
          <button 
            onClick={onClear}
            className="p-1.5 bg-industrial-900 hover:bg-industrial-800 border border-industrial-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Clear Terminal Logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* TERMINAL CONTENT */}
      <div 
        ref={containerRef}
        className="flex-1 bg-black/45 rounded-xl border border-industrial-900 p-4 font-mono text-xs text-neon-green overflow-y-auto space-y-2 max-h-[300px] shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)] scrollbar-thin"
      >
        {logs.length === 0 ? (
          <div className="text-slate-500 italic select-none">Waiting for rover telemetry...</div>
        ) : (
          logs.map((log, index) => {
            // Check if log contains error or obstacle
            const isAlert = log.includes('OBSTACLE') || log.includes('Waiting') || log.includes('No GPS');
            const isNav = log.includes('TARGET REACHED') || log.includes('HOME REACHED');
            
            return (
              <div 
                key={index} 
                className={`leading-relaxed border-b border-black/10 pb-0.5 last:border-b-0 flex gap-2 ${
                  isAlert ? "text-neon-yellow" : isNav ? "text-neon-green font-bold animate-pulse" : "text-neon-green/90"
                }`}
              >
                <span className="text-neon-blue select-none font-bold">&gt;</span>
                <span className="break-all">{log}</span>
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER */}
      <div className="mt-3 flex items-center justify-between text-[9px] uppercase tracking-wider text-slate-500 select-none font-mono">
        <span>Baud: 115200</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-ping" />
          Streaming Telemetry
        </span>
      </div>

    </div>
  );
};
