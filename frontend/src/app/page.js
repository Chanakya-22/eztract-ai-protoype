"use client";
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchPlots, predictPlotPrice, savePlotToDB } from '../services/api';
import { Loader2, PlusCircle, CheckCircle, X, User, Phone, ShieldCheck, ArrowRight, Lock, Eye, EyeOff, Command } from 'lucide-react';

const PlotCanvas = dynamic(() => import('../components/PlotCanvas'), { ssr: false });

export default function MasterApp() {
  const [currentView, setCurrentView] = useState('landing'); 
  const [role, setRole] = useState('user'); 
  const [showPassword, setShowPassword] = useState(false);

  // ==========================================
  // SCREEN 1: LANDING PAGE (Apple-Tier Design)
  // ==========================================
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden selection:bg-white/30">
        {/* Cinematic Background Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900/40 via-black to-black pointer-events-none"></div>

        <div className="z-10 max-w-5xl mx-auto text-center px-4 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <Command className="w-16 h-16 text-white mb-8 opacity-90" />
          <h1 className="text-6xl md:text-8xl font-medium text-white tracking-tighter mb-6">
            Spatial reality. <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-400 to-neutral-600">Digitized.</span>
          </h1>
          <p className="text-xl md:text-2xl text-neutral-400 mb-16 max-w-2xl mx-auto font-light tracking-wide">
            The next generation of real estate layout management. Pro-level tools. Effortless interface.
          </p>

          <div className="flex flex-col sm:flex-row gap-6">
            <button 
              onClick={() => { setRole('user'); setCurrentView('dashboard'); }}
              className="px-8 py-4 rounded-full bg-white text-black font-semibold tracking-wide hover:scale-105 transition-transform duration-300 flex items-center gap-2"
            >
              Explore as Guest <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentView('login')}
              className="px-8 py-4 rounded-full bg-transparent text-white border border-white/20 font-semibold tracking-wide hover:bg-white/10 transition-colors duration-300 flex items-center gap-2"
            >
              Admin Portal <ShieldCheck className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SCREEN 2: SECURE LOGIN
  // ==========================================
  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900/30 via-black to-black pointer-events-none"></div>
        
        <div className="bg-neutral-900/50 backdrop-blur-2xl border border-white/10 p-10 rounded-3xl w-full max-w-md shadow-2xl relative z-10 animate-in zoom-in-95 duration-500">
          <button onClick={() => setCurrentView('landing')} className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex justify-center mb-8">
            <Lock className="w-10 h-10 text-white opacity-80" />
          </div>
          
          <h2 className="text-3xl font-medium text-center text-white mb-2 tracking-tight">Admin Sign In</h2>
          <p className="text-center text-neutral-400 text-sm mb-10">Use your security passkey to continue.</p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            if (e.target.password.value === 'admin123') { 
              setRole('admin'); 
              setCurrentView('dashboard');
            } else { 
              alert('Incorrect Password. For this prototype, use: admin123'); 
            }
          }}>
            <div className="mb-8 relative">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                required
                className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-white focus:border-white focus:ring-1 focus:ring-white outline-none transition-all pr-12 font-mono tracking-widest" 
                placeholder="••••••••" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <button type="submit" className="w-full bg-white text-black font-semibold py-4 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
              Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // SCREEN 3: DASHBOARD ROUTER
  // ==========================================
  return <Dashboard role={role} onLogout={() => { setRole('user'); setCurrentView('landing'); }} />;
}

// ==========================================
// THE MAIN DASHBOARD COMPONENT
// ==========================================
function Dashboard({ role, onLogout }) {
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false); 
  const [drawnShapeData, setDrawnShapeData] = useState(null);
  const [viewPlot, setViewPlot] = useState(null); 
  
  // AI states
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({ 
    plot_number: '', 
    buyer_name: '', 
    contact_number: '', 
    managed_by: '', 
    status: 'Available' 
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load Data from Database
  const loadData = async () => {
    setLoading(true);
    const data = await fetchPlots();
    setPlots(data);
    setLoading(false);
  };

  useEffect(() => { 
    loadData(); 
  }, []);

  const handlePlotDrawn = (rectData) => {
    if (role !== 'admin') return;
    setDrawnShapeData(rectData);
    setShowModal(true); 
  };

  const handleAIInit = async () => {
    if (!drawnShapeData) return;
    setIsPredicting(true);
    
    const result = await predictPlotPrice({ 
      x: drawnShapeData.x, 
      y: drawnShapeData.y, 
      width: drawnShapeData.width, 
      height: drawnShapeData.height 
    });
    
    setPredictionResult(result);
    setIsPredicting(false);
  };

  const handleSavePlot = async () => {
    if (!formData.plot_number) return alert("Plot Number is required!");
    setIsSaving(true);
    
    // Extract geometry
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
      await loadData(); 
      handleCloseModal(); 
    } else { 
      alert("Failed to save. Check terminal for errors."); 
    }
    setIsSaving(false);
  };

  const handleCloseModal = () => {
    setShowModal(false); 
    setPredictionResult(null); 
    setDrawnShapeData(null);
    setFormData({ 
      plot_number: '', 
      buyer_name: '', 
      contact_number: '', 
      managed_by: '', 
      status: 'Available' 
    });
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 font-sans">
      
      {/* Premium Header */}
      <header className="mb-10 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <Command className="text-white w-8 h-8" />
            <div>
              <h1 className="text-2xl font-medium tracking-tight">Kumaran Nagar Layout</h1>
              <p className="text-neutral-500 text-xs uppercase tracking-widest mt-1">
                {role === 'admin' ? 'Administrator Mode' : 'Guest Viewer'}
              </p>
            </div>
        </div>
        <button 
          onClick={onLogout} 
          className="px-5 py-2.5 rounded-full text-sm font-medium bg-neutral-900 hover:bg-neutral-800 border border-white/10 transition-colors"
        >
            Exit System
        </button>
      </header>

      {/* Main Glassmorphic Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3">
           <PlotCanvas 
             existingPlots={plots} 
             onPlotDrawn={handlePlotDrawn} 
             onPlotClick={setViewPlot} 
             role={role} 
           />
        </div>

        {/* Glass Sidebar */}
        <div className="bg-neutral-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 h-[700px] overflow-y-auto flex flex-col shadow-2xl">
          <div className="mb-8">
             <h2 className="text-2xl font-medium tracking-tight">Records</h2>
             <p className="text-neutral-500 text-sm mt-1">{plots.length} Plots Mapped</p>
          </div>
          
          {loading ? (
            <div className="flex-1 flex justify-center items-center">
              <Loader2 className="animate-spin w-6 h-6 text-neutral-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {plots.map((plot) => (
                <div 
                  key={plot.id} 
                  onClick={() => setViewPlot(plot)} 
                  className="group bg-black/40 border border-white/5 rounded-2xl p-5 hover:bg-neutral-800/50 hover:border-white/20 cursor-pointer transition-all duration-300"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium tracking-wide">Plot {plot.plot_number}</span>
                    <div className={`w-2.5 h-2.5 rounded-full ${plot.status === 'Available' ? 'bg-green-500' : plot.status === 'Sold' ? 'bg-neutral-600' : 'bg-amber-500'}`}></div>
                  </div>
                  <div className="text-xs text-neutral-500 flex justify-between font-mono">
                    <span>{plot.total_area_sqft} sqft</span>
                    <span className="text-neutral-300">₹{plot.base_price.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* PREMIUM VIEW MODAL (When clicking a plot) */}
      {/* ========================================== */}
      {viewPlot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-neutral-900/90 backdrop-blur-3xl border border-white/10 p-10 rounded-[2rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-300">
              <button 
                onClick={() => setViewPlot(null)} 
                className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors bg-black/40 p-2 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="mb-10 text-center mt-4">
                <span className={`inline-block px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border ${
                  viewPlot.status === 'Available' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                  viewPlot.status === 'Sold' ? 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20' : 
                  'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {viewPlot.status}
                </span>
                <h2 className="text-6xl font-medium text-white tracking-tighter">Plot {viewPlot.plot_number}</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-black/40 p-6 rounded-3xl border border-white/5 text-center flex flex-col justify-center">
                    <p className="text-xs text-neutral-500 mb-2 uppercase tracking-widest font-semibold">Area</p>
                    <p className="text-3xl font-light text-white">{viewPlot.total_area_sqft} <span className="text-sm text-neutral-500">sqft</span></p>
                    <p className="text-xs text-neutral-600 mt-2">{viewPlot.width_ft}' × {viewPlot.length_ft}'</p>
                </div>
                <div className="bg-black/40 p-6 rounded-3xl border border-white/5 text-center flex flex-col justify-center">
                    <p className="text-xs text-neutral-500 mb-2 uppercase tracking-widest font-semibold">Valuation</p>
                    <p className="text-3xl font-medium text-white">₹{viewPlot.base_price.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {viewPlot.status !== 'Available' ? (
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest text-center mb-4">Registration Details</h3>
                  {viewPlot.buyer_name && (
                    <div className="flex items-center justify-between text-white border-b border-white/5 pb-3">
                      <span className="text-neutral-500 text-sm flex items-center gap-2"><User className="w-4 h-4"/> Buyer</span>
                      <span className="font-medium text-lg">{viewPlot.buyer_name}</span>
                    </div>
                  )}
                  {viewPlot.contact_number && (
                    <div className="flex items-center justify-between text-white border-b border-white/5 pb-3">
                      <span className="text-neutral-500 text-sm flex items-center gap-2"><Phone className="w-4 h-4"/> Contact</span>
                      <span className="font-mono text-sm bg-black/50 px-3 py-1 rounded-lg">{viewPlot.contact_number}</span>
                    </div>
                  )}
                  {viewPlot.managed_by && (
                    <div className="flex items-center justify-between text-white pt-1">
                      <span className="text-neutral-500 text-sm">Agent</span>
                      <span className="text-sm text-neutral-400">{viewPlot.managed_by}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-black/30 border border-white/5 p-8 rounded-3xl text-center flex flex-col items-center">
                  <ShieldCheck className="w-8 h-8 text-neutral-600 mb-3" />
                  <p className="text-neutral-400 text-sm font-light">This plot is fully cleared and available for immediate acquisition.</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* ========================================== */}
      {/* PREMIUM CREATE MODAL (Admin Only) */}
      {/* ========================================== */}
      {showModal && drawnShapeData && role === 'admin' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-neutral-900/90 backdrop-blur-3xl border border-white/10 p-10 rounded-[2rem] w-full max-w-4xl shadow-2xl flex flex-col md:flex-row gap-12 animate-in zoom-in-95 duration-300">
              
              <div className="flex-1 flex flex-col">
                  <h2 className="text-2xl font-medium text-white mb-6 tracking-tight flex items-center gap-3">
                    <Command className="w-6 h-6 text-neutral-500" /> AI Spatial Analysis
                  </h2>
                  
                  {!predictionResult ? (
                      <div className="h-full flex flex-col justify-center bg-black/30 rounded-3xl p-8 border border-white/5">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 mx-auto">
                          <PlusCircle className="w-8 h-8 text-neutral-400" />
                        </div>
                        <p className="text-neutral-400 mb-8 font-light leading-relaxed text-center">
                          A physical boundary has been detected. Initialize the engine to accurately calculate layout dimensions and run optimal pricing algorithms.
                        </p>
                        <button 
                          onClick={handleAIInit} 
                          disabled={isPredicting} 
                          className="w-full py-4 rounded-2xl font-semibold bg-white text-black hover:scale-[1.02] transition-transform flex justify-center items-center gap-2"
                        >
                          {isPredicting ? <Loader2 className="w-5 h-5 animate-spin" /> : null} 
                          {isPredicting ? 'Analyzing Geometry...' : 'Run Prediction Model'}
                        </button>
                      </div>
                  ) : (
                      <div className="space-y-4 flex-1">
                          <div className="bg-black/50 p-8 rounded-3xl border border-white/5 h-1/2 flex flex-col justify-center">
                              <p className="text-xs text-neutral-500 mb-3 uppercase tracking-widest font-semibold">Calculated Dimensions</p>
                              <p className="text-4xl font-light text-white">{predictionResult.width_ft}' × {predictionResult.length_ft}'</p>
                              <p className="text-neutral-500 mt-2">Total Area: <span className="text-white font-medium">{predictionResult.total_area_sqft} sqft</span></p>
                          </div>
                          <div className="bg-white/5 p-8 rounded-3xl border border-white/10 h-1/2 flex flex-col justify-center relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-10"><Command className="w-24 h-24" /></div>
                              <p className="text-xs text-neutral-500 mb-3 uppercase tracking-widest font-semibold relative z-10">AI Predicted Valuation</p>
                              <p className="text-5xl font-medium text-white relative z-10">₹{predictionResult.predicted_price.toLocaleString('en-IN')}</p>
                          </div>
                      </div>
                  )}
              </div>

              {predictionResult && (
                  <div className="flex-1 border-t md:border-t-0 md:border-l border-white/10 pt-8 md:pt-0 md:pl-12 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl font-medium mb-8 tracking-tight text-white">Registry Database</h3>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold ml-2 mb-2 block">Plot Identifier *</label>
                                <input 
                                  type="text" 
                                  className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-white focus:border-white outline-none transition-colors placeholder:text-neutral-700 font-medium text-lg" 
                                  value={formData.plot_number} 
                                  onChange={e => setFormData({...formData, plot_number: e.target.value})} 
                                  placeholder="e.g. 104A" 
                                  required 
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold ml-2 mb-2 block">Status</label>
                                  <select 
                                    className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-white focus:border-white outline-none appearance-none"
                                    value={formData.status} 
                                    onChange={e => setFormData({...formData, status: e.target.value})}
                                  >
                                      <option>Available</option>
                                      <option>Booked</option>
                                      <option>Sold</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold ml-2 mb-2 block">Agent</label>
                                  <input 
                                    type="text" 
                                    className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-white focus:border-white outline-none placeholder:text-neutral-700" 
                                    value={formData.managed_by} 
                                    onChange={e => setFormData({...formData, managed_by: e.target.value})} 
                                    placeholder="Name" 
                                  />
                                </div>
                            </div>

                            {formData.status !== 'Available' && (
                                <div className="space-y-5 animate-in slide-in-from-top-4 pt-4 border-t border-white/5 mt-4">
                                    <div>
                                      <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold ml-2 mb-2 block">Buyer Full Name</label>
                                      <input 
                                        type="text" 
                                        className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-white focus:border-white outline-none placeholder:text-neutral-700" 
                                        value={formData.buyer_name} 
                                        onChange={e => setFormData({...formData, buyer_name: e.target.value})} 
                                        placeholder="John Doe" 
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold ml-2 mb-2 block">Contact Number</label>
                                      <input 
                                        type="text" 
                                        className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-white focus:border-white outline-none placeholder:text-neutral-700 font-mono" 
                                        value={formData.contact_number} 
                                        onChange={e => setFormData({...formData, contact_number: e.target.value})} 
                                        placeholder="+91-9876543210" 
                                      />
                                    </div>
                                </div>
                            )}
                        </div>
                      </div>
                      
                      <div className="mt-12 flex gap-4">
                          <button 
                            onClick={handleCloseModal} 
                            className="flex-[1] py-4 rounded-2xl font-medium bg-neutral-900 border border-white/10 text-white hover:bg-neutral-800 transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleSavePlot} 
                            disabled={isSaving} 
                            className="flex-[2] py-4 rounded-2xl font-bold bg-white text-black hover:bg-neutral-200 hover:scale-[1.02] transition-all flex justify-center items-center gap-2"
                          >
                              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                              {isSaving ? 'Writing to Database...' : 'Commit Record'}
                          </button>
                      </div>
                  </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}