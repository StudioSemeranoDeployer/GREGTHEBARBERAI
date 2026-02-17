
import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Upload, Scissors, Sparkles, RefreshCcw, 
  Check, ShieldCheck, ChevronLeft, Download, 
  User, Image as ImageIcon, Zap, Info, Share2, Eye, Key
} from 'lucide-react';
import { AppStep, AnalysisResult, GeneratedStyle } from './types';
import { analyzePhoto, transformHairstyle } from './services/geminiService';

const LOADING_MESSAGES = [
  "Mapping facial architecture...",
  "Analyzing hair follicles and texture...",
  "Calculating optimal taper ratios...",
  "Consulting the GregTheBarber style guide...",
  "Applying digital precision shears...",
  "Rendering final masterclass looks..."
];

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [results, setResults] = useState<GeneratedStyle[]>([]);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    let interval: number;
    if (step === AppStep.ANALYZING || step === AppStep.GENERATING) {
      interval = window.setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [step]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("Please upload a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImage(base64);
      processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Camera access denied. Please use the upload option.");
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const video = videoRef.current;
        const size = Math.min(video.videoWidth, video.videoHeight);
        canvasRef.current.width = size;
        canvasRef.current.height = size;
        
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;
        
        context.drawImage(video, startX, startY, size, size, 0, 0, size, size);
        const base64 = canvasRef.current.toDataURL('image/jpeg', 0.9);
        setImage(base64);
        
        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        setShowCamera(false);
        processImage(base64);
      }
    }
  };

  const handleApiError = async (err: any) => {
    console.error("API Error:", err);
    const errorMessage = err?.message || String(err);
    
    if (errorMessage.includes("Requested entity was not found") || errorMessage.includes("API_KEY") || errorMessage.includes("403")) {
      setError("Il servizio richiede una chiave API valida. Per favore, seleziona la tua chiave.");
      const anyWindow = window as any;
      if (anyWindow.aistudio && typeof anyWindow.aistudio.openSelectKey === 'function') {
        await anyWindow.aistudio.openSelectKey();
      }
    } else {
      setError("I nostri stilisti hanno riscontrato un problema tecnico. Riprova tra poco.");
    }
    setStep(AppStep.UPLOAD);
  };

  const processImage = async (base64: string) => {
    setError(null);
    setStep(AppStep.ANALYZING);
    
    try {
      const analysisResult = await analyzePhoto(base64);
      setAnalysis(analysisResult);
      
      setStep(AppStep.GENERATING);
      
      const generationPromises = analysisResult.recommendations.map(async (rec) => {
        try {
          const imageUrl = await transformHairstyle(base64, rec.name);
          return { style: rec, imageUrl };
        } catch (e) {
          console.error(`Error generating ${rec.name}:`, e);
          return null;
        }
      });

      const generatedResults = (await Promise.all(generationPromises)).filter(r => r !== null) as GeneratedStyle[];
      
      if (generatedResults.length === 0) throw new Error("Could not generate styles.");
      
      setResults(generatedResults);
      setStep(AppStep.RESULT);
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'GregTheBarber AI Transformation',
          text: 'Check out my new AI-generated hairstyle!',
          url: window.location.href,
        });
      } catch (err) {
        console.log("Sharing failed", err);
      }
    }
  };

  const reset = () => {
    setImage(null);
    setAnalysis(null);
    setResults([]);
    setStep(AppStep.UPLOAD);
    setError(null);
    setLoadingMsgIdx(0);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between glass-card sticky top-0 z-50">
        <div className="flex items-center gap-3 sm:gap-4 cursor-pointer group" onClick={reset}>
          <div className="bg-[#d4af37] p-2 sm:p-2.5 rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-transform group-hover:scale-110">
            <Scissors className="text-black" size={20} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-[0.1em] sm:tracking-[0.15em] uppercase text-white leading-none">
              GREGTHEBARBER <span className="text-[#d4af37] ml-0.5 sm:ml-1">AI</span>
            </h1>
            <p className="text-[8px] sm:text-[10px] text-white/40 uppercase tracking-widest mt-0.5 sm:mt-1">Digital Masterclass</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4">
           <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest leading-none">V3.1 Online</span>
           </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 md:p-12 flex flex-col justify-center">
        {error && (
          <div className="mb-8 p-4 sm:p-6 bg-red-500/10 border border-red-500/20 rounded-2xl sm:rounded-[2rem] text-red-400 flex flex-col sm:flex-row items-center gap-4 animate-in slide-in-from-top-2">
            <Info size={24} className="shrink-0" />
            <p className="text-sm font-medium flex-1 text-center sm:text-left">{error}</p>
            <div className="flex gap-2 sm:gap-3">
               <button 
                 onClick={async () => {
                   const anyWindow = window as any;
                   if (anyWindow.aistudio) await anyWindow.aistudio.openSelectKey();
                   setError(null);
                 }}
                 className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
               >
                 <Key size={14} /> Update Key
               </button>
               <button onClick={() => setError(null)} className="text-white/40 hover:text-white transition-colors text-2xl leading-none px-2">&times;</button>
            </div>
          </div>
        )}

        {/* UPLOAD STEP */}
        {step === AppStep.UPLOAD && !showCamera && (
          <div className="max-w-4xl mx-auto w-full space-y-12 sm:space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-6 sm:space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
                <Sparkles size={10} />
                <span>Executive Grooming Assistant</span>
              </div>
              <h2 className="text-4xl sm:text-6xl md:text-8xl font-serif-italic text-white leading-[1] sm:leading-[0.9]">
                The future of your <br/> <span className="text-[#d4af37]">signature style.</span>
              </h2>
              <p className="text-white/40 text-base sm:text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed px-4">
                Elevate your look. Our AI analyzes your facial geometry to render premium, precision-cut visualizations tailored uniquely to you.
              </p>
            </div>

            <div 
              className={`grid sm:grid-cols-2 gap-4 sm:gap-8 transition-transform duration-500 ${dragActive ? 'scale-[1.02]' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <button 
                onClick={startCamera}
                className="group relative p-8 sm:p-12 glass-card rounded-[2rem] sm:rounded-[3rem] flex flex-col items-center gap-6 sm:gap-8 transition-all duration-300 hover:bg-[#d4af37]/[0.05] gold-glow active:scale-[0.98]"
              >
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-white/[0.03] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#d4af37]/20 transition-all duration-500">
                  <Camera size={32} className="text-[#d4af37] stroke-[1.5] sm:hidden" />
                  <Camera size={44} className="text-[#d4af37] stroke-[1.5] hidden sm:block" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 text-white">Open Studio</h3>
                  <p className="text-white/30 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">Live Lens Experience</p>
                </div>
              </button>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative p-8 sm:p-12 glass-card rounded-[2rem] sm:rounded-[3rem] flex flex-col items-center gap-6 sm:gap-8 cursor-pointer transition-all duration-300 hover:bg-blue-500/[0.05] shadow-[0_0_40px_rgba(59,130,246,0.05)] active:scale-[0.98]"
              >
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-white/[0.03] flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-500">
                  <ImageIcon size={32} className="text-blue-500 stroke-[1.5] sm:hidden" />
                  <ImageIcon size={44} className="text-blue-500 stroke-[1.5] hidden sm:block" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 text-white">Upload Portrait</h3>
                  <p className="text-white/30 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">Device Photo Library</p>
                </div>
              </div>
            </div>
            
            <div className="pt-4 sm:pt-8 grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto">
               {[
                 { icon: <ShieldCheck size={16}/>, label: "Private" },
                 { icon: <Zap size={16}/>, label: "Instant" },
                 { icon: <Eye size={16}/>, label: "True" }
               ].map((item, i) => (
                 <div key={i} className="flex flex-col items-center gap-2 sm:gap-3 text-center">
                    <div className="text-[#d4af37]/40">{item.icon}</div>
                    <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">{item.label}</span>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* CAMERA SCREEN */}
        {showCamera && (
          <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-in fade-in duration-500">
            <div className="absolute top-6 sm:top-8 left-6 sm:left-8 z-[101]">
               <button onClick={() => setShowCamera(false)} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full glass-card flex items-center justify-center text-white/60 hover:text-white transition-colors border border-white/10 active:scale-90">
                  <ChevronLeft size={24} sm:size={28} />
               </button>
            </div>
            <div className="relative flex-1 flex items-center justify-center overflow-hidden">
               <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
               <div className="face-guide"></div>
               <div className="absolute bottom-10 sm:bottom-12 text-center w-full px-6">
                  <p className="text-white/60 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-black/40 backdrop-blur-md inline-block px-4 py-2 rounded-full border border-white/10">
                    Posiziona il volto nel cerchio
                  </p>
               </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="p-10 sm:p-12 bg-[#0a0c10] flex justify-center items-center border-t border-white/[0.05] safe-area-bottom">
              <button 
                onClick={capturePhoto} 
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#d4af37] flex items-center justify-center p-2 group transition-all active:scale-90"
              >
                <div className="w-full h-full bg-[#d4af37] rounded-full shadow-[0_0_30px_rgba(212,175,55,0.4)]" />
              </button>
            </div>
          </div>
        )}

        {/* PROCESSING SCREEN */}
        {(step === AppStep.ANALYZING || step === AppStep.GENERATING) && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8 sm:space-y-12 animate-in fade-in zoom-in-95 duration-1000">
            <div className="relative">
              <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full border-t border-[#d4af37] animate-spin duration-[3000ms] shadow-[0_0_80px_rgba(212,175,55,0.1)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-[#d4af37] animate-pulse">
                   <Scissors size={60} sm:size={80} className="stroke-[1]" />
                </div>
              </div>
            </div>
            <div className="text-center space-y-4 sm:space-y-6 max-w-sm mx-auto px-6">
              <h3 className="text-[10px] sm:text-xs font-black text-[#d4af37] tracking-[0.5em] uppercase">Processing</h3>
              <p className="text-2xl sm:text-3xl font-serif-italic text-white italic h-10">{LOADING_MESSAGES[loadingMsgIdx]}</p>
              <div className="w-full h-[1px] bg-white/10 rounded-full overflow-hidden">
                 <div className="h-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent w-full animate-shimmer" />
              </div>
            </div>
          </div>
        )}

        {/* RESULTS SCREEN */}
        {step === AppStep.RESULT && results.length > 0 && (
          <div className="space-y-12 sm:space-y-20 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 sm:gap-12 border-b border-white/[0.05] pb-10 sm:pb-16">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,1)]" />
                   <span className="text-[9px] sm:text-[10px] font-black text-[#d4af37] tracking-[0.4em] uppercase">Style Portfolio</span>
                </div>
                <h2 className="text-5xl sm:text-6xl md:text-8xl font-serif-italic text-white">The Greg Selection.</h2>
                <div className="flex flex-wrap gap-2 sm:gap-4">
                   <span className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-white/50 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">
                     Anatomy: <span className="text-white ml-2">{analysis?.faceShape}</span>
                   </span>
                   <span className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-white/50 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">
                     Fiber: <span className="text-white ml-2">{analysis?.hairTexture}</span>
                   </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                <button 
                  onClick={handleShare}
                  className="flex-1 sm:flex-none group flex items-center justify-center gap-3 bg-white/[0.03] hover:bg-white/[0.08] px-6 py-4 sm:px-8 sm:py-5 rounded-2xl sm:rounded-3xl border border-white/[0.08] font-bold transition-all active:scale-95"
                >
                  <Share2 size={18} className="text-white/40 group-hover:text-white" />
                  <span className="text-white/80 uppercase tracking-widest text-[10px] sm:text-[11px]">Share</span>
                </button>
                <button 
                  onClick={reset}
                  className="flex-1 sm:flex-none group flex items-center justify-center gap-3 bg-[#d4af37] hover:bg-[#b8962d] px-6 py-4 sm:px-8 sm:py-5 rounded-2xl sm:rounded-3xl text-black font-black transition-all active:scale-95 shadow-xl shadow-[#d4af37]/10"
                >
                  <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
                  <span className="uppercase tracking-widest text-[10px] sm:text-[11px]">New Session</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-12 items-start">
              {/* Profile Panel */}
              <div className="lg:col-span-4 lg:sticky lg:top-36 space-y-8 sm:space-y-10">
                <div className="group relative rounded-[3rem] sm:rounded-[4rem] overflow-hidden glass-card p-2 sm:p-3 border border-white/10">
                  <img src={image!} alt="Original" className="w-full h-auto aspect-square object-cover rounded-[2.5rem] sm:rounded-[3.2rem] opacity-70" />
                  <div className="absolute top-6 sm:top-10 left-6 sm:left-10 bg-black/80 backdrop-blur-xl px-4 py-1.5 sm:px-6 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] border border-white/10 text-[#d4af37]">
                    Base Portrait
                  </div>
                </div>
                
                <div className="glass-card p-8 sm:p-10 rounded-[3rem] sm:rounded-[4rem] border-l border-[#d4af37] space-y-6 sm:space-y-8 relative overflow-hidden">
                  <div className="absolute -right-6 sm:-right-8 -top-6 sm:-top-8 text-[#d4af37]/5 rotate-12">
                     <Scissors size={100} sm:size={120} />
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                     <div className="bg-[#d4af37]/10 p-2 rounded-lg">
                        <User size={18} sm:size={20} className="text-[#d4af37]" />
                     </div>
                     <h4 className="font-black text-white uppercase text-[9px] sm:text-[10px] tracking-[0.3em]">Greg's Stylist Note</h4>
                  </div>
                  <p className="text-white/40 text-sm sm:text-base leading-relaxed font-light italic">
                    "Con un profilo <span className="text-white font-medium">{analysis?.faceShape}</span> e texture <span className="text-white font-medium">{analysis?.hairTexture}</span>, queste quattro selezioni sono ottimizzate per le tue proporzioni uniche."
                  </p>
                </div>
              </div>

              {/* Styled Results Grid */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
                {results.map((res, idx) => (
                  <div key={idx} className="group relative rounded-[3rem] sm:rounded-[4rem] overflow-hidden bg-[#0a0c10] border border-white/[0.05] hover:border-[#d4af37]/40 transition-all duration-700 shadow-2xl flex flex-col h-full">
                    <div className="relative aspect-square overflow-hidden">
                       <img src={res.imageUrl} alt={res.style.name} className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110" />
                       <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-transparent to-transparent opacity-80" />
                       <div className="absolute top-6 right-6">
                          <span className={`text-[8px] sm:text-[9px] font-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border tracking-[0.2em] uppercase backdrop-blur-md ${
                            res.style.trendLevel === 'Bold' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 
                            res.style.trendLevel === 'Trending' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                            'bg-[#d4af37]/10 border-[#d4af37]/30 text-[#d4af37]'
                          }`}>
                            {res.style.trendLevel}
                          </span>
                       </div>
                    </div>
                    
                    <div className="p-8 sm:p-10 pt-0 space-y-5 sm:space-y-6 -mt-12 sm:-mt-16 relative z-10 flex-1 flex flex-col">
                      <div className="flex items-end justify-between gap-4">
                        <h4 className="text-3xl sm:text-4xl font-serif-italic italic text-white leading-none tracking-wide">{res.style.name}</h4>
                        <a 
                          href={res.imageUrl} 
                          download={`GregTheBarber_${res.style.name}.png`}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-[#d4af37] transition-all border border-white/10 active:scale-90"
                        >
                          <Download size={18} sm:size={20} />
                        </a>
                      </div>
                      
                      <p className="text-white/40 text-xs sm:text-sm font-light leading-relaxed flex-1">
                        {res.style.description}
                      </p>
                      
                      <div className="pt-6 sm:pt-8 border-t border-white/[0.05] flex items-start gap-3 sm:gap-4">
                        <div className="mt-0.5 shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#d4af37]/20 flex items-center justify-center">
                           <Check className="text-[#d4af37]" size={10} sm:size={12} />
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-[#d4af37] font-black tracking-widest uppercase leading-tight">
                           Logic: <span className="text-white/60 font-medium normal-case tracking-normal ml-1">{res.style.whyItWorks}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="p-8 sm:p-16 border-t border-white/[0.03] mt-12 sm:mt-24">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-8 sm:gap-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <h5 className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.5em] text-[#d4af37]">GREGTHEBARBER AI</h5>
            <p className="text-[9px] sm:text-[10px] text-white/20 uppercase tracking-[0.2em]">© 2024 Master Class Digital • Stylist Suite</p>
          </div>
          
          <div className="flex items-center">
            <a 
              href="https://www.instagram.com/marco_vrchitect" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-[#d4af37] transition-all duration-300 active:scale-95"
            >
              VirtualArchitectsStudio
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
