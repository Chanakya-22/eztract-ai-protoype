"use client";
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchPlots, predictPlotPrice, savePlotToDB } from '../services/api';
import { Map, Loader2, PlusCircle, CheckCircle } from 'lucide-react';

const PlotCanvas = dynamic(() => import('../components/PlotCanvas'), { ssr: false });

export default function Dashboard() {
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Draw State
  const [showModal, setShowModal] = useState(false);
  const [drawnShapeData, setDrawnShapeData] = useState(null);
  
  // AI State
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);

  // NEW: Form State for saving
  const [formData, setFormData] = useState({
    plot_number: '', buyer_name: '', contact_number: '', managed_by: '', status: 'Available'
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all plots
  const loadData = async () => {
    setLoading(true);
    const data = await fetchPlots();
    setPlots(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handlePlotDrawn = (rectData) => {
    setDrawnShapeData(rectData);
    setShowModal(true); 
  };

  const handlePlotClick = (plot) => {
      // In the future, this can open an edit modal. For now, we alert to show it works.
      alert(`Clicked Plot ${plot.plot_number}\nStatus: ${plot.status}\nBuyer: ${plot.buyer_name || 'N/A'}`);
  };

  const handleAIInit = async () => {
    if (!drawnShapeData) return;
    setIsPredicting(true);
    const result = await predictPlotPrice({
      x: drawnShapeData.x, y: drawnShapeData.y, width: drawnShapeData.width, height: drawnShapeData.height
    });
    setPredictionResult(result);
    setIsPredicting(false);
  };

  // NEW: Save the combined data to the database
  const handleSavePlot = async () => {
    if (!formData.plot_number) return alert("Plot Number is required!");
    setIsSaving(true);

    // Format coordinates from the drawn rect
    const x = drawnShapeData.x;
    const y = drawnShapeData.y;
    const w = Math.abs(drawnShapeData.width);
    const h = Math.abs(drawnShapeData.height);
    const polygonString = `[[${x},${y}], [${x+w},${y}], [${x+w},${y+h}], [${x},${y+h}]]`;

    const finalPayload = {
      plot_number: formData.plot_number,
      width_ft: predictionResult.width_ft,
      length_ft: predictionResult.length_ft,
      total_area_sqft: predictionResult.total_area_sqft,
      base_price: predictionResult.predicted_price,
      status: formData.status,
      buyer_name: formData.buyer_name || null,
      contact_number: formData.contact_number || null,
      managed_by: formData.managed_by || null,
      polygon_coordinates: polygonString
    };

    const res = await savePlotToDB(finalPayload);
    if (res) {
        // Refresh data and close modal
        await loadData();
        handleCloseModal();
    } else {
        alert("Failed to save. Check terminal for errors.");
    }
    setIsSaving(false);
  };

  const handleCloseModal = () => {
    setShowModal(false); setPredictionResult(null); setDrawnShapeData(null);
    setFormData({ plot_number: '', buyer_name: '', contact_number: '', managed_by: '', status: 'Available' });
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
        <div className="xl:col-span-2">
           <PlotCanvas existingPlots={plots} onPlotDrawn={handlePlotDrawn} onPlotClick={handlePlotClick} />
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 h-[650px] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold flex items-center gap-2">Database Records</h2>
             <span className="text-sm text-neutral-400">Total: {plots.length}</span>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-32"><Loader2 className="animate-spin w-8 h-8 text-emerald-500" /></div>
          ) : (
            <div className="space-y-3">
              {plots.map((plot) => (
                <div key={plot.id} onClick={() => handlePlotClick(plot)} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 hover:border-emerald-500/50 cursor-pointer transition-colors">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold">Plot {plot.plot_number}</span>
                    <div className={`w-3 h-3 rounded-full ${plot.status === 'Available' ? 'bg-emerald-500' : plot.status === 'Sold' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                  </div>
                  <div className="text-[11px] text-neutral-500 flex justify-between">
                    <span>{plot.width_ft}' x {plot.length_ft}'</span>
                    <span>₹{plot.base_price.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && drawnShapeData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-neutral-900 border border-neutral-700 p-8 rounded-2xl w-full max-w-2xl shadow-2xl flex gap-8">
              
              {/* Left Column: AI Logic */}
              <div className="flex-1">
                  <h2 className="text-2xl font-bold text-emerald-400 mb-6">AI Spatial Logic</h2>
                  {!predictionResult ? (
                      <>
                        <p className="text-neutral-400 mb-6 text-sm">Boundary detected. Initialize AI to calculate dimensions and optimal pricing.</p>
                        <button onClick={handleAIInit} disabled={isPredicting} className="px-4 py-3 rounded-xl font-bold bg-emerald-500 text-black hover:bg-emerald-400 transition-colors w-full flex justify-center items-center gap-2">
                        {isPredicting ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5" />} 
                        {isPredicting ? 'Analyzing...' : 'Initialize Prediction Engine'}
                        </button>
                      </>
                  ) : (
                      <div className="space-y-4">
                          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                              <p className="text-xs text-neutral-500 mb-1">Calculated Dimensions</p>
                              <p className="text-xl font-bold">{predictionResult.width_ft}' x {predictionResult.length_ft}' <span className="text-sm font-normal text-neutral-400">({predictionResult.total_area_sqft} sqft)</span></p>
                          </div>
                          <div className="bg-emerald-900/20 p-4 rounded-xl border border-emerald-500/30">
                              <p className="text-xs text-emerald-500/70 mb-1">AI Predicted Valuation</p>
                              <p className="text-2xl font-bold text-emerald-400">₹{predictionResult.predicted_price.toLocaleString('en-IN')}</p>
                          </div>
                      </div>
                  )}
              </div>

              {/* Right Column: User Input Form (Only shows after AI prediction) */}
              {predictionResult && (
                  <div className="flex-1 border-l border-neutral-800 pl-8">
                      <h3 className="text-lg font-bold mb-4">Registration Details</h3>
                      <div className="space-y-3">
                          <div>
                              <label className="text-xs text-neutral-400">Plot Number*</label>
                              <input type="text" className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-sm mt-1 focus:border-emerald-500 outline-none" 
                                value={formData.plot_number} onChange={e => setFormData({...formData, plot_number: e.target.value})} placeholder="e.g., 104A" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className="text-xs text-neutral-400">Status</label>
                                  <select className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-sm mt-1 focus:border-emerald-500 outline-none"
                                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                      <option>Available</option><option>Booked</option><option>Sold</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="text-xs text-neutral-400">Managed By</label>
                                  <input type="text" className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-sm mt-1 focus:border-emerald-500 outline-none" 
                                    value={formData.managed_by} onChange={e => setFormData({...formData, managed_by: e.target.value})} placeholder="Agent Name" />
                              </div>
                          </div>
                          {formData.status !== 'Available' && (
                              <>
                                  <div>
                                      <label className="text-xs text-neutral-400">Buyer/Exhibitor Name</label>
                                      <input type="text" className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-sm mt-1" 
                                        value={formData.buyer_name} onChange={e => setFormData({...formData, buyer_name: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="text-xs text-neutral-400">Contact Number</label>
                                      <input type="text" className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-sm mt-1" 
                                        value={formData.contact_number} onChange={e => setFormData({...formData, contact_number: e.target.value})} />
                                  </div>
                              </>
                          )}
                      </div>
                  </div>
              )}
           </div>
           
           {/* Bottom Action Bar */}
           <div className="absolute bottom-8 right-8 flex gap-4">
                <button onClick={handleCloseModal} className="px-6 py-2 rounded-xl font-medium bg-neutral-800 hover:bg-neutral-700 transition-colors">Cancel</button>
                {predictionResult && (
                    <button onClick={handleSavePlot} disabled={isSaving} className="px-6 py-2 rounded-xl font-bold bg-white text-black hover:bg-neutral-200 transition-colors flex items-center gap-2 disabled:opacity-50">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        {isSaving ? 'Saving...' : 'Save Plot to Database'}
                    </button>
                )}
           </div>
        </div>
      )}
    </div>
  );
}