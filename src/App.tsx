import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './components/Dashboard';
import { useRadarWebSocket } from './hooks/useRadarWebSocket';
import { RadarVisualization } from './components/radar/RadarVisualization';
import { ObstacleDetectionPanel } from './components/radar/ObstacleDetectionPanel';
import { RadarDistanceChart } from './components/radar/RadarDistanceChart';
import { ControlPanel } from './components/ControlPanel';
import { Settings } from './components/Settings';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [roverIp, setRoverIp] = useState('192.168.4.1');
  
  useEffect(() => {
    const savedIp = localStorage.getItem('roverIp');
    if (savedIp) {
      setRoverIp(savedIp);
    }
  }, []);

  // Use ws:// for localhost and ws:// for ESP32
  // If the user IP contains a port, use it; otherwise connect on port 80 (omitting port number)
  const wsUrl = roverIp.includes(':') ? `ws://${roverIp}` : `ws://${roverIp}`;
  const radarWs = useRadarWebSocket(wsUrl);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard radarWs={radarWs} />;
      case 'radar':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-10rem)]">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <RadarVisualization 
                radarData={radarWs.radarData} 
                latestPoint={radarWs.latestPoint}
                isConnected={radarWs.isConnected}
                className="flex-1"
              />
            </div>
            <div className="flex flex-col gap-6">
              <div className="h-1/2">
                <ObstacleDetectionPanel 
                  status={radarWs.alerts.status}
                  distance={radarWs.alerts.distance}
                  angle={radarWs.alerts.angle}
                  direction={radarWs.alerts.direction}
                  isConnected={radarWs.isConnected}
                />
              </div>
              <div className="h-1/2">
                <RadarDistanceChart latestPoint={radarWs.latestPoint} />
              </div>
            </div>
          </div>
        );
      case 'control':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px] max-w-4xl mx-auto">
            <ControlPanel radarWs={radarWs} />
            <div className="glass-panel p-6 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-industrial-800 rounded-full flex items-center justify-center mb-4 border-4 border-neon-blue/20">
                <div className="w-16 h-16 bg-neon-blue/10 rounded-full flex items-center justify-center animate-pulse">
                  <div className="w-8 h-8 bg-neon-blue rounded-full" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Live Camera Feed</h3>
              <p className="text-sm text-slate-400">Waiting for WebRTC connection...</p>
            </div>
          </div>
        );

      case 'settings':
        return <Settings roverIp={roverIp} setRoverIp={setRoverIp} />;
      default:
        return <Dashboard radarWs={radarWs} />;
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 10, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, scale: 0.98, filter: 'blur(4px)', transition: { duration: 0.2 } }
  };

  return (
    <MainLayout 
      currentPage={currentPage} 
      setCurrentPage={setCurrentPage}
      isConnected={radarWs.isConnected}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="h-full"
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </MainLayout>
  );
}

export default App;
