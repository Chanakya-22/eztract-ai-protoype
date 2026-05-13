"use client";
import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { fetchPlots, predictPlotPrice, savePlotToDB, fetchPricingInsight, fetchCompletionForecast, fetchSmartBundling, fetchBuyerPersona, updatePlotStatus, detectPlotsCV } from '../services/api';
import { 
  Loader2, PlusCircle, CheckCircle, X, User, Phone, ShieldCheck, ArrowRight, Lock, 
  Eye, EyeOff, Command, Layers, Cpu, Database, Map, LayoutDashboard, Settings, LogOut, 
  FileText, Search, TrendingUp, Clock, Users, Link, Info, TrendingDown, RotateCcw, Sparkles, Menu
} from 'lucide-react';

const PlotCanvas = dynamic(() => import('../components/PlotCanvas'), { ssr: false });

// ==========================================
// TOAST NOTIFICATION COMPONENT
// ==========================================
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl animate-in slide-in-from-right-8 fade-in duration-300 pointer-events-auto border bg-neutral-950/95 backdrop-blur-md ${
          toast.type === 'success' ? 'border-emerald-500/30' :
          toast.type === 'error' ? 'border-red-500/30' :
          'border-blue-500/30'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" /> : 
           toast.type === 'error' ? <X className="w-5 h-5 shrink-0 text-red-500" /> : 
           <Info className="w-5 h-5 shrink-0 text-blue-500" />}
          
          <p className="text-sm font-medium text-white">{toast.message}</p>
          
          <button onClick={() => removeToast(toast.id)} className="ml-4 text-neutral-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// ANIMATED COUNTER COMPONENT
// ==========================================
function AnimatedCounter({ value, isCurrency = false, duration = 2000 }) {
  const [count, setCount] = useState(0);
  const counterRef = useRef(null);

  useEffect(() => {
    let observer;
    let animationFrame;
    let startTime;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      
      const easeOut = 1 - Math.pow(1 - progress / duration, 3);
      const currentCount = Math.min(value * easeOut, value);
      
      setCount(currentCount);

      if (progress < duration) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };

    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        startTime = null;
        animationFrame = requestAnimationFrame(animate);
        observer.disconnect(); 
      }
    }, { threshold: 0.1 });

    if (counterRef.current) observer.observe(counterRef.current);

    return () => {
      if (observer) observer.disconnect();
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [value, duration]);

  return (
    <span ref={counterRef}>
      {isCurrency ? `₹${count.toFixed(1)}Cr` : Math.floor(count)}
    </span>
  );
}

