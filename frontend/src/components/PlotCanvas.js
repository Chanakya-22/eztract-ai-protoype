"use client";

import { useState, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect } from 'react-konva';
import useImage from 'use-image';

export default function PlotCanvas({ existingPlots, onPlotDrawn }) {
  // Load the layout image from the public folder
  const [image] = useImage('/layout.jpg');
  
  // State for drawing new plots
  const [isDrawing, setIsDrawing] = useState(false);
  const [newPlotRect, setNewPlotRect] = useState(null);
  
  // To ensure the canvas fits the screen nicely
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    // Basic responsive sizing for the prototype
    if (typeof window !== 'undefined') {
      setDimensions({ width: window.innerWidth * 0.6, height: 600 });
    }
  }, []);

  const handleMouseDown = (e) => {
    // Start drawing
    setIsDrawing(true);
    const { x, y } = e.target.getStage().getPointerPosition();
    setNewPlotRect({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    // Update width and height as the user drags
    setNewPlotRect((prev) => ({
      ...prev,
      width: point.x - prev.x,
      height: point.y - prev.y,
    }));
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // If the user actually drew a box (not just a click)
    if (newPlotRect && Math.abs(newPlotRect.width) > 10) {
      // Trigger the parent component to show the "Add Plot Details" popup
      onPlotDrawn(newPlotRect);
    } else {
      setNewPlotRect(null); // Reset if too small
    }
  };

  return (
    <div className="border border-neutral-700 rounded-xl overflow-hidden shadow-2xl bg-neutral-900">
      <div className="bg-neutral-800 p-3 border-b border-neutral-700 flex justify-between items-center">
        <h3 className="text-white font-medium">Interactive Site Map</h3>
        <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Admin Mode: Smart-Draw Active</span>
      </div>
      
      <Stage 
        width={dimensions.width} 
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        className="cursor-crosshair"
      >
        <Layer>
          {/* Render the Map Background */}
          {image && (
            <KonvaImage 
              image={image} 
              width={dimensions.width} 
              height={dimensions.height} 
            />
          )}

          {/* Render Existing Plots (as transparent green/red boxes based on synthetic coordinates) */}
          {/* Note: In a real app, we map the DB polygon coordinates. For now, we visualize an area. */}

          {/* Render the Shape the user is currently drawing */}
          {newPlotRect && (
            <Rect
              x={newPlotRect.width < 0 ? newPlotRect.x + newPlotRect.width : newPlotRect.x}
              y={newPlotRect.height < 0 ? newPlotRect.y + newPlotRect.height : newPlotRect.y}
              width={Math.abs(newPlotRect.width)}
              height={Math.abs(newPlotRect.height)}
              fill="rgba(52, 211, 153, 0.4)" // Emerald green with transparency
              stroke="#10b981"
              strokeWidth={2}
              dash={[5, 5]} // Dashed line to indicate it's "in progress"
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}