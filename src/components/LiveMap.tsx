import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { WifiOff } from 'lucide-react';

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

interface LiveMapProps {
  lat: number;
  lng: number;
  homeLat?: number;
  homeLon?: number;
  targetLat?: number;
  targetLon?: number;
  isConnected?: boolean;
}

const MapCenterController: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

export const LiveMap: React.FC<LiveMapProps> = ({ 
  lat, 
  lng, 
  homeLat = 0.0, 
  homeLon = 0.0, 
  targetLat = 0.0, 
  targetLon = 0.0,
  isConnected = false
}) => {
  // If disconnected or GPS coordinates are zero (no fix / offline)
  const isOffline = !isConnected || lat === 0.0 || lng === 0.0;

  if (isOffline) {
    return (
      <div className="w-full h-full min-h-[190px] rounded-xl overflow-hidden border border-industrial-800/80 bg-black/40 flex flex-col items-center justify-center relative p-6 select-none">
        <WifiOff className="w-8 h-8 text-slate-500 mb-2 animate-pulse" />
        <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest text-center">GPS Map Offline</span>
        <span className="text-[9px] text-slate-500 font-mono mt-1.5 text-center leading-relaxed">Establish telemetry connection to stream real GPS coordinates.</span>
      </div>
    );
  }

  const roverCenter: [number, number] = [lat, lng];
  const hasTarget = targetLat !== 0 && targetLon !== 0 && !isNaN(targetLat) && !isNaN(targetLon);
  const hasHome = homeLat !== 0 && homeLon !== 0 && !isNaN(homeLat) && !isNaN(homeLon);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-industrial-800/80 relative z-0">
      <MapContainer 
        center={roverCenter} 
        zoom={18} 
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />
        
        {/* Dynamic map center tracking */}
        <MapCenterController center={roverCenter} />

        {/* Rover current location */}
        <Marker position={roverCenter} icon={pulseIcon} />

        {/* Rover saved HOME location */}
        {hasHome && (
          <Marker position={[homeLat, homeLon]} icon={homeIcon} />
        )}

        {/* GPS Navigation Target location */}
        {hasTarget && (
          <Marker position={[targetLat, targetLon]} icon={targetIcon} />
        )}

        {/* Path line: Rover -> Target (Blue dashed) */}
        {hasTarget && (
          <Polyline 
            positions={[roverCenter, [targetLat, targetLon]]} 
            color="#3b82f6" 
            dashArray="5, 10" 
            weight={2} 
          />
        )}

        {/* Path line: Rover -> Home (Green dashed) */}
        {hasHome && (
          <Polyline 
            positions={[roverCenter, [homeLat, homeLon]]} 
            color="#22c55e" 
            dashArray="5, 10" 
            weight={1.5} 
            opacity={0.6}
          />
        )}
      </MapContainer>
    </div>
  );
};
