"use client";
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchPlots, predictPlotPrice, savePlotToDB } from '../services/api';
import { 
  Loader2, PlusCircle, CheckCircle, X, User, Phone, ShieldCheck, ArrowRight, Lock, 
  Eye, EyeOff, Command, Layers, Cpu, Database, Map, LayoutDashboard, Settings, LogOut, FileText, Search
} from 'lucide-react';

const PlotCanvas = dynamic(() => import('../components/PlotCanvas'), { ssr: false });

export default function MasterApp() {
  // Application Router State
  const [currentView, setCurrentView] = useState('landing'); // landing, login, dashboard, map
  const [role, setRole] = useState('user'); 
  const [showPassword, setShowPassword] = useState(false);
  
  // Projects State (Simulating a backend projects table for the prototype)
  const [projects, setProjects] = useState([
    { id: 'proj_1', name: 'Kumaran Nagar Layout', location: 'Chennai, Tamil Nadu', totalArea: '4.2 Acres', status: 'Active', image: '/layout.jpg' },
    { id: 'proj_2', name: 'Green Valley Estates', location: 'Coimbatore, Tamil Nadu', totalArea: '12.5 Acres', status: 'Draft', image: null }
  ]);
  const [selectedProject, setSelectedProject] = useState(null);

  // ==========================================
  // VIEW 1: MARKETING LANDING PAGE
  // ==========================================
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden">
        <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-1.5 rounded-lg"><Command className="w-5 h-5 text-black" /></div>
              <span className="font-bold tracking-wide text-lg">EZTract</span>
            </div>
            <div className="flex items-center gap-6 text-sm font-medium">
              <a href="#features" className="text-neutral-400 hover:text-white transition-colors hidden md:block">Features</a>
              <a href="#how-it-works" className="text-neutral-400 hover:text-white transition-colors hidden md:block">Technology</a>
              <button onClick={() => setCurrentView('login')} className="text-emerald-400 hover:text-emerald-300 transition-colors">Admin Gateway</button>
              <button onClick={() => { setRole('user'); setCurrentView('dashboard'); }} className="bg-white text-black px-5 py-2.5 rounded-full hover:scale-105 transition-transform font-semibold">
                Open Dashboard
              </button>
            </div>
          </div>
        </nav>

        <section className="relative pt-48 pb-32 px-6 flex flex-col items-center text-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.05)_0%,_transparent_50%)] pointer-events-none"></div>
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold tracking-widest uppercase mb-8 text-emerald-400 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Production Prototype V2
          </div>
          
          <h1 className="text-5xl md:text-8xl font-medium tracking-tighter max-w-5xl mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            Intelligent spatial <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">layout digitization.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mb-12 font-light leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
            Transform physical blueprints and raw land layouts into interactive, data-rich digital assets. EZTract calculates dimensions, predicts market valuations, and centralizes your registry.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
            <button onClick={() => { setRole('user'); setCurrentView('dashboard'); }} className="px-8 py-4 rounded-full bg-white text-black font-semibold tracking-wide hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2">
              Launch Platform Workspace <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        <section id="features" className="py-32 px-6 bg-neutral-950 border-t border-white/5 relative">
          <div className="max-w-7xl mx-auto">
            <div className="mb-20 md:w-2/3">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6 text-white">Built for modern real estate developers.</h2>
              <p className="text-neutral-400 text-lg font-light leading-relaxed">Stop managing millions of rupees in inventory on paper. EZTract brings enterprise-grade spatial mapping directly to your browser with zero complex CAD software required.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-black border border-white/5 p-10 rounded-[2rem] hover:border-emerald-500/30 transition-colors group">
                <div className="w-14 h-14 bg-neutral-900 group-hover:bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 transition-colors">
                  <Map className="w-7 h-7 text-white group-hover:text-emerald-400" />
                </div>
                <h3 className="text-2xl font-medium mb-4 text-white">Smart-Draw Engine</h3>
                <p className="text-neutral-400 font-light leading-relaxed text-sm">Upload standard layout JPEGs. Admins can instantly draw boundary polygons that automatically scale and anchor to the physical image forever.</p>
              </div>

              <div className="bg-black border border-white/5 p-10 rounded-[2rem] hover:border-blue-500/30 transition-colors group">
                <div className="w-14 h-14 bg-neutral-900 group-hover:bg-blue-500/10 rounded-2xl flex items-center justify-center mb-8 transition-colors">
                  <Cpu className="w-7 h-7 text-white group-hover:text-blue-400" />
                </div>
                <h3 className="text-2xl font-medium mb-4 text-white">AI Valuation Models</h3>
                <p className="text-neutral-400 font-light leading-relaxed text-sm">Our spatial algorithms convert drawn pixel boundaries into real-world square footage, dynamically predicting plot valuations based on local market rates.</p>
              </div>

              <div className="bg-black border border-white/5 p-10 rounded-[2rem] hover:border-purple-500/30 transition-colors group">
                <div className="w-14 h-14 bg-neutral-900 group-hover:bg-purple-500/10 rounded-2xl flex items-center justify-center mb-8 transition-colors">
                  <Database className="w-7 h-7 text-white group-hover:text-purple-400" />
                </div>
                <h3 className="text-2xl font-medium mb-4 text-white">Registry Database</h3>
                <p className="text-neutral-400 font-light leading-relaxed text-sm">Securely store buyer information, manage plot statuses (Available, Booked, Sold), and track agent assignments in a centralized cloud architecture.</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/5 py-16 px-6 bg-black">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-neutral-500 text-sm">
            <div className="flex items-center gap-2"><Command className="w-5 h-5 text-neutral-600" /><span className="font-semibold text-neutral-400">EZTract</span></div>
            <p>© 2026 ThinkCove Technologies. Prototype Demonstration Phase.</p>
          </div>
        </footer>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ADMIN LOGIN
  // ==========================================
  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-neutral-950 border border-white/10 p-12 rounded-[2rem] w-full max-w-md shadow-2xl relative">
          <button onClick={() => setCurrentView('landing')} className="absolute top-8 right-8 text-neutral-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
          
          <div className="flex justify-center mb-8"><div className="bg-emerald-500/10 p-4 rounded-full"><Lock className="w-8 h-8 text-emerald-500" /></div></div>
          <h2 className="text-3xl font-medium text-center text-white mb-2 tracking-tight">Admin Gateway</h2>
          <p className="text-center text-neutral-500 text-sm mb-10">Authenticate to access spatial management tools.</p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            if (e.target.password.value === 'admin123') { 
              setRole('admin'); setCurrentView('dashboard');
            } else { alert('Incorrect Password. Prototype Passkey: admin123'); }
          }}>
            <div className="mb-8 relative">
              <input 
                type={showPassword ? "text" : "password"} name="password" required
                className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all pr-12 font-mono" 
                placeholder="Passkey" 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <button type="submit" className="w-full bg-emerald-500 text-black font-bold py-4 rounded-2xl hover:bg-emerald-400 transition-colors">
              Access Workspace
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: GLOBAL SAAS DASHBOARD (Projects List)
  // ==========================================
  if (currentView === 'dashboard') {
    return (
      <DashboardLayout role={role} onLogout={() => setCurrentView('landing')}>
        <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h1 className="text-3xl font-medium text-white tracking-tight mb-2">Projects Overview</h1>
              <p className="text-neutral-400">Manage your digitized layouts and real estate developments.</p>
            </div>
            {role === 'admin' && (
              <button onClick={() => alert('New Project Creation UI will go here in Phase 5.')} className="bg-white text-black px-5 py-2.5 rounded-xl font-medium hover:bg-neutral-200 transition-colors flex items-center gap-2">
                <PlusCircle className="w-5 h-5" /> New Layout Project
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(proj => (
              <div key={proj.id} className="bg-neutral-900 border border-white/5 rounded-3xl overflow-hidden hover:border-emerald-500/30 transition-all group cursor-pointer"
                onClick={() => { setSelectedProject(proj); setCurrentView('map'); }}
              >
                <div className="h-48 bg-neutral-950 relative border-b border-white/5 flex items-center justify-center overflow-hidden">
                  {proj.image ? (
                    <img src={proj.image} alt={proj.name} className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
                  ) : (
                    <Map className="w-12 h-12 text-neutral-800" />
                  )}
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full border border-white/10 text-xs font-bold uppercase tracking-widest text-emerald-400">
                    {proj.status}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-medium text-white mb-2">{proj.name}</h3>
                  <p className="text-neutral-500 text-sm flex items-center gap-2 mb-1"><Map className="w-4 h-4"/> {proj.location}</p>
                  <p className="text-neutral-500 text-sm flex items-center gap-2 mb-6"><Layers className="w-4 h-4"/> {proj.totalArea}</p>
                  <div className="flex items-center text-emerald-500 text-sm font-medium group-hover:translate-x-2 transition-transform">
                    Open Workspace <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ==========================================
  // VIEW 4: THE SPECIFIC MAP VIEWER (e.g., Kumaran Nagar)
  // ==========================================
  if (currentView === 'map' && selectedProject) {
    return (
      <DashboardLayout role={role} onLogout={() => setCurrentView('landing')}>
         <div className="p-6 h-[calc(100vh-theme(spacing.16))] overflow-hidden flex flex-col">
            
            {/* Project Header inside Map View */}
            <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-4">
                 <button onClick={() => setCurrentView('dashboard')} className="text-neutral-500 hover:text-white transition-colors bg-neutral-900 p-2 rounded-lg border border-white/5">
                   <ArrowRight className="w-5 h-5 rotate-180" />
                 </button>
                 <div>
                   <h2 className="text-2xl font-medium text-white tracking-tight">{selectedProject.name}</h2>
                   <p className="text-neutral-500 text-xs uppercase tracking-widest mt-1">Layout Mapping Interface</p>
                 </div>
               </div>
            </div>

            <MapEngine role={role} />
            
         </div>
      </DashboardLayout>
    );
  }

  return null;
}

// ==========================================
// SAAS SIDEBAR LAYOUT WRAPPER
// ==========================================
function DashboardLayout({ children, role, onLogout }) {
  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-950 border-r border-white/5 flex flex-col hidden md:flex">
        <div className="h-20 flex items-center px-8 border-b border-white/5">
          <Command className="w-6 h-6 text-emerald-500 mr-3" />
          <span className="font-bold tracking-widest text-lg">EZTRACT</span>
        </div>
        <div className="p-6 flex-1 space-y-2">
          <p className="text-xs font-bold text-neutral-600 uppercase tracking-widest mb-4 ml-2">Menu</p>
          <button className="w-full flex items-center gap-3 bg-neutral-900 text-white px-4 py-3 rounded-xl font-medium border border-white/5">
            <LayoutDashboard className="w-5 h-5" /> Projects
          </button>
          <button className="w-full flex items-center gap-3 text-neutral-500 hover:text-white hover:bg-neutral-900/50 px-4 py-3 rounded-xl font-medium transition-colors">
            <FileText className="w-5 h-5" /> Reports
          </button>
          <button className="w-full flex items-center gap-3 text-neutral-500 hover:text-white hover:bg-neutral-900/50 px-4 py-3 rounded-xl font-medium transition-colors">
            <Settings className="w-5 h-5" /> Settings
          </button>
        </div>
        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold border border-emerald-500/30">
              {role === 'admin' ? 'A' : 'G'}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{role === 'admin' ? 'Administrator' : 'Guest Viewer'}</p>
              <p className="text-xs text-neutral-500">Active Session</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-neutral-500 hover:text-white bg-neutral-900 hover:bg-neutral-800 py-3 rounded-xl transition-colors font-medium border border-white/5">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#050505]">
        {children}
      </main>
    </div>
  );
}

// ==========================================
// THE SPECIFIC MAP ENGINE COMPONENT (Extracted logic)
// ==========================================
function MapEngine({ role }) {
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false); 
  const [drawnShapeData, setDrawnShapeData] = useState(null);
  const [viewPlot, setViewPlot] = useState(null); 
  
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [formData, setFormData] = useState({ plot_number: '', buyer_name: '', contact_number: '', managed_by: '', status: 'Available' });
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchPlots();
    setPlots(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handlePlotDrawn = (rectData) => {
    if (role !== 'admin') return;
    setDrawnShapeData(rectData);
    setShowModal(true); 
  };

  const handleAIInit = async () => {
    if (!drawnShapeData) return;
    setIsPredicting(true);
    const result = await predictPlotPrice({ x: drawnShapeData.x, y: drawnShapeData.y, width: drawnShapeData.width, height: drawnShapeData.height });
    setPredictionResult(result);
    setIsPredicting(false);
  };

  const handleSavePlot = async () => {
    if (!formData.plot_number) return alert("Plot Number is required!");
    setIsSaving(true);
    const x = drawnShapeData.x; const y = drawnShapeData.y;
    const w = Math.abs(drawnShapeData.width); const h = Math.abs(drawnShapeData.height);
    const polygonString = `[[${x},${y}], [${x+w},${y}], [${x+w},${y+h}], [${x},${y+h}]]`;

    const finalPayload = {
      plot_number: formData.plot_number, width_ft: predictionResult.width_ft, length_ft: predictionResult.length_ft,
      total_area_sqft: predictionResult.total_area_sqft, base_price: predictionResult.predicted_price,
      status: formData.status, buyer_name: formData.buyer_name || null, contact_number: formData.contact_number || null,
      managed_by: formData.managed_by || null, polygon_coordinates: polygonString
    };

    const res = await savePlotToDB(finalPayload);
    if (res) { await loadData(); handleCloseModal(); } 
    else { alert("Failed to save. Check terminal."); }
    setIsSaving(false);
  };

  const handleCloseModal = () => {
    setShowModal(false); setPredictionResult(null); setDrawnShapeData(null);
    setFormData({ plot_number: '', buyer_name: '', contact_number: '', managed_by: '', status: 'Available' });
  };

  return (
    <div className="flex-1 flex gap-6 overflow-hidden">
      {/* 75% Width Canvas */}
      <div className="flex-[3] relative h-full">
         <PlotCanvas existingPlots={plots} onPlotDrawn={handlePlotDrawn} onPlotClick={setViewPlot} role={role} />
      </div>

      {/* 25% Width Sidebar Records */}
      <div className="flex-[1] bg-neutral-900 border border-white/5 rounded-3xl p-6 flex flex-col h-full shadow-2xl">
        <div className="mb-6 pb-6 border-b border-white/5">
           <h2 className="text-xl font-medium tracking-tight mb-2">Registry Database</h2>
           <div className="flex items-center justify-between text-neutral-500 text-sm">
             <span>{plots.length} Mapped</span>
             <Search className="w-4 h-4" />
           </div>
        </div>
        
        {loading ? (
          <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin w-6 h-6 text-emerald-500" /></div>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-2 pb-10">
            {plots.map((plot) => (
              <div key={plot.id} onClick={() => setViewPlot(plot)} className="bg-black/50 border border-white/5 rounded-2xl p-4 hover:bg-neutral-800 cursor-pointer transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium tracking-wide text-sm">Plot {plot.plot_number}</span>
                  <div className={`w-2 h-2 rounded-full ${plot.status === 'Available' ? 'bg-green-500' : plot.status === 'Sold' ? 'bg-neutral-600' : 'bg-amber-500'}`}></div>
                </div>
                <div className="text-xs text-neutral-500 flex justify-between font-mono">
                  <span>{plot.total_area_sqft} sf</span>
                  <span className="text-emerald-500/70">₹{plot.base_price.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VIEW PLOT MODAL (Comprehensive Database Inspector) */}
      {viewPlot && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-neutral-950 border border-white/10 p-8 rounded-[2rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-300">
              <button onClick={() => setViewPlot(null)} className="absolute top-6 right-6 text-neutral-500 hover:text-white bg-white/5 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              
              <div className="mb-8 text-center mt-2">
                <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 border ${
                  viewPlot.status === 'Available' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                  viewPlot.status === 'Sold' ? 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20' : 
                  'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {viewPlot.status}
                </span>
                <h2 className="text-5xl font-medium text-white tracking-tighter">Plot {viewPlot.plot_number}</h2>
              </div>

              <div className="space-y-4">
                  {/* Physical Specifications */}
                  <div className="bg-black border border-white/5 p-5 rounded-2xl">
                      <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-4">Physical Specifications</h3>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <p className="text-xs text-neutral-500 mb-1">Total Area</p>
                              <p className="text-xl font-medium text-white">{viewPlot.total_area_sqft} <span className="text-sm text-neutral-600">sqft</span></p>
                          </div>
                          <div>
                              <p className="text-xs text-neutral-500 mb-1">Calculated Dimensions</p>
                              <p className="text-xl font-medium text-white">{viewPlot.width_ft}' × {viewPlot.length_ft}'</p>
                          </div>
                      </div>
                  </div>

                  {/* Registry & Financial Details */}
                  <div className="bg-black border border-white/5 p-5 rounded-2xl">
                      <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-4">Registry & Financials</h3>
                      <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                          <div>
                              <p className="text-xs text-neutral-500 mb-1">Base Valuation</p>
                              <p className="text-xl font-medium text-emerald-400">₹{viewPlot.base_price.toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                              <p className="text-xs text-neutral-500 mb-1">Managed By (Agent)</p>
                              <p className="text-sm font-medium text-white mt-1">
                                {viewPlot.managed_by || <span className="text-neutral-700 italic">Unassigned</span>}
                              </p>
                          </div>
                          
                          {/* Force display of Buyer/Contact fields even if empty/Available */}
                          <div className="col-span-2 border-t border-white/5 pt-5 mt-1">
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <p className="text-xs text-neutral-500 mb-1 flex items-center gap-1.5"><User className="w-3 h-3"/> Buyer Name</p>
                                      <p className="text-sm font-medium text-white mt-1">
                                        {viewPlot.buyer_name || <span className="text-neutral-700 italic">Not Registered</span>}
                                      </p>
                                  </div>
                                  <div>
                                      <p className="text-xs text-neutral-500 mb-1 flex items-center gap-1.5"><Phone className="w-3 h-3"/> Contact Phone</p>
                                      <p className="text-sm font-mono text-white mt-1 bg-white/5 inline-block px-2 py-0.5 rounded">
                                        {viewPlot.contact_number || <span className="text-neutral-700 italic">No Data</span>}
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* CREATE PLOT MODAL */}
      {showModal && drawnShapeData && role === 'admin' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-neutral-950 border border-white/10 p-8 rounded-[2rem] w-full max-w-4xl shadow-2xl flex flex-col md:flex-row gap-8 animate-in zoom-in-95 duration-300">
              <div className="flex-1 flex flex-col">
                  <h2 className="text-xl font-medium text-white mb-6 tracking-tight flex items-center gap-3">
                    <Command className="w-5 h-5 text-emerald-500" /> AI Prediction Engine
                  </h2>
                  {!predictionResult ? (
                      <div className="h-full flex flex-col justify-center bg-black rounded-3xl p-6 border border-white/5">
                        <p className="text-neutral-400 mb-6 font-light text-sm text-center">
                          Boundary locked. Initialize the spatial engine to calculate dimensions and valuation.
                        </p>
                        <button onClick={handleAIInit} disabled={isPredicting} className="w-full py-3.5 rounded-xl font-semibold bg-white text-black hover:scale-[1.02] transition-transform flex justify-center items-center gap-2">
                          {isPredicting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} 
                          {isPredicting ? 'Analyzing...' : 'Run Prediction'}
                        </button>
                      </div>
                  ) : (
                      <div className="space-y-4 flex-1">
                          <div className="bg-black p-6 rounded-2xl border border-white/5 flex flex-col justify-center">
                              <p className="text-[10px] text-neutral-500 mb-2 uppercase tracking-widest font-semibold">Dimensions</p>
                              <p className="text-3xl font-light text-white">{predictionResult.width_ft}' × {predictionResult.length_ft}'</p>
                          </div>
                          <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/20 flex flex-col justify-center">
                              <p className="text-[10px] text-emerald-500/70 mb-2 uppercase tracking-widest font-semibold">Predicted Valuation</p>
                              <p className="text-4xl font-medium text-emerald-400">₹{predictionResult.predicted_price.toLocaleString('en-IN')}</p>
                          </div>
                      </div>
                  )}
              </div>

              {predictionResult && (
                  <div className="flex-1 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-medium mb-6 tracking-tight text-white">Database Registry</h3>
                        <div className="space-y-4">
                            <div>
                                <input type="text" className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white focus:border-emerald-500 outline-none placeholder:text-neutral-700 font-medium text-sm" 
                                  value={formData.plot_number} onChange={e => setFormData({...formData, plot_number: e.target.value})} placeholder="Plot Number (Required)" required />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <select className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white focus:border-emerald-500 outline-none appearance-none text-sm"
                                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                      <option>Available</option><option>Booked</option><option>Sold</option>
                                </select>
                                <input type="text" className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white focus:border-emerald-500 outline-none placeholder:text-neutral-700 text-sm" 
                                    value={formData.managed_by} onChange={e => setFormData({...formData, managed_by: e.target.value})} placeholder="Agent Name" />
                            </div>
                            {formData.status !== 'Available' && (
                                <div className="space-y-3 animate-in slide-in-from-top-2 pt-3 border-t border-white/5 mt-2">
                                    <input type="text" className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white focus:border-emerald-500 outline-none placeholder:text-neutral-700 text-sm" 
                                      value={formData.buyer_name} onChange={e => setFormData({...formData, buyer_name: e.target.value})} placeholder="Buyer Full Name" />
                                    <input type="text" className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white focus:border-emerald-500 outline-none placeholder:text-neutral-700 font-mono text-sm" 
                                      value={formData.contact_number} onChange={e => setFormData({...formData, contact_number: e.target.value})} placeholder="Contact Phone" />
                                </div>
                            )}
                        </div>
                      </div>
                      <div className="mt-8 flex gap-3">
                          <button onClick={handleCloseModal} className="flex-1 py-3.5 rounded-xl font-medium bg-neutral-900 border border-white/10 text-white hover:bg-neutral-800 transition-colors text-sm">Cancel</button>
                          <button onClick={handleSavePlot} disabled={isSaving} className="flex-[2] py-3.5 rounded-xl font-bold bg-emerald-500 text-black hover:bg-emerald-400 transition-all flex justify-center items-center gap-2 text-sm">
                              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              {isSaving ? 'Saving...' : 'Commit Record'}
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