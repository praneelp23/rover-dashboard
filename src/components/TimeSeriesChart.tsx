import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';
import type { TimeSeriesPoint } from '../data/mockData';
import { cn } from '../lib/utils';

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  title: string;
  unit: string;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data, title, unit }) => {
  const [activeView, setActiveView] = useState<'both' | 'shallow' | 'deep'>('both');

  return (
    <div className="glass-panel p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-industrial-800 rounded-lg border border-industrial-700">
            <LineChartIcon className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-wide text-slate-100">{title} Trends</h2>
            <p className="text-xs text-slate-400">24-Hour Historical Data ({unit})</p>
          </div>
        </div>

        <div className="flex bg-industrial-800 rounded-lg p-1 border border-industrial-700">
          {(['both', 'shallow', 'deep'] as const).map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all capitalize",
                activeView === view 
                  ? "bg-industrial-700 text-white shadow-md" 
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorShallow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorDeep" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tick={{fill: '#64748b'}}
              tickFormatter={(value, i) => i % 4 === 0 ? value : ''} // Decimate ticks
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tick={{fill: '#64748b'}}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                borderColor: '#334155',
                backdropFilter: 'blur(8px)',
                borderRadius: '0.5rem',
                color: '#f8fafc'
              }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle"
              wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
            />
            
            {(activeView === 'both' || activeView === 'shallow') && (
              <Area 
                type="monotone" 
                dataKey="shallow" 
                name="Shallow (5cm)" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorShallow)" 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
              />
            )}
            
            {(activeView === 'both' || activeView === 'deep') && (
              <Area 
                type="monotone" 
                dataKey="deep" 
                name="Deep (15cm)" 
                stroke="#a855f7" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorDeep)" 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#a855f7' }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
