"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchPlots, predictPlotPrice } from '../services/api';
import { Map, Loader2, PlusCircle } from 'lucide-react';

// Crucial: Dynamically import the Canvas so it only loads in the browser
const PlotCanvas = dynamic(() => import('../components/PlotCanvas'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-neutral-900 animate-pulse rounded-xl flex items-center justify-center text-neutral-500">Loading AI Canvas...</div>
});

export default function Dashboard() {
  // Base State
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Drawing State
  const [showModal, setShowModal] = useState(false);
  const [drawnShapeData, setDrawnShapeData] = useState(null);
  
  // AI Pricing State
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);

  // 1. Fetch data on load
  useEffect(() => {
    const getPlots = async () => {
      const data = await fetchPlots();
      setPlots(data);
      setLoading(false);
    };
    getPlots();
  }, []);

  // 2. This fires when the Admin finishes dragging a box on the image
  const handlePlotDrawn = (rectData) => {
    setDrawnShapeData(rectData);
    setShowModal(true); 
  };

  // 3. This fires when the "Initialize AI" button is clicked
  const handleAIInit = async () => {
    if (!drawnShapeData) return;
    setIsPredicting(true);
    
    // Send the raw pixels to the Python Backend
    const result = await predictPlotPrice({
      x: drawnShapeData.x,
      y: drawnShapeData.y,
      width: drawnShapeData.width,
      height: drawnShapeData.height
    });
    
    // Save the AI's response to state
    setPredictionResult(result);
    setIsPredicting(false);
  };

  // 4. Safely close and reset the modal
  const handleCloseModal = () => {
    setShowModal(false);
    setPredictionResult(null);
    setDrawnShapeData(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <header className="mb-8 flex items-center gap-3 border-b border-neutral-800 pb-6">
        <Map className="text-emerald-500 w-8 h-8" />
        <div>
          <h1 className="text-3xl font-light tracking-tight">EZTract <span className="font-semibold text-emerald-500">AI Prototype</span></h1>
          <p className="text-neutral-400 text-sm mt-1">Kumaran Nagar Layout - Admin Interface</p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: The Interactive AI Canvas */}
        <div className="xl:col-span-2">
           <PlotCanvas existingPlots={plots} onPlotDrawn={handlePlotDrawn} />
        </div>

        {/* Right Column: Existing Plots Data View */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 h-[650px] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
             Database Records
          </h2>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="animate-spin w-8 h-8 text-emerald-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {plots.map((plot) => (
                <div key={plot.id} className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg">Plot {plot.plot_number}</span>
                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${
                      plot.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400' :
                      plot.status === 'Sold' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {plot.status}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400 space-y-1">
                    <p>Dimensions: {plot.width_ft}' x {plot.length_ft}'</p>
                    <p>Base Price: ₹{plot.base_price.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* The AI Popup Modal */}
      {showModal && drawnShapeData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-neutral-900 border border-neutral-700 p-8 rounded-2xl w-full max-w-lg shadow-2xl">
              <h2 className="text-2xl font-bold text-emerald-400 mb-2">AI Spatial Intelligence</h2>
              
              {!predictionResult ? (
                  <>
                    <p className="text-neutral-400 mb-6 text-sm">You have drawn a new boundary. Initialize the AI to calculate real-world dimensions and predict optimal pricing.</p>
                    <div className="bg-neutral-950 p-4 rounded-lg mb-6 text-sm font-mono text-neutral-500 border border-neutral-800">
                        {/* Use optional chaining (?) to prevent crashes if data is missing momentarily */}
                        <p>Raw X/Y: {drawnShapeData?.x.toFixed(0)}, {drawnShapeData?.y.toFixed(0)}</p>
                        <p>Raw W/H: {Math.abs(drawnShapeData?.width || 0).toFixed(0)}px x {Math.abs(drawnShapeData?.height || 0).toFixed(0)}px</p>
                    </div>
                  </>
              ) : (
                  <div className="mb-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800">
                              <p className="text-xs text-neutral-500 mb-1">Calculated Size</p>
                              <p className="text-xl font-bold text-white">{predictionResult.width_ft}' x {predictionResult.length_ft}'</p>
                              <p className="text-sm text-neutral-400">{predictionResult.total_area_sqft} sq ft</p>
                          </div>
                          <div className="bg-emerald-900/20 p-4 rounded-lg border border-emerald-500/30">
                              <p className="text-xs text-emerald-500/70 mb-1">Predicted Value</p>
                              <p className="text-2xl font-bold text-emerald-400">₹{predictionResult.predicted_price.toLocaleString('en-IN')}</p>
                          </div>
                      </div>
                      <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
                          <p className="text-sm text-blue-300 leading-relaxed">{predictionResult.ai_insight}</p>
                      </div>
                  </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-lg font-medium bg-neutral-800 hover:bg-neutral-700 transition-colors w-full"
                >
                  {predictionResult ? 'Close' : 'Cancel'}
                </button>
                
                {!predictionResult ? (
                    <button 
                        onClick={handleAIInit}
                        disabled={isPredicting}
                        className="px-4 py-2 rounded-lg font-medium bg-emerald-500 text-black hover:bg-emerald-400 transition-colors w-full flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                    {isPredicting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />} 
                    {isPredicting ? 'Analyzing...' : 'Initialize AI'}
                    </button>
                ) : (
                    <button className="px-4 py-2 rounded-lg font-medium bg-white text-black hover:bg-neutral-200 transition-colors w-full flex justify-center items-center gap-2">
                      Save Plot to Database
                    </button>
                )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}