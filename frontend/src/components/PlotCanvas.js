"use client";
import { useState, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Group, Text } from 'react-konva';
import useImage from 'use-image';

export default function PlotCanvas({ existingPlots, onPlotDrawn, onPlotClick, role }) {
  const [image] = useImage('/layout.jpg');
  
  // Drawing States
  const [isDrawing, setIsDrawing] = useState(false);
  const [newPlotRect, setNewPlotRect] = useState(null);
  
  // Interaction States
  const [hoveredPlot, setHoveredPlot] = useState(null); 
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 700 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDimensions({ width: window.innerWidth * 0.7, height: 700 });
    }
  }, []);

  // CRITICAL FIX: Extreme null-safety added here to prevent "Cannot read properties of null (reading 'height')"
  const getRectProps = (coordStr) => {
    try {
      if (!coordStr) return null;
      
      const coords = JSON.parse(coordStr);
      
      // Ensure the parsed data is an array and actually has content
      if (!Array.isArray(coords) || coords.length === 0) return null;
      
      const xs = coords.map(c => c[0]);
      const ys = coords.map(c => c[1]);
      
      return {
        x: Math.min(...xs), 
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs), 
        height: Math.max(...ys) - Math.min(...ys)
      };
    } catch { 
      return null; 
    }
  };

  const handleMouseDown = (e) => {
    // Only admins can draw boxes
    if (role !== 'admin') return; 
    
    // Prevent drawing a new box if they are clicking an existing plot
    if (e.target.attrs.id && e.target.attrs.id.startsWith('plot-')) return;
    
    setIsDrawing(true);
    const { x, y } = e.target.getStage().getPointerPosition();
    setNewPlotRect({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    // Track mouse for the floating tooltip
    if (hoveredPlot) {
      setMousePos({ x: e.evt.clientX, y: e.evt.clientY });
    }

    if (!isDrawing) return;
    
    // Draw the new rectangle dynamically
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    setNewPlotRect((prev) => ({
      ...prev, 
      width: point.x - prev.x, 
      height: point.y - prev.y,
    }));
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Require a minimum box size (15x15 pixels) to trigger the AI modal.
    // This stops accidental clicks from opening the form.
    if (newPlotRect && Math.abs(newPlotRect.width) > 15 && Math.abs(newPlotRect.height) > 15) {
      onPlotDrawn(newPlotRect);
    }
    setNewPlotRect(null); 
  };

  return (
    <div className="border border-white/5 rounded-[2rem] shadow-2xl bg-neutral-900/30 backdrop-blur-md relative overflow-hidden">
      
      {/* Canvas Top Bar */}
      <div className="bg-black/40 p-5 border-b border-white/5 flex justify-between items-center">
        <h3 className="text-white font-medium tracking-wide">Interactive Site Map</h3>
        <span className={`text-xs px-4 py-1.5 rounded-full font-bold uppercase tracking-widest ${
          role === 'admin' ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-neutral-800 text-neutral-400'
        }`}>
          {role === 'admin' ? 'Smart-Draw Active' : 'View Mode'}
        </span>
      </div>
      
      {/* Main Konva Stage */}
      <Stage 
        width={dimensions.width} 
        height={dimensions.height}
        onMouseDown={handleMouseDown} 
        onMousemove={handleMouseMove} 
        onMouseup={handleMouseUp}
        className={hoveredPlot ? "cursor-pointer" : (role === 'admin' ? "cursor-crosshair" : "cursor-default")}
      >
        <Layer>
          {image && (
            <KonvaImage 
              image={image} 
              width={dimensions.width} 
              height={dimensions.height} 
              opacity={0.9} 
            />
          )}

          {/* Render Existing Database Plots */}
          {existingPlots && existingPlots.map((plot) => {
            const rectProps = getRectProps(plot.polygon_coordinates);
            
            // Safe exit if database coordinates are broken
            if (!rectProps) return null; 
            
            const fillColor = plot.status === 'Available' ? 'rgba(34, 197, 94, 0.3)' : 
                              plot.status === 'Sold' ? 'rgba(0, 0, 0, 0.7)' : 
                              'rgba(245, 158, 11, 0.4)'; 

            const isHovered = hoveredPlot?.id === plot.id;

            return (
              <Group key={plot.id}>
                <Rect
                  id={`plot-${plot.id}`}
                  x={rectProps.x} 
                  y={rectProps.y}
                  width={rectProps.width} 
                  height={rectProps.height}
                  fill={isHovered ? 'rgba(255,255,255,0.2)' : fillColor} 
                  stroke={isHovered ? '#fff' : 'rgba(255,255,255,0.1)'}
                  strokeWidth={isHovered ? 2 : 1}
                  cornerRadius={4}
                  
                  // Interaction Logic
                  onMouseEnter={() => setHoveredPlot(plot)}
                  onMouseLeave={() => setHoveredPlot(null)}
                  onClick={(e) => { 
                    e.cancelBubble = true; 
                    onPlotClick(plot); 
                  }} 
                  onTap={(e) => { 
                    e.cancelBubble = true; 
                    onPlotClick(plot); 
                  }}
                />
                <Text 
                  x={rectProps.x} 
                  y={rectProps.y + (rectProps.height / 2) - 7}
                  width={rectProps.width} 
                  text={plot.plot_number}
                  fontSize={14} 
                  fill={isHovered ? "white" : "rgba(255,255,255,0.8)"} 
                  fontStyle="600" 
                  align="center" 
                  fontFamily="system-ui"
                  listening={false} 
                />
              </Group>
            );
          })}

          {/* Render New Plot Box (while Admin is dragging the mouse) */}
          {newPlotRect && role === 'admin' && (
            <Rect
              x={newPlotRect.width < 0 ? newPlotRect.x + newPlotRect.width : newPlotRect.x}
              y={newPlotRect.height < 0 ? newPlotRect.y + newPlotRect.height : newPlotRect.y}
              width={Math.abs(newPlotRect.width)} 
              height={Math.abs(newPlotRect.height)}
              fill="rgba(255, 255, 255, 0.1)" 
              stroke="#fff" 
              strokeWidth={2} 
              dash={[5, 5]} 
              cornerRadius={4}
            />
          )}
        </Layer>
      </Stage>

      {/* ========================================== */}
      {/* RESTORED: GLASSMORPHIC HOVER TOOLTIP */}
      {/* ========================================== */}
      {hoveredPlot && (
        <div 
          className="fixed bg-black/80 backdrop-blur-xl border border-white/10 text-white p-5 rounded-2xl shadow-2xl pointer-events-none z-[100] w-64 transition-opacity duration-150 animate-in fade-in zoom-in-95"
          style={{ 
            left: `${mousePos.x + 20}px`, 
            top: `${mousePos.y + 20}px`,
            transform: mousePos.x > window.innerWidth - 300 ? 'translateX(-110%)' : 'none',
            marginTop: mousePos.y > window.innerHeight - 200 ? '-150px' : '0'
          }}
        >
           <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-xl tracking-tight">Plot {hoveredPlot.plot_number}</h4>
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                hoveredPlot.status === 'Available' ? 'bg-green-500/20 text-green-400' : 
                hoveredPlot.status === 'Sold' ? 'bg-neutral-500/20 text-neutral-400' : 
                'bg-amber-500/20 text-amber-400'
              }`}>
                {hoveredPlot.status}
              </span>
           </div>
           
           <div className="text-sm space-y-2 border-t border-white/5 pt-3">
             <div className="flex justify-between items-center">
                <span className="text-neutral-500 text-xs uppercase tracking-widest">Size</span>
                <span className="font-mono">{hoveredPlot.total_area_sqft} sqft</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-neutral-500 text-xs uppercase tracking-widest">Value</span>
                <span className="font-medium text-white">₹{hoveredPlot.base_price.toLocaleString('en-IN')}</span>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}