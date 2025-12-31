
import React, { useState, useEffect, useCallback } from 'react';
import CameraFeed from './components/CameraFeed';
import IdentityCard from './components/IdentityCard';
import { Identity, CameraStatus, ProcessingState } from './types';
import { refineIdentity } from './services/geminiService';

const INITIAL_IDENTITIES: Identity[] = [
  { 
    id: '1', 
    name: 'Executive Professional', 
    imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400&h=400', 
    embeddingStatus: 'ready' 
  },
  { 
    id: '2', 
    name: 'Creative Director', 
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400&h=400', 
    embeddingStatus: 'ready' 
  },
];

const App: React.FC = () => {
  const [identities, setIdentities] = useState<Identity[]>(INITIAL_IDENTITIES);
  const [activeIdentityId, setActiveIdentityId] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>(CameraStatus.INACTIVE);
  const [processing, setProcessing] = useState<ProcessingState>({
    isFaceDetected: false,
    isCalibrated: false,
    isVirtualCamOutputActive: false,
    framerate: 0
  });
  const [isUploading, setIsUploading] = useState(false);

  // Simulation of face tracking loop
  useEffect(() => {
    if (cameraStatus === CameraStatus.ACTIVE || cameraStatus === CameraStatus.SWAPPING) {
      const interval = setInterval(() => {
        setProcessing(prev => ({
          ...prev,
          isFaceDetected: true, // Maintain detection for demo smoothness
          framerate: 28 + Math.floor(Math.random() * 4)
        }));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [cameraStatus]);

  const toggleCamera = () => {
    setCameraStatus(prev => prev === CameraStatus.INACTIVE ? CameraStatus.ACTIVE : CameraStatus.INACTIVE);
  };

  const toggleSwap = () => {
    if (cameraStatus === CameraStatus.INACTIVE) return;
    setCameraStatus(prev => prev === CameraStatus.SWAPPING ? CameraStatus.ACTIVE : CameraStatus.SWAPPING);
  };

  const handleIdentitySelect = (id: string) => {
    setActiveIdentityId(id === activeIdentityId ? null : id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      const base64 = base64Data.split(',')[1];
      const newIdentity: Identity = {
        id: Date.now().toString(),
        name: file.name.split('.')[0],
        imageUrl: base64Data,
        embeddingStatus: 'processing'
      };

      setIdentities(prev => [...prev, newIdentity]);
      
      // AI Backend extraction simulation
      await refineIdentity(base64, "Map facial features for real-time overlay.");

      setIdentities(prev => prev.map(idty => 
        idty.id === newIdentity.id ? { ...idty, embeddingStatus: 'ready' } : idty
      ));
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const deleteIdentity = (id: string) => {
    setIdentities(prev => prev.filter(i => i.id !== id));
    if (activeIdentityId === id) setActiveIdentityId(null);
  };

  const activeIdentity = identities.find(i => i.id === activeIdentityId);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100">
      {/* Sidebar - Controls */}
      <aside className="w-80 glass-panel border-r border-slate-800 flex flex-col z-30">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center pulse-orange">
              <i className="fa-solid fa-microchip text-slate-950 text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">SASA<span className="text-orange-500">CAM</span></h1>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Identity Engine</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Identity Library</h2>
              <label className="cursor-pointer">
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                <div className={`flex items-center space-x-1 text-[10px] font-bold text-orange-500 hover:text-orange-400 transition-colors ${isUploading ? 'animate-pulse opacity-50' : ''}`}>
                  <i className="fa-solid fa-plus-circle"></i>
                  <span>{isUploading ? 'EXTRACTING...' : 'ADD FACE'}</span>
                </div>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {identities.map(identity => (
                <IdentityCard 
                  key={identity.id}
                  identity={identity}
                  isActive={activeIdentityId === identity.id}
                  onSelect={handleIdentitySelect}
                  onDelete={deleteIdentity}
                />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Processing Logic</h2>
            <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Smoothing (GFPGAN)</span>
                <span className="text-orange-500 font-mono">0.85</span>
              </div>
              <input type="range" className="w-full accent-orange-500" defaultValue="85" />
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Lighting Match</span>
                <span className="text-orange-500 font-mono">Auto</span>
              </div>
              <div className="flex space-x-2">
                <button className="flex-1 py-1 text-[10px] font-bold bg-slate-800 rounded border border-slate-700 hover:border-orange-500">WARM</button>
                <button className="flex-1 py-1 text-[10px] font-bold bg-orange-500 text-slate-950 rounded border border-orange-500">COOL</button>
                <button className="flex-1 py-1 text-[10px] font-bold bg-slate-800 rounded border border-slate-700 hover:border-orange-500">VIVID</button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">System Telemetry</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800 flex flex-col items-center">
                <span className="text-[10px] text-slate-500 mb-1">LATENCY</span>
                <span className="text-sm font-mono text-green-400">14ms</span>
              </div>
              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800 flex flex-col items-center">
                <span className="text-[10px] text-slate-500 mb-1">FPS</span>
                <span className="text-sm font-mono text-orange-400">{processing.framerate}</span>
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 bg-slate-900/60 border-t border-slate-800">
          <button 
            onClick={toggleCamera}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center space-x-3 transition-all ${
              cameraStatus === CameraStatus.INACTIVE 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                : 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
            }`}
          >
            <i className={`fa-solid ${cameraStatus === CameraStatus.INACTIVE ? 'fa-power-off' : 'fa-circle-stop'}`}></i>
            <span>{cameraStatus === CameraStatus.INACTIVE ? 'INITIALIZE SYSTEM' : 'SHUTDOWN CORE'}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 relative bg-[#020617] p-8 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between mb-8 z-20">
          <div className="flex flex-col">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard <span className="text-slate-500 font-light">Main Feed</span></h2>
            <p className="text-slate-400 text-sm">Intercepting Media Stream: 1280x720@30fps</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-900/60 border border-slate-800 px-4 py-2 rounded-full text-xs">
              <span className="text-slate-500 font-bold">V-CAM:</span>
              <span className="text-orange-500 font-bold uppercase">Sasa Cam Output 1</span>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center z-10">
          <div className="w-full max-w-5xl">
            <CameraFeed 
              status={cameraStatus} 
              isFaceDetected={processing.isFaceDetected} 
              activeIdentityUrl={activeIdentity?.imageUrl}
            />
          </div>

          <div className="mt-8 flex items-center space-x-4">
             <button 
              onClick={toggleSwap}
              disabled={cameraStatus === CameraStatus.INACTIVE || !activeIdentityId}
              className={`px-8 py-3 rounded-full font-bold flex items-center space-x-3 shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                cameraStatus === CameraStatus.SWAPPING
                  ? 'bg-orange-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-orange-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
             >
               <i className={`fa-solid ${cameraStatus === CameraStatus.SWAPPING ? 'fa-bolt' : 'fa-wand-magic-sparkles'}`}></i>
               <span>{cameraStatus === CameraStatus.SWAPPING ? 'STOP SWAP' : 'ACTIVATE PERSONA'}</span>
             </button>

             <div className="flex items-center space-x-2 px-6 py-3 bg-slate-900/80 rounded-full border border-slate-800">
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target:</span>
               <span className={`text-xs font-bold ${activeIdentityId ? 'text-white' : 'text-slate-600 italic'}`}>
                 {activeIdentity ? activeIdentity.name : 'None Selected'}
               </span>
             </div>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-orange-600/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="absolute bottom-8 left-8 flex flex-col space-y-2 opacity-30 pointer-events-none font-mono text-[10px] text-slate-500">
          <div>// SESSION_ID: {Math.random().toString(36).substring(7).toUpperCase()}</div>
          <div>// KERNEL_VER: 2.1.0-SWAP-PRO</div>
          <div>// BUFFER_STATUS: OPTIMAL [||||||||||]</div>
        </div>
      </main>
    </div>
  );
};

export default App;
