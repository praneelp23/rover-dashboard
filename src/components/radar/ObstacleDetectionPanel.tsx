import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldCheck, AlertOctagon, WifiOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ObstacleDetectionPanelProps {
  status: 'SAFE' | 'WARNING' | 'DANGER';
  distance: number;
  angle: number;
  direction: string;
  isConnected?: boolean;
}

export const ObstacleDetectionPanel: React.FC<ObstacleDetectionPanelProps> = ({
  status, distance, angle, direction, isConnected = false
}) => {
  
  const statusConfig = {
    SAFE: {
      color: 'text-neon-green',
      bg: 'bg-neon-green/10',
      border: 'border-neon-green/30',
      icon: ShieldCheck,
      text: 'Path Clear'
    },
    WARNING: {
      color: 'text-neon-yellow',
      bg: 'bg-neon-yellow/10',
      border: 'border-neon-yellow/30',
      icon: AlertTriangle,
      text: 'Obstacle Warning'
    },
    DANGER: {
      color: 'text-neon-red',
      bg: 'bg-neon-red/10',
      border: 'border-neon-red/30',
      icon: AlertOctagon,
      text: 'Obstacle Detected'
    },
    OFFLINE: {
      color: 'text-slate-500',
      bg: 'bg-slate-500/5',
      border: 'border-slate-800',
      icon: WifiOff,
      text: 'Link Offline'
    }
  };

  // Determine current active config based on connection status
  const currentStatus = isConnected ? status : 'OFFLINE';
  const currentConfig = statusConfig[currentStatus];
  const Icon = currentConfig.icon;

  return (
    <div className="glass-panel p-6 h-full flex flex-col justify-between">
      <h2 className="text-lg font-semibold tracking-wide text-slate-100 mb-6">Proximity Alert System</h2>
      
      <div className="flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStatus}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className={cn(
              "w-40 h-40 rounded-full flex flex-col items-center justify-center border-4 mb-8 shadow-2xl relative select-none",
              currentConfig.bg,
              currentConfig.border,
              isConnected && status === 'DANGER' && "animate-pulse"
            )}
          >
            {isConnected && status === 'DANGER' && (
              <div className="absolute inset-0 rounded-full border-4 border-neon-red scale-110 animate-ping opacity-20" />
            )}
            <Icon className={cn("w-12 h-12 mb-2", currentConfig.color)} />
            <span className={cn("font-bold text-xs tracking-widest uppercase", currentConfig.color)}>
              {currentConfig.text}
            </span>
          </motion.div>
        </AnimatePresence>

        <div className="w-full grid grid-cols-3 gap-4">
          <div className="bg-industrial-800/40 rounded-xl p-4 border border-industrial-850 text-center">
            <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Distance</div>
            <div className={cn("text-2xl font-bold font-mono", isConnected ? currentConfig.color : "text-slate-500")}>
              {isConnected ? distance : '-'}<span className="text-sm font-sans text-slate-500 ml-1">cm</span>
            </div>
          </div>
          <div className="bg-industrial-800/40 rounded-xl p-4 border border-industrial-850 text-center">
            <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Direction</div>
            <div className={cn("text-base font-bold mt-1", isConnected ? "text-slate-200" : "text-slate-500")}>
              {isConnected ? direction : 'Offline'}
            </div>
          </div>
          <div className="bg-industrial-800/40 rounded-xl p-4 border border-industrial-850 text-center">
            <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Angle</div>
            <div className={cn("text-2xl font-bold font-mono", isConnected ? "text-neon-blue" : "text-slate-500")}>
              {isConnected ? angle : '-'}<span className="text-sm font-sans text-slate-500 ml-1">°</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
