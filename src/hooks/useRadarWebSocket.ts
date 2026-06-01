import { useState, useEffect, useRef, useCallback } from 'react';

export interface RadarDataPoint {
  angle: number;
  distance: number;
  obstacle: boolean;
  timestamp: number;
}

export interface TelemetryPacket {
  angle: number;
  distance: number;
  obstacle: boolean;
  lat: number;
  lon: number;
  homeLat: number;
  homeLon: number;
  targetLat: number;
  targetLon: number;
  autoMode: boolean;
  returnHome: boolean;
  satellites: number;
  speed: number;
  log: string;
  probeState: string;
  probe_height_pct?: number;
  
  // Real NPK parameters
  soil_moisture?: number;
  soil_temp?: number;
  soil_ec?: number;
  soil_ph?: number;
  soil_n?: number;
  soil_p?: number;
  soil_k?: number;
  battery?: number;
  timestamp: number;
}

export const useRadarWebSocket = (url: string = 'ws://localhost:8080') => {
  const [isConnected, setIsConnected] = useState(false);
  const [radarData, setRadarData] = useState<Record<number, RadarDataPoint>>({});
  const [latestPoint, setLatestPoint] = useState<RadarDataPoint | null>(null);
  
  // Custom rover status states from live telemetry
  const [lat, setLat] = useState(0.0);
  const [lon, setLon] = useState(0.0);
  const [homeLat, setHomeLat] = useState(0.0);
  const [homeLon, setHomeLon] = useState(0.0);
  const [targetLat, setTargetLat] = useState(0.0);
  const [targetLon, setTargetLon] = useState(0.0);
  const [autoMode, setAutoMode] = useState(false);
  const [returnHome, setReturnHome] = useState(false);
  const [satellites, setSatellites] = useState(0);
  const [speed, setSpeed] = useState(0.0);
  const [probeState, setProbeState] = useState('retracted');
  const [probeHeightPct, setProbeHeightPct] = useState(0);
  const [logs, setLogs] = useState<string[]>(["[SYSTEM] Dashboard initialized."]);

  // Real NPK Soil Parameters
  const [soilMoisture, setSoilMoisture] = useState(0.0);
  const [soilTemp, setSoilTemp] = useState(0.0);
  const [soilEC, setSoilEC] = useState(0);
  const [soilPH, setSoilPH] = useState(0.0);
  const [soilN, setSoilN] = useState(0);
  const [soilP, setSoilP] = useState(0);
  const [soilK, setSoilK] = useState(0);
  const [battery, setBattery] = useState(0);
  
  // DHT11 Air parameters
  const [airTemp, setAirTemp] = useState(0.0);
  const [airHumidity, setAirHumidity] = useState(0.0);

  const [alerts, setAlerts] = useState<{ status: 'SAFE' | 'WARNING' | 'DANGER', distance: number, angle: number, direction: string }>({
    status: 'SAFE',
    distance: 100,
    angle: 0,
    direction: 'Front'
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const lastLogRef = useRef<string>("");

  const getDirection = (angle: number) => {
    if (angle < 60) return 'Right';
    if (angle > 120) return 'Left';
    return 'Front';
  };

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        console.log('Connected to Rover WebSocket:', url);
        setLogs(prev => [...prev.slice(-49), `[SYSTEM] Connected to Rover WebSocket at ${url}`]);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data: TelemetryPacket = JSON.parse(event.data);
          
          // Parse radar data point
          const radarPoint: RadarDataPoint = {
            angle: data.angle,
            distance: data.distance,
            obstacle: data.obstacle,
            timestamp: data.timestamp || Date.now()
          };
          setLatestPoint(radarPoint);
          
          // Store point by angle (rounded) to build the radar map
          const roundedAngle = Math.round(data.angle);
          setRadarData(prev => {
            const next = { ...prev };
            for (let i = roundedAngle - 2; i <= roundedAngle + 2; i++) {
              if (next[i]) delete next[i];
            }
            next[roundedAngle] = radarPoint;
            return next;
          });

          // Sync GPS and Rover status coordinates
          if (data.lat !== undefined) setLat(data.lat);
          if (data.lon !== undefined) setLon(data.lon);
          if (data.homeLat !== undefined) setHomeLat(data.homeLat);
          if (data.homeLon !== undefined) setHomeLon(data.homeLon);
          if (data.targetLat !== undefined) setTargetLat(data.targetLat);
          if (data.targetLon !== undefined) setTargetLon(data.targetLon);
          if (data.autoMode !== undefined) setAutoMode(data.autoMode);
          if (data.returnHome !== undefined) setReturnHome(data.returnHome);
          if (data.satellites !== undefined) setSatellites(data.satellites);
          if (data.speed !== undefined) setSpeed(data.speed);
          if (data.probeState !== undefined) setProbeState(data.probeState);
          
          // Sync soil NPK readings
          if (data.soil_moisture !== undefined) setSoilMoisture(data.soil_moisture);
          if (data.soil_temp !== undefined) setSoilTemp(data.soil_temp);
          if (data.soil_ec !== undefined) setSoilEC(data.soil_ec);
          if (data.soil_ph !== undefined) setSoilPH(data.soil_ph);
          if (data.soil_n !== undefined) setSoilN(data.soil_n);
          if (data.soil_p !== undefined) setSoilP(data.soil_p);
          if (data.soil_k !== undefined) setSoilK(data.soil_k);
          if (data.battery !== undefined) setBattery(data.battery);
          
          // Sync DHT11 Air parameters (if sent by ESP32)
          if ((data as any).air_temp !== undefined) setAirTemp((data as any).air_temp);
          if ((data as any).air_humidity !== undefined) setAirHumidity((data as any).air_humidity);

          // Log terminal buffering
          if (data.log && data.log !== lastLogRef.current) {
            lastLogRef.current = data.log;
            setLogs(prev => [...prev.slice(-49), data.log]);
          }

          // Update safety alerts
          if (data.obstacle || data.distance < 45) {
            setAlerts({
              status: data.distance < 20 ? 'DANGER' : 'WARNING',
              distance: Math.round(data.distance),
              angle: Math.round(data.angle),
              direction: getDirection(data.angle)
            });
          } else {
            setAlerts({
              status: 'SAFE',
              distance: Math.round(data.distance),
              angle: Math.round(data.angle),
              direction: getDirection(data.angle)
            });
          }
          
        } catch (e) {
          console.error("Error parsing telemetry packet", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setRadarData({});
        setLatestPoint(null);
        setLat(0.0);
        setLon(0.0);
        setHomeLat(0.0);
        setHomeLon(0.0);
        setTargetLat(0.0);
        setTargetLon(0.0);
        setAutoMode(false);
        setReturnHome(false);
        setSatellites(0);
        setSpeed(0.0);
        setProbeState('retracted');
        setProbeHeightPct(0);
        setSoilMoisture(0.0);
        setSoilTemp(0.0);
        setSoilEC(0);
        setSoilPH(0.0);
        setSoilN(0);
        setSoilP(0);
        setSoilK(0);
        setBattery(0);
        setAlerts({
          status: 'SAFE',
          distance: 100,
          angle: 0,
          direction: 'Front'
        });
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        console.log('Rover WebSocket disconnected. Reconnecting...');
        setLogs(prev => [...prev.slice(-49), "[SYSTEM] Connection lost. Reconnecting..."]);
        reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error('Rover WebSocket error:', error);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        ws.close();
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('Failed to connect to WebSocket', e);
      reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [connect]);

  // Client-side smooth probe progression sync
  useEffect(() => {
    let interval: number;
    if (probeState === 'deploying') {
      interval = window.setInterval(() => {
        setProbeHeightPct(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 5;
        });
      }, 150);
    } else if (probeState === 'retracting') {
      interval = window.setInterval(() => {
        setProbeHeightPct(prev => {
          if (prev <= 0) {
            clearInterval(interval);
            return 0;
          }
          return prev - 5;
        });
      }, 150);
    } else if (probeState === 'deployed') {
      setProbeHeightPct(100);
    } else if (probeState === 'retracted') {
      setProbeHeightPct(0);
    }
    return () => clearInterval(interval);
  }, [probeState]);

  // Transmit driving control commands
  const sendControlCommand = (move: 'forward' | 'backward' | 'left' | 'right' | 'stop') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CONTROL', move }));
    }
  };

  // Transmit linear actuator probe control commands
  const sendProbeCommand = (action: 'deploy' | 'retract' | 'stop') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'PROBE', action }));
    }
  };

  // Transmit autonomous mode toggles
  const toggleAutoMode = (enabled: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'TOGGLE_AUTO', enabled }));
    }
  };

  // Transmit target GPS coordinates
  const setGpsTarget = (latVal: number, lonVal: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SET_TARGET', lat: latVal, lon: lonVal }));
    }
  };

  // Transmit Return to Home coordinates command
  const triggerReturnHome = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'RETURN_HOME' }));
    }
  };

  const toggleRadar = (enabled: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'TOGGLE_RADAR', enabled }));
    }
  };

  return {
    isConnected,
    radarData,
    latestPoint,
    alerts,
    toggleRadar,
    
    // Telemetry fields
    lat,
    lon,
    homeLat,
    homeLon,
    targetLat,
    targetLon,
    autoMode,
    returnHome,
    satellites,
    speed,
    logs,
    probeState,
    probeHeightPct,

    // NPK metrics
    soilMoisture,
    soilTemp,
    soilEC,
    soilPH,
    soilN,
    soilP,
    soilK,
    battery,

    // DHT11 air metrics
    airTemp,
    airHumidity,

    // Operations commands
    sendControlCommand,
    sendProbeCommand,
    toggleAutoMode,
    setGpsTarget,
    triggerReturnHome
  };
};
