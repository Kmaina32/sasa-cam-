
import React, { useRef, useEffect, useState } from 'react';
import { CameraStatus } from '../types';
import { performFaceSwap } from '../services/geminiService';

interface CameraFeedProps {
  status: CameraStatus;
  isFaceDetected: boolean;
  activeIdentityUrl?: string;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ status, isFaceDetected, activeIdentityUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [swappedFrame, setSwappedFrame] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [identityBase64, setIdentityBase64] = useState<string | null>(null);

  // Improved helper to convert URL to Base64 using a canvas to bypass CORS where possible
  const urlToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      if (url.startsWith('data:')) {
        resolve(url);
        return;
      }
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg'));
        } else {
          resolve(url);
        }
      };
      img.onerror = () => {
        console.warn("Failed to load identity image for processing, falling back to URL");
        resolve(url);
      };
      img.src = url;
    });
  };

  // Pre-process active identity whenever it changes
  useEffect(() => {
    if (activeIdentityUrl) {
      urlToBase64(activeIdentityUrl).then(setIdentityBase64);
    } else {
      setIdentityBase64(null);
      setSwappedFrame(null);
    }
  }, [activeIdentityUrl]);

  useEffect(() => {
    async function setupCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 },
          audio: false 
        });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    }

    if (status !== CameraStatus.INACTIVE) {
      setupCamera();
    } else {
      stream?.getTracks().forEach(track => track.stop());
      setStream(null);
      setSwappedFrame(null);
    }

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [status]);

  // Face Swap Loop
  useEffect(() => {
    let interval: number;

    const processFrame = async () => {
      // Must be swapping, have a target, and not currently busy
      if (status !== CameraStatus.SWAPPING || !identityBase64 || isProcessing) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      setIsProcessing(true);
      
      try {
        // Capture current frame from webcam
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const sourceBase64 = canvas.toDataURL('image/jpeg', 0.8);

          // Perform the actual AI swap with temporal consistency (passing swappedFrame)
          const result = await performFaceSwap(sourceBase64, identityBase64, swappedFrame || undefined);
          if (result) {
            setSwappedFrame(result);
          }
        }
      } catch (err) {
        console.error("Persona Activation Error:", err);
      } finally {
        setIsProcessing(false);
      }
    };

    if (status === CameraStatus.SWAPPING && identityBase64) {
      processFrame();
      // Increase consistency by processing regularly, but not so fast that it causes lag
      interval = window.setInterval(processFrame, 6000); 
    } else {
      setSwappedFrame(null);
    }

    return () => clearInterval(interval);
  }, [status, identityBase64, swappedFrame, isProcessing]);

  const showDetectionUI = isFaceDetected && status !== CameraStatus.INACTIVE;

  return (
    <div className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border-2 transition-all duration-500 shadow-2xl ${
      showDetectionUI ? 'border-orange-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]' : 'border-slate-800'
    }`}>
      <canvas ref={canvasRef} className="hidden" />
      
      {status === CameraStatus.INACTIVE && (
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
          <div className="p-6 bg-slate-800/50 rounded-full">
            <i className="fa-solid fa-video-slash text-4xl text-slate-600"></i>
          </div>
          <p className="text-slate-500 font-medium">Camera Input Disabled</p>
        </div>
      )}

      {status !== CameraStatus.INACTIVE && (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover transition-opacity duration-500 ${status === CameraStatus.SWAPPING ? 'opacity-60' : 'opacity-100'}`}
        />
      )}

      {status === CameraStatus.SWAPPING && (
        <div className="absolute inset-0 z-40">
          {swappedFrame ? (
            <img 
              src={swappedFrame} 
              className="w-full h-full object-cover transition-opacity duration-1000 opacity-100"
              alt="AI Swapped Persona"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90">
               <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-4"></div>
               <p className="text-orange-500 font-bold tracking-widest text-xs uppercase animate-pulse">Initializing Neural Link...</p>
               <p className="text-slate-500 text-[10px] mt-2">Locking target identity to stream coordinates</p>
            </div>
          )}
          
          {isProcessing && swappedFrame && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-orange-500 text-slate-950 px-4 py-1 rounded-full text-[10px] font-bold tracking-widest animate-pulse z-50 shadow-lg flex items-center space-x-2">
              <i className="fa-solid fa-sync animate-spin"></i>
              <span>RE-SYNCING PERSONA...</span>
            </div>
          )}

          {swappedFrame && !isProcessing && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-green-500/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-[8px] font-bold tracking-[0.2em] z-50 shadow-lg border border-green-400/50">
              <i className="fa-solid fa-shield-check mr-2"></i>
              NEURAL LINK SYNCED
            </div>
          )}
        </div>
      )}

      {/* Tracking Overlays */}
      {showDetectionUI && (
        <div className="absolute inset-0 pointer-events-none z-50">
          <div className="scanline"></div>
          
          {/* Increased Area Size: w-72 h-96 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-96 border-2 border-orange-500 rounded-[3rem] transition-all duration-300">
            <div className="absolute inset-0 border-2 border-orange-400 rounded-[3rem] animate-ping opacity-20"></div>
            
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-orange-500 text-[10px] font-bold px-2 py-0.5 rounded text-slate-900 uppercase tracking-widest shadow-lg whitespace-nowrap">
              <i className="fa-solid fa-bullseye animate-pulse"></i>
              <span>{status === CameraStatus.SWAPPING ? 'IDENTITY LOCKED' : 'FACE TRACKED'}</span>
            </div>

            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl opacity-90 shadow-sm"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl opacity-90 shadow-sm"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl opacity-90 shadow-sm"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl opacity-90 shadow-sm"></div>
          </div>
        </div>
      )}

      {/* Brand Watermark */}
      <div className="absolute bottom-4 left-6 flex items-center space-x-2 z-20">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg">
          <span className="font-bold text-slate-900 text-sm">S</span>
        </div>
        <span className="font-bold text-white tracking-tighter text-lg drop-shadow-md">SASA<span className="text-orange-500">CAM</span></span>
      </div>

      <div className="absolute top-4 right-6 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-full px-3 py-1 flex items-center space-x-2 z-20">
        <div className={`w-2 h-2 rounded-full ${status === CameraStatus.ACTIVE || status === CameraStatus.SWAPPING ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
           {status === CameraStatus.SWAPPING ? 'Virtual Persona' : 'Live Feed'}
        </span>
      </div>
    </div>
  );
};

export default CameraFeed;
