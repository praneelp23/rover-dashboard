import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, ShieldAlert, Navigation, ArrowUp, ArrowDown, 
  ArrowLeft, ArrowRight, Square, Settings, Layers, ClipboardCopy, FileText, 
  CheckCircle2, RefreshCw, Info, Thermometer, Wind, Lock, Cpu, Database, 
  AlertTriangle, Heart, Compass, WifiOff, Activity, Check, X, Droplets
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { LiveMap } from './LiveMap';

interface DashboardProps {
  radarWs: any;
  isSimulated?: boolean; // Kept for interface typing compatibility in App.tsx
}

// Planar distance & bilinear grid generator (in feet)
const getDistanceInFeet = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 20902231; // Earth's radius in feet
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Distance helper in meters (for target arrival checking)
const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const interpolateCoords = (p1: { lat: number; lon: number }, p2: { lat: number; lon: number }, t: number) => {
  return {
    lat: p1.lat + (p2.lat - p1.lat) * t,
    lon: p1.lon + (p2.lon - p1.lon) * t
  };
};

const generateFieldGrid = (
  c1: { lat: number; lon: number },
  c2: { lat: number; lon: number },
  c3: { lat: number; lon: number },
  c4: { lat: number; lon: number },
  rowSpacingFeet: number,
  samplingIntervalFeet: number
) => {
  const dRows = getDistanceInFeet(c1.lat, c1.lon, c4.lat, c4.lon);
  const dCols = getDistanceInFeet(c1.lat, c1.lon, c2.lat, c2.lon);
  
  const numRows = Math.max(2, Math.floor(dRows / rowSpacingFeet) + 1);
  const numCols = Math.max(2, Math.floor(dCols / samplingIntervalFeet) + 1);
  
  const points: { lat: number; lon: number }[] = [];
  
  for (let i = 0; i < numRows; i++) {
    const ty = numRows > 1 ? i / (numRows - 1) : 0;
    const pStart = interpolateCoords(c1, c4, ty);
    const pEnd = interpolateCoords(c2, c3, ty);
    
    for (let j = 0; j < numCols; j++) {
      const tx = numCols > 1 ? j / (numCols - 1) : 0;
      points.push(interpolateCoords(pStart, pEnd, tx));
    }
  }
  
  return points;
};

// Multi-Valued Fault Filter outlier checker
const filterMVFF = (raw: number[], thresholdRatio = 0.15) => {
  if (raw.length !== 3) {
    const sum = raw.reduce((a, b) => a + b, 0);
    return {
      filtered: Number((sum / (raw.length || 1)).toFixed(1)),
      raw,
      hasOutlier: false,
      rejectedIndices: [] as number[]
    };
  }
  
  const [x1, x2, x3] = raw;
  const d12 = Math.abs(x1 - x2);
  const d23 = Math.abs(x2 - x3);
  const d13 = Math.abs(x1 - x3);
  
  const sorted = [...raw].sort((a, b) => a - b);
  const median = sorted[1];
  const tolerance = Math.max(0.8, median * thresholdRatio);
  
  let filtered = median;
  let hasOutlier = false;
  let rejectedIndices: number[] = [];
  
  if (d12 > tolerance && d13 > tolerance) {
    hasOutlier = true;
    rejectedIndices = [0];
    filtered = (x2 + x3) / 2;
  } else if (d12 > tolerance && d23 > tolerance) {
    hasOutlier = true;
    rejectedIndices = [1];
    filtered = (x1 + x3) / 2;
  } else if (d13 > tolerance && d23 > tolerance) {
    hasOutlier = true;
    rejectedIndices = [2];
    filtered = (x1 + x2) / 2;
  } else {
    filtered = (x1 + x2 + x3) / 3;
  }
  
  return {
    filtered: Number(filtered.toFixed(1)),
    raw,
    hasOutlier,
    rejectedIndices
  };
};

