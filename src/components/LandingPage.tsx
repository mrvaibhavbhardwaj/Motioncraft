import React, { useState, useEffect } from "react";
import {
  Monitor,
  Video,
  Mic,
  Volume2,
  Sliders,
  Sparkles,
  Scissors,
  Captions,
  Loader2,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Shield,
  Zap,
  Globe2,
  Layers,
  History,
  MousePointerClick,
  ChevronDown,
  BookOpen,
  Settings,
  HelpCircle,
  Clock,
  ThumbsUp,
  LogOut,
  User,
  Key
} from "lucide-react";

interface LandingPageProps {
  onTryDemo: () => void;
}

export default function LandingPage({ onTryDemo }: LandingPageProps) {
  const [activePage, setActivePage] = useState<"home" | "features" | "guides" | "faq">("home");
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);
  const [typedTitleIndex, setTypedTitleIndex] = useState(0);
  const subTitles = ["Screen Recorder", "Video Subtitler", "Webcam Mixer", "Video Editor"];
  
  // Rotating title effects for home page
  useEffect(() => {
    if (activePage !== "home") return;
    const timer = setInterval(() => {
      setTypedTitleIndex((prev) => (prev + 1) % subTitles.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [activePage]);

  const faqs = [
    {
      category: "Security & Sovereignty",
      q: "Does my recording go to a secondary backend server?",
      a: "No. MotionCraft values complete data sovereignty. All frame streams and recorded files are processed inside your browser and stored offline in IndexedDB on your hardware. Zero video bytes leave your local storage."
    },
    {
      category: "Audio Configuration",
      q: "How does the real-time speech recognizer operate?",
      a: "Our engine utilises the browser's native Web Speech API to translate spoken words into interactive subtitle lines synchronously. You can review, edit timestamps, or expand them directly!"
    },
    {
      category: "Fidelity & Resolution",
      q: "Are the frames captured in high definition?",
      a: "Absolutely. We support up to 60 FPS in Ultra-HD 1440p (2K), combining your custom window displays, browser tabs, and webcam streams into a beautifully synchronized, perfectly proportioned workspace canvas."
    },
    {
      category: "Playback & Scrubbing",
      q: "Can I adjust playback speeds during review?",
      a: "Yes. MotionCraft includes built-in playback speed options (0.5x, 1x, 1.5x, 2x) permitting lightning-fast audits or micro-trimming review of long webinars or gameplay recordings."
    },
    {
      category: "Limits & Quota",
      q: "Is there a recording limit on file lengths?",
      a: "The only limit is your device's free disk storage allocated to the browser sandbox (typically around 10 to 20 GB). The application displays a real-time storage index meter to help track safe export sizes."
    },
    {
      category: "Export Formats",
      q: "What video formats are supported?",
      a: "We support both WebM (recommended for lightning-fast local encoding) and high-compatibility MP4 options, ensuring you can upload directly to YouTube, Gmail, Teams, or Slack."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative flex flex-col justify-between" id="landing-page-root">
      
      {/* Decorative Grid Pattern Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-70 pointer-events-none" />

      {/* Top Multi-Page Navigation Header */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-4" id="landing-header">
        <div 
          className="flex items-center gap-3 cursor-pointer select-none" 
          onClick={() => {
            setActivePage("home");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <div className="w-10 h-10 bg-linear-to-tr from-teal-400 via-cyan-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <Video className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full ring-2 ring-white animate-ping"></span>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 leading-none">MotionCraft</h1>
            <p className="text-[10px] text-indigo-600 font-medium mt-1 font-bold">Screen & Web Camera Recorder</p>
          </div>
        </div>

        {/* Dynamic Nav Tabs Router */}
        <nav className="flex items-center gap-1 bg-slate-200/60 border border-slate-300/30 rounded-xl p-1 relative z-20 shadow-xs">
          <button
            id="nav-btn-home"
            type="button"
            onClick={() => { setActivePage("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activePage === "home" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Overview
          </button>
          <button
            id="nav-btn-features"
            type="button"
            onClick={() => { setActivePage("features"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activePage === "features" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Features Catalog
          </button>
          <button
            id="nav-btn-guides"
            type="button"
            onClick={() => { setActivePage("guides"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activePage === "guides" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Guides Info
          </button>
          <button
            id="nav-btn-faq"
            type="button"
            onClick={() => { setActivePage("faq"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activePage === "faq" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            FAQ Center
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-[10px] font-bold text-emerald-700 rounded-full border border-emerald-100 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            100% Client-Side Privacy
          </span>

          <button
            id="header-try-demo-btn"
            onClick={onTryDemo}
            className="px-4.5 py-2 hover:translate-y-[-1px] active:translate-y-[1px] bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-100 transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            Launch Free Studio
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* RENDER PAGES DYNAMICALLY */}
      <main className="flex-grow">
        
        {/* ========================================== */}
        {/* PAGE 1: OVERVIEW HERO PAGE                 */}
        {/* ========================================== */}
        {activePage === "home" && (
          <div className="relative z-10 w-full animate-fade-in" id="page-home-content">
            {/* HERO INTRODUCTION */}
            <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 text-center">
              
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-bold leading-none mb-6">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" style={{ animationDuration: '3s' }} />
                <span>Privacy-First Screen & Video Recording</span>
              </div>
       
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-950 tracking-tight leading-[1.1] max-w-4xl mx-auto">
                The Intelligent Web <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 relative">
                  {subTitles[typedTitleIndex]}
                </span>
              </h2>

              <p className="text-sm sm:text-base md:text-lg text-slate-600 mt-6 max-w-2xl mx-auto leading-relaxed font-normal">
                Record your screen, camera, and voice natively. Generate synchronized interactive AI subtitles, tweak playback speeds, trim frame ranges, and export in High Definition formats locally.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
                <button
                  id="hero-try-demo-main-btn"
                  onClick={onTryDemo}
                  className="w-full sm:w-auto px-8 py-4 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xl shadow-indigo-150 transition-all hover:shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2 group"
                >
                  Try Free Demo Live
                  <MousePointerClick className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                
                <button
                  id="hero-explore-features-btn"
                  onClick={() => { setActivePage("features"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="w-full sm:w-auto px-6 py-4 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all hover:border-slate-300 cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  Explore Features
                </button>
              </div>

              {/* Main Preview Illustration Card Mock */}
              <div className="mt-14 max-w-5xl mx-auto border border-slate-200/80 rounded-2xl md:rounded-3xl bg-white p-2 sm:p-3.5 shadow-2xl shadow-slate-100 relative group overflow-hidden" id="hero-studio-mock">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl group-hover:translate-x-20 transition-transform duration-1000 -translate-y-12"></div>
                
                <div className="bg-slate-900 rounded-xl md:rounded-2xl pb-4 overflow-hidden border border-slate-800 shadow-inner relative z-10 text-left">
                  <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
                    <div className="flex gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
                      <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                      <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                    </div>
                    <div className="text-[10px] bg-slate-900 border border-slate-800/55 px-3 py-1 rounded-md text-slate-400">
                      captureflow.app/recorder
                    </div>
                    <div className="w-14"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 min-h-[300px]">
                    <div className="md:col-span-8 bg-slate-950 rounded-xl border border-slate-800/70 p-4 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-40"></div>
                      
                      <div className="flex items-center justify-between relative z-10">
                        <div className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                          Ready
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">1440p FHD • 60fps</div>
                      </div>

                      <div className="my-10 text-center relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
                          <Monitor className="w-8 h-8" />
                        </div>
                        <h4 className="font-semibold text-slate-100 text-sm">Screen & Webcam Mixer</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm">
                          Toggle floating webcams, overlay screen captures, adjust mic inputs, and record locally.
                        </p>
                      </div>

                      <div className="p-3 bg-indigo-950/40 border border-indigo-900/30 rounded-lg text-center relative z-10 max-w-md mx-auto">
                        <span className="text-indigo-200 text-xs font-medium animate-pulse">
                          "Welcome to MotionCraft! Hit Launch Free Studio to begin."
                        </span>
                      </div>
                    </div>

                    <div className="md:col-span-4 bg-slate-900/60 rounded-xl border border-slate-800/60 p-4 flex flex-col justify-between">
                      <div>
                        <h5 className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-3">RECORDER OPTIONS</h5>
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center bg-slate-950/60 border border-slate-800/80 p-2 rounded-lg">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                              <Monitor className="w-3.5 h-3.5 text-slate-500" /> Screen Stream
                            </span>
                            <span className="text-[10px] text-indigo-300 font-bold bg-indigo-950 border border-indigo-900 px-1.5 py-0.5 rounded">ACTIVE</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-950/60 border border-slate-800/80 p-2 rounded-lg">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                              <Video className="w-3.5 h-3.5 text-slate-500" /> Webcam PIP Overlay
                            </span>
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 border border-emerald-900 px-1.5 py-0.5 rounded">SECONDARY</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-950/60 border border-slate-800/80 p-2 rounded-lg">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                              <Mic className="w-3.5 h-3.5 text-slate-500" /> Voice Microphone
                            </span>
                            <span className="text-[10px] text-slate-500 px-1.5 py-0.5">Dual-Mix</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800">
                        <button
                          onClick={onTryDemo}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-50 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          Quick Launch Studio
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* BENEFITS BADGES */}
            <section className="bg-white border-y border-slate-200 py-10">
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">100% Client-Side Privacy</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      No storage bounds or privacy leaks. Your media remains completely isolated within your browser's standard space.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Instant No-Key AI Subtitles</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Natively speech-to-text without configuring external payment tokens. Captions auto-populate synchronously while speaking.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Custom Workspace Control</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Alter recording resolutions, frame rates, and preview audio mix options. Precise timeline editing makes publishing a breeze.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA SECTION */}
            <section className="max-w-4xl mx-auto px-6 py-20 text-center">
              <h3 className="text-2xl font-black text-slate-950 tracking-tight">Expand onto Sub-Pages to Explore MotionCraft</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
                Click our tabs at the top to discover our interactive features, walkthrough technical tutorials, and common FAQ topics.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => { setActivePage("features"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="px-4 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
                >
                  View Features Catalog
                </button>
                <button
                  type="button"
                  onClick={() => { setActivePage("guides"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="px-4 py-2 bg-[#f1f5f9] border border-slate-200 hover:bg-slate-200/80 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
                >
                  Read Operator Guides
                </button>
                <button
                  type="button"
                  onClick={onTryDemo}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-all inline-flex items-center gap-1 shadow-sm"
                >
                  Try Living App Panel
                  <ArrowRight className="w-3" />
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ========================================== */}
        {/* PAGE 2: FEATURES CATALOG                   */}
        {/* ========================================== */}
        {activePage === "features" && (
          <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-in" id="page-features-content">
            <div className="text-center mb-16">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100/50">Core Engine Specs</span>
              <h3 className="text-3xl font-black text-slate-950 tracking-tight mt-3">Exquisite Suite of Modern Capabilities</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto">
                Everything you need built cleanly into a single interactive studio screen without complicated software setups!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 border border-indigo-100">
                  <Monitor className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-slate-900">Custom Layout Multi-Mixer</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Support combined multi-layered recording screens. Capture pure high-fidelity video tracks alongside a responsive floating webcam overlay configured in rounded picture-in-picture frames.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">Video PiP</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Screen Shared</span>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 border border-emerald-100">
                  <Mic className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-slate-900">Dual-Channel Mixed Audio</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Mix multiple audio feeds seamlessly. Record device sounds (video playback sounds, system alerts) and input microphones at the same time into a single synchronized output audio track.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Mic Channel</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">System Stereo</span>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
                <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center mb-4 border border-violet-100">
                  <Captions className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-slate-900">Immediate Speech Subtitling</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Translate spoken sentences into dynamic subtitle timelines instantly. Built on native Web Speech algorithms, text is added to your clip without calling external billing API keys.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[10px] bg-violet-50 text-violet-700 font-semibold px-2 py-0.5 rounded-full">Web Speech API</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">SRT & VTT Export</span>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4 border border-rose-100">
                  <Scissors className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-slate-900">Precision Non-Destructive Trimming</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Refine recorded video files inside our custom scrubbing editor. Adjust boundaries to discard boring pauses at start or stop frames without quality degradation.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[10px] bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded-full">Frame Cutters</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Timeline Scrub</span>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4 border border-amber-100">
                  <Sliders className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-slate-900">Custom Recording Specifications</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Complete authority over frame resolutions and encoding formats. Select WebM or MP4 options, choose resolutions from 720p to 1440p (2K), and set liquid smooth 30 to 60 FPS benchmarks.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full">HD 1440p</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">60 FPS Smooth</span>
                </div>
              </div>

              {/* Feature 6 */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
                <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center mb-4 border border-sky-100">
                  <History className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-slate-900">IndexedDB Secure Database</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Recordings persist offline strictly in your browser. Relive session library archives, download clips directly into your system files, or wipe database indexes instantly anytime.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[10px] bg-sky-50 text-sky-700 font-semibold px-2 py-0.5 rounded-full">No Server Sync</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Local db indexed</span>
                </div>
              </div>
            </div>

            <div className="mt-14 p-6 rounded-2xl bg-indigo-50 border border-indigo-100 text-center max-w-xl mx-auto">
              <span className="font-bold text-sm text-indigo-900">Ready to put these features to work?</span>
              <p className="text-xs text-indigo-650 mt-1">Boot up our client recorder stream with no registration step!</p>
              <button
                type="button"
                onClick={onTryDemo}
                className="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer transition-colors"
              >
                Launch Free Studio Now
              </button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* PAGE 3: GUIDES MANUAL                      */}
        {/* ========================================== */}
        {activePage === "guides" && (
          <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-in" id="page-guides-content">
            <div className="text-center mb-16">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100/50">Instruction Manual</span>
              <h3 className="text-3xl font-black text-slate-950 tracking-tight mt-3">Step-by-Step Operator Manual</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto">
                Comprehensive tutorials to guide you on layouts config, mixing audio channels, and managing sandbox safety.
              </p>
            </div>

            <div className="space-y-12">
              {/* Step 1 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white p-6 rounded-2xl border border-slate-200">
                <div className="md:col-span-1 flex justify-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-150 text-indigo-800 font-bold text-lg flex items-center justify-center">1</div>
                </div>
                <div className="md:col-span-11">
                  <h4 className="font-bold text-base text-slate-900">Choose your Recording Preset</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Navigate to the **Studio Recorder** dashboard. In the left panel, you see three ready-to-record feeds presets: <strong>Screen Record Only</strong> (perfect for quick walkthroughs), <strong>Screen with Audio</strong> (integrates voice recording), and <strong>Screen, Audio & Camera</strong> (combines circle webcam layouts). Pick the preset that fits your presentation context.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white p-6 rounded-2xl border border-slate-200">
                <div className="md:col-span-1 flex justify-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-150 text-indigo-800 font-bold text-lg flex items-center justify-center">2</div>
                </div>
                <div className="md:col-span-11">
                  <h4 className="font-bold text-base text-slate-900">Verify Microphone & Camera Permissions</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Once camera or audio are enabled, your browser will prompt a dialog asking to grant permission blocks. Confined iframe sandbox containers can block screen recording blocks. Hit <strong>"Open App in Standalone Tab"</strong> to launch the editor natively in its independent tab if the browser indicates restrictions.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white p-6 rounded-2xl border border-slate-200">
                <div className="md:col-span-1 flex justify-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-150 text-indigo-800 font-bold text-lg flex items-center justify-center">3</div>
                </div>
                <div className="md:col-span-11">
                  <h4 className="font-bold text-base text-slate-900">Configure Screen Share Layers (System Audio)</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    When you click "Launch Screen Recorder," your browser's share panel appears. To capture YouTube sounds, Spotify channels, or computer speaker overlays, verify you check the <strong>"Share System Audio"</strong> checkbox located in the lower-left corner of the browser's screen share dialog.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white p-6 rounded-2xl border border-slate-200">
                <div className="md:col-span-1 flex justify-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-150 text-indigo-800 font-bold text-lg flex items-center justify-center">4</div>
                </div>
                <div className="md:col-span-11">
                  <h4 className="font-bold text-base text-slate-900">Refine Subtitle Sentences in Video Editor</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    After you stop recording, your video file automatically lists inside your browser library. Click <strong>"Video Editor"</strong> or selection buttons. Here, we transcribe voice streams offline. Double-click any caption card to repair spelling, or customize timestamps in the video scroller, then download as subtitle formats.
                  </p>
                </div>
              </div>
            </div>

            {/* Sandbox Notice Banner */}
            <div className="mt-12 bg-amber-50 border border-amber-200 p-5 rounded-xl flex items-start gap-4 mx-auto max-w-3xl text-xs text-slate-700">
              <div className="bg-amber-100 p-2 text-amber-700 rounded-lg shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-slate-900 block font-semibold">Important Security Warning regarding Browser Sandbox restrictions</strong>
                <p className="mt-1.5 leading-relaxed text-slate-600">
                  Chrome, Edge, and Safari disallow displaying screen sharing permission interfaces when the parent website is contained in embedded preview frames (like inside development sandboxes). If you see alerts, please launch MotionCraft in its standalone browser tab above, which runs completely natively.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* PAGE 4: FAQ COMPREHENSIVE                  */}
        {/* ========================================== */}
        {activePage === "faq" && (
          <div className="max-w-4xl mx-auto px-6 py-12 animate-fade-in" id="page-faq-content">
            <div className="text-center mb-16">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100/50">Help Center</span>
              <h3 className="text-3xl font-black text-slate-950 tracking-tight mt-3">Got Questions? We Have Answers.</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto">
                Discover quick solutions regarding audio mixer issues, file safety, and database bounds.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-300 shadow-xs"
                  id={`faq-item-ex-${index}`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveFAQ(activeFAQ === index ? null : index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-slate-800 hover:text-slate-950 text-xs sm:text-sm cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono sm:self-center self-start">
                        {faq.category}
                      </span>
                      <span>{faq.q}</span>
                    </div>
                    <span className="p-1 rounded-md bg-slate-50 border border-slate-200 text-slate-400 shrink-0 select-none">
                      {activeFAQ === index ? "−" : "+"}
                    </span>
                  </button>
                  {activeFAQ === index && (
                    <div className="px-5 pb-4.5 text-xs text-slate-600 leading-relaxed border-t border-slate-50 pt-2 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick contact suggestion */}
            <div className="mt-14 p-6 bg-slate-150/40 border border-slate-200 text-center rounded-2xl max-w-xl mx-auto">
              <h4 className="font-bold text-sm text-slate-900">Need immediate help with a recording?</h4>
              <p className="text-xs text-slate-500 mt-1">Our studio processes all recordings 100% offline. We never receive your data!</p>
              <button
                type="button"
                onClick={onTryDemo}
                className="mt-4 px-5 py-2 hover:bg-indigo-700 bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                Go to App Dashboard
              </button>
            </div>
          </div>
        )}

      </main>

      {/* METICULOUS FOOTER */}
      <footer className="border-t border-slate-150 bg-white py-10 text-slate-500 text-xs mt-12 relative z-10" id="landing-footer">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => { setActivePage("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          >
            <div className="w-7 h-7 bg-linear-to-tr from-teal-400 via-cyan-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md relative overflow-hidden">
              <Video className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-800">MotionCraft</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold">
            <button type="button" onClick={() => { setActivePage("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-slate-900 cursor-pointer">Overview</button>
            <span>•</span>
            <button type="button" onClick={() => { setActivePage("features"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-slate-900 cursor-pointer">Features Catalog</button>
            <span>•</span>
            <button type="button" onClick={() => { setActivePage("guides"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-slate-900 cursor-pointer">Operator Guides</button>
            <span>•</span>
            <button type="button" onClick={() => { setActivePage("faq"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-slate-900 cursor-pointer">FAQ Center</button>
          </div>

          <div className="text-center sm:text-right flex flex-col items-center sm:items-end gap-1">
            <p className="font-mono text-[10px]">© 2026 MotionCraft. All capabilities processed locally offline.</p>
            <p className="text-[10px] text-slate-400">
              Developed by <strong className="text-indigo-600 font-bold">Vaibhav Bhardwaj</strong> —{" "}
              <a href="https://www.linkedin.com/in/mr-vaibhav-bhardwaj" target="_blank" rel="noreferrer noopener" className="hover:text-slate-950 underline font-semibold transition-colors">LinkedIn</a> |{" "}
              <a href="https://github.com/mrvaibhavbhardwaj" target="_blank" rel="noreferrer noopener" className="hover:text-slate-950 underline font-semibold transition-colors">GitHub</a>
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
