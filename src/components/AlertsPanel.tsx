import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import type { Alert } from '../data/mockData';
import { cn } from '../lib/utils';

interface AlertsPanelProps {
  alerts: Alert[];
}

const alertIconMap = {
  critical: <AlertCircle className="w-5 h-5 text-neon-red" />,
  warning: <AlertTriangle className="w-5 h-5 text-neon-yellow" />,
  info: <Info className="w-5 h-5 text-neon-blue" />,
};

const alertBorderMap = {
  critical: 'border-l-neon-red bg-neon-red/5',
  warning: 'border-l-neon-yellow bg-neon-yellow/5',
  info: 'border-l-neon-blue bg-neon-blue/5',
};

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  return (
    <div className="glass-panel p-6 flex flex-col h-full">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-industrial-800 rounded-lg border border-industrial-700 relative">
          <Bell className="w-5 h-5 text-slate-200" />
          {alerts.some(a => a.type === 'critical') && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-neon-red animate-ping" />
          )}
          {alerts.some(a => a.type === 'critical') && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-neon-red" />
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-wide text-slate-100">System Alerts</h2>
          <p className="text-xs text-slate-400">{alerts.length} Active Notifications</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        <AnimatePresence>
          {alerts.map((alert, idx) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "p-3 rounded-r-lg border-l-4 border-y border-r border-y-industrial-800 border-r-industrial-800 flex gap-3",
                alertBorderMap[alert.type]
              )}
            >
              <div className="mt-0.5">{alertIconMap[alert.type]}</div>
              <div className="flex-1">
                <p className="text-sm text-slate-200 font-medium">{alert.message}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">{alert.sector}</span>
                  <span className="text-xs text-slate-400">{alert.timestamp}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
