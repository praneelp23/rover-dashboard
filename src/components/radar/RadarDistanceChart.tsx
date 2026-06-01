import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { RadarDataPoint } from '../../hooks/useRadarWebSocket';

interface RadarDistanceChartProps {
  latestPoint: RadarDataPoint | null;
}

export const RadarDistanceChart: React.FC<RadarDistanceChartProps> = ({ latestPoint }) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!latestPoint) return;
    
    // Only update every 5th point to avoid overwhelming the chart
    if (Math.round(latestPoint.angle) % 15 !== 0) return;

    setData(prev => {
      const newData = [...prev, {
        time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
        distance: latestPoint.distance,
      }];
      // Keep last 30 data points
      if (newData.length > 30) {
        return newData.slice(newData.length - 30);
      }
      return newData;
    });
  }, [latestPoint]);

  return (
    <div className="glass-panel p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold tracking-wide text-slate-100 mb-6">Distance Trend</h2>
      <div className="flex-1 w-full h-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDistance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#64748b" 
              fontSize={10} 
              tickMargin={10}
              minTickGap={20}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={10} 
              domain={[0, 100]} 
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                color: '#f8fafc'
              }}
              itemStyle={{ color: '#3b82f6' }}
            />
            <Area 
              type="monotone" 
              dataKey="distance" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorDistance)" 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
