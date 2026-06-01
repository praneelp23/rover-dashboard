import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { WifiOff, ShieldAlert } from 'lucide-react';

const pulseIcon = L.divIcon({
  className: 'custom-div-icon-rover',
  html: `<div class="relative flex h-5 w-5">
           <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-blue opacity-75"></span>
           <span class="relative inline-flex rounded-full h-5 w-5 bg-neon-blue border-2 border-white"></span>
         </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const homeIcon = L.divIcon({
  className: 'custom-div-icon-home',
  html: `<div class="relative flex h-5 w-5">
           <span class="relative inline-flex rounded-full h-5 w-5 bg-neon-green border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-[0_0_8px_rgba(34,197,94,0.4)]">H</span>
         </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const targetIcon = L.divIcon({
  className: 'custom-div-icon-target',
  html: `<div class="relative flex h-5 w-5">
           <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-red opacity-60"></span>
           <span class="relative inline-flex rounded-full h-5 w-5 bg-neon-red border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.4)]">T</span>
         </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const gridNodeIcon = L.divIcon({
  className: 'custom-div-icon-node',
  html: `<div class="w-3 h-3 rounded-full border-2 border-slate-500 bg-[#0f172a] shadow-md hover:scale-125 transition-transform"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const getCompletedIcon = (moisture: number) => {
  let colorClass = 'bg-[#3b82f6] border-white shadow-[0_0_8px_rgba(59,130,246,0.6)]'; // Blue (Wet)
  if (moisture < 30) {
    colorClass = 'bg-[#ef4444] border-white shadow-[0_0_8px_rgba(239,68,68,0.6)]'; // Red (Dry)
  } else if (moisture < 60) {
    colorClass = 'bg-[#eab308] border-white shadow-[0_0_8px_rgba(234,179,8,0.6)]'; // Yellow (Medium)
  } else if (moisture < 80) {
    colorClass = 'bg-[#22c55e] border-white shadow-[0_0_8px_rgba(34,197,94,0.6)]'; // Green (Healthy)
  }
  
  return L.divIcon({
    className: 'custom-div-icon-completed',
    html: `<div class="w-4.5 h-4.5 rounded-full border-2 ${colorClass} hover:scale-125 transition-transform animate-pulse"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
};

interface LiveMapProps {
  lat: number;
  lng: number;
  homeLat?: number;
  homeLon?: number;
  targetLat?: number;
  targetLon?: number;
  isConnected?: boolean;
  corners?: { lat: number; lon: number }[];
  gridPoints?: { lat: number; lon: number }[];
  completedPoints?: { lat: number; lon: number; moisture: number; ph: number }[];
}

const MapCenterController: React.FC<{ center: [number, number]; corners?: { lat: number; lon: number }[] }> = ({ center, corners }) => {
  const map = useMap();

  useEffect(() => {
    if (corners && corners.length === 4) {
      const bounds = L.latLngBounds(corners.map(c => [c.lat, c.lon]));
      map.fitBounds(bounds, { padding: [30, 30] });
    } else if (center[0] !== 0.0 && center[1] !== 0.0) {
      map.setView(center, map.getZoom());
    }
  }, [center, corners, map]);

  return null;
};

export const LiveMap: React.FC<LiveMapProps> = ({ 
  lat, 
  lng, 
  homeLat = 0.0, 
  homeLon = 0.0, 
  targetLat = 0.0, 
  targetLon = 0.0,
  isConnected = false,
  corners = [],
  gridPoints = [],
  completedPoints = []
}) => {
  const isRoverOffline = !isConnected || lat === 0.0 || lng === 0.0;
  
  // Napa Valley winery coordinate center default for preview
  const mapCenter: [number, number] = (!isRoverOffline) ? [lat, lng] : [38.4055, -122.3846];
  const hasTarget = targetLat !== 0 && targetLon !== 0 && !isNaN(targetLat) && !isNaN(targetLon);
  const hasHome = homeLat !== 0 && homeLon !== 0 && !isNaN(homeLat) && !isNaN(homeLon);

  return (
    <div className="w-full h-full min-h-[350px] lg:min-h-[440px] rounded-2xl overflow-hidden border border-industrial-700/50 relative z-0 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
      
      {/* Sleek Floating Connection Status badge overlays */}
      {isRoverOffline && (
        <div className="absolute top-4 right-4 bg-industrial-950/80 border border-neon-red/35 backdrop-blur-md rounded-xl px-3 py-1.5 z-[1000] flex items-center gap-2 select-none shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <span className="h-2 w-2 rounded-full bg-neon-red animate-ping" />
          <WifiOff className="w-3.5 h-3.5 text-neon-red" />
          <span className="text-[10px] font-mono font-bold text-neon-red uppercase tracking-widest">TELEMETRY OFFLINE</span>
        </div>
      )}

      {!isRoverOffline && (
        <div className="absolute top-4 right-4 bg-industrial-950/80 border border-neon-green/35 backdrop-blur-md rounded-xl px-3 py-1.5 z-[1000] flex items-center gap-2 select-none shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-neon-green uppercase tracking-widest">LIVE GPS OK</span>
        </div>
      )}

      <MapContainer 
        center={mapCenter} 
        zoom={17} 
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />
        
        {/* Dynamic tracking controls */}
        <MapCenterController center={mapCenter} corners={corners.length === 4 ? corners : undefined} />

        {/* Boundary field polygon */}
        {corners.length === 4 && (
          <Polygon 
            positions={corners.map(c => [c.lat, c.lon])} 
            pathOptions={{ 
              color: '#3b82f6', 
              weight: 2, 
              fillColor: '#3b82f6',
              fillOpacity: 0.08,
              dashArray: '4, 6'
            }} 
          />
        )}

        {/* Uncompleted generated nodes */}
        {gridPoints.map((point, idx) => {
          const isCompleted = completedPoints.some(
            cp => Math.abs(cp.lat - point.lat) < 0.000002 && Math.abs(cp.lon - point.lon) < 0.000002
          );
          if (isCompleted) return null;

          return (
            <Marker 
              key={`node-${idx}`} 
              position={[point.lat, point.lon]} 
              icon={gridNodeIcon}
            />
          );
        })}

        {/* Completed colored heat nodes */}
        {completedPoints.map((point, idx) => (
          <Marker 
            key={`completed-${idx}`} 
            position={[point.lat, point.lon]} 
            icon={getCompletedIcon(point.moisture)}
          />
        ))}

        {/* Rover Live Coordinate Marker */}
        {!isRoverOffline && (
          <Marker position={[lat, lng]} icon={pulseIcon} />
        )}

        {/* Rover Home coordinate marker */}
        {hasHome && (
          <Marker position={[homeLat, homeLon]} icon={homeIcon} />
        )}

        {/* target waypoint coordinates marker */}
        {hasTarget && (
          <Marker position={[targetLat, targetLon]} icon={targetIcon} />
        )}

        {/* Path line: Rover -> Target Vector (Blue dashed) */}
        {hasTarget && !isRoverOffline && (
          <Polyline 
            positions={[[lat, lng], [targetLat, targetLon]]} 
            color="#3b82f6" 
            dashArray="6, 8" 
            weight={2.5} 
          />
        )}

        {/* Path line: Rover -> Home Vector (Green dashed) */}
        {hasHome && !isRoverOffline && (
          <Polyline 
            positions={[[lat, lng], [homeLat, homeLon]]} 
            color="#22c55e" 
            dashArray="5, 10" 
            weight={1.5} 
            opacity={0.5}
          />
        )}
      </MapContainer>
    </div>
  );
};