export default function MasterApp() {
  const [currentView, setCurrentView] = useState('landing'); 
  const [role, setRole] = useState('user'); 
  const [showPassword, setShowPassword] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // TOAST STATE MANAGEMENT
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000); 
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  const [projects, setProjects] = useState([
    { id: 'proj_1', name: 'Kumaran Nagar Layout', location: 'Chennai, Tamil Nadu', totalArea: '4.2 Acres', status: 'Active', image: '/layout.jpg' },
    { id: 'proj_2', name: 'Green Valley Estates', location: 'Coimbatore, Tamil Nadu', totalArea: '12.5 Acres', status: 'Draft', image: null }
  ]);
  const [selectedProject, setSelectedProject] = useState(null);

  // ==========================================
  // GLOBAL CV UPLOAD & NEW PROJECT HANDLER
  // ==========================================
  const [isDetectingCV, setIsDetectingCV] = useState(false);
  const [initialCvQueue, setInitialCvQueue] = useState([]);

  const handleNewProjectUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsDetectingCV(true);
    addToast("Scanning blueprint with U-Net Computer Vision...", "info");

    const res = await detectPlotsCV(file);
    
    if (res && res.polygons) {
      if (res.polygons.length === 0) {
         addToast("No plots detected by the AI model.", "info");
      } else {
         const queue = res.polygons.map(poly => {
           const xs = poly.map(p => p[0]);
           const ys = poly.map(p => p[1]);
           return {
              x: Math.min(...xs),
              y: Math.min(...ys),
              width: Math.max(...xs) - Math.min(...xs),
              height: Math.max(...ys) - Math.min(...ys),
              originalPolygon: JSON.stringify(poly) 
           };
         });

         // 1. Create the new project wrapper
         const newProject = {
            id: 'proj_' + Date.now(),
            name: 'Auto-Detected CV Layout',
            location: 'Unassigned Location',
            totalArea: 'Calculating...',
            status: 'Active',
            image: null
         };

         // 2. Add it to our dashboard and switch to map view
         setProjects(prev => [...prev, newProject]);
         setSelectedProject(newProject);
         setInitialCvQueue(queue);
         setCurrentView('map');

         addToast(`Successfully extracted ${queue.length} plots! Initializing batch review...`, "success");
      }
    } else {
       addToast("Computer Vision pipeline failed. Check backend logs.", "error");
    }
    
    setIsDetectingCV(false);
    e.target.value = null; // reset input
  };

  // SCROLL REVEAL ANIMATION OBSERVER
  useEffect(() => {
    if (currentView !== 'landing') return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('opacity-0', 'translate-y-5');
          entry.target.classList.add('opacity-100', 'translate-y-0');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    setTimeout(() => {
      const elements = document.querySelectorAll('.reveal-on-scroll');
      elements.forEach(el => observer.observe(el));
    }, 100);

    return () => observer.disconnect();
  }, [currentView]);

  // WRAPPER FUNCTION TO RENDER CURRENT VIEW
  const renderContent = () => {
    if (currentView === 'landing') {
      return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden relative scroll-smooth flex flex-col">
          
          <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative z-50">
              
              <button onClick={() => { setCurrentView('landing'); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 hover:opacity-80 transition-opacity outline-none">
                <div className="bg-emerald-500 p-1.5 rounded-lg"><Command className="w-5 h-5 text-black" /></div>
                <span className="font-bold tracking-wide text-lg">EZTRACT</span>
              </button>

              <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400 absolute left-1/2 -translate-x-1/2">
                 <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
                 <a href="#ai-models" className="hover:text-white transition-colors">AI Models</a>
              </div>

              <div className="hidden md:flex items-center gap-6 text-sm font-medium">
                <button onClick={() => setCurrentView('login')} className="text-emerald-400 hover:text-emerald-300 transition-colors">Admin Gateway</button>
                <button onClick={() => { setRole('user'); setCurrentView('dashboard'); }} className="bg-white text-black px-5 py-2.5 rounded-full hover:scale-105 transition-transform font-semibold">
                  View Demo
                </button>
              </div>

              <button className="md:hidden p-2 -mr-2 text-neutral-400 hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            <div className={`md:hidden absolute top-16 left-0 w-full bg-neutral-950 border-b border-white/5 transition-all duration-300 ease-in-out overflow-hidden ${isMobileMenuOpen ? 'max-h-[400px] border-opacity-100 shadow-2xl' : 'max-h-0 border-opacity-0'}`}>
              <div className="flex flex-col px-6 py-4 space-y-2">
                <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="block py-3 text-neutral-300 hover:text-white font-medium text-lg">How It Works</a>
                <a href="#ai-models" onClick={() => setIsMobileMenuOpen(false)} className="block py-3 text-neutral-300 hover:text-white font-medium text-lg">AI Models</a>
                <div className="h-px bg-white/10 my-2"></div>
                <button onClick={() => { setIsMobileMenuOpen(false); setCurrentView('login'); }} className="text-left py-3 text-emerald-400 hover:text-emerald-300 font-medium text-lg">Admin Gateway</button>
                <button onClick={() => { setIsMobileMenuOpen(false); setRole('user'); setCurrentView('dashboard'); }} className="text-left py-3 text-white font-medium text-lg">View Demo</button>
              </div>
            </div>
          </nav>

          {isMobileMenuOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
          )}

          <section className="relative pt-40 pb-20 px-6 flex flex-col items-center text-center flex-1">
            <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.08)_0%,_transparent_50%)] pointer-events-none"></div>
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold tracking-widest uppercase mb-8 text-emerald-400 relative z-10 animate-in fade-in duration-1000">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Now in Beta · V2.0
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tighter max-w-5xl mb-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150 fill-mode-both">
              Intelligent spatial <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">layout digitization.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mb-12 font-light leading-relaxed relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
              Transform physical blueprints and raw land layouts into interactive, data-rich digital assets. EZTract calculates dimensions, predicts market valuations, and centralizes your registry.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 relative z-10 mb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 fill-mode-both">
              <button onClick={() => { setRole('user'); setCurrentView('dashboard'); }} className="px-8 py-4 rounded-full bg-white text-black font-semibold tracking-wide hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2">
                Launch Platform Workspace <ArrowRight className="w-4 h-4" />
              </button>
              <a href="https://github.com/Chanakya-22/eztract-ai-protoype" target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-full border border-white/10 text-white font-semibold tracking-wide hover:border-white/30 transition-colors flex items-center justify-center gap-2">
                View on GitHub <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div id="how-it-works" className="max-w-5xl w-full mx-auto relative z-10 scroll-mt-24">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-[2px] border-t-2 border-dashed border-white/10 z-0"></div>

                <div className="relative z-10 flex flex-col items-center text-center bg-black px-6 reveal-on-scroll opacity-0 translate-y-5 transition-all duration-700 ease-out" style={{ transitionDelay: '0ms' }}>
                  <div className="w-24 h-24 bg-neutral-950 border border-white/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                    <Map className="w-10 h-10 text-emerald-500" />
                  </div>
                  <div className="text-emerald-500 font-mono font-bold text-sm mb-2">01</div>
                  <h3 className="text-xl font-medium text-white mb-3">Draw</h3>
                  <p className="text-neutral-400 text-sm font-light leading-relaxed">Trace the physical boundaries of raw land directly on the interactive satellite layout.</p>
                </div>

                <div className="relative z-10 flex flex-col items-center text-center bg-black px-6 reveal-on-scroll opacity-0 translate-y-5 transition-all duration-700 ease-out" style={{ transitionDelay: '150ms' }}>
                  <div className="w-24 h-24 bg-neutral-950 border border-white/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                    <Cpu className="w-10 h-10 text-emerald-500" />
                  </div>
                  <div className="text-emerald-500 font-mono font-bold text-sm mb-2">02</div>
                  <h3 className="text-xl font-medium text-white mb-3">Predict</h3>
                  <p className="text-neutral-400 text-sm font-light leading-relaxed">The AI engine calculates precise square footage and predicts market valuation.</p>
                </div>

                <div className="relative z-10 flex flex-col items-center text-center bg-black px-6 reveal-on-scroll opacity-0 translate-y-5 transition-all duration-700 ease-out" style={{ transitionDelay: '300ms' }}>
                  <div className="w-24 h-24 bg-neutral-950 border border-white/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                    <Database className="w-10 h-10 text-emerald-500" />
                  </div>
                  <div className="text-emerald-500 font-mono font-bold text-sm mb-2">03</div>
                  <h3 className="text-xl font-medium text-white mb-3">Register</h3>
                  <p className="text-neutral-400 text-sm font-light leading-relaxed">Save exact coordinates and buyer details to the centralized cloud database.</p>
                </div>
              </div>

              <div id="ai-models" className="mt-40 mb-16 scroll-mt-24 text-left">
                <div className="text-center mb-16 reveal-on-scroll opacity-0 translate-y-5 transition-all duration-700 ease-out">
                  <h2 className="text-3xl md:text-5xl font-medium text-white mb-4 tracking-tight">Everything your sales team needs.</h2>
                  <p className="text-neutral-400 text-lg font-light">Four AI models. One unified platform.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-neutral-900/30 border border-white/5 border-t-emerald-500/30 rounded-3xl p-8 hover:-translate-y-1 hover:shadow-2xl hover:bg-neutral-900/50 transition-all duration-300 group reveal-on-scroll opacity-0 translate-y-5 ease-out" style={{ transitionDelay: '0ms', transitionDuration: '700ms' }}>
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/20">
                      <TrendingUp className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-3">Optimal Pricing Window</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed mb-6 font-light">Predicts the exact week and price point that maximizes sale probability, acting as a live moving average of your layout&apos;s current market velocity.</p>
                    <p className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">Live in dashboard <ArrowRight className="w-3 h-3" /></p>
                  </div>

                  <div className="bg-neutral-900/30 border border-white/5 border-t-blue-500/30 rounded-3xl p-8 hover:-translate-y-1 hover:shadow-2xl hover:bg-neutral-900/50 transition-all duration-300 group reveal-on-scroll opacity-0 translate-y-5 ease-out" style={{ transitionDelay: '150ms', transitionDuration: '700ms' }}>
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 border border-blue-500/20">
                      <Clock className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-3">Completion Forecasting</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed mb-6 font-light">Uses linear regression on historical booking velocity to accurately forecast your layout&apos;s 100% sell-out date and optimize discount structures.</p>
                    <p className="text-[10px] font-bold text-blue-500 tracking-widest uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">Live in dashboard <ArrowRight className="w-3 h-3" /></p>
                  </div>

                  <div className="bg-neutral-900/30 border border-white/5 border-t-purple-500/30 rounded-3xl p-8 hover:-translate-y-1 hover:shadow-2xl hover:bg-neutral-900/50 transition-all duration-300 group reveal-on-scroll opacity-0 translate-y-5 ease-out" style={{ transitionDelay: '300ms', transitionDuration: '700ms' }}>
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6 border border-purple-500/20">
                      <Link className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-3">Smart Plot Bundling</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed mb-6 font-light">A complex spatial adjacency engine that auto-clusters neighboring plots into high-ticket bundle deals, prioritizing premium commercial buyers.</p>
                    <p className="text-[10px] font-bold text-purple-500 tracking-widest uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">Live in dashboard <ArrowRight className="w-3 h-3" /></p>
                  </div>

                  <div className="bg-neutral-900/30 border border-white/5 border-t-cyan-500/30 rounded-3xl p-8 hover:-translate-y-1 hover:shadow-2xl hover:bg-neutral-900/50 transition-all duration-300 group reveal-on-scroll opacity-0 translate-y-5 ease-out" style={{ transitionDelay: '450ms', transitionDuration: '700ms' }}>
                    <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6 border border-cyan-500/20">
                      <Users className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-3">Buyer Profile Matcher</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed mb-6 font-light">Generative persona synthesis that cross-references plot dimensions against demographic data to automatically script targeted sales pitches per plot.</p>
                    <p className="text-[10px] font-bold text-cyan-500 tracking-widest uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">Live in dashboard <ArrowRight className="w-3 h-3" /></p>
                  </div>

                </div>
              </div>

              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 py-10 border-y border-white/5 bg-neutral-900/20 backdrop-blur-sm rounded-3xl reveal-on-scroll opacity-0 translate-y-5 transition-all duration-700 ease-out" style={{ transitionDelay: '150ms' }}>
                <div className="text-center">
                  <p className="text-5xl font-light text-white mb-2">
                    <AnimatedCounter value={36} />
                  </p>
                  <p className="text-xs uppercase tracking-widest text-emerald-500/80 font-bold">Plots Digitized</p>
                </div>
                <div className="text-center md:border-x border-white/5">
                  <p className="text-5xl font-light text-white mb-2">
                    <AnimatedCounter value={8.2} isCurrency={true} />
                  </p>
                  <p className="text-xs uppercase tracking-widest text-emerald-500/80 font-bold">Portfolio Tracked</p>
                </div>
                <div className="text-center">
                  <p className="text-5xl font-light text-white mb-2">
                    <AnimatedCounter value={4} />
                  </p>
                  <p className="text-xs uppercase tracking-widest text-emerald-500/80 font-bold">AI Models Active</p>
                </div>
              </div>

            </div>
          </section>

          <footer className="w-full bg-neutral-950 border-t border-white/5 py-12 px-6 mt-auto relative z-10">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 text-center md:text-left">
                
                <button onClick={() => setCurrentView('landing')} className="flex items-center gap-2 hover:opacity-80 transition-opacity outline-none">
                  <div className="bg-emerald-500 p-1.5 rounded-lg"><Command className="w-4 h-4 text-black" /></div>
                  <span className="font-bold tracking-wide text-lg text-white">EZTRACT</span>
                </button>
                
                <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-neutral-400 font-medium">
                  <a href="https://github.com/Chanakya-22/eztract-ai-protoype" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
                  <button onClick={() => setCurrentView('login')} className="hover:text-white transition-colors">Admin Gateway</button>
                  <button onClick={() => { setRole('user'); setCurrentView('dashboard'); }} className="hover:text-white transition-colors">Open Dashboard</button>
                </div>

              </div>
              
              <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-neutral-600 text-center md:text-left">
                <p>© 2025 EZTract. Built as a production prototype.</p>
                <p>FastAPI · Next.js · Supabase · Python AI</p>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    if (currentView === 'login') {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-white/10 p-12 rounded-[2rem] w-full max-w-md shadow-2xl relative">
            <button onClick={() => setCurrentView('landing')} className="absolute top-8 right-8 text-neutral-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            
            <div className="flex justify-center mb-8"><div className="bg-emerald-500/10 p-4 rounded-full"><Lock className="w-8 h-8 text-emerald-500" /></div></div>
            <h2 className="text-3xl font-medium text-center text-white mb-1 tracking-tight">Admin Gateway</h2>
            <p className="text-center text-neutral-600 text-sm mb-8">Restricted to authorized personnel only.</p>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const password = e.target.password.value;
              try {
                const response = await fetch('/api/admin/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ password })
                });
                if (response.ok) {
                  setRole('admin');
                  setCurrentView('dashboard');
                  addToast("Successfully authenticated as Admin.", "success");
                } else {
                  addToast("Incorrect Passkey. Access Denied.", "error");
                }
              } catch (error) {
                addToast("Login request failed. Check server connection.", "error");
              }
            }}>
              <div className="mb-8 relative mt-8">
                <input 
                  type={showPassword ? "text" : "password"} name="password" required
                  className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all pr-12 font-mono" 
                  placeholder="Passkey" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button type="submit" className="w-full bg-emerald-500 text-black font-bold py-4 rounded-2xl hover:bg-emerald-400 transition-colors">Access Workspace</button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <DashboardLayout role={role} currentView={currentView} onViewChange={setCurrentView} onLogout={() => setCurrentView('landing')}>
        {currentView === 'dashboard' && <ProjectsDashboard projects={projects} onSelectProject={(p) => { setSelectedProject(p); setCurrentView('map'); }} role={role} isDetectingCV={isDetectingCV} onNewProjectUpload={handleNewProjectUpload} />}
        {currentView === 'map' && selectedProject && <MapEngine role={role} project={selectedProject} onBack={() => { setCurrentView('dashboard'); setInitialCvQueue([]); }} addToast={addToast} initialCvQueue={initialCvQueue} />}
        {currentView === 'insights' && <InsightsDashboard role={role} />}
      </DashboardLayout>
    );
  };

  return (
    <>
      {renderContent()}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}

