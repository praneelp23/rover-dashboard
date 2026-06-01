import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, Map as MapIcon } from 'lucide-react';
import type { HeatmapData, ParameterType } from '../data/mockData';
import { cn } from '../lib/utils';

interface SoilHeatmapProps {
  data: HeatmapData;
}

const parameters: { id: ParameterType; label: string; colorMap: (val: number) => string }[] = [
  { 
    id: 'nitrogen', 
    label: 'Nitrogen (N)', 
    colorMap: (val) => `rgba(34, 197, 94, ${val / 100})` // Green
  },
  { 
    id: 'phosphorus', 
    label: 'Phosphorus (P)', 
    colorMap: (val) => `rgba(168, 85, 247, ${val / 100})` // Purple
  },
  { 
    id: 'potassium', 
    label: 'Potassium (K)', 
    colorMap: (val) => `rgba(234, 179, 8, ${val / 150})` // Yellow
  },
  { 
    id: 'moisture', 
    label: 'Moisture', 
    colorMap: (val) => `rgba(59, 130, 246, ${val / 50})` // Blue
  },
];

export const SoilHeatmap: React.FC<SoilHeatmapProps> = ({ data }) => {
  const [selectedParam, setSelectedParam] = useState<ParameterType>('nitrogen');
  const [depth, setDepth] = useState<number>(5);

  const activeParamDef = parameters.find(p => p.id === selectedParam);

  return (
    <div className="glass-panel p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-industrial-800 rounded-lg border border-industrial-700">
            <MapIcon className="w-5 h-5 text-neon-blue" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-wide text-slate-100">Spatial Analysis</h2>
            <p className="text-xs text-slate-400">Sector Alpha - Grid View</p>
          </div>
        </div>
        
        {/* Parameter Selector */}
        <div className="flex bg-industrial-800 rounded-lg p-1 border border-industrial-700">
          {parameters.map(param => (
            <button
              key={param.id}
              onClick={() => setSelectedParam(param.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                selectedParam === param.id 
                  ? "bg-industrial-700 text-white shadow-md" 
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {param.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex gap-6">
        {/* Heatmap Grid */}
        <div className="flex-1 flex items-center justify-center bg-industrial-900/50 rounded-xl border border-industrial-800 p-4">
          <div 
            className="grid gap-1 w-full max-w-md aspect-square"
            style={{ 
              gridTemplateColumns: `repeat(${data.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${data.rows}, minmax(0, 1fr))`
            }}
          >
            {data.grid.map((cell, idx) => {
              // Simulate depth variation (mock logic for visual effect)
              const depthFactor = 1 - ((depth - 5) * 0.02);
              const val = cell[selectedParam] * depthFactor;
              
              return (
                <motion.div
                  key={`${cell.x}-${cell.y}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.005 }}
                  whileHover={{ scale: 1.1, zIndex: 10, borderColor: 'rgba(255,255,255,0.5)' }}
                  className="rounded-sm border border-industrial-700/30 cursor-crosshair transition-colors duration-500 relative group"
                  style={{ backgroundColor: activeParamDef?.colorMap(val) || '#1e293b' }}
                >
                  {/* Tooltip */}
                  <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-industrial-800 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap z-50 border border-industrial-700 shadow-xl transition-opacity">
                    ({cell.x}, {cell.y}): {val.toFixed(1)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Depth Slider */}
        <div className="w-16 flex flex-col items-center justify-between bg-industrial-900/50 rounded-xl border border-industrial-800 py-6">
          <Layers className="w-5 h-5 text-slate-400" />
          
          <div className="relative flex-1 flex items-center w-full my-4 justify-center">
            <input
              type="range"
              min="5"
              max="20"
              step="5"
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="absolute w-[200px] -rotate-90 appearance-none bg-industrial-700 h-1.5 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-neon-blue [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>
          
          <div className="text-center">
            <span className="block text-lg font-bold text-neon-blue">{depth}</span>
            <span className="block text-[10px] text-slate-500 uppercase tracking-wider">cm</span>
          </div>
        </div>
      </div>
    </div>
  );
};
