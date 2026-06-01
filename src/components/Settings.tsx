import React, { useState, useEffect } from 'react';
import { Network, Save, Server, Wifi, Cpu, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface SettingsProps {
  roverIp: string;
  setRoverIp: (ip: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ roverIp, setRoverIp }) => {
  const [ipInput, setIpInput] = useState(roverIp);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIpInput(roverIp);
  }, [roverIp]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setRoverIp(ipInput);
    localStorage.setItem('roverIp', ipInput);
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Network Configuration card */}
      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold tracking-wide text-slate-100 flex items-center gap-2 mb-6">
          <Network className="w-5 h-5 text-neon-blue" />
          Network Configuration
        </h2>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="ip-address" className="block text-sm font-medium text-slate-400">
              ESP32 Rover IP Address
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Server className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="text"
                  id="ip-address"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-industrial-700 rounded-lg bg-industrial-900/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-neon-blue focus:border-neon-blue sm:text-sm transition-colors font-mono"
                  placeholder="e.g., 192.168.4.1 or 192.168.1.100"
                />
              </div>
              <button
                type="submit"
                className={cn(
                  "flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                  isSaved 
                    ? "bg-neon-green/20 text-neon-green border border-neon-green/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]" 
                    : "bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 border border-neon-blue/30"
                )}
              >
                <Save className="w-4 h-4" />
                {isSaved ? 'Saved!' : 'Save & Connect'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Network Connection Wizard */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold tracking-wide text-slate-100 flex items-center gap-2 mb-6">
          <HelpCircle className="w-5 h-5 text-neon-yellow" />
          Rover Connection Wizard
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Method A: AP Mode */}
          <div className="bg-industrial-800/20 rounded-xl p-5 border border-industrial-850 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-neon-yellow/10 rounded-lg border border-neon-yellow/20 text-neon-yellow">
                  <Wifi className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Method A: AP Mode (Direct Link)</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Recommended for field use where no local router is available. Connect directly to the Rover's self-generated WiFi network.
              </p>
              <ul className="text-xs text-slate-300 space-y-2.5 font-mono">
                <li className="flex gap-2">
                  <span className="text-neon-yellow font-bold">1.</span>
                  <span>Turn on your ESP32 Rover power switch.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-neon-yellow font-bold">2.</span>
                  <span>Connect your computer or phone to WiFi: <br/><strong className="text-white">SSID: AgriSync-Rover-AP</strong><br/><strong className="text-white">Password: password123</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="text-neon-yellow font-bold">3.</span>
                  <span>Enter target IP address above:<br/><strong className="text-neon-blue font-bold">192.168.4.1</strong></span>
                </li>
              </ul>
            </div>
            
            <button
              onClick={() => {
                setIpInput('192.168.4.1');
                setRoverIp('192.168.4.1');
                localStorage.setItem('roverIp', '192.168.4.1');
              }}
              className="w-full py-2 bg-industrial-900 border border-industrial-800 hover:bg-industrial-800 rounded-lg text-xs font-bold text-slate-300 font-mono transition-all"
            >
              Autofill AP Address
            </button>
          </div>

          {/* Method B: Station Mode */}
          <div className="bg-industrial-800/20 rounded-xl p-5 border border-industrial-850 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-neon-blue/10 rounded-lg border border-neon-blue/20 text-neon-blue">
                  <Cpu className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Method B: Station Mode (Router Link)</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Recommended for development and home testing. Both the Rover and the Web Dashboard connect to your home WiFi.
              </p>
              <ul className="text-xs text-slate-300 space-y-2.5 font-mono">
                <li className="flex gap-2">
                  <span className="text-neon-blue font-bold">1.</span>
                  <span>Set your home credentials in <code className="text-white">src/config.h</code>:<br/><code className="text-slate-400">WIFI_SSID "ESP_TEST"</code><br/><code className="text-slate-400">WIFI_PASS "12345678"</code></span>
                </li>
                <li className="flex gap-2">
                  <span className="text-neon-blue font-bold">2.</span>
                  <span>Connect the ESP32 to PC and open the Arduino IDE Serial Monitor at <strong className="text-white">115200 baud</strong>.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-neon-blue font-bold">3.</span>
                  <span>Copy the allocated IP address shown on connection, enter it above, and click Save.</span>
                </li>
              </ul>
            </div>
            
            <button
              onClick={() => {
                setIpInput('localhost:8080');
                setRoverIp('localhost:8080');
                localStorage.setItem('roverIp', 'localhost:8080');
              }}
              className="w-full py-2 bg-industrial-900 border border-industrial-800 hover:bg-industrial-800 rounded-lg text-xs font-bold text-slate-300 font-mono transition-all"
            >
              Autofill Local Mock Address
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