// ==========================================
// DASHBOARD LAYOUT
// ==========================================
function DashboardLayout({ children, role, currentView, onViewChange, onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = () => setIsSidebarOpen(false);

  const handleNav = (view) => {
    onViewChange(view);
    closeSidebar();
  };

  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden font-sans relative">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
          onClick={closeSidebar}
        ></div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-neutral-950 border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center px-8 border-b border-white/5 justify-between md:justify-start shrink-0">
          <button onClick={() => onViewChange('landing')} className="flex items-center hover:opacity-80 transition-opacity outline-none">
            <Command className="w-6 h-6 text-emerald-500 mr-3" />
            <span className="font-bold tracking-widest text-lg">EZTRACT</span>
          </button>
          <button onClick={closeSidebar} className="md:hidden text-neutral-500 hover:text-white outline-none">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4 ml-2">Workspace</p>
            <button onClick={() => handleNav('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium border transition-colors ${currentView === 'dashboard' || currentView === 'map' ? 'bg-neutral-900 text-white border-l-2 border-l-emerald-500 border-y-white/5 border-r-white/5 rounded-l-sm' : 'text-neutral-500 hover:text-white hover:bg-neutral-900/50 border-transparent'}`}>
              <LayoutDashboard className="w-5 h-5" /> Projects Layout
            </button>
            <button onClick={() => handleNav('insights')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium border transition-colors ${currentView === 'insights' ? 'bg-neutral-900 text-white border-l-2 border-l-emerald-500 border-y-white/5 border-r-white/5 rounded-l-sm' : 'text-neutral-500 hover:text-white hover:bg-neutral-900/50 border-transparent'}`}>
              <Cpu className="w-5 h-5" /> AI Revenue Insights
            </button>
          </div>

          <div className="h-px bg-white/5 my-6 mx-2"></div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4 ml-2">Account</p>
            
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl border border-white/5 mb-2">
               <span className="text-sm font-medium text-neutral-400">Role Access</span>
               <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md ${role === 'admin' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}`}>
                  {role === 'admin' ? 'Admin' : 'Guest'}
               </span>
            </div>

            <a href="https://github.com/Chanakya-22/eztract-ai-protoype#documentation" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium border border-transparent text-neutral-500 hover:text-white hover:bg-neutral-900/50 transition-colors">
              <FileText className="w-5 h-5" /> Documentation
            </a>
            
            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium border border-transparent text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors mt-2">
              <LogOut className="w-5 h-5" /> Sign Out
            </button>
          </div>

          <div className="mt-auto pt-8 pb-2 text-center">
             <p className="text-[10px] font-medium text-neutral-700 uppercase tracking-widest">v2.0 · Prototype</p>
          </div>

        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#050505] relative">
        <div className="md:hidden flex items-center p-4 border-b border-white/5 bg-neutral-950 shrink-0 gap-3 relative z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors outline-none">
            <Menu className="w-6 h-6" />
          </button>
          <button onClick={() => onViewChange('landing')} className="flex items-center gap-2 hover:opacity-80 transition-opacity outline-none">
            <Command className="w-5 h-5 text-emerald-500" />
            <span className="font-bold tracking-widest text-base">EZTRACT</span>
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}

function ProjectsDashboard({ projects, onSelectProject, role, isDetectingCV, onNewProjectUpload }) {
  const fileInputRef = useRef(null);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500 overflow-y-auto custom-scrollbar h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-medium text-white tracking-tight mb-2">Projects Overview</h1>
          <p className="text-neutral-400">Manage your digitized layouts and real estate developments.</p>
        </div>
        {role === 'admin' && (
          <div className="flex items-center gap-3">
             <input type="file" ref={fileInputRef} onChange={onNewProjectUpload} accept="image/*" className="hidden" />
             <button 
               onClick={() => fileInputRef.current?.click()} 
               disabled={isDetectingCV}
               className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-500/20 transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50"
             >
               {isDetectingCV ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
               {isDetectingCV ? 'Scanning Layout...' : 'New Layout Project (CV)'}
             </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
        {projects.map(proj => (
          <div key={proj.id} className="bg-neutral-900 border border-white/5 rounded-3xl overflow-hidden hover:border-emerald-500/30 transition-all group cursor-pointer"
            onClick={() => onSelectProject(proj)}>
            <div className="h-48 bg-neutral-950 relative border-b border-white/5 flex items-center justify-center overflow-hidden">
              {proj.image ? ( <img src={proj.image} alt={proj.name} className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-500" /> ) : ( <Map className="w-12 h-12 text-neutral-800" /> )}
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full border border-white/10 text-xs font-bold uppercase tracking-widest text-emerald-400">{proj.status}</div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-medium text-white mb-2">{proj.name}</h3>
              <p className="text-neutral-500 text-sm flex items-center gap-2 mb-1"><Map className="w-4 h-4"/> {proj.location}</p>
              <p className="text-neutral-500 text-sm flex items-center gap-2 mb-6"><Layers className="w-4 h-4"/> {proj.totalArea}</p>
              <div className="flex items-center text-emerald-500 text-sm font-medium group-hover:translate-x-2 transition-transform">Open Workspace <ArrowRight className="w-4 h-4 ml-2" /></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightsDashboard({ role }) {
  // Feature 1 State
  const [pricingInsight, setPricingInsight] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [targetPlot, setTargetPlot] = useState("");

  // Feature 2 State
  const [forecastInsight, setForecastInsight] = useState(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  // Feature 3 State
  const [bundlingInsight, setBundlingInsight] = useState(null);
  const [loadingBundling, setLoadingBundling] = useState(false);

  // Feature 4 State
  const [personaInsight, setPersonaInsight] = useState(null);
  const [loadingPersona, setLoadingPersona] = useState(false);
  const [personaPlot, setPersonaPlot] = useState("");

  const handleRunPricing = async () => {
    if (!targetPlot) return;
    setLoadingPricing(true);
    const data = await fetchPricingInsight(targetPlot);
    setPricingInsight(data);
    setLoadingPricing(false);
  };

  const handleRunForecast = async () => {
    setLoadingForecast(true);
    const data = await fetchCompletionForecast();
    setForecastInsight(data);
    setLoadingForecast(false);
  };

  const handleRunBundling = async () => {
    setLoadingBundling(true);
    const data = await fetchSmartBundling();
    setBundlingInsight(data);
    setLoadingBundling(false);
  };

  const handleRunPersona = async () => {
    if (!personaPlot) return;
    setLoadingPersona(true);
    const data = await fetchBuyerPersona(personaPlot);
    setPersonaInsight(data);
    setLoadingPersona(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500 overflow-y-auto h-full custom-scrollbar">
      <div className="mb-10">
        <h1 className="text-3xl font-medium text-white tracking-tight mb-2 flex items-center gap-3">
           <Cpu className="w-8 h-8 text-emerald-500" /> Executive AI Insights
        </h1>
        <p className="text-neutral-400">Advanced algorithmic predictions and revenue intelligence based on your spatial data.</p>
      </div>

      {role !== 'admin' && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mb-8 flex items-center gap-3 text-amber-400 text-sm">
          <ShieldCheck className="w-5 h-5" /> 
          You are viewing sample data. Connect as an Administrator to run the Python inference engine on live data.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        {/* Feature 1: Optimal Pricing Window */}
        <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><TrendingUp className="w-32 h-32" /></div>
          
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="text-lg font-medium text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Optimal Pricing Window</h3>
            <div className="flex items-center gap-3">
               {pricingInsight && (
                  <button onClick={() => setPricingInsight(null)} className="text-neutral-500 hover:text-white transition-colors" title="Clear Model">
                    <RotateCcw className="w-4 h-4" />
                  </button>
               )}
               <div className="flex items-center gap-2 bg-black border border-white/10 rounded-lg pr-1 overflow-hidden focus-within:border-emerald-500 transition-colors">
                 <span className="text-xs text-neutral-500 pl-3 uppercase tracking-widest font-semibold">Plot</span>
                 <input 
                   type="text" 
                   value={targetPlot} 
                   onChange={(e) => setTargetPlot(e.target.value)} 
                   className="bg-transparent py-1.5 w-12 text-white text-sm outline-none text-center font-mono" 
                   placeholder="#" 
                 />
               </div>
            </div>
          </div>

          <div className="flex-1 relative z-10 mb-6 flex flex-col justify-center">
             {loadingPricing ? (
               <div className="flex h-full min-h-[150px] items-center justify-center text-emerald-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
             ) : pricingInsight ? (
               <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col h-full justify-between">
                 <div className="flex items-end justify-between mb-6">
                    <div>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-1">Target: Plot {pricingInsight.plot_number}</p>
                      <p className="text-4xl font-light text-white tracking-tight">₹{(pricingInsight.optimal_price / 100000).toFixed(1)}<span className="text-xl text-emerald-500 font-medium ml-1">Lakh</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-1">Sale Window</p>
                      <p className="text-2xl font-medium text-emerald-400">{pricingInsight.timeframe_weeks} <span className="text-sm font-light text-emerald-500/70">Wks</span></p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="bg-black/60 p-4 rounded-xl border border-white/5">
                       <div className="flex justify-between text-sm mb-2">
                         <span className="text-neutral-300 font-medium">Probability of Sale</span>
                         <span className="text-emerald-400 font-bold">{pricingInsight.probability_optimal}%</span>
                       </div>
                       <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pricingInsight.probability_optimal}%` }}></div>
                       </div>
                    </div>

                    <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl flex gap-3 items-start">
                       <div className="bg-red-500/20 p-1.5 rounded-md mt-0.5"><TrendingDown className="w-4 h-4 text-red-400" /></div>
                       <div>
                         <p className="text-sm text-white font-medium mb-1">Overpricing Penalty Alert</p>
                         <p className="text-xs text-neutral-400 leading-relaxed">Pricing above <span className="text-red-400 font-mono">₹{(pricingInsight.drop_price_threshold / 100000).toFixed(1)}L</span> will crash the sale probability to <strong className="text-white">{pricingInsight.probability_drop}%</strong> due to current market velocity.</p>
                       </div>
                    </div>
                 </div>
               </div>
             ) : (
                <div className="bg-black/50 p-6 rounded-2xl border border-white/5 h-full flex flex-col justify-center">
                  <h4 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> How this model works</h4>
                  <p className="text-sm text-neutral-400 leading-relaxed font-light">
                    Calculates a live moving average of your layout&apos;s current price-per-square-foot. It then applies spatial velocity modifiers (smaller plots sell significantly faster) to predict the exact window of time a specific plot will take to sell, and calculates hard price-drop thresholds.
                  </p>
                </div>
             )}
          </div>
          
          {role === 'admin' && (
            <button 
              onClick={handleRunPricing} 
              disabled={loadingPricing || !targetPlot} 
              className="w-full py-3.5 bg-white text-black hover:bg-neutral-200 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:hover:bg-white"
            >
              {loadingPricing ? 'Calculating Model...' : 'Run Live Inference'}
            </button>
          )}
        </div>

        {/* Feature 2: Completion Forecasting */}
        <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Clock className="w-32 h-32" /></div>
          
          <div className="flex justify-between items-center mb-6 relative z-10">
             <h3 className="text-lg font-medium text-white flex items-center gap-2"><Clock className="w-5 h-5 text-blue-400" /> Completion Forecasting</h3>
             {forecastInsight && (
                <button onClick={() => setForecastInsight(null)} className="text-neutral-500 hover:text-white transition-colors" title="Clear Model">
                  <RotateCcw className="w-4 h-4" />
                </button>
             )}
          </div>
          
          <div className="flex-1 relative z-10 mb-6 flex flex-col justify-center">
            {loadingForecast ? (
                <div className="flex h-full min-h-[150px] items-center justify-center text-blue-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : forecastInsight ? (
                <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col h-full justify-between space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-black/50 p-5 rounded-2xl border border-white/5 text-center">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-semibold">Proj. Sell-Out</p>
                        <p className="text-3xl font-light text-white">{forecastInsight.projected_sellout_date}</p>
                     </div>
                     <div className="bg-black/50 p-5 rounded-2xl border border-white/5 text-center">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-semibold">Live Velocity</p>
                        <p className="text-3xl font-light text-blue-400">{forecastInsight.current_velocity} <span className="text-sm font-medium text-blue-500/50">/mo</span></p>
                     </div>
                  </div>
                  
                  <div className="bg-blue-500/5 border border-blue-500/10 p-5 rounded-xl">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Clock className="w-3 h-3" /> Predictive Strategy</p>
                      <p className="text-sm text-neutral-300 leading-relaxed font-light">{forecastInsight.ai_suggestion}</p>
                  </div>
                </div>
            ) : (
                <div className="bg-black/50 p-6 rounded-2xl border border-white/5 h-full flex flex-col justify-center">
                  <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> How this model works</h4>
                  <p className="text-sm text-neutral-400 font-light leading-relaxed">
                      Uses a linear regression algorithm on historical &apos;Sold&apos; and &apos;Booked&apos; statuses against the layout&apos;s active timeline to calculate market velocity. It then projects the exact month the entire layout will reach 100% capacity and offers strategic discount modeling.
                  </p>
                </div>
            )}
          </div>

          {role === 'admin' && (
            <button 
              onClick={handleRunForecast} 
              disabled={loadingForecast} 
              className="w-full py-3.5 bg-white text-black hover:bg-neutral-200 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:hover:bg-white"
            >
              {loadingForecast ? 'Running Regression...' : 'Run Layout Analysis'}
            </button>
          )}
        </div>

        {/* Feature 3: Smart Plot Bundling */}
        <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Link className="w-32 h-32" /></div>
          
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="text-lg font-medium text-white flex items-center gap-2"><Link className="w-5 h-5 text-purple-400" /> Smart Plot Bundling</h3>
            {bundlingInsight && (
                <button onClick={() => setBundlingInsight(null)} className="text-neutral-500 hover:text-white transition-colors" title="Clear Model">
                  <RotateCcw className="w-4 h-4" />
                </button>
            )}
          </div>

          <div className="flex-1 relative z-10 mb-6 flex flex-col justify-center">
             {loadingBundling ? (
                 <div className="flex h-full min-h-[150px] items-center justify-center text-purple-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
             ) : bundlingInsight ? (
                 <div className="animate-in fade-in zoom-in-95 duration-500">
                    <p className="text-xs text-neutral-400 font-light leading-relaxed mb-6 bg-black/30 p-3 rounded-lg border border-white/5">
                        {bundlingInsight.insight_message}
                    </p>
                    {bundlingInsight.bundles.length > 0 ? (
                        <div className="space-y-3">
                           {bundlingInsight.bundles.map((bundle, idx) => (
                             <div key={idx} className="flex items-center justify-between bg-black/60 p-4 rounded-xl border border-white/5 hover:border-purple-500/30 transition-colors">
                                <div>
                                   <p className="text-sm text-white font-medium">{bundle.bundle_name}</p>
                                   <p className="text-xs text-neutral-500 mt-0.5">Total Area: {bundle.total_area} sqft</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-purple-400 font-bold tracking-wide">₹{(bundle.bundled_price / 100000).toFixed(1)}L</p>
                                   <p className={`text-[9px] uppercase tracking-widest mt-1 ${bundle.viability === 'Highly Viable' ? 'text-green-500' : 'text-purple-400/70'}`}>
                                      {bundle.viability}
                                   </p>
                                </div>
                             </div>
                           ))}
                        </div>
                    ) : (
                        <p className="text-sm text-neutral-500 text-center py-6">No adjacent available plots found.</p>
                    )}
                 </div>
             ) : (
                 <div className="bg-black/50 p-6 rounded-2xl border border-white/5 h-full flex flex-col justify-center">
                    <h4 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> How this model works</h4>
                    <p className="text-sm text-neutral-400 font-light leading-relaxed">
                        A spatial algorithm that parses the live geometric JSON coordinates of your layout map. It calculates the centroid distance between all &apos;Available&apos; plots to identify physical adjacency, and automatically clusters them to suggest high-ticket bulk deals.
                    </p>
                 </div>
             )}
          </div>

          {role === 'admin' && (
            <button 
              onClick={handleRunBundling} 
              disabled={loadingBundling} 
              className="w-full py-3.5 bg-white text-black hover:bg-neutral-200 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:hover:bg-white"
            >
              {loadingBundling ? 'Scanning Geometry...' : 'Run Spatial Analysis'}
            </button>
          )}
        </div>

        {/* Feature 4: Buyer Profile Matcher */}
        <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Users className="w-32 h-32" /></div>
          
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="text-lg font-medium text-white flex items-center gap-2"><Users className="w-5 h-5 text-cyan-400" /> Buyer Profile Matcher</h3>
            <div className="flex items-center gap-3">
               {personaInsight && (
                  <button onClick={() => setPersonaInsight(null)} className="text-neutral-500 hover:text-white transition-colors" title="Clear Model">
                    <RotateCcw className="w-4 h-4" />
                  </button>
               )}
               <div className="flex items-center gap-2 bg-black border border-white/10 rounded-lg pr-1 overflow-hidden focus-within:border-cyan-500 transition-colors">
                 <span className="text-xs text-neutral-500 pl-3 uppercase tracking-widest font-semibold">Plot</span>
                 <input 
                   type="text" 
                   value={personaPlot} 
                   onChange={(e) => setPersonaPlot(e.target.value)} 
                   className="bg-transparent py-1.5 w-12 text-white text-sm outline-none text-center font-mono" 
                   placeholder="#" 
                 />
               </div>
            </div>
          </div>

          <div className="flex-1 relative z-10 mb-6 flex flex-col justify-center">
             {loadingPersona ? (
                 <div className="flex h-full min-h-[150px] items-center justify-center text-cyan-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
             ) : personaInsight ? (
                 <div className="animate-in fade-in zoom-in-95 duration-500">
                    <div className="bg-cyan-500/5 border border-cyan-500/10 p-5 rounded-2xl mb-4">
                       <p className="text-[10px] text-cyan-500 uppercase tracking-widest mb-3 font-bold flex items-center gap-2">
                         <Sparkles className="w-3 h-3" /> Target Persona: {personaInsight.persona_name}
                       </p>
                       <p className="text-sm text-neutral-300 leading-relaxed font-light mb-4">
                         <strong className="text-white font-medium">Demographic:</strong> {personaInsight.target_demographic}
                       </p>
                       <p className="text-sm text-neutral-300 leading-relaxed font-light border-t border-white/10 pt-4">
                         <strong className="text-white font-medium">Recommended Pitch:</strong> {personaInsight.recommended_pitch}
                       </p>
                    </div>
                 </div>
             ) : (
                 <div className="bg-black/50 p-6 rounded-2xl border border-white/5 h-full flex flex-col justify-center">
                    <h4 className="text-sm font-medium text-cyan-400 mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> How this model works</h4>
                    <p className="text-sm text-neutral-400 font-light leading-relaxed">
                        A heuristic generative engine that cross-references plot dimensions and pricing against demographic data to synthesize a highly targeted buyer persona and actionable sales pitch for your agents.
                    </p>
                 </div>
             )}
          </div>

          {role === 'admin' && (
            <button 
              onClick={handleRunPersona} 
              disabled={loadingPersona || !personaPlot} 
              className="w-full py-3.5 bg-white text-black hover:bg-neutral-200 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:hover:bg-white"
            >
              {loadingPersona ? 'Generating Persona...' : 'Generate New Pitch via GenAI'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ==========================================
// MAP ENGINE COMPONENT
// ==========================================
function MapEngine({ role, project, onBack, addToast, initialCvQueue = [] }) {
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false); 
  const [drawnShapeData, setDrawnShapeData] = useState(null);
  const [viewPlot, setViewPlot] = useState(null); 
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [formData, setFormData] = useState({ plot_number: '', buyer_name: '', contact_number: '', managed_by: '', status: 'Available' });
  const [isSaving, setIsSaving] = useState(false);

  // SEARCH AND FILTER STATE
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // PLOT STATUS EDIT STATE
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [editStatusValue, setEditStatusValue] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // COMPUTER VISION QUEUE
  const [cvQueue, setCvQueue] = useState([]);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchPlots();
    setPlots(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Check if MapEngine was loaded with a new CV Queue
  useEffect(() => {
    if (initialCvQueue && initialCvQueue.length > 0) {
       setCvQueue(initialCvQueue);
       setDrawnShapeData(initialCvQueue[0]);
       setShowModal(true);
    }
  }, [initialCvQueue]);

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
    if (!formData.plot_number) return addToast("Plot Number is required!", "error");
    
    setIsSaving(true);
    const x = drawnShapeData.x; const y = drawnShapeData.y;
    const w = Math.abs(drawnShapeData.width); const h = Math.abs(drawnShapeData.height);
    
    const polygonString = drawnShapeData.originalPolygon || `[[${x},${y}], [${x+w},${y}], [${x+w},${y+h}], [${x},${y+h}]]`;
    
    const finalPayload = {
      plot_number: formData.plot_number, width_ft: predictionResult.width_ft, length_ft: predictionResult.length_ft,
      total_area_sqft: predictionResult.total_area_sqft, base_price: predictionResult.predicted_price,
      status: formData.status, buyer_name: formData.buyer_name || null, contact_number: formData.contact_number || null,
      managed_by: formData.managed_by || null, polygon_coordinates: polygonString
    };
    
    const res = await savePlotToDB(finalPayload);
    
    if (res) { 
      await loadData(); 
      addToast(`Plot ${formData.plot_number} successfully registered!`, "success");
      
      if (cvQueue.length > 1) {
         const nextQueue = cvQueue.slice(1);
         setCvQueue(nextQueue);
         setDrawnShapeData(nextQueue[0]);
         setPredictionResult(null);
         setFormData({ plot_number: '', buyer_name: '', contact_number: '', managed_by: '', status: 'Available' });
      } else {
         handleCloseModal(); 
      }
    } 
    else { 
      addToast("Failed to save plot. Please check server connection.", "error"); 
    }
    setIsSaving(false);
  };

  const handleSkipCVPlot = () => {
    if (cvQueue.length > 1) {
       const nextQueue = cvQueue.slice(1);
       setCvQueue(nextQueue);
       setDrawnShapeData(nextQueue[0]);
       setPredictionResult(null);
       setFormData({ plot_number: '', buyer_name: '', contact_number: '', managed_by: '', status: 'Available' });
    } else {
       handleCloseModal();
    }
  };

  const handleUpdateStatus = async () => {
    setIsUpdatingStatus(true);
    const res = await updatePlotStatus(viewPlot.id, editStatusValue);
    if (res) {
      addToast(`Plot ${viewPlot.plot_number} status updated to ${editStatusValue}`, "success");
      setViewPlot({ ...viewPlot, status: editStatusValue });
      setIsEditingStatus(false);
      loadData(); 
    } else {
      addToast("Failed to update plot status.", "error");
    }
    setIsUpdatingStatus(false);
  };

  const handleCloseModal = () => {
    setShowModal(false); setPredictionResult(null); setDrawnShapeData(null);
    setFormData({ plot_number: '', buyer_name: '', contact_number: '', managed_by: '', status: 'Available' });
    setCvQueue([]);
  };

  // CALCULATE STATS
  const totalPlots = plots.length;
  const availablePlots = plots.filter(p => p.status === 'Available').length;
  const bookedPlots = plots.filter(p => p.status === 'Booked').length;
  const soldPlots = plots.filter(p => p.status === 'Sold').length;
  const totalValueLakhs = (plots.reduce((sum, p) => sum + (p.base_price || 0), 0) / 100000).toFixed(2);

  // APPLY SEARCH AND FILTER
  const filteredPlots = plots.filter(plot => {
    const matchesSearch = plot.plot_number.toString().toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || plot.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      
      {/* STATS BAR */}
      <div className="shrink-0 pt-6 px-6 animate-in fade-in slide-in-from-top-4 duration-500 hidden md:block">
         <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            
            <div className="bg-neutral-900/40 border border-white/5 rounded-xl p-4 flex flex-col border-l-4 border-l-white/20">
               <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Total Plots</span>
               <span className="text-2xl font-light text-white mt-1">{totalPlots}</span>
            </div>

            <div className="bg-neutral-900/40 border border-white/5 rounded-xl p-4 flex flex-col border-l-4 border-l-emerald-500">
               <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Available
               </span>
               <span className="text-2xl font-light text-white mt-1">{availablePlots}</span>
            </div>

            <div className="bg-neutral-900/40 border border-white/5 rounded-xl p-4 flex flex-col border-l-4 border-l-amber-500">
               <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-amber-500"></div> Booked
               </span>
               <span className="text-2xl font-light text-white mt-1">{bookedPlots}</span>
            </div>

            <div className="bg-neutral-900/40 border border-white/5 rounded-xl p-4 flex flex-col border-l-4 border-l-red-500/50">
               <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-red-500/50"></div> Sold
               </span>
               <span className="text-2xl font-light text-white mt-1">{soldPlots}</span>
            </div>

            <div className="bg-neutral-900/40 border border-white/5 rounded-xl p-4 flex flex-col border-l-4 border-l-emerald-500">
               <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Portfolio Value</span>
               <span className="text-2xl font-light text-white mt-1">₹{totalValueLakhs}<span className="text-sm text-neutral-500 ml-1">Lakhs</span></span>
            </div>

         </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden p-6">
        <div className="flex-[3] relative h-[50vh] lg:h-full flex flex-col shrink-0 lg:shrink">
           <div className="flex items-center gap-4 mb-4">
             <button onClick={onBack} className="text-neutral-500 hover:text-white transition-colors bg-neutral-900 p-2 rounded-lg border border-white/5">
               <ArrowRight className="w-5 h-5 rotate-180" />
             </button>
             <div>
               <h2 className="text-2xl font-medium text-white tracking-tight">{project.name}</h2>
               <p className="text-neutral-500 text-xs uppercase tracking-widest mt-1">Layout Mapping Interface</p>
             </div>
           </div>
           <PlotCanvas existingPlots={plots} onPlotDrawn={handlePlotDrawn} onPlotClick={setViewPlot} role={role} />
        </div>

        <div className="flex-[1] bg-neutral-900 border border-white/5 rounded-3xl p-6 flex flex-col h-[400px] lg:h-full shadow-2xl shrink-0 lg:shrink mt-6 lg:mt-0">
          
          {/* SEARCH AND FILTER HEADER */}
          <div className="mb-6 pb-6 border-b border-white/5 space-y-4 shrink-0">
             <div>
               <h2 className="text-xl font-medium tracking-tight mb-2">Registry Database</h2>
               <p className="text-xs text-neutral-500">Showing {filteredPlots.length} of {plots.length} plots</p>
             </div>
             <div className="flex gap-2">
               <div className="flex-1 relative">
                 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                 <input 
                   type="text" 
                   placeholder="Search plot #" 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                 />
               </div>
               <select 
                 value={statusFilter}
                 onChange={(e) => setStatusFilter(e.target.value)}
                 className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none appearance-none cursor-pointer"
               >
                 <option value="All">All</option>
                 <option value="Available">Available</option>
                 <option value="Booked">Booked</option>
                 <option value="Sold">Sold</option>
               </select>
             </div>
          </div>

          {/* SKELETON LOADERS */}
          {loading ? ( 
            <div className="space-y-3 overflow-y-auto pr-2 pb-10 custom-scrollbar flex-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-black/50 border border-white/5 rounded-2xl p-4 animate-pulse">
                  <div className="flex justify-between items-center mb-2">
                    <div className="h-5 w-20 bg-neutral-800 rounded"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-neutral-800"></div>
                  </div>
                  <div className="text-xs text-neutral-500 flex justify-between font-mono mt-3">
                    <div className="h-4 w-12 bg-neutral-800 rounded"></div>
                    <div className="h-4 w-20 bg-neutral-800 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-2 pb-10 custom-scrollbar flex-1">
              {filteredPlots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-neutral-500">No plots match your criteria.</p>
                </div>
              ) : (
                filteredPlots.map((plot) => (
                  <div key={plot.id} onClick={() => setViewPlot(plot)} className="bg-black/50 border border-white/5 rounded-2xl p-4 hover:bg-neutral-800 cursor-pointer transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium tracking-wide text-sm">Plot {plot.plot_number}</span>
                      <div className={`w-2.5 h-2.5 rounded-full ${plot.status === 'Available' ? 'bg-emerald-500' : plot.status === 'Sold' ? 'bg-red-500/50' : 'bg-amber-500'}`}></div>
                    </div>
                    <div className="text-xs text-neutral-500 flex justify-between font-mono">
                      <span>{plot.total_area_sqft} sf</span>
                      <span className="text-emerald-500/70">₹{plot.base_price.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* VIEW PLOT MODAL WITH EDIT STATUS */}
      {viewPlot && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-neutral-950 border border-white/10 p-8 rounded-[2rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-300">
              <button onClick={() => { setViewPlot(null); setIsEditingStatus(false); }} className="absolute top-6 right-6 text-neutral-500 hover:text-white bg-white/5 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center mb-8 mt-2">
                {!isEditingStatus ? (
                  <div className="flex items-center gap-3 mb-6">
                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      viewPlot.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                      viewPlot.status === 'Sold' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        viewPlot.status === 'Available' ? 'bg-emerald-500 animate-pulse' : 
                        viewPlot.status === 'Sold' ? 'bg-red-500/50' : 'bg-amber-500'
                      }`}></span>
                      {viewPlot.status}
                    </span>
                    {role === 'admin' && (
                      <button onClick={() => { setIsEditingStatus(true); setEditStatusValue(viewPlot.status); }} className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 hover:text-white transition-colors border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/5">
                        Edit Status
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-6 animate-in fade-in zoom-in-95 duration-200">
                    <select 
                      value={editStatusValue} 
                      onChange={e => setEditStatusValue(e.target.value)}
                      className="bg-black border border-white/10 rounded-full px-4 py-1.5 text-xs text-white focus:border-emerald-500 outline-none appearance-none cursor-pointer uppercase tracking-widest font-bold"
                    >
                      <option value="Available">Available</option>
                      <option value="Booked">Booked</option>
                      <option value="Sold">Sold</option>
                    </select>
                    <button onClick={handleUpdateStatus} disabled={isUpdatingStatus} className="bg-emerald-500 text-black px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-emerald-400 transition-colors flex items-center gap-2">
                      {isUpdatingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                    </button>
                    <button onClick={() => setIsEditingStatus(false)} disabled={isUpdatingStatus} className="text-neutral-500 hover:text-white transition-colors p-1.5 bg-white/5 rounded-full">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                
                <h2 className="text-5xl font-medium text-white tracking-tighter">Plot {viewPlot.plot_number}</h2>
              </div>

              <div className="space-y-4">
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

      {/* CREATE PLOT MODAL / BATCH REVIEW */}
      {showModal && drawnShapeData && role === 'admin' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-neutral-950 border border-white/10 p-8 rounded-[2rem] w-full max-w-4xl shadow-2xl flex flex-col md:flex-row gap-8 animate-in zoom-in-95 duration-300">
              <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-medium text-white tracking-tight flex items-center gap-3">
                      <Command className="w-5 h-5 text-emerald-500" /> AI Prediction Engine
                    </h2>
                    {cvQueue.length > 0 && (
                      <div className="text-[10px] bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-full border border-purple-500/20 font-bold tracking-widest uppercase">
                        CV Batch Review: {cvQueue.length} left
                      </div>
                    )}
                  </div>

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
                          {cvQueue.length > 0 && (
                            <button onClick={handleSkipCVPlot} className="flex-[0.8] py-3.5 rounded-xl font-medium bg-neutral-900 border border-white/10 text-neutral-400 hover:text-white transition-colors text-sm">
                              Skip Plot
                            </button>
                          )}
                          <button onClick={handleCloseModal} className="flex-1 py-3.5 rounded-xl font-medium bg-neutral-900 border border-white/10 text-white hover:bg-neutral-800 transition-colors text-sm">
                            Cancel {cvQueue.length > 0 ? 'Batch' : ''}
                          </button>
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