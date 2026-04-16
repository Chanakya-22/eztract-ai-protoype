"use client";
import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { fetchPlots, predictPlotPrice, savePlotToDB, updatePlotInDB, deletePlotFromDB } from '../services/api';
import { Map, Loader2, PlusCircle, CheckCircle, Search, Edit2, Trash2, X } from 'lucide-react';

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

  // NEW: View Plot Modal State
  const [viewPlot, setViewPlot] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const { totalValuation, soldPercentage, totalArea } = useMemo(() => {
    let tv = 0, sc = 0, ta = 0;
    plots.forEach(p => {
      tv += p.base_price || 0;
      ta += p.total_area_sqft || 0;
      if (p.status === 'Sold') sc++;
    });
    return {
      totalValuation: tv,
      totalArea: ta,
      soldPercentage: plots.length > 0 ? Math.round((sc / plots.length) * 100) : 0
    };
  }, [plots]);

  const filteredPlots = useMemo(() => {
    return plots.filter(plot => {
      const matchesSearch = plot.plot_number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || plot.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [plots, searchQuery, statusFilter]);

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
      setViewPlot(plot);
      setIsEditing(false);
      setEditFormData({
          status: plot.status,
          buyer_name: plot.buyer_name || '',
          contact_number: plot.contact_number || '',
          managed_by: plot.managed_by || ''
      });
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

  const handleUpdatePlot = async () => {
      setIsSaving(true);
      const res = await updatePlotInDB(viewPlot.id, editFormData);
      if (res) {
          await loadData();
          setViewPlot({ ...viewPlot, ...editFormData });
          setIsEditing(false);
      } else {
          alert("Failed to update plot.");
      }
      setIsSaving(false);
  };

  const handleDeletePlot = async () => {
      if (!confirm("Are you sure you want to permanently delete this plot?")) return;
      setIsSaving(true);
      const res = await deletePlotFromDB(viewPlot.id);
      if (res) {
          await loadData();
          setViewPlot(null);
      } else {
          alert("Failed to delete plot.");
      }
      setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <header className="mb-8 flex items-center justify-between border-b border-neutral-800 pb-6">
        <div className="flex items-center gap-3">
          <Map className="text-emerald-500 w-8 h-8" />
          <div>
            <h1 className="text-3xl font-light tracking-tight">EZTract <span className="font-semibold text-emerald-500">AI Prototype</span></h1>
            <p className="text-neutral-400 text-sm mt-1">Kumaran Nagar Layout - Admin Interface</p>
          </div>
        </div>
        <div className="flex gap-6 hidden md:flex">
            <div className="bg-neutral-900 border border-neutral-800 px-5 py-3 rounded-xl min-w-[140px]">
                <p className="text-xs text-neutral-500 mb-1">Total Valuation</p>
                <p className="text-xl font-bold text-emerald-400">₹{totalValuation.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 px-5 py-3 rounded-xl min-w-[140px]">
                <p className="text-xs text-neutral-500 mb-1">Mapped Area</p>
                <p className="text-xl font-bold">{Math.round(totalArea).toLocaleString('en-IN')} <span className="text-sm font-normal text-neutral-400">sqft</span></p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 px-5 py-3 rounded-xl min-w-[140px]">
                <p className="text-xs text-neutral-500 mb-1">Sold Inventory</p>
                <div className="flex items-center gap-2">
                   <p className="text-xl font-bold">{soldPercentage}%</p>
                   <div className="w-20 h-2 bg-neutral-800 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500" style={{ width: `${soldPercentage}%` }}></div>
                   </div>
                </div>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
           <PlotCanvas existingPlots={plots} searchQuery={searchQuery} statusFilter={statusFilter} onPlotDrawn={handlePlotDrawn} onPlotClick={handlePlotClick} />
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 h-[650px] flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold flex items-center gap-2">Database Records</h2>
             <span className="text-sm text-neutral-400">Showing: {filteredPlots.length}</span>
          </div>

          <div className="space-y-3 mb-6">
              <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
                  <input type="text" placeholder="Search Plot #..." className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 p-2 text-sm focus:border-emerald-500 outline-none transition-colors" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex bg-neutral-950 rounded-lg p-1 border border-neutral-800">
                  {['All', 'Available', 'Booked', 'Sold'].map(status => (
                      <button key={status} onClick={() => setStatusFilter(status)} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${statusFilter === status ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'}`}>
                          {status}
                      </button>
                  ))}
              </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {loading ? (
            <div className="flex justify-center items-center h-32"><Loader2 className="animate-spin w-8 h-8 text-emerald-500" /></div>
          ) : (
            <>
              {filteredPlots.map((plot) => (
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
              {filteredPlots.length === 0 && <p className="text-sm text-neutral-500 text-center py-6">No matching plots found.</p>}
            </>
          )}
          </div>
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

      {viewPlot && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-neutral-900 border border-neutral-700 p-8 rounded-2xl w-full max-w-lg shadow-2xl relative">
              <button onClick={() => setViewPlot(null)} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
              
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h2 className="text-2xl font-bold text-emerald-400">Plot {viewPlot.plot_number}</h2>
                    <p className="text-sm text-neutral-400">Database Record</p>
                 </div>
                 <div className={`px-3 py-1 rounded-full text-xs font-bold ${viewPlot.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : viewPlot.status === 'Sold' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                    {viewPlot.status}
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                        <p className="text-xs text-neutral-500 mb-1">Dimensions</p>
                        <p className="text-lg font-bold">{viewPlot.width_ft}' x {viewPlot.length_ft}'</p>
                        <p className="text-xs text-neutral-400">{viewPlot.total_area_sqft} sqft</p>
                    </div>
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                        <p className="text-xs text-neutral-500 mb-1">Valuation</p>
                        <p className="text-lg font-bold text-emerald-400">₹{viewPlot.base_price?.toLocaleString('en-IN')}</p>
                    </div>
                 </div>

                 <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                    <p className="text-xs text-neutral-500 mb-3">Registration Details</p>
                    {isEditing ? (
                       <div className="space-y-3">
                           <div>
                               <label className="text-xs text-neutral-400">Status</label>
                               <select className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-sm mt-1 focus:border-emerald-500 outline-none"
                                 value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value})}>
                                   <option>Available</option><option>Booked</option><option>Sold</option>
                               </select>
                           </div>
                           <div>
                               <label className="text-xs text-neutral-400">Buyer Name</label>
                               <input type="text" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-sm mt-1 focus:border-emerald-500 outline-none" 
                                 value={editFormData.buyer_name} onChange={e => setEditFormData({...editFormData, buyer_name: e.target.value})} />
                           </div>
                           <div>
                               <label className="text-xs text-neutral-400">Contact Number</label>
                               <input type="text" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-sm mt-1 focus:border-emerald-500 outline-none" 
                                 value={editFormData.contact_number} onChange={e => setEditFormData({...editFormData, contact_number: e.target.value})} />
                           </div>
                           <div>
                               <label className="text-xs text-neutral-400">Managed By</label>
                               <input type="text" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-sm mt-1 focus:border-emerald-500 outline-none" 
                                 value={editFormData.managed_by} onChange={e => setEditFormData({...editFormData, managed_by: e.target.value})} />
                           </div>
                       </div>
                    ) : (
                       <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                             <span className="text-neutral-400">Buyer Name</span>
                             <span className="font-medium">{viewPlot.buyer_name || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                             <span className="text-neutral-400">Contact Number</span>
                             <span className="font-medium">{viewPlot.contact_number || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                             <span className="text-neutral-400">Managed By</span>
                             <span className="font-medium">{viewPlot.managed_by || 'N/A'}</span>
                          </div>
                       </div>
                    )}
                 </div>
              </div>

              <div className="mt-8 flex gap-4">
                 {!isEditing ? (
                    <>
                       <button onClick={() => setIsEditing(true)} className="flex-1 px-6 py-3 rounded-xl font-medium bg-neutral-800 hover:bg-neutral-700 transition-colors flex justify-center items-center gap-2 text-sm"><Edit2 className="w-4 h-4"/> Edit</button>
                       <button onClick={handleDeletePlot} disabled={isSaving} className="flex-1 px-6 py-3 rounded-xl font-medium bg-red-950 hover:bg-red-900 text-red-500 transition-colors flex justify-center items-center gap-2 text-sm disabled:opacity-50"><Trash2 className="w-4 h-4"/> Delete</button>
                    </>
                 ) : (
                    <>
                       <button onClick={() => setIsEditing(false)} className="flex-1 px-6 py-3 rounded-xl font-medium bg-neutral-800 hover:bg-neutral-700 transition-colors text-sm">Cancel Edit</button>
                       <button onClick={handleUpdatePlot} disabled={isSaving} className="flex-1 px-6 py-3 rounded-xl font-medium bg-white text-black hover:bg-neutral-200 transition-colors flex justify-center items-center gap-2 text-sm disabled:opacity-50">
                           {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>} Save Updates
                       </button>
                    </>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}