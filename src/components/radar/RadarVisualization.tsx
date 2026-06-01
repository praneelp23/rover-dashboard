import React, { useEffect, useRef } from 'react';
import type { RadarDataPoint } from '../../hooks/useRadarWebSocket';
import { cn } from '../../lib/utils';

interface RadarVisualizationProps {
  radarData: Record<number, RadarDataPoint>;
  latestPoint: RadarDataPoint | null;
  isConnected?: boolean;
  className?: string;
}

export const RadarVisualization: React.FC<RadarVisualizationProps> = ({ 
  radarData, 
  latestPoint,
  isConnected = false,
  className 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution to match display size for sharp rendering
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height - 20; // Bottom center
    const radius = Math.min(width / 2 - 20, height - 40);

    const render = () => {
      // Clear canvas
      ctx.fillStyle = 'rgba(15, 23, 42, 1)'; // dark background
      ctx.fillRect(0, 0, width, height);

      // Draw grid with lower opacity if disconnected
      ctx.strokeStyle = isConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(71, 85, 105, 0.15)'; 
      ctx.lineWidth = 1;

      // Draw semi-circles
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius / 4) * i, Math.PI, 0);
        ctx.stroke();
      }

      // Draw angle lines
      for (let i = 0; i <= 180; i += 30) {
        const rad = (i * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX - Math.cos(rad) * radius,
          centerY - Math.sin(rad) * radius
        );
        ctx.stroke();
        
        // Add text labels
        ctx.fillStyle = isConnected ? 'rgba(34, 197, 94, 0.4)' : 'rgba(71, 85, 105, 0.3)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelRadius = radius + 15;
        ctx.fillText(
          `${i}°`, 
          centerX - Math.cos(rad) * labelRadius, 
          centerY - Math.sin(rad) * labelRadius
        );
      }

      // If disconnected, overlay a locked state and return (no sweep animation, no points!)
      if (!isConnected) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.3)'; // slate-400
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("TELEMETRY LINK OFFLINE", centerX, centerY - radius / 2);
        
        // Draw inactive static pointer
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX, centerY - radius);
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        return;
      }

      // Draw radar sweep line (ONLY when connected!)
      if (latestPoint) {
        const rad = (latestPoint.angle * Math.PI) / 180;
        
        // Sweep gradient
        const gradient = ctx.createLinearGradient(
          centerX, centerY, 
          centerX - Math.cos(rad) * radius, 
          centerY - Math.sin(rad) * radius
        );
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX - Math.cos(rad) * radius,
          centerY - Math.sin(rad) * radius
        );
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Add glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#22c55e';
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }

      // Draw active points (ONLY when connected!)
      Object.values(radarData).forEach(point => {
        const pointRadius = (Math.min(point.distance, 100) / 100) * radius;
        const rad = (point.angle * Math.PI) / 180;
        
        const x = centerX - Math.cos(rad) * pointRadius;
        const y = centerY - Math.sin(rad) * pointRadius;

        const age = Date.now() - point.timestamp;
        const opacity = Math.max(0, 1 - age / 3000); 

        if (opacity > 0) {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          
          if (point.obstacle) {
            ctx.fillStyle = `rgba(239, 68, 68, ${opacity})`; 
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10;
          } else {
            ctx.fillStyle = `rgba(34, 197, 94, ${opacity * 0.5})`; 
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 5;
          }
          
          ctx.fill();
          ctx.shadowBlur = 0; 
        }
      });
    };

    let animationId: number;
    const loop = () => {
      render();
      animationId = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(animationId);
  }, [radarData, latestPoint, isConnected]);

  return (
    <div className={cn("glass-panel flex flex-col h-full", className)}>
      <div className="p-4 border-b border-industrial-800">
        <h2 className="text-lg font-semibold tracking-wide text-slate-100 flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full transition-all", isConnected ? "bg-neon-green animate-pulse" : "bg-slate-650")} />
          Ultrasonic Radar
        </h2>
      </div>
      <div ref={containerRef} className="flex-1 relative p-4 min-h-[300px]">
        <canvas 
          ref={canvasRef} 
          style={{ width: '100%', height: '100%' }}
        />
        
        <div className="absolute inset-0 pointer-events-none rounded-full shadow-[inset_0_0_50px_rgba(34,197,94,0.02)]" />
      </div>
    </div>
  );
};
