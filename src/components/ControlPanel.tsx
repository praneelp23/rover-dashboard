import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square, Car, Cpu, Anchor, Settings, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';

interface ControlPanelProps {
  radarWs: any;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ radarWs }) => {
  const {
    autoMode,
    returnHome,
    probeState,
    probeHeightPct,
    logs = [],
    sendControlCommand,
    sendProbeCommand,
    toggleAutoMode,
    setGpsTarget,
    triggerReturnHome
  } = radarWs;

  // Local inputs for target GPS
  const [inputLat, setInputLat] = useState('34.0525');
  const [inputLon, setInputLon] = useState('-118.2439');
  const [lastCommand, setLastCommand] = useState<string>('NONE');

  // Trigger manual steering movements
  const handleSteerDown = (direction: 'forward' | 'backward' | 'left' | 'right') => {
    if (autoMode) return;
    setLastCommand(direction.toUpperCase());
    sendControlCommand(direction);
  };

  const handleSteerUp = () => {
    if (autoMode) return;
    setLastCommand('STOP');
    sendControlCommand('stop');
  };

  const handleStopAll = () => {
    setLastCommand('STOP');
    sendControlCommand('stop');
  };



  // Sync targets if they change in the background
  useEffect(() => {
    if (radarWs.targetLat && radarWs.targetLat !== 0) {
      setInputLat(radarWs.targetLat.toString());
    }
    if (radarWs.targetLon && radarWs.targetLon !== 0) {
      setInputLon(radarWs.targetLon.toString());
    }
  }, [radarWs.targetLat, radarWs.targetLon]);

  return (
    <div className="glass-panel p-6 h-full flex flex-col justify-between overflow-y-auto space-y-6">
      
      {/* HEADER WITH AUTO/MANUAL TOGGLE */}
      <div className="flex items-center justify-between border-b border-industrial-800 pb-4">
        <h2 className="text-lg font-semibold tracking-wide text-slate-100 flex items-center gap-2">
          <Car className="w-5 h-5 text-neon-blue" />
          Rover Control
        </h2>
        
        {/* Mode Toggle */}
        <div className="flex bg-industrial-900 rounded-lg p-1 border border-industrial-800">
          <button
            onClick={() => toggleAutoMode(false)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
              !autoMode 
                ? "bg-industrial-700 text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Gamepad2Icon className="w-3.5 h-3.5" />
            MANUAL
          </button>
          <button
            onClick={() => toggleAutoMode(true)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
              autoMode 
                ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30 shadow-sm" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Cpu className="w-3.5 h-3.5" />
            AUTO
          </button>
        </div>
      </div>

      {/* CORE CONTROLS LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 py-2">
        
        {/* LEFT COLUMN: STEERING WHEEL AND STATUS */}
        <div className="flex flex-col items-center justify-center relative bg-industrial-900/20 rounded-xl border border-industrial-800/50 p-4 min-h-[190px]">
          {autoMode && (
            <div className="absolute inset-0 z-10 bg-industrial-900/80 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
              <div className="text-center p-4">
                <Cpu className="w-8 h-8 text-neon-blue mx-auto mb-2 animate-pulse" />
                <p className="text-neon-blue font-bold tracking-widest text-xs uppercase">Autonomous Mode Active</p>
                <p className="text-slate-400 text-[10px] mt-1 font-mono">Manual steering locked</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5 w-44">
            <div />
            <ControlButton 
              icon={<ArrowUp className="w-5 h-5" />} 
              onDown={() => handleSteerDown('forward')}
              onUp={handleSteerUp}
            />
            <div />
            
            <ControlButton 
              icon={<ArrowLeft className="w-5 h-5" />} 
              onDown={() => handleSteerDown('left')}
              onUp={handleSteerUp}
            />
            <ControlButton 
              icon={<Square className="w-4 h-4" />} 
              onDown={handleStopAll}
              onUp={() => {}}
              variant="danger"
            />
            <ControlButton 
              icon={<ArrowRight className="w-5 h-5" />} 
              onDown={() => handleSteerDown('right')}
              onUp={handleSteerUp}
            />
            
            <div />
            <ControlButton 
              icon={<ArrowDown className="w-5 h-5" />} 
              onDown={() => handleSteerDown('backward')}
              onUp={handleSteerUp}
            />
            <div />
          </div>

          <div className="w-full mt-4 flex items-center justify-between text-[10px] uppercase font-mono text-slate-500 border-t border-industrial-800/40 pt-2 px-1">
            <span>Staging</span>
            <span className={cn("font-bold text-xs", lastCommand !== 'STOP' && lastCommand !== 'NONE' ? "text-neon-yellow" : "text-slate-400")}>
              {lastCommand}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: PROBE & GPS SETTINGS */}
        <div className="flex flex-col justify-between space-y-4">
          
          {/* Probe Control Panel */}
          <div className="bg-industrial-800/30 rounded-xl p-3 border border-industrial-800 flex gap-3">
            {/* Actuator buttons (75%) */}
            <div className="flex-1 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                  <Settings className="w-3.5 h-3.5 text-neon-yellow animate-spin-slow" />
                  Soil Probe Actuator
                </span>
                <span className={cn(
                  "text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border",
                  probeState === 'deploying' && "bg-neon-yellow/10 border-neon-yellow/20 text-neon-yellow animate-pulse",
                  probeState === 'retracting' && "bg-neon-blue/10 border-neon-blue/20 text-neon-blue animate-pulse",
                  probeState === 'deployed' && "bg-neon-green/10 border-neon-green/20 text-neon-green shadow-[0_0_8px_rgba(34,197,94,0.2)]",
                  probeState === 'retracted' && "bg-slate-500/10 border-slate-500/20 text-slate-400",
                  probeState === 'stopped' && "bg-neon-red/10 border-neon-red/20 text-neon-red",
                  !probeState && "bg-slate-800 text-slate-500"
                )}>
                  {probeState || 'UNKNOWN'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => sendProbeCommand('deploy')}
                  className={cn(
                    "py-2 rounded-lg text-[10px] font-bold border font-mono transition-all uppercase flex flex-col items-center gap-0.5",
                    probeState === 'deploying' 
                      ? "bg-neon-yellow/20 border-neon-yellow/50 text-neon-yellow shadow-[0_0_10px_rgba(234,179,8,0.2)]" 
                      : "bg-industrial-900 border-industrial-800 text-slate-300 hover:bg-industrial-700 hover:text-white"
                  )}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  Deploy
                </button>
                <button
                  onClick={() => sendProbeCommand('retract')}
                  className={cn(
                    "py-2 rounded-lg text-[10px] font-bold border font-mono transition-all uppercase flex flex-col items-center gap-0.5",
                    probeState === 'retracting' 
                      ? "bg-neon-blue/20 border-neon-blue/50 text-neon-blue shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                      : "bg-industrial-900 border-industrial-800 text-slate-300 hover:bg-industrial-700 hover:text-white"
                  )}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  Retract
                </button>
                <button
                  onClick={() => sendProbeCommand('stop')}
                  className="py-2 rounded-lg text-[10px] font-bold border font-mono transition-all uppercase bg-neon-red/10 border-neon-red/30 text-neon-red hover:bg-neon-red/20 flex flex-col items-center justify-center"
                >
                  Stop
                </button>
              </div>
            </div>

            {/* Actuator Gauge (25%) */}
            <div className="w-12 bg-industrial-900 rounded-lg border border-industrial-850 p-1 flex flex-col items-center justify-between relative overflow-hidden select-none">
              <span className="text-[8px] text-slate-500 font-mono font-bold leading-none mb-1">PROBE</span>
              
              {/* Vertical Guide Column */}
              <div className="w-4 flex-1 bg-black/60 rounded-full border border-industrial-800 relative overflow-hidden flex items-start justify-center">
                {/* Actuator shaft sliding down */}
                <div 
                  className={cn(
                    "w-2 bg-gradient-to-r from-slate-300 via-white to-slate-400 rounded-full transition-all duration-150 relative",
                    probeState === 'deploying' && "animate-pulse",
                    probeState === 'retracting' && "animate-pulse"
                  )}
                  style={{ 
                    height: `${probeHeightPct ?? 0}%`,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                  }}
                >
                  {/* Glowing active drill/actuator tip */}
                  <span className={cn(
                    "absolute bottom-0 left-0 right-0 h-1.5 rounded-full transition-colors duration-300",
                    probeState === 'deploying' && "bg-neon-yellow animate-ping",
                    probeState === 'retracting' && "bg-neon-blue animate-ping",
                    probeState === 'deployed' && "bg-neon-green shadow-[0_0_8px_#22c55e]",
                    probeState === 'retracted' && "bg-slate-500",
                    probeState === 'stopped' && "bg-neon-red shadow-[0_0_8px_#ef4444]"
                  )} />
                </div>
              </div>
              
              <span className="text-[9px] text-slate-400 font-mono font-bold leading-none mt-1">
                {(probeHeightPct ?? 0)}%
              </span>
            </div>
          </div>

          {/* Autonomous Mission Control */}
          <div className="bg-industrial-800/30 rounded-xl p-3 border border-industrial-800 flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Anchor className="w-3.5 h-3.5 text-neon-blue" />
                Autonomous Mission Control
              </span>
              <span className={cn(
                "text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border",
                autoMode 
                  ? "bg-neon-green/10 border-neon-green/20 text-neon-green shadow-[0_0_8px_rgba(34,197,94,0.2)] animate-pulse" 
                  : "bg-slate-500/10 border-slate-500/20 text-slate-400"
              )}>
                {autoMode ? "MISSION ACTIVE" : "MANUAL STANDBY"}
              </span>
            </div>

            {/* If Mission is Active, show Telemetry HUD instead of inputs */}
            {autoMode ? (
              <div className="bg-black/45 rounded-xl border border-industrial-850 p-2.5 flex-1 flex flex-col justify-between my-1 shadow-inner">
                <span className="text-[8px] font-mono text-neon-green/50 uppercase tracking-widest block mb-1">
                  Target Destination: {radarWs.targetLat?.toFixed(5) || '0.00000'}, {radarWs.targetLon?.toFixed(5) || '0.00000'}
                </span>
                
                {/* Parse the live telemetry line */}
                {(() => {
                  const navLog = [...logs].reverse().find(l => l.includes('D:') && l.includes('B:'));
                  let distance = '-';
                  let bearing = '-';
                  let heading = '-';
                  let error = '-';
                  if (navLog) {
                    const match = navLog.match(/D:([\d.]+)m B:([\d.]+) H:([\d.]+) E:([-\d.]+)/);
                    if (match) {
                      distance = match[1] + ' m';
                      bearing = match[2] + '°';
                      heading = match[3] + '°';
                      error = match[4] + '°';
                    }
                  }

                  return (
                    <div className="grid grid-cols-2 gap-2 font-mono text-[9px]">
                      <div className="bg-industrial-900/60 p-1.5 rounded border border-industrial-800/80">
                        <span className="text-slate-500 block mb-0.5 uppercase">Distance</span>
                        <span className="text-xs font-bold text-neon-green">{distance}</span>
                      </div>
                      <div className="bg-industrial-900/60 p-1.5 rounded border border-industrial-800/80">
                        <span className="text-slate-500 block mb-0.5 uppercase">Bearing</span>
                        <span className="text-xs font-bold text-neon-blue">{bearing}</span>
                      </div>
                      <div className="bg-industrial-900/60 p-1.5 rounded border border-industrial-800/80">
                        <span className="text-slate-500 block mb-0.5 uppercase">Heading</span>
                        <span className="text-xs font-bold text-slate-200">{heading}</span>
                      </div>
                      <div className="bg-industrial-900/60 p-1.5 rounded border border-industrial-800/80">
                        <span className="text-slate-500 block mb-0.5 uppercase">Error</span>
                        <span className={cn(
                          "text-xs font-bold",
                          Math.abs(parseFloat(error)) > 20 ? "text-neon-red" : "text-neon-yellow"
                        )}>{error}</span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  onClick={() => toggleAutoMode(false)}
                  className="w-full py-1.5 mt-2 bg-neon-red/10 border border-neon-red/40 hover:bg-neon-red/20 rounded text-[10px] font-bold text-neon-red transition-all font-mono uppercase tracking-widest animate-pulse"
                >
                  ⚠ Abort Mission (E-Stop)
                </button>
              </div>
            ) : (
              // If stand-by, show coordinates form inputs
              <div className="space-y-2 flex-1 flex flex-col justify-between my-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase font-mono text-slate-500 block mb-0.5">Latitude</label>
                    <input
                      type="text"
                      value={inputLat}
                      onChange={(e) => setInputLat(e.target.value)}
                      className="w-full bg-industrial-900 border border-industrial-800 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-neon-blue"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-mono text-slate-500 block mb-0.5">Longitude</label>
                    <input
                      type="text"
                      value={inputLon}
                      onChange={(e) => setInputLon(e.target.value)}
                      className="w-full bg-industrial-900 border border-industrial-800 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-neon-blue"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => {
                      const latNum = parseFloat(inputLat);
                      const lonNum = parseFloat(inputLon);
                      if (!isNaN(latNum) && !isNaN(lonNum)) {
                        setGpsTarget(latNum, lonNum);
                        // Trigger immediate auto mode engage
                        toggleAutoMode(true);
                      }
                    }}
                    className="py-1.5 rounded-lg text-[10px] font-bold border border-neon-blue/30 text-neon-blue hover:bg-neon-blue/15 bg-industrial-900 transition-all font-mono uppercase flex items-center justify-center gap-1 shadow-md hover:border-neon-blue/60"
                  >
                    Start Mission
                  </button>
                  <button
                    onClick={triggerReturnHome}
                    className={cn(
                      "py-1.5 rounded-lg text-[10px] font-bold border transition-all font-mono uppercase flex items-center justify-center gap-1 shadow-md",
                      returnHome 
                        ? "bg-neon-green/20 border-neon-green/50 text-neon-green shadow-[0_0_10px_rgba(34,197,94,0.2)] animate-pulse" 
                        : "bg-industrial-900 border-neon-green/30 text-neon-green hover:bg-neon-green/15"
                    )}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Return Home
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

// Mini-component for manual drive button icon
function Gamepad2Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="6" x2="10" y1="12" y2="12" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <line x1="15" x2="15.01" y1="13" y2="13" />
      <line x1="18" x2="18.01" y1="11" y2="11" />
      <rect width="20" height="12" x="2" y="6" rx="2" />
    </svg>
  );
}

interface ControlButtonProps {
  icon: React.ReactNode;
  onDown: () => void;
  onUp: () => void;
  variant?: 'default' | 'danger';
}

const ControlButton: React.FC<ControlButtonProps> = ({ icon, onDown, onUp, variant = 'default' }) => {
  return (
    <button
      onMouseDown={onDown}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onTouchStart={onDown}
      onTouchEnd={onUp}
      className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-100 border active:scale-90 select-none",
        variant === 'danger' 
          ? "bg-industrial-800 border-neon-red/30 text-neon-red hover:bg-neon-red/15 hover:border-neon-red/50 shadow-[inset_0_0_10px_rgba(239,68,68,0.05)]" 
          : "bg-industrial-850 border-industrial-800 text-slate-400 hover:bg-industrial-700 hover:text-white hover:border-industrial-600 shadow-[0_3px_6px_rgba(0,0,0,0.3)] active:bg-neon-blue/20 active:border-neon-blue/50 active:text-neon-blue active:shadow-[0_0_12px_rgba(59,130,246,0.25)]"
      )}
    >
      {icon}
    </button>
  );
};
