"use client";
import { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Group, Text } from 'react-konva';
import useImage from 'use-image';

export default function PlotCanvas({ existingPlots, onPlotDrawn, onPlotClick, role }) {
  const [image] = useImage('/layout.jpg');
  const containerRef = useRef(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [newPlotRect, setNewPlotRect] = useState(null);
  const [hoveredPlot, setHoveredPlot] = useState(null); 
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const [stageDimensions, setStageDimensions] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);

  // CRITICAL AUTO-SCALING MATH
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && image) {
        const containerWidth = containerRef.current.offsetWidth;
        const newScale = containerWidth / image.width;
        
        setScale(newScale);
        setStageDimensions({ 
          width: containerWidth, 
          height: image.height * newScale 
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [image]);

  const getRectProps = (coordStr) => {
    try {
      if (!coordStr) return null;
      const coords = JSON.parse(coordStr);
      if (!Array.isArray(coords) || coords.length === 0) return null;
      
      const xs = coords.map(c => c[0]);
      const ys = coords.map(c => c[1]);
      return {
        x: Math.min(...xs), y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys)
      };
    } catch { return null; }
  };

  const handleMouseDown = (e) => {
    if (role !== 'admin') return; 
    if (e.target.attrs.id && e.target.attrs.id.startsWith('plot-')) return;
    
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    // Save coordinate based on ORIGINAL image scale so it never drifts
    setNewPlotRect({ x: pos.x / scale, y: pos.y / scale, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (hoveredPlot) {
      setMousePos({ x: e.evt.clientX, y: e.evt.clientY });
    }
    if (!isDrawing) return;
    const pos = e.target.getStage().getPointerPosition();
    setNewPlotRect((prev) => ({
      ...prev, width: (pos.x / scale) - prev.x, height: (pos.y / scale) - prev.y,
    }));
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (newPlotRect && Math.abs(newPlotRect.width) > 10 && Math.abs(newPlotRect.height) > 10) {
      onPlotDrawn(newPlotRect);
    }
    setNewPlotRect(null); 
  };

  return (
    <div className="border border-white/5 rounded-3xl bg-black relative flex flex-col h-full" ref={containerRef}>
      
      <div className="bg-neutral-950 p-4 border-b border-white/5 flex justify-between items-center z-10 rounded-t-3xl">
        <h3 className="text-white font-medium text-sm tracking-wide">Interactive Canvas</h3>
        <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest ${
          role === 'admin' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-900 border border-white/10 text-neutral-400'
        }`}>
          {role === 'admin' ? 'Smart-Draw Active' : 'View Mode'}
        </span>
      </div>
      
      <div className="flex-1 overflow-auto bg-neutral-900/20 relative custom-scrollbar">
        <Stage 
          width={stageDimensions.width} 
          height={stageDimensions.height}
          onMouseDown={handleMouseDown} 
          onMousemove={handleMouseMove} 
          onMouseup={handleMouseUp}
          className={hoveredPlot ? "cursor-pointer" : (role === 'admin' ? "cursor-crosshair" : "cursor-grab")}
        >
          <Layer scaleX={scale} scaleY={scale}>
            {image && <KonvaImage image={image} opacity={0.9} />}

            {existingPlots && existingPlots.map((plot) => {
              const rectProps = getRectProps(plot.polygon_coordinates);
              if (!rectProps) return null; 
              
              const fillColor = plot.status === 'Available' ? 'rgba(34, 197, 94, 0.4)' : 
                                plot.status === 'Sold' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(245, 158, 11, 0.5)'; 
              const isHovered = hoveredPlot?.id === plot.id;

              return (
                <Group key={plot.id}>
                  <Rect
                    id={`plot-${plot.id}`}
                    x={rectProps.x} y={rectProps.y}
                    width={rectProps.width} height={rectProps.height}
                    fill={isHovered ? 'rgba(255,255,255,0.3)' : fillColor} 
                    stroke={isHovered ? '#fff' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={isHovered ? 3 : 1}
                    cornerRadius={2}
                    onMouseEnter={() => setHoveredPlot(plot)}
                    onMouseLeave={() => setHoveredPlot(null)}
                    onClick={(e) => { e.cancelBubble = true; onPlotClick(plot); }} 
                    onTap={(e) => { e.cancelBubble = true; onPlotClick(plot); }}
                  />
                  <Text 
                    x={rectProps.x} y={rectProps.y + (rectProps.height / 2) - 6}
                    width={rectProps.width} text={plot.plot_number}
                    fontSize={12} fill={isHovered ? "white" : "rgba(255,255,255,0.9)"} fontStyle="bold" align="center"
                    listening={false} 
                  />
                </Group>
              );
            })}

            {newPlotRect && role === 'admin' && (
              <Rect
                x={newPlotRect.width < 0 ? newPlotRect.x + newPlotRect.width : newPlotRect.x}
                y={newPlotRect.height < 0 ? newPlotRect.y + newPlotRect.height : newPlotRect.y}
                width={Math.abs(newPlotRect.width)} height={Math.abs(newPlotRect.height)}
                fill="rgba(255, 255, 255, 0.15)" stroke="#fff" strokeWidth={2} dash={[5, 5]} cornerRadius={2}
              />
            )}
          </Layer>
        </Stage>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredPlot && (
        <div className="fixed bg-black/90 backdrop-blur-xl border border-white/10 text-white p-4 rounded-xl shadow-2xl pointer-events-none z-[100] w-56 animate-in fade-in zoom-in-95"
             style={{ left: `${mousePos.x + 20}px`, top: `${mousePos.y + 20}px`, transform: mousePos.x > window.innerWidth - 250 ? 'translateX(-110%)' : 'none' }}>
           <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-lg tracking-tight">Plot {hoveredPlot.plot_number}</h4>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${hoveredPlot.status === 'Available' ? 'bg-green-500/20 text-green-400' : hoveredPlot.status === 'Sold' ? 'bg-neutral-500/20 text-neutral-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {hoveredPlot.status}
              </span>
           </div>
           <div className="text-xs space-y-1.5 border-t border-white/5 pt-2">
             <div className="flex justify-between items-center"><span className="text-neutral-500 uppercase tracking-widest text-[9px]">Size</span><span className="font-mono">{hoveredPlot.total_area_sqft} sf</span></div>
             <div className="flex justify-between items-center"><span className="text-neutral-500 uppercase tracking-widest text-[9px]">Value</span><span className="font-medium text-white">₹{hoveredPlot.base_price.toLocaleString('en-IN')}</span></div>
           </div>
        </div>
      )}
    </div>
  );
}