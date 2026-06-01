import React from 'react';
import { motion } from 'framer-motion';
import { Droplet, Thermometer, FlaskConical, Activity, Zap, Beaker, Sprout } from 'lucide-react';
import type { SensorCurrentValue } from '../data/mockData';
import { cn } from '../lib/utils';
import { AnimatedNumber } from './AnimatedNumber';

interface SensorCardsProps {
  sensors: SensorCurrentValue[];
}

const iconMap: Record<string, React.ReactNode> = {
  nitrogen: <Sprout className="w-5 h-5" />,
  phosphorus: <FlaskConical className="w-5 h-5" />,
  potassium: <Beaker className="w-5 h-5" />,
  ph: <Activity className="w-5 h-5" />,
  moisture: <Droplet className="w-5 h-5" />,
  temperature: <Thermometer className="w-5 h-5" />,
  ec: <Zap className="w-5 h-5" />,
};

const statusColorMap = {
  normal: 'text-neon-green',
  warning: 'text-neon-yellow',
  critical: 'text-neon-red animate-pulse',
};

const bgStatusMap = {
  normal: 'bg-neon-green/10 border-neon-green/20',
  warning: 'bg-neon-yellow/10 border-neon-yellow/20',
  critical: 'bg-neon-red/10 border-neon-red/30',
};

export const SensorCards: React.FC<SensorCardsProps> = ({ sensors }) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4"
    >
      {sensors.map((sensor) => (
        <motion.div
          key={sensor.id}
          variants={item}
          whileHover={{ scale: 1.02, translateY: -2 }}
          className={cn(
            "glass-card p-4 flex flex-col justify-between h-32 relative overflow-hidden",
            bgStatusMap[sensor.status]
          )}
        >
          {/* Subtle background glow */}
          <div className={cn(
            "absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-20",
            sensor.status === 'critical' ? 'bg-neon-red' : sensor.status === 'warning' ? 'bg-neon-yellow' : 'bg-neon-green'
          )} />

          <div className="flex justify-between items-start z-10">
            <span className="text-sm font-medium text-slate-400">{sensor.name}</span>
            <div className={cn("p-1.5 rounded-lg bg-industrial-900/50 backdrop-blur-sm", statusColorMap[sensor.status])}>
              {iconMap[sensor.id]}
            </div>
          </div>
          
          <div className="z-10 mt-2">
            <div className="flex items-baseline space-x-1">
              <span className={cn("text-2xl font-bold tracking-tight", statusColorMap[sensor.status])}>
                <AnimatedNumber 
                  value={sensor.value} 
                  decimals={['ph', 'ec', 'temperature'].includes(sensor.id) ? 1 : 0} 
                />
              </span>
              <span className="text-xs text-slate-500 font-medium">{sensor.unit}</span>
            </div>
            
            {/* Mini Progress Bar */}
            <div className="mt-2 h-1 w-full bg-industrial-900/50 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-1000 ease-out",
                  sensor.status === 'critical' ? 'bg-neon-red' : sensor.status === 'warning' ? 'bg-neon-yellow' : 'bg-neon-green'
                )}
                style={{ width: `${Math.min(100, Math.max(0, ((sensor.value - sensor.min) / (sensor.max - sensor.min)) * 100))}%` }}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};
