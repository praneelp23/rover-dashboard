export type ParameterType = 'nitrogen' | 'phosphorus' | 'potassium' | 'ph' | 'moisture' | 'temperature' | 'ec';

export interface GridCell {
  x: number;
  y: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  moisture: number;
  temperature: number;
  ec: number;
}

export interface HeatmapData {
  rows: number;
  cols: number;
  grid: GridCell[];
}

export interface TimeSeriesPoint {
  time: string;
  shallow: number; // 5cm depth
  deep: number; // 15cm depth
}

export interface SensorCurrentValue {
  name: string;
  id: ParameterType;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  min: number;
  max: number;
}

export interface RoverStatus {
  battery: number; // percentage
  connection: 'connected' | 'disconnected' | 'weak';
  mode: 'manual' | 'autonomous';
  coordinates: { lat: number; lng: number };
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  sector: string;
}

// Generate an 8x8 grid of mock data
const generateHeatmapGrid = (): HeatmapData => {
  const rows = 8;
  const cols = 8;
  const grid: GridCell[] = [];
  
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      grid.push({
        x,
        y,
        nitrogen: Math.floor(Math.random() * 80) + 20, // 20-100 mg/kg
        phosphorus: Math.floor(Math.random() * 60) + 10, // 10-70 mg/kg
        potassium: Math.floor(Math.random() * 100) + 50, // 50-150 mg/kg
        ph: (Math.random() * 3) + 5, // 5.0-8.0
        moisture: Math.floor(Math.random() * 40) + 10, // 10-50%
        temperature: Math.floor(Math.random() * 15) + 15, // 15-30°C
        ec: (Math.random() * 1.5) + 0.5, // 0.5-2.0 dS/m
      });
    }
  }
  
  return { rows, cols, grid };
};

// Generate 24 hours of time-series data
const generateTimeSeriesData = (param: ParameterType): TimeSeriesPoint[] => {
  const data: TimeSeriesPoint[] = [];
  let baseShallow = 0;
  let baseDeep = 0;

  switch (param) {
    case 'moisture':
      baseShallow = 20; baseDeep = 35;
      break;
    case 'temperature':
      baseShallow = 25; baseDeep = 22;
      break;
    case 'nitrogen':
      baseShallow = 40; baseDeep = 45;
      break;
    default:
      baseShallow = 50; baseDeep = 50;
  }

  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0') + ':00';
    data.push({
      time: hour,
      shallow: Math.max(0, baseShallow + (Math.random() * 10 - 5)),
      deep: Math.max(0, baseDeep + (Math.random() * 6 - 3)),
    });
  }
  
  return data;
};

export const mockData = {
  heatmap: generateHeatmapGrid(),
  
  timeSeries: {
    nitrogen: generateTimeSeriesData('nitrogen'),
    moisture: generateTimeSeriesData('moisture'),
    temperature: generateTimeSeriesData('temperature'),
  },

  currentSensors: [
    { id: 'nitrogen', name: 'Nitrogen', value: 42, unit: 'mg/kg', status: 'warning', min: 0, max: 100 },
    { id: 'phosphorus', name: 'Phosphorus', value: 55, unit: 'mg/kg', status: 'normal', min: 0, max: 100 },
    { id: 'potassium', name: 'Potassium', value: 120, unit: 'mg/kg', status: 'normal', min: 0, max: 200 },
    { id: 'ph', name: 'pH Level', value: 6.8, unit: 'pH', status: 'normal', min: 0, max: 14 },
    { id: 'moisture', name: 'Moisture', value: 18, unit: '%', status: 'critical', min: 0, max: 100 },
    { id: 'temperature', name: 'Temperature', value: 24.5, unit: '°C', status: 'normal', min: -10, max: 50 },
    { id: 'ec', name: 'Elec. Conductivity', value: 1.2, unit: 'dS/m', status: 'normal', min: 0, max: 5 },
  ] as SensorCurrentValue[],

  rover: {
    battery: 78,
    connection: 'connected',
    mode: 'autonomous',
    coordinates: { lat: 34.0522, lng: -118.2437 }
  } as RoverStatus,

  alerts: [
    { id: 'a1', type: 'critical', message: 'Critically low moisture detected', timestamp: '10 mins ago', sector: 'Sector 4, C2' },
    { id: 'a2', type: 'warning', message: 'Nitrogen levels dropping below optimal threshold', timestamp: '1 hour ago', sector: 'Sector 2, A5' },
    { id: 'a3', type: 'info', message: 'Routine diagnostic completed successfully', timestamp: '2 hours ago', sector: 'Rover Core' },
  ] as Alert[],
};
