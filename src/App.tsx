import { useState, useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './components/Dashboard';
import { useRadarWebSocket } from './hooks/useRadarWebSocket';

function App() {
  const [roverIp, setRoverIp] = useState('localhost:8080');
  
  useEffect(() => {
    const savedIp = localStorage.getItem('roverIp');
    if (savedIp) {
      setRoverIp(savedIp);
    }
  }, []);

  // Use ws:// for ESP32 or local websocket server
  const wsUrl = roverIp.includes('ws://') ? roverIp : `ws://${roverIp}`;
  const radarWs = useRadarWebSocket(wsUrl);

  return (
    <MainLayout 
      isConnected={radarWs.isConnected}
      roverIp={roverIp}
      setRoverIp={setRoverIp}
    >
      <Dashboard radarWs={radarWs} />
    </MainLayout>
  );
}

export default App;
