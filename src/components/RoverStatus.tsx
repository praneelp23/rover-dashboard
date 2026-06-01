import React from 'react';
import { Battery, Wifi, Compass } from 'lucide-react';
import type { RoverStatus as RoverStatusType } from '../data/mockData';
import { cn } from '../lib/utils';
import { LiveMap } from './LiveMap';

interface RoverStatusProps {
  status: RoverStatusType;
  radarWs?: any;
}

export const RoverStatus: React.FC<RoverStatusProps> = ({ status: _status, radarWs }) => {
  const isConnected = radarWs ? radarWs.isConnected : false; // Only active when websocket reports connection
  const batteryVal = isConnected ? (radarWs ? radarWs.battery : 0) : 0;
  const modeVal = isConnected ? (radarWs ? (radarWs.autoMode ? 'autonomous' : 'manual') : 'manual') : 'manual';
  
  // Coordinates
  const currentLat = isConnected ? (radarWs ? radarWs.lat : 0) : 0;
  const currentLon = isConnected ? (radarWs ? radarWs.lon : 0) : 0;
  const homeLat = isConnected ? (radarWs ? radarWs.homeLat : 0) : 0;
  const homeLon = isConnected ? (radarWs ? radarWs.homeLon : 0) : 0;
  const targetLat = isConnected ? (radarWs ? radarWs.targetLat : 0) : 0;
  const targetLon = isConnected ? (radarWs ? radarWs.targetLon : 0) : 0;

  // Extra GPS stats
  const satellites = isConnected ? (radarWs ? radarWs.satellites : 0) : 0;
  const speed = isConnected ? (radarWs ? radarWs.speed : 0.0) : 0.0;

  return (
    <div className="glass-panel p-6 flex flex-col h-full space-y-6">
      
      {/* HEADER WITH STATS */}
      <div className="flex items-center justify-between border-b border-industrial-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-industrial-800 rounded-lg border border-industrial-700">
            <Compass className="w-5 h-5 text-neon-blue animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-wide text-slate-100">Telemetry</h2>
            <p className="text-xs text-slate-400">AgriSync Rover - v1.2</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-industrial-900 border border-industrial-800 px-3 py-1 rounded-full text-[10px] font-mono text-slate-400 font-bold uppercase">
          <span className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-neon-green animate-pulse" : "bg-neon-red")} />
          {isConnected ? "Linked" : "Offline"}
        </div>
      </div>

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-2 gap-4">
        {/* Battery Widget */}
        <div className="bg-industrial-800/20 rounded-xl p-3 border border-industrial-800 flex flex-col items-center justify-center relative overflow-hidden">
          <Battery className={cn("w-5 h-5 mb-1.5", batteryVal > 20 ? "text-neon-green" : "text-neon-red")} />
          <span className="text-xl font-bold text-slate-200 font-mono">{batteryVal}%</span>
          <span className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Power Level</span>
        </div>

        {/* GPS Satellite Status */}
        <div className="bg-industrial-800/20 rounded-xl p-3 border border-industrial-800 flex flex-col items-center justify-center relative overflow-hidden">
          <Wifi className={cn("w-5 h-5 mb-1.5", isConnected ? "text-neon-blue" : "text-slate-500")} />
          <span className="text-xl font-bold text-slate-200 font-mono">{satellites} Sats</span>
          <span className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">GPS Fix</span>
        </div>
      </div>

      {/* DETAILED DATA FIELDS */}
      <div className="grid grid-cols-3 gap-2 bg-industrial-900/50 p-2.5 rounded-xl border border-industrial-850 font-mono text-[9px] text-slate-400 uppercase tracking-wider">
        <div className="text-center border-r border-industrial-800/80 flex flex-col justify-center">
          <span className="text-slate-500 block mb-0.5 font-sans">Speed</span>
          <span className="text-xs font-bold text-slate-200">{isConnected ? `${speed.toFixed(1)} km/h` : 'OFFLINE'}</span>
        </div>
        <div className="text-center border-r border-industrial-800/80 flex flex-col justify-center">
          <span className="text-slate-500 block mb-0.5 font-sans">Latitude</span>
          <span className={cn(
            "text-xs font-bold font-mono",
            !isConnected ? "text-neon-red" : currentLat === 0 ? "text-neon-yellow" : "text-slate-200"
          )}>
            {!isConnected ? 'OFFLINE' : currentLat === 0 ? 'NO FIX' : currentLat.toFixed(5)}
          </span>
        </div>
        <div className="text-center flex flex-col justify-center">
          <span className="text-slate-500 block mb-0.5 font-sans">Longitude</span>
          <span className={cn(
            "text-xs font-bold font-mono",
            !isConnected ? "text-neon-red" : currentLon === 0 ? "text-neon-yellow" : "text-slate-200"
          )}>
            {!isConnected ? 'OFFLINE' : currentLon === 0 ? 'NO FIX' : currentLon.toFixed(5)}
          </span>
        </div>
      </div>

      {/* LIVE MAP REPRESENTATION */}
      <div className="flex-1 bg-industrial-900/40 rounded-xl border border-industrial-800/60 p-1 flex flex-col relative min-h-[190px] overflow-hidden">
        <div className="absolute top-3 left-3 z-10">
          <span className={cn(
            "px-2.5 py-0.5 bg-industrial-900/90 backdrop-blur-sm rounded-full text-[9px] font-bold border uppercase tracking-wider",
            modeVal === 'autonomous' ? "text-neon-blue border-neon-blue/30" : "text-neon-yellow border-neon-yellow/30"
          )}>
            {modeVal} Mode
          </span>
        </div>
        
        <LiveMap 
          lat={currentLat} 
          lng={currentLon}
          homeLat={homeLat}
          homeLon={homeLon}
          targetLat={targetLat}
          targetLon={targetLon}
          isConnected={isConnected}
        />
        
        {targetLat !== 0 && (
          <div className="absolute bottom-3 left-3 z-10 flex gap-2 text-[8px] text-slate-400 font-mono bg-industrial-900/90 backdrop-blur-sm px-2 py-1 rounded border border-industrial-800 uppercase">
            <span>Tgt: {targetLat.toFixed(5)}, {targetLon.toFixed(5)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
