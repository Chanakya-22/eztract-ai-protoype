"use client";
import { useState, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Group, Text } from 'react-konva';
import useImage from 'use-image';

export default function PlotCanvas({ existingPlots, searchQuery, statusFilter, onPlotDrawn, onPlotClick }) {
  const [image] = useImage('/layout.jpg');
  const [isDrawing, setIsDrawing] = useState(false);
  const [newPlotRect, setNewPlotRect] = useState(null);
  const [hoveredPlot, setHoveredPlot] = useState(null); 
  
  // State to track mouse position for the tooltip
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDimensions({ width: window.innerWidth * 0.6, height: 600 });
    }
  }, []);

  const getRectProps = (coordStr) => {
    try {
      const coords = JSON.parse(coordStr);
      const xs = coords.map(c => c[0]);
      const ys = coords.map(c => c[1]);
      return {
        x: Math.min(...xs), y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys)
      };
    } catch { return null; }
  };

  const handleMouseDown = (e) => {
    if (e.target.attrs.id && e.target.attrs.id.startsWith('plot-')) return;
    setIsDrawing(true);
    const { x, y } = e.target.getStage().getPointerPosition();
    setNewPlotRect({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (hoveredPlot) {
      setMousePos({ x: e.evt.clientX, y: e.evt.clientY });
    }

    if (!isDrawing) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    setNewPlotRect((prev) => ({
      ...prev, width: point.x - prev.x, height: point.y - prev.y,
    }));
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (newPlotRect && Math.abs(newPlotRect.width) > 10) {
      onPlotDrawn(newPlotRect);
    }
    setNewPlotRect(null); 
  };

  return (
    <div className="border border-neutral-700 rounded-xl shadow-2xl bg-neutral-900 relative">
      <div className="bg-neutral-800 p-3 border-b border-neutral-700 flex justify-between items-center">
        <h3 className="text-white font-medium">Interactive Site Map</h3>
        <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Admin Mode: Smart-Draw Active</span>
      </div>
      
      <Stage 
        width={dimensions.width} height={dimensions.height}
        onMouseDown={handleMouseDown} onMousemove={handleMouseMove} onMouseup={handleMouseUp}
        className={hoveredPlot ? "cursor-pointer" : "cursor-crosshair"}
      >
        <Layer>
          {image && <KonvaImage image={image} width={dimensions.width} height={dimensions.height} />}

          {existingPlots.map((plot) => {
            const rectProps = getRectProps(plot.polygon_coordinates);
            if (!rectProps) return null;
            
            const isSearchActive = (searchQuery && searchQuery.length > 0) || (statusFilter && statusFilter !== 'All');
            const matchesSearch = !searchQuery || plot.plot_number.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = !statusFilter || statusFilter === 'All' || plot.status === statusFilter;
            const isMatch = matchesSearch && matchesStatus;

            const opacity = isSearchActive ? (isMatch ? 1 : 0.1) : 1;
            const isClickable = isMatch;

            const fillColor = plot.status === 'Available' ? 'rgba(16, 185, 129, 0.4)' : 
                              plot.status === 'Sold' ? 'rgba(239, 68, 68, 0.4)' : 
                              'rgba(245, 158, 11, 0.4)'; 

            return (
              <Group key={plot.id} opacity={opacity} listening={isClickable}>
                <Rect
                  id={`plot-${plot.id}`}
                  x={rectProps.x} y={rectProps.y}
                  width={rectProps.width} height={rectProps.height}
                  fill={hoveredPlot?.id === plot.id ? 'rgba(255,255,255,0.3)' : fillColor} 
                  stroke={hoveredPlot?.id === plot.id ? '#fff' : 'transparent'}
                  strokeWidth={2}
                  onMouseEnter={(e) => {
                    setHoveredPlot(plot);
                    setMousePos({ x: e.evt.clientX, y: e.evt.clientY });
                  }}
                  onMouseLeave={() => setHoveredPlot(null)}
                  onClick={(e) => {
                    // CRITICAL FIX: Stops the background canvas from interpreting this click as a "draw" action
                    e.cancelBubble = true; 
                    onPlotClick(plot);
                  }} 
                />
                <Text 
                  x={rectProps.x} y={rectProps.y + (rectProps.height / 2) - 6}
                  width={rectProps.width}
                  text={plot.plot_number}
                  fontSize={12} fill="white" fontStyle="bold" align="center"
                  listening={false} 
                />
              </Group>
            );
          })}

          {newPlotRect && (
            <Rect
              x={newPlotRect.width < 0 ? newPlotRect.x + newPlotRect.width : newPlotRect.x}
              y={newPlotRect.height < 0 ? newPlotRect.y + newPlotRect.height : newPlotRect.y}
              width={Math.abs(newPlotRect.width)} height={Math.abs(newPlotRect.height)}
              fill="rgba(52, 211, 153, 0.4)" stroke="#10b981" strokeWidth={2} dash={[5, 5]} 
            />
          )}
        </Layer>
      </Stage>

      {hoveredPlot && (
        <div 
          className="fixed bg-neutral-950/95 backdrop-blur border border-neutral-700 text-white p-4 rounded-xl shadow-2xl pointer-events-none z-[100] w-64 transition-opacity duration-150"
          style={{ 
            left: `${mousePos.x + 20}px`, 
            top: `${mousePos.y + 20}px`,
            transform: mousePos.x > window.innerWidth - 300 ? 'translateX(-110%)' : 'none',
            marginTop: mousePos.y > window.innerHeight - 200 ? '-150px' : '0'
          }}
        >
           <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-lg">Plot {hoveredPlot.plot_number}</h4>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${hoveredPlot.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400' : hoveredPlot.status === 'Sold' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {hoveredPlot.status}
              </span>
           </div>
           <div className="text-xs text-neutral-300 space-y-1">
             <p><span className="text-neutral-500">Size:</span> {hoveredPlot.width_ft}' x {hoveredPlot.length_ft}'</p>
             <p><span className="text-neutral-500">Price:</span> ₹{hoveredPlot.base_price.toLocaleString('en-IN')}</p>
             {hoveredPlot.buyer_name && <p><span className="text-neutral-500">Buyer:</span> {hoveredPlot.buyer_name}</p>}
           </div>
        </div>
      )}
    </div>
  );
}