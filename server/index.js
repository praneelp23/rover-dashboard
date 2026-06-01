import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import http from 'http';
import sqlite3Pkg from 'sqlite3';
const sqlite3 = sqlite3Pkg.verbose();

const db = new sqlite3.Database('./rover_data.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    db.run(`CREATE TABLE IF NOT EXISTS radar_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      angle REAL,
      distance REAL,
      obstacle BOOLEAN,
      timestamp INTEGER
    )`);
    console.log('Database connected and table ready.');
  }
});

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 8080;

// API Endpoints
app.post('/api/control', (req, res) => {
  const { move } = req.body;
  console.log(`[ROVER CONTROL] Received HTTP command: ${move}`);
  handleMoveCommand(move);
  res.status(200).json({ status: 'success', command: move });
});

app.post('/api/log', (req, res) => {
  const dataPoints = req.body;
  if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Expected non-empty array of data points' });
  }

  const stmt = db.prepare('INSERT INTO radar_logs (angle, distance, obstacle, timestamp) VALUES (?, ?, ?, ?)');
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    dataPoints.forEach((point) => {
      stmt.run(point.angle, point.distance, point.obstacle ? 1 : 0, point.timestamp);
    });
    db.run('COMMIT', (err) => {
      if (err) {
        console.error('Failed to commit batch', err);
        res.status(500).json({ status: 'error', message: 'Database error' });
      } else {
        res.status(200).json({ status: 'success', count: dataPoints.length });
      }
    });
  });
  stmt.finalize();
});

// WebSocket Telemetry States
let connectedClients = new Set();
let isRadarEnabled = true;

// Simulated Physical Rover States
let currentLat = 34.0522;
let currentLon = -118.2437;
let homeLat = 34.0522;
let homeLon = -118.2437;
let targetLat = 0.0;
let targetLon = 0.0;
let homeSaved = true;
let autoMode = false;
let returnHome = false;
let gpsSatellites = 12;
let gpsSpeed = 0.0;
let currentHeading = 90.0; // east
let lastLogMsg = "=== EL ROVER READY ===";

// Probe State & Height Tracking
let probeState = "retracted";
let probeHeightPct = 0; // 0 to 100

// NPK Real Sensor Telemetry Simulation
let soilN = 45;
let soilP = 32;
let soilK = 92;
let soilPH = 6.8;
let soilMoisture = 18.5;
let soilTemp = 24.5;
let soilEC = 450;
let batteryLevel = 98;
let obstacleDetected = false;

// Slowly decay battery
setInterval(() => {
  if (batteryLevel > 15) {
    batteryLevel -= 1;
  }
}, 45000); // decay every 45s for simulation visibility

// Slowly drift soil values for organic realism
setInterval(() => {
  if (probeState === 'deployed') {
    soilN = Math.max(10, Math.min(100, Math.round(soilN + (Math.random() * 2 - 1))));
    soilP = Math.max(10, Math.min(80, Math.round(soilP + (Math.random() * 2 - 1))));
    soilK = Math.max(20, Math.min(180, Math.round(soilK + (Math.random() * 4 - 2))));
    soilPH = Math.max(4.5, Math.min(8.5, parseFloat((soilPH + (Math.random() * 0.2 - 0.1)).toFixed(1))));
    soilMoisture = Math.max(5, Math.min(45, parseFloat((soilMoisture + (Math.random() * 0.4 - 0.2)).toFixed(1))));
    soilTemp = Math.max(12, Math.min(38, parseFloat((soilTemp + (Math.random() * 0.2 - 0.1)).toFixed(1))));
    soilEC = Math.max(100, Math.min(800, Math.round(soilEC + (Math.random() * 6 - 3))));
  } else {
    // When probe is retracted, parameters are 0 because it's not touching the soil!
    soilN = 0;
    soilP = 0;
    soilK = 0;
    soilPH = 0.0;
    soilMoisture = 0.0;
    soilTemp = 0.0;
    soilEC = 0;
  }
}, 2000);

// Progressive Soil Probe actuator sweep
setInterval(() => {
  if (probeState === 'deploying') {
    probeHeightPct += 5;
    if (probeHeightPct >= 100) {
      probeHeightPct = 100;
      probeState = 'deployed';
      lastLogMsg = `[PROBE] Probe fully deployed. Reading soil metrics...`;
    } else {
      lastLogMsg = `[PROBE] Deploying linear actuator... ${probeHeightPct}%`;
    }
  } else if (probeState === 'retracting') {
    probeHeightPct -= 5;
    if (probeHeightPct <= 0) {
      probeHeightPct = 0;
      probeState = 'retracted';
      lastLogMsg = `[PROBE] Probe fully retracted.`;
    } else {
      lastLogMsg = `[PROBE] Retracting linear actuator... ${probeHeightPct}%`;
    }
  }
}, 150);

// Motor movements tracking (for manual driving mapping)
let currentMovement = "stop";

// Manual coordinate update helper (simulating manual driving drift)
setInterval(() => {
  if (autoMode) return;
  if (currentMovement === "stop") {
    gpsSpeed = 0.0;
    return;
  }

  gpsSpeed = 2.5; // 2.5 km/h
  const step = 0.000005; // degree increment
  if (currentMovement === "forward") {
    currentLat += step;
    currentHeading = 0.0;
  } else if (currentMovement === "backward") {
    currentLat -= step;
    currentHeading = 180.0;
  } else if (currentMovement === "left") {
    currentLon -= step;
    currentHeading = 270.0;
  } else if (currentMovement === "right") {
    currentLon += step;
    currentHeading = 90.0;
  }
}, 200);

// Autonomous Navigation simulation loop
setInterval(() => {
  if (!autoMode) return;

  let tLat = returnHome ? homeLat : targetLat;
  let tLon = returnHome ? homeLon : targetLon;

  if (tLat === 0.0 && tLon === 0.0) {
    lastLogMsg = "AUTO: No target set";
    autoMode = false;
    gpsSpeed = 0.0;
    return;
  }

  gpsSpeed = 5.4; // 5.4 km/h simulated autonomous speed
  const dLat = tLat - currentLat;
  const dLon = tLon - currentLon;
  
  // Haversine-like direct distance
  const R = 6371000.0;
  const dy = dLat * (Math.PI / 180.0) * R;
  const dx = dLon * (Math.PI / 180.0) * R * Math.cos(currentLat * Math.PI / 180.0);
  const distance = Math.sqrt(dy * dy + dx * dx);

  // Bearing calculation
  let requiredBearing = (Math.atan2(dx, dy) * 180.0 / Math.PI + 360.0) % 360.0;

  // Simulate heading adjustments
  let headingDiff = requiredBearing - currentHeading;
  if (headingDiff > 180.0) headingDiff -= 360.0;
  if (headingDiff < -180.0) headingDiff += 360.0;

  // Steer towards target
  if (Math.abs(headingDiff) > 10) {
    currentHeading += Math.sign(headingDiff) * 8.0;
    currentHeading = (currentHeading + 360.0) % 360.0;
  }

  // Step GPS closer
  const moveStepRatio = 0.08; // speed of simulation steps
  currentLat += dLat * moveStepRatio;
  currentLon += dLon * moveStepRatio;

  // Log navigation telemetry
  lastLogMsg = `D:${distance.toFixed(1)}m B:${requiredBearing.toFixed(1)} H:${currentHeading.toFixed(1)} E:${headingDiff.toFixed(1)}`;

  // Check arrival threshold (2 meters)
  if (distance <= 2.0) {
    lastLogMsg = "NAV: *** TARGET REACHED ***";
    gpsSpeed = 0.0;
    
    setTimeout(() => {
      if (returnHome) {
        returnHome = false;
        autoMode = false;
        lastLogMsg = "NAV: HOME REACHED. Auto OFF.";
      } else {
        autoMode = false;
        lastLogMsg = "AUTO: Navigation complete.";
      }
    }, 1500);
  }
}, 1000);

function handleMoveCommand(move) {
  currentMovement = move;
  if (move !== 'stop') {
    lastLogMsg = `[DRIVE] Moving ${move.toUpperCase()}`;
  } else {
    lastLogMsg = `[DRIVE] Rover stopped`;
  }
}

wss.on('connection', (ws) => {
  console.log('Client connected to Web Dashboard WebSocket');
  connectedClients.add(ws);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'TOGGLE_RADAR') {
        isRadarEnabled = data.enabled;
        console.log(`Radar scanning ${isRadarEnabled ? 'ENABLED' : 'DISABLED'}`);
      }
      else if (data.type === 'CONTROL') {
        handleMoveCommand(data.move);
      }
      else if (data.type === 'PROBE') {
        // Toggle progressive actuator
        const action = data.action;
        if (action === 'deploy') {
          probeState = 'deploying';
        } else if (action === 'retract') {
          probeState = 'retracting';
        } else {
          probeState = 'stopped';
          lastLogMsg = `[PROBE] Actuator stopped.`;
        }
      }
      else if (data.type === 'TOGGLE_AUTO') {
        autoMode = data.enabled;
        returnHome = false;
        if (autoMode) {
          lastLogMsg = `MODE: AUTO ON`;
          if (!homeSaved) {
            homeLat = currentLat;
            homeLon = currentLon;
            homeSaved = true;
          }
        } else {
          lastLogMsg = `MODE: MANUAL`;
          currentMovement = "stop";
        }
      }
      else if (data.type === 'SET_TARGET') {
        targetLat = data.lat;
        targetLon = data.lon;
        lastLogMsg = `TARGET Lat: ${targetLat.toFixed(6)}`;
        setTimeout(() => {
          lastLogMsg = `TARGET Lon: ${targetLon.toFixed(6)}`;
        }, 1000);
      }
      else if (data.type === 'RETURN_HOME') {
        returnHome = true;
        autoMode = true;
        lastLogMsg = `MODE: RETURN HOME`;
      }
    } catch (e) {
      console.error('Failed to parse websocket message', e);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    connectedClients.delete(ws);
  });
});

// Radar & Telemetry Broadcaster
let currentAngle = 90;
let sweepDir = 1;
const SWEEP_SPEED = 2.5; // step size in degrees

setInterval(() => {
  // Sweep servo
  if (isRadarEnabled) {
    currentAngle += SWEEP_SPEED * sweepDir;
    if (currentAngle >= 145) {
      currentAngle = 145;
      sweepDir = -1;
    } else if (currentAngle <= 30) {
      currentAngle = 30;
      sweepDir = 1;
    }
  }

  // Distance obstacle calculation
  let distance = 100;
  obstacleDetected = false;

  // Build unified telemetry packet
  const telemetry = {
    angle: currentAngle,
    distance,
    obstacle: obstacleDetected,
    lat: currentLat,
    lon: currentLon,
    homeLat: homeLat,
    homeLon: homeLon,
    targetLat: targetLat,
    targetLon: targetLon,
    autoMode: autoMode,
    returnHome: returnHome,
    satellites: gpsSatellites,
    speed: gpsSpeed,
    log: lastLogMsg,
    probeState: probeState,
    probe_height_pct: probeHeightPct,
    
    // NPK metrics
    soil_moisture: soilMoisture,
    soil_temp: soilTemp,
    soil_ec: soilEC,
    soil_ph: soilPH,
    soil_n: soilN,
    soil_p: soilP,
    soil_k: soilK,
    battery: batteryLevel,
    air_temp: parseFloat((24.2 + (Math.random() * 0.4 - 0.2)).toFixed(1)),
    air_humidity: parseFloat((55.8 + (Math.random() * 1.0 - 0.5)).toFixed(1)),
    timestamp: Date.now()
  };

  // Broadcast to all websocket connections
  const message = JSON.stringify(telemetry);
  connectedClients.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  });

}, 150); // sync with esp32 broadcast rate

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket server is running on ws://localhost:${PORT}`);
});