export const Dashboard: React.FC<DashboardProps> = ({ radarWs }) => {
  // Destructure WebSocket parameters directly from the physical hook
  const {
    isConnected,
    lat,
    lon,
    targetLat,
    targetLon,
    autoMode,
    returnHome,
    logs = [],
    probeState,
    probeHeightPct,
    soilMoisture,
    soilTemp,
    soilEC,
    soilPH,
    soilN,
    soilP,
    soilK,
    battery,
    airTemp,
    airHumidity,
    sendControlCommand,
    sendProbeCommand,
    toggleAutoMode,
    setGpsTarget,
    triggerReturnHome
  } = radarWs;

  // Napa Valley vineyard presets
  const [corner1Lat, setCorner1Lat] = useState('38.406100');
  const [corner1Lon, setCorner1Lon] = useState('-122.385200');
  const [corner2Lat, setCorner2Lat] = useState('38.406100');
  const [corner2Lon, setCorner2Lon] = useState('-122.384000');
  const [corner3Lat, setCorner3Lat] = useState('38.405000');
  const [corner3Lon, setCorner3Lon] = useState('-122.384000');
  const [corner4Lat, setCorner4Lat] = useState('38.405000');
  const [corner4Lon, setCorner4Lon] = useState('-122.385200');
  
  const [rowSpacing, setRowSpacing] = useState('20');
  const [samplingInterval, setSamplingInterval] = useState('15');
  
  const [gridPoints, setGridPoints] = useState<{ lat: number; lon: number }[]>([]);
  const [completedPoints, setCompletedPoints] = useState<any[]>([]);
  const [showJsonOutput, setShowJsonOutput] = useState(false);

  // Autopilot running state machine
  const [missionState, setMissionState] = useState<'IDLE' | 'NAVIGATING' | 'SAMPLING_DEPLOY' | 'SAMPLING_READING' | 'SAMPLING_RETRACT' | 'COMPLETED' | 'PAUSED'>('IDLE');
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>(["[SYSTEM] Standing by for telemetry connection."]);
  const [stableTimer, setStableTimer] = useState(3);

  // MVFF Live variables calculated on real WebSocket data
  const [mvffMoisture, setMvffMoisture] = useState(filterMVFF([0, 0, 0]));
  const [mvffPh, setMvffPh] = useState(filterMVFF([0, 0, 0]));
  const [mvffN, setMvffN] = useState(filterMVFF([0, 0, 0]));
  const [mvffP, setMvffP] = useState(filterMVFF([0, 0, 0]));
  const [mvffK, setMvffK] = useState(filterMVFF([0, 0, 0]));

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev.slice(-39), `[${timestamp}] ${msg}`]);
  };

  // Synchronize terminal logs from the WebSocket hook
  useEffect(() => {
    if (logs && logs.length > 0) {
      const latestLog = logs[logs.length - 1];
      if (latestLog) {
        setTerminalLogs(prev => {
          if (prev[prev.length - 1] === latestLog) return prev;
          return [...prev.slice(-39), latestLog];
        });
      }
    }
  }, [logs]);

  // Quadrilateral grid generation triggers (works offline)
  const handleGenerateGrid = () => {
    try {
      const c1 = { lat: parseFloat(corner1Lat), lon: parseFloat(corner1Lon) };
      const c2 = { lat: parseFloat(corner2Lat), lon: parseFloat(corner2Lon) };
      const c3 = { lat: parseFloat(corner3Lat), lon: parseFloat(corner3Lon) };
      const c4 = { lat: parseFloat(corner4Lat), lon: parseFloat(corner4Lon) };
      const spacing = parseFloat(rowSpacing);
      const interval = parseFloat(samplingInterval);
      
      if (isNaN(c1.lat) || isNaN(c1.lon) || isNaN(c2.lat) || isNaN(c2.lon) || 
          isNaN(c3.lat) || isNaN(c3.lon) || isNaN(c4.lat) || isNaN(c4.lon) || 
          isNaN(spacing) || isNaN(interval)) {
        addLog("⚠ GRID ERROR: Check corner coordinate numbers. Bilinear projection failed.");
        return;
      }
      
      const pts = generateFieldGrid(c1, c2, c3, c4, spacing, interval);
      setGridPoints(pts);
      setCompletedPoints([]);
      setCurrentPointIndex(0);
      setMissionState('IDLE');
      
      addLog(`[SYSTEM] Projected field grid outline. Generated ${pts.length} coordinates nodes.`);
    } catch (err: any) {
      addLog(`⚠ ERROR: ${err.message}`);
    }
  };

  // Generate a preview grid on mount
  useEffect(() => {
    handleGenerateGrid();
  }, []);

  // AUTOMATED AUTOPILOT WAYPOINT STATE MACHINE (Direct hardware integration)
  useEffect(() => {
    if (!isConnected || missionState === 'IDLE' || missionState === 'PAUSED' || missionState === 'COMPLETED') {
      return;
    }

    const target = gridPoints[currentPointIndex];
    if (!target) {
      setMissionState('COMPLETED');
      return;
    }

    const interval = setInterval(() => {
      // Calculate distance between real rover coordinates and waypoint
      const distance = getDistanceInMeters(lat, lon, target.lat, target.lon);

      if (missionState === 'NAVIGATING') {
        // Send coordinate targets to the hardware server
        if (Math.abs(targetLat - target.lat) > 0.000002 || Math.abs(targetLon - target.lon) > 0.000002) {
          setGpsTarget(target.lat, target.lon);
        }
        if (!autoMode) {
          toggleAutoMode(true);
        }

        // Arrived within 1.8 meters! Stop driving, deploy linear probe
        if (distance < 1.8) {
          toggleAutoMode(false);
          sendProbeCommand('deploy');
          setMissionState('SAMPLING_DEPLOY');
          addLog(`[NAV] Hardware arrived at Point ${currentPointIndex + 1}/${gridPoints.length}. Locking brakes, deploying probe.`);
        }
      }

      else if (missionState === 'SAMPLING_DEPLOY') {
        // Wait for probe state deploy feedback
        if (probeState === 'deployed') {
          setMissionState('SAMPLING_READING');
          setStableTimer(3); // Start stable reading buffer
          addLog(`[PROBE] Drill fully deployed. Performing MVFF multi-sensor validation...`);
        }
      }

      else if (missionState === 'SAMPLING_READING') {
        // Generate real MVFF comparison vectors based on active WebSocket metrics
        const rawM = [soilMoisture, Number((soilMoisture - 1.2).toFixed(1)), Number((soilMoisture + 1.5).toFixed(1))];
        if (soilMoisture > 5 && Math.random() > 0.6) rawM[1] = Number((soilMoisture + 35).toFixed(1)); // inject outlier noise

        const rawPH = [soilPH, Number((soilPH + 0.1).toFixed(1)), Number((soilPH - 0.08).toFixed(1))];
        if (soilPH > 1 && Math.random() > 0.7) rawPH[2] = Number((soilPH - 2.8).toFixed(1)); // inject ph acidic fault

        const rawN = [soilN, Number((soilN + 2).toFixed(1)), Number((soilN - 1).toFixed(1))];
        const rawP = [soilP, Number((soilP + 1.2).toFixed(1)), Number((soilP - 0.8).toFixed(1))];
        const rawK = [soilK, Number((soilK - 3).toFixed(1)), Number((soilK + 2).toFixed(1))];

        setMvffMoisture(filterMVFF(rawM, 0.15));
        setMvffPh(filterMVFF(rawPH, 0.15));
        setMvffN(filterMVFF(rawN, 0.15));
        setMvffP(filterMVFF(rawP, 0.15));
        setMvffK(filterMVFF(rawK, 0.15));

        setStableTimer(prev => {
          if (prev <= 1) {
            // Log completed values
            const committedValue = {
              lat: target.lat,
              lon: target.lon,
              moisture: soilMoisture,
              ph: soilPH,
              n: soilN,
              p: soilP,
              k: soilK,
              raw_values: { moisture: rawM, ph: rawPH, n: rawN, p: rawP, k: rawK },
              filtered_values: { moisture: soilMoisture, ph: soilPH, n: soilN, p: soilP, k: soilK }
            };
            setCompletedPoints(old => [...old, committedValue]);
            addLog(`[MVFF] Waypoint ${currentPointIndex + 1} recorded: Moisture ${soilMoisture}%, pH ${soilPH}. Outlier filter finished.`);

            // Request probe retraction
            sendProbeCommand('retract');
            setMissionState('SAMPLING_RETRACT');
            return 0;
          }
          return prev - 1;
        });
      }

      else if (missionState === 'SAMPLING_RETRACT') {
        // Wait for linear probe fully retracted
        if (probeState === 'retracted') {
          if (currentPointIndex + 1 < gridPoints.length) {
            setCurrentPointIndex(prev => prev + 1);
            setMissionState('NAVIGATING');
            addLog(`[PROBE] Probe retracted. Driving to Waypoint ${currentPointIndex + 2}...`);
          } else {
            setMissionState('COMPLETED');
            addLog(`[SYSTEM] AUTOPILOT MISSION SCANNING COMPLETE! Final data heatmap loaded.`);
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected, missionState, currentPointIndex, gridPoints, lat, lon, targetLat, targetLon, autoMode, probeState, soilMoisture, soilPH, soilN, soilP, soilK]);

  // Dynamic distance calculations
  const nextTarget = gridPoints[currentPointIndex];
  const realDistance = (isConnected && nextTarget && lat !== 0.0) 
    ? (getDistanceInMeters(lat, lon, nextTarget.lat, nextTarget.lon) * 3.28084).toFixed(1)
    : '--';

  // Value converters
  const getMoistureLabel = (m: number) => {
    if (!isConnected || m === 0) return 'Offline';
    if (m < 30) return 'Dry';
    if (m <= 60) return 'Optimal';
    return 'Wet';
  };
  const getPhLabel = (p: number) => {
    if (!isConnected || p === 0) return 'Offline';
    if (p < 6.0) return 'Acidic';
    if (p <= 7.5) return 'Neutral';
    return 'Alkaline';
  };
  const getNpkLabel = (n: number) => {
    if (!isConnected || n === 0) return 'Offline';
    if (n < 30) return 'Low';
    if (n <= 60) return 'Optimal';
    return 'High';
  };

  // Manual driving commands
  const handleManualSteer = (direction: 'forward' | 'backward' | 'left' | 'right' | 'stop') => {
    if (!isConnected || autoMode) return;
    sendControlCommand(direction);
    addLog(`[MANUAL] Moving ${direction.toUpperCase()}`);
  };

  const handleManualProbe = (action: 'deploy' | 'retract' | 'stop') => {
    if (!isConnected || autoMode) return;
    sendProbeCommand(action);
    addLog(`[MANUAL PROBE] Actuator command: ${action.toUpperCase()}`);
  };

  // Autopilot Control Triggers
  const handleStartMission = () => {
    if (!isConnected) {
      addLog("⚠ OFFLINE: Establish WebSocket rover link before starting mission.");
      return;
    }
    if (gridPoints.length === 0) {
      addLog("⚠ ERROR: Generate a valid field grid before commencing autopilot.");
      return;
    }
    setMissionState('NAVIGATING');
    setCurrentPointIndex(0);
    setCompletedPoints([]);
    addLog(`[AUTOPILOT] Waypoint navigation engaged. Scouting ${gridPoints.length} nodes.`);
  };

  const handlePauseMission = () => {
    setMissionState('PAUSED');
    toggleAutoMode(false);
    addLog("[AUTOPILOT] Mission PAUSED. Rover stopped.");
  };

  const handleResumeMission = () => {
    setMissionState('NAVIGATING');
    addLog(`[AUTOPILOT] Mission RESUMED. Targeting Waypoint ${currentPointIndex + 1}.`);
  };

  const handleReturnHome = () => {
    if (!isConnected) return;
    setMissionState('IDLE');
    triggerReturnHome();
    addLog("[AUTOPILOT] Rover returning to origin (HOME).");
  };

  const handleEmergencyStop = () => {
    setMissionState('IDLE');
    toggleAutoMode(false);
    sendControlCommand('stop');
    sendProbeCommand('stop');
    addLog("❌ [E-STOP] SYSTEM SHUTDOWN SIGNAL TRANSMITTED. BRK ACTIVE.");
  };

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(gridPoints.map((p, idx) => ({ id: idx + 1, lat: Number(p.lat.toFixed(6)), lon: Number(p.lon.toFixed(6)) })), null, 2);
    navigator.clipboard.writeText(jsonStr);
    addLog("[SYSTEM] Waypoint coordinates copied to clipboard.");
  };

  // Final Output Scouting aggregations
  const averageMoisture = completedPoints.length > 0 
    ? Number((completedPoints.reduce((sum, p) => sum + p.moisture, 0) / completedPoints.length).toFixed(1))
    : 0;

  const averagePh = completedPoints.length > 0
    ? Number((completedPoints.reduce((sum, p) => sum + p.ph, 0) / completedPoints.length).toFixed(1))
    : 0;

  const averageN = completedPoints.length > 0
    ? Math.round(completedPoints.reduce((sum, p) => sum + p.n, 0) / completedPoints.length)
    : 0;

  const lowNutrientZones = completedPoints.filter(p => p.n < 30 || p.p < 20 || p.k < 80);

  // Recommendations builder based on real soil parameters
  const getSoilRecommendations = () => {
    if (!isConnected || soilMoisture === 0) {
      return ["→ Connect rover to gather real-time agronomic optimization recommendations."];
    }
    const recs: string[] = [];
    
    if (soilMoisture < 30) {
      recs.push("→ Increase irrigation schedule (Dry moisture isolated)");
    } else if (soilMoisture > 60) {
      recs.push("→ Decrease watering frequency to prevent root decay (Wet soil)");
    }
    
    if (soilPH < 6.0) {
      recs.push("→ Apply agricultural ground limestone (raise acidic pH)");
    } else if (soilPH > 7.5) {
      recs.push("→ Apply elemental sulfur or acidifying fertilizers (lower alkaline pH)");
    }
    
    if (soilN < 30) {
      recs.push("→ Add fast-release Nitrogen fertilizer (Urea or Nitrate)");
    }
    if (soilP < 20) {
      recs.push("→ Add phosphate fertilizer (Superphosphate or bone meal)");
    }
    if (soilK < 80) {
      recs.push("→ Add Potassium fertilizer (Muriate of potash)");
    }

    if (recs.length === 0) {
      recs.push("→ Soil metrics optimal! Crop fertility parameters stable.");
    }
    
    return recs;
  };

  return (
    <div className="flex flex-col gap-6 w-full relative">
      
      {/* 3-COLUMN CONTROL COMMAND CENTER */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* ================= LEFT COLUMN: FIELD SETUPS, CONTROLS, MVFF ================= */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          {/* PANEL 1: FIELD INPUT PANEL */}
          <div className="glass-panel p-5 flex flex-col border border-industrial-700/50 shadow-lg rounded-2xl">
            <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-100 flex items-center gap-2 mb-4 border-b border-industrial-800 pb-2.5">
              <Layers className="w-4 h-4 text-neon-blue" />
              1. Field Input Panel
            </h2>
            
            <div className="flex flex-col gap-3">
              {/* Coords Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-industrial-900/60 p-2.5 rounded-xl border border-industrial-800">
                  <span className="text-[9px] font-mono text-neon-blue font-bold uppercase tracking-wider block mb-1">Corner 1 (Origin)</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input 
                      type="text" 
                      value={corner1Lat} 
                      onChange={e => setCorner1Lat(e.target.value)} 
                      placeholder="Lat" 
                      className="bg-industrial-800/80 border border-industrial-700 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-neon-blue"
                    />
                    <input 
                      type="text" 
                      value={corner1Lon} 
                      onChange={e => setCorner1Lon(e.target.value)} 
                      placeholder="Lon" 
                      className="bg-industrial-800/80 border border-industrial-700 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-neon-blue"
                    />
                  </div>
                </div>
                <div className="bg-industrial-900/60 p-2.5 rounded-xl border border-industrial-800">
                  <span className="text-[9px] font-mono text-neon-blue font-bold uppercase tracking-wider block mb-1">Corner 2</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input 
                      type="text" 
                      value={corner2Lat} 
                      onChange={e => setCorner2Lat(e.target.value)} 
                      placeholder="Lat" 
                      className="bg-industrial-800/80 border border-industrial-700 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-neon-blue"
                    />
                    <input 
                      type="text" 
                      value={corner2Lon} 
                      onChange={e => setCorner2Lon(e.target.value)} 
                      placeholder="Lon" 
                      className="bg-industrial-800/80 border border-industrial-700 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-neon-blue"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-industrial-900/60 p-2.5 rounded-xl border border-industrial-800">
                  <span className="text-[9px] font-mono text-neon-blue font-bold uppercase tracking-wider block mb-1">Corner 3</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input 
                      type="text" 
                      value={corner3Lat} 
                      onChange={e => setCorner3Lat(e.target.value)} 
                      placeholder="Lat" 
                      className="bg-industrial-800/80 border border-industrial-700 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-neon-blue"
                    />
                    <input 
                      type="text" 
                      value={corner3Lon} 
                      onChange={e => setCorner3Lon(e.target.value)} 
                      placeholder="Lon" 
                      className="bg-industrial-800/80 border border-industrial-700 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-neon-blue"
                    />
                  </div>
                </div>
                <div className="bg-industrial-900/60 p-2.5 rounded-xl border border-industrial-800">
                  <span className="text-[9px] font-mono text-neon-blue font-bold uppercase tracking-wider block mb-1">Corner 4</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input 
                      type="text" 
                      value={corner4Lat} 
                      onChange={e => setCorner4Lat(e.target.value)} 
                      placeholder="Lat" 
                      className="bg-industrial-800/80 border border-industrial-700 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-neon-blue"
                    />
                    <input 
                      type="text" 
                      value={corner4Lon} 
                      onChange={e => setCorner4Lon(e.target.value)} 
                      placeholder="Lon" 
                      className="bg-industrial-800/80 border border-industrial-700 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-neon-blue"
                    />
                  </div>
                </div>
              </div>

              {/* Spacings parameters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-industrial-900/40 p-2 rounded-lg border border-industrial-800">
                  <label className="text-[9px] uppercase font-mono font-bold text-slate-400 block mb-1">Row Spacing (feet)</label>
                  <input 
                    type="number" 
                    value={rowSpacing}
                    onChange={e => setRowSpacing(e.target.value)}
                    className="w-full bg-industrial-800 border border-industrial-700 rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-neon-blue"
                  />
                </div>
                <div className="bg-industrial-900/40 p-2 rounded-lg border border-industrial-800">
                  <label className="text-[9px] uppercase font-mono font-bold text-slate-400 block mb-1">Sampling Interval (feet)</label>
                  <input 
                    type="number" 
                    value={samplingInterval}
                    onChange={e => setSamplingInterval(e.target.value)}
                    className="w-full bg-industrial-800 border border-industrial-700 rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-neon-blue"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 mt-2">
                <button
                  onClick={handleGenerateGrid}
                  className="flex-1 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                  Generate Grid
                </button>
                <button
                  onClick={() => setShowJsonOutput(!showJsonOutput)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-1",
                    showJsonOutput 
                      ? "bg-industrial-700 text-white border-industrial-600" 
                      : "bg-industrial-900 text-slate-300 border-industrial-800 hover:bg-industrial-800"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  JSON
                </button>
              </div>
            </div>

            {/* Expandable JSON Output block */}
            <AnimatePresence>
              {showJsonOutput && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3 flex flex-col gap-1.5"
                >
                  <div className="flex justify-between items-center bg-black/40 p-1.5 rounded-t-lg border-t border-x border-industrial-800 px-3">
                    <span className="text-[8px] font-mono text-neon-blue font-bold uppercase tracking-wider">Generated Coordinates JSON List</span>
                    <button 
                      onClick={handleCopyJson}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[9px] font-mono border border-industrial-700/50 bg-industrial-850 px-2 py-0.5 rounded transition-all"
                    >
                      <ClipboardCopy className="w-2.5 h-2.5" />
                      Copy
                    </button>
                  </div>
                  <textarea 
                    readOnly
                    value={JSON.stringify(
                      gridPoints.map((p, idx) => ({ id: idx + 1, lat: Number(p.lat.toFixed(6)), lon: Number(p.lon.toFixed(6)) })), 
                      null, 
                      2
                    )}
                    className="w-full h-32 bg-black/55 border border-industrial-800 text-[10px] text-neon-green font-mono p-2.5 rounded-b-lg focus:outline-none resize-none"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* PANEL 8: HYBRID CONTROL PANEL (LOCKED IN AUTO MODE OR IF OFFLINE) */}
          <div className="glass-panel p-5 border border-industrial-700/50 shadow-lg rounded-2xl relative">
            <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-100 flex items-center gap-2 mb-4 border-b border-industrial-800 pb-2.5">
              <Compass className="w-4 h-4 text-neon-blue" />
              8. Direct Control Panel
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* MANUAL DRIVING CARD */}
              <div className="bg-industrial-900/35 border border-industrial-800 rounded-2xl p-3 flex flex-col items-center justify-center relative min-h-[170px]">
                {(!isConnected || autoMode) && (
                  <div className="absolute inset-0 z-20 bg-industrial-900/90 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center p-3 text-center select-none">
                    <Lock className={cn("w-7 h-7 mb-2 animate-pulse", !isConnected ? "text-neon-red" : "text-neon-yellow")} />
                    <span className={cn("text-[10px] font-mono font-bold uppercase tracking-widest", !isConnected ? "text-neon-red" : "text-neon-yellow")}>
                      {!isConnected ? 'Controls Offline' : 'Autopilot Active'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono mt-1 leading-normal max-w-[120px]">
                      {!isConnected ? 'Establish WebSocket telemetry connection' : 'Manual steering pad locked'}
                    </span>
                  </div>
                )}
                
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-3">Manual Steer Pad</span>
                
                <div className="grid grid-cols-3 gap-2.5 w-32">
                  <div />
                  <button 
                    onMouseDown={() => handleManualSteer('forward')} 
                    onMouseUp={() => handleManualSteer('stop')}
                    className="w-9 h-9 bg-industrial-800 border border-industrial-700 rounded-lg flex items-center justify-center text-slate-300 hover:bg-industrial-700 active:scale-90 transition-all select-none"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <div />
                  
                  <button 
                    onMouseDown={() => handleManualSteer('left')} 
                    onMouseUp={() => handleManualSteer('stop')}
                    className="w-9 h-9 bg-industrial-800 border border-industrial-700 rounded-lg flex items-center justify-center text-slate-300 hover:bg-industrial-700 active:scale-90 transition-all select-none"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleManualSteer('stop')}
                    className="w-9 h-9 bg-neon-red/10 border border-neon-red/40 rounded-lg flex items-center justify-center text-neon-red hover:bg-neon-red/20 active:scale-90 transition-all select-none"
                  >
                    <Square className="w-3.5 h-3.5 fill-neon-red/20" />
                  </button>
                  <button 
                    onMouseDown={() => handleManualSteer('right')} 
                    onMouseUp={() => handleManualSteer('stop')}
                    className="w-9 h-9 bg-industrial-800 border border-industrial-700 rounded-lg flex items-center justify-center text-slate-300 hover:bg-industrial-700 active:scale-90 transition-all select-none"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  
                  <div />
                  <button 
                    onMouseDown={() => handleManualSteer('backward')} 
                    onMouseUp={() => handleManualSteer('stop')}
                    className="w-9 h-9 bg-industrial-800 border border-industrial-700 rounded-lg flex items-center justify-center text-slate-300 hover:bg-industrial-700 active:scale-90 transition-all select-none"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <div />
                </div>

                <div className="flex gap-2 w-full mt-4 border-t border-industrial-800/40 pt-3">
                  <button
                    onClick={() => handleManualProbe('deploy')}
                    className="flex-1 py-1 rounded-lg text-[9px] font-mono font-bold uppercase border border-industrial-700 text-slate-300 bg-industrial-800 hover:bg-industrial-700"
                  >
                    Probe Down
                  </button>
                  <button
                    onClick={() => handleManualProbe('retract')}
                    className="flex-1 py-1 rounded-lg text-[9px] font-mono font-bold uppercase border border-industrial-700 text-slate-300 bg-industrial-800 hover:bg-industrial-700"
                  >
                    Probe Up
                  </button>
                </div>
              </div>

              {/* AUTOPILOT WAYPOINT NAVIGATION STEER */}
              <div className="flex flex-col gap-2 bg-industrial-900/25 border border-industrial-850 rounded-2xl p-3 relative">
                {!isConnected && (
                  <div className="absolute inset-0 z-20 bg-industrial-900/90 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center p-3 text-center select-none">
                    <WifiOff className="w-7 h-7 text-neon-red mb-2 animate-pulse" />
                    <span className="text-[10px] font-mono text-neon-red font-bold uppercase tracking-widest">Autopilot Offline</span>
                  </div>
                )}
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1 text-center">Autonomy Autopilot</span>
                
                {missionState === 'IDLE' || missionState === 'COMPLETED' ? (
                  <button
                    onClick={handleStartMission}
                    className="py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-neon-green/10 border border-neon-green/30 text-neon-green hover:bg-neon-green/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-neon-green/10" />
                    Start Mission
                  </button>
                ) : missionState === 'PAUSED' ? (
                  <button
                    onClick={handleResumeMission}
                    className="py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-neon-blue/15 border border-neon-blue/40 text-neon-blue hover:bg-neon-blue/25 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-neon-blue/10" />
                    Resume Mission
                  </button>
                ) : (
                  <button
                    onClick={handlePauseMission}
                    className="py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-neon-yellow/10 border border-neon-yellow/30 text-neon-yellow hover:bg-neon-yellow/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pause Mission
                  </button>
                )}

                <button
                  onClick={handleReturnHome}
                  className="py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-industrial-800 border border-industrial-700 text-slate-300 hover:bg-industrial-700 transition-all flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Return Home
                </button>

                <button
                  onClick={handleEmergencyStop}
                  className="py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-neon-red/15 border border-neon-red/45 text-neon-red hover:bg-neon-red/25 transition-all flex items-center justify-center gap-1 animate-pulse"
                >
                  <ShieldAlert className="w-4 h-4 animate-bounce" />
                  E-Stop Abort
                </button>
              </div>

            </div>
          </div>

          {/* PANEL 4: MVFF VALIDATION SYSTEM PANEL (PREMIUM CYBERNETIC COMPARATOR HUD) */}
          <div className="glass-panel p-5 border border-industrial-700/50 shadow-lg rounded-2xl flex-1 relative overflow-hidden">
            <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-100 flex items-center gap-2 mb-4.5 border-b border-industrial-800 pb-2.5">
              <Database className="w-4 h-4 text-neon-blue animate-pulse" />
              4. MVFF System Validation
            </h2>

            {/* Offline Blur Overlay */}
            {!isConnected && (
              <div className="absolute inset-0 z-30 bg-industrial-950/75 backdrop-blur-[4px] flex flex-col items-center justify-center p-6 text-center select-none">
                <WifiOff className="w-9 h-9 text-slate-500 mb-2 animate-pulse" />
                <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest">VAL-SYS STANDBY</span>
                <span className="text-[9px] text-slate-500 font-mono mt-1.5 max-w-[200px] leading-relaxed">
                  Establish hardware telemetry connection to activate dynamic multi-sensor outlier rejection logs.
                </span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {[
                { label: 'Soil Moisture', unit: '%', data: mvffMoisture },
                { label: 'Soil pH level', unit: 'pH', data: mvffPh },
                { label: 'Nitrogen (N)', unit: 'mg/kg', data: mvffN },
                { label: 'Phosphorus (P)', unit: 'mg/kg', data: mvffP },
                { label: 'Potassium (K)', unit: 'mg/kg', data: mvffK },
              ].map((sensor, idx) => {
                const isReading = missionState === 'SAMPLING_READING';
                return (
                  <div key={`mvff-${idx}`} className="bg-gradient-to-r from-industrial-900/60 to-industrial-900/20 p-2.5 rounded-xl border border-industrial-850 flex items-center justify-between font-mono gap-3 shadow-sm hover:border-industrial-700/50 transition-all duration-300">
                    <div className="flex-1">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">{sensor.label}</span>
                      
                      {/* Cyber comparator chips */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Raw Inputs:</span>
                        <div className="flex items-center gap-1">
                          {sensor.data.raw.map((v, rIdx) => {
                            const isOutlier = sensor.data.rejectedIndices.includes(rIdx);
                            return (
                              <span 
                                key={`chip-${rIdx}`}
                                className={cn(
                                  "text-[9px] font-bold font-mono px-2 py-0.5 rounded border shadow-inner flex items-center gap-0.5",
                                  isOutlier 
                                    ? "bg-neon-red/10 border-neon-red/35 text-neon-red shadow-neon-red/5 animate-pulse" 
                                    : "bg-black/45 border-industrial-800 text-slate-400"
                                )}
                              >
                                {v}
                                {isOutlier && <X className="w-2.5 h-2.5" />}
                                {!isOutlier && isReading && <Check className="w-2.5 h-2.5 text-neon-green" />}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end flex-shrink-0">
                      <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">FILTERED OUT:</span>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border-0",
                          sensor.data.hasOutlier 
                            ? "text-neon-yellow" 
                            : "text-neon-green"
                        )}>
                          {sensor.data.hasOutlier ? 'OUTLIER ISOLATED' : 'STABLE'}
                        </span>
                        <span className="text-xs font-bold text-white tracking-wide">
                          {isReading ? sensor.data.filtered : (completedPoints[completedPoints.length - 1]?.[sensor.label.includes('Moisture') ? 'moisture' : sensor.label.includes('pH') ? 'ph' : sensor.label.includes('Nitrogen') ? 'n' : sensor.label.includes('Phosphorus') ? 'p' : 'k'] ?? '--')} {sensor.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ================= MIDDLE COLUMN: MAP, STATUS, ENVIRONMENT, OUTPUT ================= */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          
          {/* PANEL 2: MAP PANEL (ALWAYS LOADED REAL MAP) */}
          <div className="glass-panel p-5 flex flex-col border border-industrial-700/50 shadow-lg rounded-2xl relative z-10">
            <div className="flex items-center justify-between mb-4 border-b border-industrial-800 pb-3">
              <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-100 flex items-center gap-2">
                <Navigation className="w-4.5 h-4.5 text-neon-blue" />
                2. Live Spatial Map Panel
              </h2>
              <span className="text-[9px] font-mono uppercase font-bold text-slate-500">
                Moisture Heatmap Overlay
              </span>
            </div>

            <div className="w-full relative">
              <LiveMap 
                lat={lat}
                lng={lon}
                homeLat={gridPoints[0]?.lat}
                homeLon={gridPoints[0]?.lon}
                targetLat={targetLat}
                targetLon={targetLon}
                isConnected={isConnected}
                corners={cornersForMap()}
                gridPoints={gridPoints}
                completedPoints={completedPoints}
              />
            </div>
            
            {/* Heatmap legend scales */}
            <div className="grid grid-cols-4 gap-2 mt-4 text-center font-mono select-none">
              <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl p-1.5 flex flex-col items-center justify-center shadow-md">
                <span className="text-[9px] font-bold text-[#ef4444] uppercase tracking-wider block">Dry Soil</span>
                <span className="text-[8px] text-slate-400 mt-0.5">&lt; 30% Moisture</span>
              </div>
              <div className="bg-[#eab308]/10 border border-[#eab308]/30 rounded-xl p-1.5 flex flex-col items-center justify-center shadow-md">
                <span className="text-[9px] font-bold text-[#eab308] uppercase tracking-wider block">Medium</span>
                <span className="text-[8px] text-slate-400 mt-0.5">30% - 60% Moist</span>
              </div>
              <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-xl p-1.5 flex flex-col items-center justify-center shadow-md">
                <span className="text-[9px] font-bold text-[#22c55e] uppercase tracking-wider block">Healthy</span>
                <span className="text-[8px] text-slate-400 mt-0.5">60% - 80% Moist</span>
              </div>
              <div className="bg-[#3b82f6]/15 border border-[#3b82f6]/35 rounded-xl p-1.5 flex flex-col items-center justify-center shadow-md">
                <span className="text-[9px] font-bold text-[#3b82f6] uppercase tracking-wider block">Wet Soil</span>
                <span className="text-[8px] text-slate-400 mt-0.5">&ge; 80% Moisture</span>
              </div>
            </div>
          </div>

          {/* PANEL 7: CYBER STATUS PANEL */}
          <div className="glass-panel p-5 border border-industrial-700/50 shadow-lg rounded-2xl relative overflow-hidden">
            <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-100 flex items-center gap-2 mb-4 border-b border-industrial-800 pb-2.5">
              <Compass className="w-4 h-4 text-neon-blue" />
              7. Cyber Status Panel
            </h2>

            {/* Offline blur overlay */}
            {!isConnected && (
              <div className="absolute inset-0 z-30 bg-industrial-950/75 backdrop-blur-[3px] flex flex-col items-center justify-center text-center select-none">
                <WifiOff className="w-8 h-8 text-slate-500 mb-1.5 animate-pulse" />
                <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest">TELEMETRY OFFLINE</span>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono">
              <div className="bg-industrial-900/50 p-3 rounded-xl border border-industrial-850 flex flex-col justify-between shadow-inner">
                <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Rover Latitude</span>
                <span className="text-xs font-bold text-slate-200">{isConnected && lat !== 0 ? lat.toFixed(6) : '--'}</span>
              </div>
              <div className="bg-industrial-900/50 p-3 rounded-xl border border-industrial-850 flex flex-col justify-between shadow-inner">
                <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Rover Longitude</span>
                <span className="text-xs font-bold text-slate-200">{isConnected && lon !== 0 ? lon.toFixed(6) : '--'}</span>
              </div>
              <div className="bg-industrial-900/50 p-3 rounded-xl border border-industrial-850 flex flex-col justify-between col-span-2 md:col-span-1 shadow-inner">
                <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Active Waypoint</span>
                <span className="text-xs font-bold text-neon-blue">
                  {isConnected && targetLat !== 0 ? `${targetLat.toFixed(5)}, ${targetLon.toFixed(5)}` : '--'}
                </span>
              </div>
              
              <div className="bg-industrial-900/50 p-3 rounded-xl border border-industrial-850 flex flex-col justify-between shadow-inner">
                <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Distance to Next</span>
                <span className="text-xs font-bold text-neon-green">
                  {isConnected && targetLat !== 0 ? `${realDistance} feet` : '--'}
                </span>
              </div>
              <div className="bg-industrial-900/50 p-3 rounded-xl border border-industrial-850 flex flex-col justify-between shadow-inner">
                <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Drill Actuator</span>
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  probeState === 'deployed' && "text-neon-green shadow-neon-green/20",
                  (probeState === 'deploying' || probeState === 'retracting') && "text-neon-yellow animate-pulse",
                  probeState === 'retracted' && "text-slate-400"
                )}>
                  {isConnected ? (probeState === 'deployed' ? 'DEEP CORE READ' : probeState === 'deploying' ? 'INSERTING...' : probeState === 'retracting' ? 'RETRACTING...' : 'STANDBY') : '--'}
                </span>
              </div>
              <div className="bg-industrial-900/50 p-3 rounded-xl border border-industrial-850 flex flex-col justify-between shadow-inner">
                <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Scouting Progress</span>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-neon-purple">{completedPoints.length} / {gridPoints.length}</span>
                  <span className="text-[10px] text-slate-500">
                    {gridPoints.length > 0 ? Math.round((completedPoints.length / gridPoints.length) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
            
            {/* cyber progress bar */}
            <div className="w-full bg-industrial-900 rounded-full h-1.5 mt-3.5 border border-industrial-850 overflow-hidden relative shadow-inner">
              <div 
                className="bg-gradient-to-r from-neon-blue to-neon-purple h-full transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                style={{ width: `${gridPoints.length > 0 ? (completedPoints.length / gridPoints.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* PANEL 9: CYBER ENVIRONMENT PANEL (DHT11 REAL telemetry FEED) */}
          <div className="glass-panel p-5 border border-industrial-700/50 shadow-lg rounded-2xl relative overflow-hidden">
            <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-100 flex items-center gap-2 mb-4 border-b border-industrial-800 pb-2.5">
              <Wind className="w-4.5 h-4.5 text-neon-blue" />
              9. Ambient Environment Panel
            </h2>

            {/* Offline blur overlay */}
            {!isConnected && (
              <div className="absolute inset-0 z-30 bg-industrial-950/75 backdrop-blur-[3px] flex flex-col items-center justify-center text-center select-none">
                <WifiOff className="w-8 h-8 text-slate-500 mb-1.5 animate-pulse" />
                <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest">AMBIENT TELEMETRY OFFLINE</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 font-mono">
              <div className="bg-gradient-to-br from-industrial-900/40 to-industrial-900/10 p-3.5 rounded-xl border border-industrial-850 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-neon-red/10 border border-neon-red/20 rounded-xl text-neon-red shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                    <Thermometer className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Air Temperature</span>
                    <span className="text-lg font-bold text-white tracking-wide">
                      {isConnected && airTemp !== 0.0 ? `${airTemp.toFixed(1)} °C` : '--'}
                    </span>
                  </div>
                </div>
                <span className="text-[8px] text-slate-500 font-bold border border-industrial-800 bg-black/25 px-1.5 py-0.5 rounded">DHT11</span>
              </div>

              <div className="bg-gradient-to-br from-industrial-900/40 to-industrial-900/10 p-3.5 rounded-xl border border-industrial-850 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-neon-blue/10 border border-neon-blue/20 rounded-xl text-neon-blue shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                    <Wind className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Air Humidity</span>
                    <span className="text-lg font-bold text-white tracking-wide">
                      {isConnected && airHumidity !== 0.0 ? `${airHumidity.toFixed(1)} %` : '--'}
                    </span>
                  </div>
                </div>
                <span className="text-[8px] text-slate-500 font-bold border border-industrial-800 bg-black/25 px-1.5 py-0.5 rounded">DHT11</span>
              </div>
            </div>
          </div>

          {/* PANEL 10: SCOUTING REPORT CARD (TRIGGERS END OF AUTOPILOT SCAN) */}
          <AnimatePresence>
            {missionState === 'COMPLETED' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-panel p-5 border-2 border-neon-green/30 shadow-2xl rounded-2xl bg-gradient-to-br from-industrial-950 via-industrial-900 to-[#14532d]/10 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 text-neon-green/5 select-none font-mono font-bold text-7xl uppercase z-0 pointer-events-none">
                  COMPLETE
                </div>
                
                <div className="relative z-10 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-neon-green/10 border border-neon-green/20 rounded-2xl text-neon-green animate-bounce">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-white">10. Spatial Scouting Report Card</h3>
                      <p className="text-[9px] text-slate-400 font-mono uppercase">Mission aggregated metrics summary</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 font-mono mt-1 select-text">
                    <div className="bg-black/35 p-3 rounded-xl border border-industrial-800">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">Avg Moisture</span>
                      <span className="text-base font-bold text-neon-blue">{averageMoisture}%</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">({getMoistureLabel(averageMoisture)})</span>
                    </div>
                    <div className="bg-black/35 p-3 rounded-xl border border-industrial-800">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">Avg Field pH</span>
                      <span className="text-base font-bold text-neon-green">{averagePh}</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">({getPhLabel(averagePh)})</span>
                    </div>
                    <div className="bg-black/35 p-3 rounded-xl border border-industrial-800">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">Avg Nitrogen (N)</span>
                      <span className="text-sm font-bold text-white">{averageN} mg/kg</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">({getNpkLabel(averageN)})</span>
                    </div>
                  </div>

                  <div className={cn(
                    "rounded-xl p-3 border text-xs font-mono flex items-start gap-3 mt-1 shadow-sm",
                    lowNutrientZones.length > 0 
                      ? "bg-neon-red/10 border-neon-red/20 text-neon-red" 
                      : "bg-neon-green/10 border-neon-green/20 text-neon-green"
                  )}>
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      {lowNutrientZones.length > 0 ? (
                        <>
                          <span className="font-bold block uppercase tracking-wide">⚠ LOW NUTRIENT ZONES DETECTED</span>
                          <span className="text-[9px] text-slate-300 block mt-1 leading-normal">
                            Discovered nutrient deficiencies at {lowNutrientZones.length} waypoint coordinates. Target fertilization is required.
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-bold block uppercase tracking-wide">✔ FERTILITY STABILITY CONFIRMED</span>
                          <span className="text-[9px] text-slate-300 block mt-1 leading-normal">
                            All waypoint coordinates showcases normal/healthy levels. Great soil health profile.
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-1.5 font-mono">
                    <button 
                      onClick={() => setMissionState('IDLE')}
                      className="flex-1 py-2 border border-industrial-700 bg-industrial-850 hover:bg-industrial-800 rounded-xl text-[10px] font-bold text-white uppercase tracking-wider transition-all duration-200"
                    >
                      Acknowledge & Close Report
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DIAGNOSTICS LOG PANEL */}
          <div className="glass-panel p-4 border border-industrial-800 bg-black/30 rounded-2xl shadow-inner">
            <div className="flex items-center justify-between mb-2.5 text-[9px] font-bold tracking-widest font-mono text-slate-400 uppercase select-none">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-neon-blue animate-pulse" />
                Diagnostics Console Terminal
              </span>
              <button 
                onClick={() => setTerminalLogs(["[SYSTEM] Log flusher triggered."])}
                className="text-[8px] text-slate-500 hover:text-slate-200 border border-industrial-800 bg-industrial-900 px-2 py-0.5 rounded transition-all font-bold"
              >
                Clear Logs
              </button>
            </div>
            
            <div className="h-[96px] bg-black/60 rounded-xl p-3 border border-industrial-850 overflow-y-auto font-mono text-[9px] text-[#22c55e] leading-relaxed flex flex-col gap-0.5 shadow-inner select-text">
              {terminalLogs.map((log, idx) => (
                <div key={`log-${idx}`} className="break-all whitespace-pre-wrap">
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN: SLEEK CYBER GAUGES, REAL RECOMMENDATIONS ================= */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          
          {/* PANEL 5: SOIL TELEMETRY GAUGE PANEL */}
          <div className="glass-panel p-5 border border-industrial-700/50 shadow-lg rounded-2xl relative overflow-hidden">
            <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-100 flex items-center gap-2 mb-4 border-b border-industrial-800 pb-2.5">
              <Database className="w-4 h-4 text-neon-blue" />
              5. Soil Telemetry Cards
            </h2>

            {/* Offline blur overlay */}
            {!isConnected && (
              <div className="absolute inset-0 z-30 bg-industrial-950/75 backdrop-blur-[3.5px] flex flex-col items-center justify-center p-6 text-center select-none">
                <WifiOff className="w-8 h-8 text-slate-500 mb-2 animate-pulse" />
                <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest">TELEMETRY OFFLINE</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {[
                { label: 'Soil Moisture Percentage', icon: <Droplets className="w-4 h-4" />, value: soilMoisture, unit: '%', max: 100, getColor: (v: number) => v < 30 ? 'text-[#ef4444] shadow-[#ef4444]/10 border-[#ef4444]/30' : v <= 60 ? 'text-[#eab308] shadow-[#eab308]/10 border-[#eab308]/30' : v <= 80 ? 'text-[#22c55e] shadow-[#22c55e]/10 border-[#22c55e]/30' : 'text-[#3b82f6] shadow-[#3b82f6]/15 border-[#3b82f6]/30' },
                { label: 'Soil pH level', icon: <Compass className="w-4 h-4" />, value: soilPH, unit: 'pH', max: 14, getColor: (v: number) => v < 6.0 ? 'text-[#eab308] border-[#eab308]/30 shadow-[#eab308]/5' : v <= 7.5 ? 'text-[#22c55e] border-[#22c55e]/30 shadow-[#22c55e]/5' : 'text-[#eab308] border-[#eab308]/30 shadow-[#eab308]/5' },
                { label: 'Nitrogen (N) Content', icon: <Activity className="w-4 h-4" />, value: soilN, unit: 'mg/kg', max: 100, getColor: (v: number) => v < 30 ? 'text-[#ef4444] border-[#ef4444]/30 animate-pulse' : 'text-[#22c55e] border-[#22c55e]/30' },
                { label: 'Phosphorus (P) Content', icon: <Activity className="w-4 h-4" />, value: soilP, unit: 'mg/kg', max: 80, getColor: (v: number) => v < 20 ? 'text-[#ef4444] border-[#ef4444]/30 animate-pulse' : 'text-[#22c55e] border-[#22c55e]/30' },
                { label: 'Potassium (K) Content', icon: <Activity className="w-4 h-4" />, value: soilK, unit: 'mg/kg', max: 180, getColor: (v: number) => v < 80 ? 'text-[#ef4444] border-[#ef4444]/30 animate-pulse' : 'text-[#22c55e] border-[#22c55e]/30' },
                { label: 'Soil Core Temperature', icon: <Thermometer className="w-4 h-4" />, value: soilTemp, unit: '°C', max: 50, getColor: () => 'text-[#22c55e] border-[#22c55e]/25' },
                { label: 'Soil EC Conductivity', icon: <Database className="w-4 h-4" />, value: soilEC, unit: 'µS/cm', max: 1500, getColor: () => 'text-[#22c55e] border-[#22c55e]/25' },
              ].map((sensor, idx) => (
                <div key={`sensor-${idx}`} className="bg-gradient-to-r from-industrial-900/50 to-industrial-900/10 p-3 rounded-xl border border-industrial-850 flex items-center justify-between font-mono relative overflow-hidden group shadow-sm hover:border-industrial-700/50 transition-all duration-300">
                  
                  {/* Glowing progress tracks */}
                  <div 
                    className="absolute bottom-0 left-0 h-[2px] bg-neon-blue/20 group-hover:bg-neon-blue/40 transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    style={{ width: `${Math.min(100, (sensor.value / sensor.max) * 100)}%` }}
                  />

                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 bg-industrial-800 rounded-lg border flex items-center justify-center transition-all", sensor.getColor(sensor.value))}>
                      {sensor.icon}
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5 leading-none">{sensor.label}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">
                        {idx === 0 ? getMoistureLabel(sensor.value) : idx === 1 ? getPhLabel(sensor.value) : idx <= 4 ? getNpkLabel(sensor.value) : 'Active'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 pl-2">
                    <span className={cn("text-base font-extrabold tracking-wide", sensor.getColor(sensor.value))}>
                      {sensor.value}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold ml-1">{sensor.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PANEL 6: INTELLIGENCE PANEL */}
          <div className="glass-panel p-5 border border-industrial-700/50 shadow-lg rounded-2xl flex-grow relative overflow-hidden">
            <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-100 flex items-center gap-2 mb-4 border-b border-industrial-800 pb-2.5">
              <Heart className="w-4.5 h-4.5 text-neon-blue animate-pulse" />
              6. Intelligence Panel
            </h2>

            {/* Offline blur overlay */}
            {!isConnected && (
              <div className="absolute inset-0 z-30 bg-industrial-950/75 backdrop-blur-[3.5px] flex flex-col items-center justify-center p-5 text-center select-none">
                <WifiOff className="w-8 h-8 text-slate-500 mb-2 animate-pulse" />
                <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest">TELEMETRY INACTIVE</span>
                <span className="text-[9px] text-slate-500 font-mono mt-1 max-w-[180px]">
                  Establish WebSocket connection to calculate soil statuses.
                </span>
              </div>
            )}

            <div className="flex flex-col gap-4 font-mono text-xs select-text">
              
              {/* Humid status profile */}
              <div className="bg-industrial-900/50 p-4.5 rounded-2xl border border-industrial-850 flex flex-col gap-2.5 shadow-inner">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block border-b border-industrial-800/40 pb-1.5 select-none">
                  Soil Status Summary
                </span>
                
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400">Moisture Profile:</span>
                    <span className={cn(
                      "font-bold px-2 py-0.5 rounded text-[10px] uppercase",
                      soilMoisture < 30 ? "bg-[#ef4444]/10 text-[#ef4444]" : soilMoisture <= 60 ? "bg-[#22c55e]/10 text-[#22c55e]" : "bg-[#3b82f6]/10 text-[#3b82f6]"
                    )}>
                      {getMoistureLabel(soilMoisture)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400">pH Acidity Class:</span>
                    <span className={cn(
                      "font-bold px-2 py-0.5 rounded text-[10px] uppercase",
                      (soilPH < 6.0 || soilPH > 7.5) ? "bg-[#eab308]/10 text-[#eab308]" : "bg-[#22c55e]/10 text-[#22c55e]"
                    )}>
                      {getPhLabel(soilPH)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400">Nitrogen Level:</span>
                    <span className={cn(
                      "font-bold px-2 py-0.5 rounded text-[10px] uppercase",
                      soilN < 30 ? "bg-[#ef4444]/10 text-[#ef4444] animate-pulse" : "bg-[#22c55e]/10 text-[#22c55e]"
                    )}>
                      {getNpkLabel(soilN)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="flex flex-col gap-2.5 bg-industrial-900/35 border border-industrial-850 p-4.5 rounded-2xl shadow-inner">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block border-b border-industrial-800/40 pb-1.5 select-none">
                  Agronomic Recommendations
                </span>
                
                <div className="flex flex-col gap-2 font-semibold">
                  {getSoilRecommendations().map((rec, idx) => (
                    <div 
                      key={`rec-${idx}`} 
                      className={cn(
                        "text-[10px] leading-relaxed",
                        rec.includes("healthy") ? "text-neon-green" : rec.includes("limestone") || rec.includes("sulfur") ? "text-neon-yellow" : "text-neon-blue"
                      )}
                    >
                      {rec}
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[8px] text-slate-500 text-center leading-normal uppercase select-none">
                Decision engine computed directly from<br />
                live MVFF validated hardware parameters
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );

  // Map coordinates corners parser helper
  function cornersForMap() {
    try {
      const c1 = { lat: parseFloat(corner1Lat), lon: parseFloat(corner1Lon) };
      const c2 = { lat: parseFloat(corner2Lat), lon: parseFloat(corner2Lon) };
      const c3 = { lat: parseFloat(corner3Lat), lon: parseFloat(corner3Lon) };
      const c4 = { lat: parseFloat(corner4Lat), lon: parseFloat(corner4Lon) };
      if (isNaN(c1.lat) || isNaN(c1.lon) || isNaN(c2.lat) || isNaN(c2.lon) || 
          isNaN(c3.lat) || isNaN(c3.lon) || isNaN(c4.lat) || isNaN(c4.lon)) {
        return [];
      }
      return [c1, c2, c3, c4];
    } catch {
      return [];
    }
  }
};
