import React from 'react';
import { SensorCards } from './SensorCards';
import { AlertsPanel } from './AlertsPanel';
import { RoverStatus } from './RoverStatus';
import { ControlPanel } from './ControlPanel';
import { TerminalLogPanel } from './TerminalLogPanel';
import { ObstacleDetectionPanel } from './radar/ObstacleDetectionPanel';
import { mockData } from '../data/mockData';
import type { SensorCurrentValue } from '../data/mockData';

interface DashboardProps {
  radarWs?: any;
}

export const Dashboard: React.FC<DashboardProps> = ({ radarWs }) => {
  const getSoilStatus = (id: string, value: number): 'normal' | 'warning' | 'critical' => {
    // If the probe is not deployed in the soil, values are 0, but it is not a critical error
    if (radarWs?.probeState !== 'deployed' && value === 0) return 'normal';

    switch (id) {
      case 'nitrogen':
        return value >= 30 ? 'normal' : value >= 15 ? 'warning' : 'critical';
      case 'phosphorus':
        return value >= 20 ? 'normal' : value >= 10 ? 'warning' : 'critical';
      case 'potassium':
        return value >= 80 ? 'normal' : value >= 40 ? 'warning' : 'critical';
      case 'ph':
        return (value >= 6.0 && value <= 7.5) ? 'normal' : (value >= 5.0 && value <= 8.5) ? 'warning' : 'critical';
      case 'moisture':
        return (value >= 20 && value <= 50) ? 'normal' : (value >= 12 && value <= 60) ? 'warning' : 'critical';
      case 'temperature':
        return (value >= 15 && value <= 35) ? 'normal' : (value >= 5 && value <= 40) ? 'warning' : 'critical';
      case 'ec':
        return (value >= 200 && value <= 1200) ? 'normal' : (value >= 100 && value <= 1600) ? 'warning' : 'critical';
      default:
        return 'normal';
    }
  };

  const liveSensors = [
    { 
      id: 'nitrogen', 
      name: 'Nitrogen', 
      value: radarWs?.soilN ?? 0, 
      unit: 'mg/kg', 
      status: getSoilStatus('nitrogen', radarWs?.soilN ?? 0), 
      min: 0, 
      max: 100 
    },
    { 
      id: 'phosphorus', 
      name: 'Phosphorus', 
      value: radarWs?.soilP ?? 0, 
      unit: 'mg/kg', 
      status: getSoilStatus('phosphorus', radarWs?.soilP ?? 0), 
      min: 0, 
      max: 100 
    },
    { 
      id: 'potassium', 
      name: 'Potassium', 
      value: radarWs?.soilK ?? 0, 
      unit: 'mg/kg', 
      status: getSoilStatus('potassium', radarWs?.soilK ?? 0), 
      min: 0, 
      max: 200 
    },
    { 
      id: 'ph', 
      name: 'pH Level', 
      value: radarWs?.soilPH ?? 0.0, 
      unit: 'pH', 
      status: getSoilStatus('ph', radarWs?.soilPH ?? 0.0), 
      min: 0, 
      max: 14 
    },
    { 
      id: 'moisture', 
      name: 'Moisture', 
      value: radarWs?.soilMoisture ?? 0.0, 
      unit: '%', 
      status: getSoilStatus('moisture', radarWs?.soilMoisture ?? 0.0), 
      min: 0, 
      max: 100 
    },
    { 
      id: 'temperature', 
      name: 'Temperature', 
      value: radarWs?.soilTemp ?? 0.0, 
      unit: '°C', 
      status: getSoilStatus('temperature', radarWs?.soilTemp ?? 0.0), 
      min: -10, 
      max: 50 
    },
    { 
      id: 'ec', 
      name: 'EC Cond.', 
      value: radarWs?.soilEC ?? 0, 
      unit: 'µS/cm', 
      status: getSoilStatus('ec', radarWs?.soilEC ?? 0), 
      min: 0, 
      max: 2000 
    },
  ] as SensorCurrentValue[];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Row: Real-time Soil Telemetry Gauges */}
      <section>
        <SensorCards sensors={liveSensors} />
      </section>

      {/* Middle Row: Rover Status, Safety & Direct Controls */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <RoverStatus 
            status={{
              ...mockData.rover, 
              connection: radarWs?.isConnected ? 'connected' : 'disconnected' 
            }} 
            radarWs={radarWs}
          />
        </div>
        <div className="lg:col-span-1">
          <ObstacleDetectionPanel 
            status={radarWs?.alerts?.status || 'SAFE'}
            distance={radarWs?.alerts?.distance || 100}
            angle={radarWs?.alerts?.angle || 0}
            direction={radarWs?.alerts?.direction || 'Front'}
            isConnected={radarWs?.isConnected || false}
          />
        </div>
        <div className="lg:col-span-1">
          <ControlPanel radarWs={radarWs} />
        </div>
      </section>

      {/* Bottom Row: System Alerts & Retro Diagnostics Terminal */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[300px]">
        <div className="lg:col-span-1">
          <AlertsPanel alerts={
            (radarWs?.isConnected && radarWs?.alerts?.status !== 'SAFE')
              ? [{
                  id: 'radar-alert',
                  type: radarWs?.alerts?.status === 'DANGER' ? 'critical' : 'warning',
                  message: `Obstacle detected at ${radarWs?.alerts?.distance}cm (${radarWs?.alerts?.direction})`,
                  timestamp: new Date().toLocaleTimeString(),
                  sector: radarWs?.alerts?.direction || 'Front'
                }]
              : []
          } />
        </div>
        <div className="lg:col-span-1">
          <TerminalLogPanel logs={radarWs?.logs || []} />
        </div>
      </section>
    </div>
  );
};
