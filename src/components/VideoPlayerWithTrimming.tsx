import React, { useRef, useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Scissors, 
  Type,
  Sparkles,
  Sliders,
  Music,
  Clapperboard,
  Layers,
  Check,
  Info,
  Layers3,
  Volume1,
  BookOpen,
  Plus,
  Trash2,
  Split,
  Crop,
  SlidersHorizontal
} from "lucide-react";
import { CaptionSegment } from "../types";

export interface TimelineClip {
  id: string;
  type: "video" | "b-roll" | "audio" | "text";
  title: string;
  start: number; // in seconds
  end: number;   // in seconds
  volume?: number; // 0 to 100
  color?: string; // theme color
  text?: string;  // graphic overlay text
}

interface Props {
  videoBlob: Blob;
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  captions: CaptionSegment[];
  playbackTime: number;
  onPlaybackTimeUpdate: (time: number) => void;
}

export default function VideoPlayerWithTrimming({
  videoBlob,
  trimStart,
  trimEnd,
  onTrimChange,
  captions,
  playbackTime,
  onPlaybackTimeUpdate,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(trimEnd || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [activeCaption, setActiveCaption] = useState<string>("");
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Core Video & Audio Editing Capabilities States
  const [activeTab, setActiveTab] = useState<"filters" | "audio" | "intro" | "timeline" | "crop">("timeline");
  
  // 1. Video Filters & Basic Tuning
  const [videoFilter, setVideoFilter] = useState<string>("normal");
  const [brightness, setBrightness] = useState<number>(100);     // 50% -> 150%
  const [contrast, setContrast] = useState<number>(100);       // 50% -> 150%
  const [saturation, setSaturation] = useState<number>(100);     // 50% -> 200%
  const [hueRotate, setHueRotate] = useState<number>(0);         // 0deg -> 360deg
  const [aspectRatio, setAspectRatio] = useState<string>("16-9"); // 16-9, 9-16, 1-1, 4-3, 21-9
  const [videoZoom, setVideoZoom] = useState<number>(100);       // 100% -> 200%
  const [videoPanX, setVideoPanX] = useState<number>(0);         // -200 -> 200 px
  const [videoPanY, setVideoPanY] = useState<number>(0);         // -200 -> 200 px

  // Multi-Layer Video timeline items state
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([
    {
      id: "clip-video-main",
      type: "video",
      title: "V1: Primary Screen Track",
      start: trimStart,
      end: trimEnd || 10,
    },
    {
      id: "clip-broll-1",
      type: "b-roll",
      title: "V2: B-Roll Corporate Accent",
      start: Math.max(0, trimStart + 1.2),
      end: Math.min(trimEnd || 10, trimStart + 5.5),
    },
    {
      id: "clip-audio-1",
      type: "audio",
      title: "A1: Accent Background Score",
      start: trimStart,
      end: trimEnd || 10,
      volume: 45,
    },
    {
      id: "clip-text-1",
      type: "text",
      title: "T1: Explainer Banner",
      start: Math.max(0, trimStart + 0.5),
      end: Math.min(trimEnd || 10, trimStart + 4.5),
      text: "✨ CRITICAL SYSTEM DEMO ✨",
      color: "amber",
    }
  ]);
  const [selectedClipId, setSelectedClipId] = useState<string>("clip-video-main");
  
  // 2. Overlays / Watermarks
  const [watermarkText, setWatermarkText] = useState<string>("");
  const [watermarkPosition, setWatermarkPosition] = useState<string>("bottom-right");
  const [watermarkColor, setWatermarkColor] = useState<string>("white");

  // 3. Web Audio EQ Mixer 
  const [audioBoost, setAudioBoost] = useState<number>(1.0); // ranges 0.0 -> 2.5
  const [audioPreset, setAudioPreset] = useState<string>("normal"); // normal, bass, speech, radio, lowpass
  const [bassGain, setBassGain] = useState<number>(0);       // -15dB -> +15dB
  const [midGain, setMidGain] = useState<number>(0);         // -15dB -> +15dB
  const [trebleGain, setTrebleGain] = useState<number>(0);     // -15dB -> +15dB
  const [smartAudioClean, setSmartAudioClean] = useState<boolean>(false);

  // 4. Intro Card Builder
  const [introEnabled, setIntroEnabled] = useState<boolean>(false);
  const [introTitle, setIntroTitle] = useState<string>("Executive Presentation");
  const [introSubtitle, setIntroSubtitle] = useState<string>("Created with Screen Recorder & Video Editor");
  const [introDuration, setIntroDuration] = useState<number>(3.0);
  const [introBg, setIntroBg] = useState<string>("indigo");

  // Web Audio Context reference instances
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);
  const hpFilterRef = useRef<BiquadFilterNode | null>(null);
  const notchFilterRef = useRef<BiquadFilterNode | null>(null);
  const isAudioConnected = useRef<boolean>(false);

  // Initialize Web Audio Processing Pipeline
  const initAudioEngine = () => {
    if (!videoRef.current) return;
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const source = ctx.createMediaElementSource(videoRef.current);
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        // Smart cleaning filters
        const hpNode = ctx.createBiquadFilter();
        hpNode.type = "highpass";
        hpNode.frequency.value = smartAudioClean ? 80 : 10;

        const notchNode = ctx.createBiquadFilter();
        notchNode.type = "notch";
        notchNode.frequency.value = smartAudioClean ? 60 : 10;
        notchNode.Q.value = smartAudioClean ? 12 : 0.01;

        // 3-band custom equalizer nodes
        const bassNode = ctx.createBiquadFilter();
        bassNode.type = "lowshelf";
        bassNode.frequency.value = 150;
        bassNode.gain.value = bassGain;

        const midNode = ctx.createBiquadFilter();
        midNode.type = "peaking";
        midNode.frequency.value = 1000;
        midNode.Q.value = 1.0;
        midNode.gain.value = midGain;

        const trebleNode = ctx.createBiquadFilter();
        trebleNode.type = "highshelf";
        trebleNode.frequency.value = 4000;
        trebleNode.gain.value = trebleGain;

        // Build Chain: source -> hpNode -> notchNode -> filter (preset) -> bassNode -> midNode -> trebleNode -> gain -> destination
        source.connect(hpNode);
        hpNode.connect(notchNode);
        notchNode.connect(filter);
        filter.connect(bassNode);
        bassNode.connect(midNode);
        midNode.connect(trebleNode);
        trebleNode.connect(gain);
        gain.connect(ctx.destination);

        audioCtxRef.current = ctx;
        sourceNodeRef.current = source;
        gainNodeRef.current = gain;
        filterNodeRef.current = filter;
        bassFilterRef.current = bassNode;
        midFilterRef.current = midNode;
        trebleFilterRef.current = trebleNode;
        hpFilterRef.current = hpNode;
        notchFilterRef.current = notchNode;
        isAudioConnected.current = true;
      }
    } catch (err) {
      console.warn("Web Audio API not supported/context blocked. Falling back to default playback engine.", err);
    }
  };

  // Keep Audio properties in perfect synchronization
  const syncAudioParameters = () => {
    if (!videoRef.current) return;
    const ctx = audioCtxRef.current;

    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    if (gainNodeRef.current && ctx) {
      gainNodeRef.current.gain.setValueAtTime(audioBoost, ctx.currentTime);
    }

    // Smart cleaning Filter nodes sync
    if (hpFilterRef.current && ctx) {
      hpFilterRef.current.frequency.setValueAtTime(smartAudioClean ? 80 : 10, ctx.currentTime);
    }
    if (notchFilterRef.current && ctx) {
      notchFilterRef.current.frequency.setValueAtTime(smartAudioClean ? 60 : 10, ctx.currentTime);
      notchFilterRef.current.Q.setValueAtTime(smartAudioClean ? 12 : 0.01, ctx.currentTime);
    }

    // Custom 3-band equalizer parameters
    if (bassFilterRef.current && ctx) {
      bassFilterRef.current.gain.setValueAtTime(bassGain, ctx.currentTime);
    }
    if (midFilterRef.current && ctx) {
      midFilterRef.current.gain.setValueAtTime(midGain, ctx.currentTime);
    }
    if (trebleFilterRef.current && ctx) {
      trebleFilterRef.current.gain.setValueAtTime(trebleGain, ctx.currentTime);
    }

    if (filterNodeRef.current && ctx) {
      switch (audioPreset) {
        case "bass":
          filterNodeRef.current.type = "lowshelf";
          filterNodeRef.current.frequency.setValueAtTime(160, ctx.currentTime);
          filterNodeRef.current.gain.setValueAtTime(14, ctx.currentTime);
          break;
        case "speech":
          filterNodeRef.current.type = "highshelf";
          filterNodeRef.current.frequency.setValueAtTime(3000, ctx.currentTime);
          filterNodeRef.current.gain.setValueAtTime(11, ctx.currentTime);
          break;
        case "radio":
          filterNodeRef.current.type = "peaking";
          filterNodeRef.current.frequency.setValueAtTime(1000, ctx.currentTime);
          filterNodeRef.current.Q.setValueAtTime(1.8, ctx.currentTime);
          filterNodeRef.current.gain.setValueAtTime(-7, ctx.currentTime);
          break;
        case "lowpass":
          filterNodeRef.current.type = "lowpass";
          filterNodeRef.current.frequency.setValueAtTime(1100, ctx.currentTime);
          break;
        default: // Bypass EQ
          filterNodeRef.current.type = "peaking";
          filterNodeRef.current.frequency.setValueAtTime(1000, ctx.currentTime);
          filterNodeRef.current.gain.setValueAtTime(0, ctx.currentTime);
          break;
      }
    }

    // Fallback if Web Audio API setup couldn't finish
    if (!isAudioConnected.current) {
      videoRef.current.volume = Math.min(1.0, audioBoost);
    } else {
      // Source node takes over internal elements
      videoRef.current.volume = 1.0;
    }
  };

  // Sync volume / EQ presets on state adjustments
  useEffect(() => {
    syncAudioParameters();
  }, [audioBoost, audioPreset, bassGain, midGain, trebleGain, smartAudioClean, videoUrl]);

  // Synchronize timeline main video clip properties with parent trimmer bounds
  useEffect(() => {
    setTimelineClips(prev => 
      prev.map(clip => {
        if (clip.id === "clip-video-main") {
          return { ...clip, start: trimStart, end: trimEnd };
        }
        return clip;
      })
    );
  }, [trimStart, trimEnd]);

  // --- TIMELINE EDITING & CROPPING HANDLERS ---
  const getProportionalStyle = (start: number, end: number) => {
    const total = duration || 10;
    const left = (start / total) * 100;
    const width = ((end - start) / total) * 100;
    return {
      left: `${Math.max(0, Math.min(99, left))}%`,
      width: `${Math.max(1, Math.min(100, width))}%`
    };
  };

  const handleSplitAtPlayhead = () => {
    const targetClip = timelineClips.find(c => c.id === selectedClipId);
    if (!targetClip) {
      alert("Please select a timeline clip layer to split.");
      return;
    }
    if (playbackTime <= targetClip.start || playbackTime >= targetClip.end) {
      alert(`The active playhead (${playbackTime.toFixed(2)}s) must be positioned inside the selected clip's bounds (${targetClip.start.toFixed(2)}s - ${targetClip.end.toFixed(2)}s) to cut it.`);
      return;
    }
    
    // Split into Part A and Part B
    const splitTime = playbackTime;
    const clip1: TimelineClip = {
      ...targetClip,
      id: `${targetClip.id}-split-${Date.now()}-a`,
      title: `${targetClip.title} (Cut A)`,
      end: splitTime,
    };
    const clip2: TimelineClip = {
      ...targetClip,
      id: `${targetClip.id}-split-${Date.now()}-b`,
      title: `${targetClip.title} (Cut B)`,
      start: splitTime,
    };

    setTimelineClips(prev => {
      const idx = prev.findIndex(c => c.id === targetClip.id);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy.splice(idx, 1, clip1, clip2);
      return copy;
    });
    setSelectedClipId(clip1.id);
  };

  const handleAddBRoll = () => {
    const newClip: TimelineClip = {
      id: `custom-broll-${Date.now()}`,
      type: "b-roll",
      title: `V2: Overlaid B-Roll Clip #${timelineClips.filter(c => c.type === "b-roll").length + 1}`,
      start: Math.max(0, playbackTime),
      end: Math.min(duration || 10, playbackTime + 3),
    };
    setTimelineClips(prev => [...prev, newClip]);
    setSelectedClipId(newClip.id);
  };

  const handleAddAudio = () => {
    const newClip: TimelineClip = {
      id: `custom-audio-${Date.now()}`,
      type: "audio",
      title: `A2: Sound Track #${timelineClips.filter(c => c.type === "audio").length + 1}`,
      start: Math.max(0, playbackTime),
      end: Math.min(duration || 10, playbackTime + 4),
      volume: 60,
    };
    setTimelineClips(prev => [...prev, newClip]);
    setSelectedClipId(newClip.id);
  };

  const handleAddText = () => {
    const newClip: TimelineClip = {
      id: `custom-text-${Date.now()}`,
      type: "text",
      title: `T2: Overlay Label #${timelineClips.filter(c => c.type === "text").length + 1}`,
      start: Math.max(0, playbackTime),
      end: Math.min(duration || 10, playbackTime + 3.5),
      text: "🔥 NEW OUTLINE LAYER 🔥",
      color: "indigo",
    };
    setTimelineClips(prev => [...prev, newClip]);
    setSelectedClipId(newClip.id);
  };

  const handleSelectedClipPropChange = (field: keyof TimelineClip, val: any) => {
    setTimelineClips(prev => prev.map(c => {
      if (c.id === selectedClipId) {
        const updated = { ...c, [field]: val };
        // If we adjust main video clip start or end, update parent bounds accordingly
        if (c.id === "clip-video-main") {
          if (field === "start") onTrimChange(parseFloat(val), c.end);
          if (field === "end") onTrimChange(c.start, parseFloat(val));
        }
        return updated;
      }
      return c;
    }));
  };

  const handleDeleteClip = (id: string) => {
    if (id === "clip-video-main") {
      alert("The primary tracking line (V1) cannot be deleted as it is the recording frame's anchor track.");
      return;
    }
    setTimelineClips(prev => prev.filter(c => c.id !== id));
    setSelectedClipId("clip-video-main");
  };

  // Safely deallocate audio elements on destroy
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Synchronize duration when active item changes or trimmer boundary is modified
  useEffect(() => {
    if (trimEnd > 0) {
      setDuration(trimEnd);
    }
  }, [trimEnd]);

  // Synchronize fullscreen state for subtle UI shifts
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Enter or exit fullscreen natively
  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch((err) => {
          console.error("Error entering full screen mode:", err);
          if (videoRef.current) {
            videoRef.current.requestFullscreen().catch(console.error);
          }
        });
      } else {
        document.exitFullscreen().catch(console.error);
      }
    }
  };

  // Keep playback speed in sync with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, videoUrl]);

  // Create local object URL for the blob
  useEffect(() => {
    const url = URL.createObjectURL(videoBlob);
    setVideoUrl(url);
    setIsPlaying(false);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoBlob]);

  // Handle video loaded metadata
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      let videoDuration = videoRef.current.duration || 0;
      
      if (videoDuration === Infinity || isNaN(videoDuration) || videoDuration <= 0.05) {
        videoDuration = trimEnd || duration || 0;
      }
      
      setDuration(videoDuration);
      videoRef.current.playbackRate = playbackSpeed;
      if (trimEnd === 0 || trimEnd > videoDuration) {
        onTrimChange(trimStart, videoDuration);
      }
    }
  };

  // Keep Track of Active Subtitles
  useEffect(() => {
    const matched = captions.find(
      (c) => playbackTime >= c.start && playbackTime <= c.end
    );
    setActiveCaption(matched ? matched.text : "");
  }, [playbackTime, captions]);

  // Manage Play / Pause / Constraints Loop
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Handle volume controls
  const toggleMuted = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const currentTime = video.currentTime;

    // Loop or reset back within trim range
    if (currentTime < trimStart) {
      video.currentTime = trimStart;
      onPlaybackTimeUpdate(trimStart);
    } else if (currentTime > trimEnd) {
      video.currentTime = trimStart;
      onPlaybackTimeUpdate(trimStart);
    } else {
      onPlaybackTimeUpdate(currentTime);
    }
  };

  const handlePlayPause = () => {
    if (!isPlaying) {
      initAudioEngine();
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = trimStart;
      onPlaybackTimeUpdate(trimStart);
      if (!isPlaying) {
        initAudioEngine();
        setIsPlaying(true);
      }
    }
  };

  // Adjust trim sliders
  const handleStartSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newStart = Math.min(val, trimEnd - 0.5);
    onTrimChange(newStart, trimEnd);
    if (videoRef.current) {
      videoRef.current.currentTime = newStart;
      onPlaybackTimeUpdate(newStart);
    }
  };

  const handleEndSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newEnd = Math.max(val, trimStart + 0.5);
    onTrimChange(trimStart, newEnd);
    if (videoRef.current && videoRef.current.currentTime > newEnd) {
      videoRef.current.currentTime = trimStart;
      onPlaybackTimeUpdate(trimStart);
    }
  };

  // Click on timeline to jump
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const clickedTime = percentage * duration;

    if (clickedTime >= trimStart && clickedTime <= trimEnd) {
      if (videoRef.current) {
        videoRef.current.currentTime = clickedTime;
        onPlaybackTimeUpdate(clickedTime);
      }
    }
  };

  const formatTime = (timeInSecs: number) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    const ms = Math.floor((timeInSecs % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  // Aspect ratio class mapper
  const getAspectRatioClass = (ratio: string) => {
    switch (ratio) {
      case "16-9": return "aspect-video w-full";
      case "9-16": return "aspect-[9/16] max-h-[480px] mx-auto";
      case "1-1": return "aspect-square max-w-[455px] mx-auto";
      case "4-3": return "aspect-[4/3] max-w-[550px] mx-auto";
      case "21-9": return "aspect-[21/9] w-full";
      default: return "aspect-video w-full";
    }
  };

  // Dynamic CSS Filter mappings combined with custom fine-tuning adjustments
  const getFilterStyle = (filter: string) => {
    let baseFilter = "";
    switch (filter) {
      case "grayscale":
        baseFilter = "grayscale(100%) contrast(105%)";
        break;
      case "sepia":
        baseFilter = "sepia(100%) brightness(95%) contrast(95%)";
        break;
      case "vintage":
        baseFilter = "sepia(45%) hue-rotate(-15deg) saturate(130%) contrast(110%)";
        break;
      case "cool":
        baseFilter = "saturate(110%) hue-rotate(15deg) brightness(97%) contrast(98%)";
        break;
      case "vivid":
        baseFilter = "saturate(170%) contrast(115%) brightness(100%)";
        break;
      case "invert":
        baseFilter = "invert(100%) contrast(100%)";
        break;
      case "contrast":
        baseFilter = "contrast(180%)";
        break;
      case "warm":
        baseFilter = "sepia(25%) saturate(120%) brightness(98%)";
        break;
      default:
        baseFilter = "";
        break;
    }
    const fineTuning = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hueRotate}deg)`;
    return baseFilter ? `${baseFilter} ${fineTuning}` : fineTuning;
  };

  // Custom Title Intro Styling helper
  const getIntroBgStyle = (bgName: string) => {
    switch (bgName) {
      case "indigo": return "bg-gradient-to-tr from-indigo-950 via-slate-900 to-indigo-900";
      case "slate": return "bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800";
      case "emerald": return "bg-gradient-to-tr from-teal-980 via-slate-950 to-emerald-950";
      case "purple": return "bg-gradient-to-tr from-purple-950 via-slate-950 to-fuchsia-950";
      case "amber": return "bg-gradient-to-tr from-amber-950 via-slate-950 to-orange-950";
      default: return "bg-slate-950";
    }
  };

  const getWatermarkPositionClass = (pos: string) => {
    switch (pos) {
      case "top-left": return "top-4 left-4 text-left";
      case "top-right": return "top-4 right-4 text-right";
      case "bottom-left": return "bottom-14 left-4 text-left";
      case "bottom-right": return "bottom-14 right-4 text-right";
      case "center-title": return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 text-center";
      default: return "bottom-14 right-4 text-right";
    }
  };

  const getWatermarkColorClass = (colorName: string) => {
    switch (colorName) {
      case "indigo": return "text-indigo-400";
      case "yellow": return "text-yellow-400";
      case "amber": return "text-amber-500";
      case "emerald": return "text-emerald-400";
      default: return "text-white/80";
    }
  };

  // Evaluate Intro Card condition
  const isIntroActive = introEnabled && (playbackTime < (trimStart + introDuration));
  const introTimeRemaining = (trimStart + introDuration) - playbackTime;
  const introOpacity = introTimeRemaining < 0.5 ? Math.max(0, introTimeRemaining / 0.5) : 1;

  // Evaluate if any text clip is currently active on the timeline
  const activeTimelineText = timelineClips.find(
    clip => clip.type === "text" && playbackTime >= clip.start && playbackTime <= clip.end
  );

  // Evaluate if any B-roll overlay segment is active on the timeline
  const activeBRoll = timelineClips.find(
    clip => clip.type === "b-roll" && playbackTime >= clip.start && playbackTime <= clip.end
  );

  return (
    <div id="video-editing-player-wrapper" className="flex flex-col gap-5">
      
      {/* Visual Canvas Player */}
      <div 
        ref={containerRef}
        className={`relative rounded-3xl bg-slate-950 overflow-hidden shadow-2xl border border-slate-800 group select-none shadow-indigo-100/10 flex items-center justify-center transition-all duration-300 ${getAspectRatioClass(aspectRatio)}`}
        onDoubleClick={handleFullscreen}
      >
        {videoUrl ? (
          <div className="w-full h-full overflow-hidden flex items-center justify-center relative">
            <video
              ref={videoRef}
              src={videoUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full h-full object-cover cursor-pointer transition-all duration-300 origin-center"
              id="rendering-video-node"
              onClick={handlePlayPause}
              style={{ 
                filter: getFilterStyle(videoFilter),
                transform: `scale(${videoZoom / 100}) translate(${videoPanX}px, ${videoPanY}px)`
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm gap-2">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Preparing preview stream...</span>
          </div>
        )}

        {/* Live Multi-track B-Roll Sequential PiP Simulation */}
        {activeBRoll && !isIntroActive && (
          <div 
            id="timeline-broll-pip-indicator"
            className="absolute top-4 right-4 w-40 aspect-video rounded-xl bg-slate-900 border border-white/20 shadow-xl overflow-hidden pointer-events-none z-40 flex flex-col justify-between p-2 text-white"
          >
            <div className="flex justify-between items-center bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
              <span className="text-amber-400">V2 OVERLAY STREAM</span>
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
            </div>
            
            {/* Visual simulation of scanline and stacked B-roll segment */}
            <div className="text-center my-auto">
              <p className="text-[9px] font-black tracking-tight leading-none uppercase text-slate-200">
                {activeBRoll.title}
              </p>
              <p className="text-[7px] text-slate-400 font-mono mt-0.5">Stacked Multi-Layer Segment</p>
            </div>

            <div className="bg-black/40 text-[7px] text-center py-0.5 rounded font-mono">
              SEC: {activeBRoll.start.toFixed(1)}s - {activeBRoll.end.toFixed(1)}s
            </div>
            
            {/* Ambient scanner visual effect */}
            <div className="absolute inset-0 bg-linear-to-b from-transparent via-indigo-500/10 to-transparent pointer-events-none animate-pulse"></div>
          </div>
        )}

        {/* Live Multi-track Dragged Graphic/Subtitle Text Layer */}
        {activeTimelineText && !isIntroActive && (
          <div
            id="timeline-text-graphic-overlay"
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[85%] max-w-md bg-indigo-950/90 backdrop-blur-xs border-2 border-amber-400/80 text-amber-300 text-xs sm:text-sm font-black px-4 py-2.5 rounded-2xl text-center shadow-2xl pointer-events-none z-50 uppercase tracking-widest leading-tight"
          >
            <span className="block text-[8px] tracking-widest text-slate-400 font-bold mb-1">[GRAPHIC OVERLAY]</span>
            {activeTimelineText.text || "NO OVERLAY CONTENT DEFINED"}
          </div>
        )}

        {/* Dynamic Watermark / Branding Text Overlay */}
        {watermarkText.trim() && !isIntroActive && (
          <div 
            id="video-watermark-overlay"
            className={`absolute font-mono text-[10px] sm:text-xs font-bold pointer-events-none drop-shadow-md tracking-wider transition-all duration-300 z-40 bg-black/30 backdrop-blur-3xs px-2 py-1 rounded border border-white/5 uppercase ${getWatermarkPositionClass(watermarkPosition)} ${getWatermarkColorClass(watermarkColor)}`}
          >
            {watermarkText}
          </div>
        )}

        {/* Captions Overlay */}
        {activeCaption && !isIntroActive && (
          <div
            id="video-caption-overlay"
            className="absolute bottom-12 left-1/2 -translate-x-1/2 w-11/12 max-w-lg bg-black/85 backdrop-blur-xs text-white text-xs sm:text-sm md:text-base font-semibold px-4 py-2 rounded-xl text-center shadow-xl pointer-events-none border border-white/10 animate-fade-in z-50"
          >
            {activeCaption}
          </div>
        )}

        {/* Custom Intro Slide Title Card Overlay */}
        {isIntroActive && (
          <div
            className={`absolute inset-0 flex flex-col justify-center items-center p-8 z-45 transition-all duration-300 ${getIntroBgStyle(introBg)}`}
            style={{ opacity: introOpacity }}
            id="video-intro-slide-overlay"
          >
            <div className="flex items-center gap-2 mb-4 bg-white/10 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              <span className="text-[9px] font-bold tracking-widest text-white uppercase">Video Introduction</span>
            </div>
            
            <div className="max-w-xl text-center space-y-2.5 animate-fade-in">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-relaxed drop-shadow-sm uppercase">
                {introTitle || "Classroom Lecture"}
              </h2>
              <div className="w-12 h-1 bg-yellow-400 mx-auto rounded"></div>
              <p className="text-xs sm:text-sm text-slate-300/90 font-medium tracking-wide leading-relaxed drop-shadow-sm">
                {introSubtitle}
              </p>
            </div>

            {/* Custom mini spinner countdown */}
            <div className="absolute bottom-6 flex items-center gap-2 text-[9px] font-mono text-slate-400 uppercase tracking-widest">
              <div className="w-2.5 h-2.5 border border-slate-500 border-t-white rounded-full animate-spin"></div>
              <span>Playback begins in {Math.max(0.1, (introTimeRemaining)).toFixed(1)}s</span>
            </div>
          </div>
        )}

        {/* Top Floating Stats HUD */}
        <div className="absolute top-4 left-4 right-4 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-40">
          <div className="px-2.5 py-1 bg-slate-900/80 backdrop-blur-xs rounded-lg text-white font-mono text-[10px] sm:text-xs">
            TRIMMED: {formatTime(trimStart)} - {formatTime(trimEnd)}
          </div>
          <div className="px-2.5 py-1 bg-slate-900/80 backdrop-blur-xs rounded-lg text-white font-mono text-[10px] sm:text-xs">
            CURRENT: {formatTime(playbackTime)}
          </div>
        </div>

        {/* Double-click instruction overlay */}
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-75 transition-opacity duration-300 pointer-events-none bg-slate-900/60 text-white font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">
          Double-click to Fullscreen
        </div>
      </div>

      {/* Control Actions Mini Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm shadow-slate-100">
        <div className="flex items-center gap-2">
          <button
            id="media-btn-play-pause"
            onClick={handlePlayPause}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.03]"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
          </button>
          <button
            id="media-btn-restart"
            onClick={handleRestart}
            className="p-2.5 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 bg-white rounded-xl transition-all cursor-pointer"
            title="Jump to Trim Start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Playback speed selector */}
        <div className="flex items-center gap-1.5" id="playback-speed-control-container">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Speed:</span>
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
            {[0.5, 1, 1.5, 2].map((speed) => (
              <button
                key={speed}
                type="button"
                id={`playback-speed-${speed}x`}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  playbackSpeed === speed
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Scrubber indicator and duration metrics */}
          <span className="font-mono text-xs text-slate-500 tracking-tight mr-1.5">
            {formatTime(playbackTime)} / {formatTime(duration || 0)}
          </span>

          {/* Audio helper on preview */}
          <button
            id="media-btn-mute"
            onClick={toggleMuted}
            className="p-2 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 bg-white rounded-xl transition-all cursor-pointer"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Play on Full Screen Mode */}
          <button
            id="media-btn-fullscreen"
            onClick={handleFullscreen}
            className={`p-2 border rounded-xl transition-all cursor-pointer ${
              isFullscreen
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-900 bg-white"
            }`}
            title="Play on Full Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Trimmer Timeline */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider">
            <Scissors className="w-4 h-4 text-indigo-500" />
            <span>Range Trimmer</span>
          </div>
          <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold border border-indigo-100">
            Selected: {formatTime(trimEnd - trimStart)}
          </span>
        </div>

        {/* Interactive Trimmer Range sliders and track */}
        <div className="relative mt-8 mb-4 h-4 bg-slate-100 rounded-full select-none" id="trimmer-track">
          <div
            id="timeline-scutter-clickable"
            onClick={handleTimelineClick}
            className="absolute inset-0 rounded-full cursor-pointer flex items-center justify-start overflow-hidden"
          >
            {/* Visual Highlights of caption density */}
            {captions.map((cap) => {
              const capLeft = duration ? (cap.start / duration) * 100 : 0;
              const capWidth = duration ? ((cap.end - cap.start) / duration) * 100 : 0;
              return (
                <div
                  key={cap.id}
                  className="absolute h-full bg-indigo-500/15 top-0"
                  style={{ left: `${capLeft}%`, width: `${capWidth}%` }}
                  title={`Caption: ${cap.text}`}
                />
              );
            })}

            {/* Active playback head line */}
            {duration > 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-indigo-600 z-10 before:content-[''] before:absolute before:-top-1 before:-left-1 before:w-2.5 before:h-2.5 before:bg-indigo-600 before:rounded-full"
                style={{ left: `${(playbackTime / duration) * 100}%` }}
              />
            )}
            
            {/* Shaded boundaries outside of trimmed area */}
            {duration > 0 && (
              <>
                <div
                  className="absolute left-0 top-0 bottom-0 bg-slate-950/10"
                  style={{ width: `${(trimStart / duration) * 100}%` }}
                />
                <div
                  className="absolute right-0 top-0 bottom-0 bg-slate-950/10"
                  style={{ left: `${(trimEnd / duration) * 100}%` }}
                />
              </>
            )}
          </div>

          {/* Dual Range Sliders overlays */}
          <input
            id="trim-start-range-slider"
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={trimStart}
            onChange={handleStartSliderChange}
            className="absolute left-0 w-full -top-1 pointer-events-none appearance-none bg-transparent opacity-100 hover:opacity-100 cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:rounded-md [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
          />
          <input
            id="trim-end-range-slider"
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={trimEnd}
            onChange={handleEndSliderChange}
            className="absolute left-0 w-full -top-1 pointer-events-none appearance-none bg-transparent opacity-100 hover:opacity-100 cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-rose-500 [&::-webkit-slider-thumb]:rounded-md [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
          />
        </div>

        {/* Manual inputs helper labels */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-600"></span>
            <span>Trim Start: <strong className="font-mono text-slate-800">{formatTime(trimStart)}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Trim End: <strong className="font-mono text-slate-800">{formatTime(trimEnd)}</strong></span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* CORES MEDIA EDITING WORKSPACE: BENTO INTERACTIVE EFFECTS TAB PANEL */}
      {/* ============================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden" id="advanced-studio-effects-cabinet">
        <div className="absolute top-0 right-0 p-16 w-48 h-48 bg-linear-to-bl from-teal-500/5 to-transparent rounded-full blur-xl pointer-events-none"></div>
        
        {/* Section Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 mb-6 relative z-10">
          <div>
            <span className="flex items-center gap-1.5 text-xs font-bold text-teal-400 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Studio Master FX</span>
            </span>
            <h3 className="font-black text-white text-sm mt-0.5 tracking-tight">Core Editing & Production Rack</h3>
          </div>

          {/* Selector Navigation */}
          <div className="flex border border-slate-850 bg-slate-950 p-1 rounded-xl gap-1 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "timeline"
                  ? "bg-slate-805 text-white shadow-md ring-1 ring-slate-800 font-extrabold bg-[#1e293b] border-b-2 border-teal-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              <Scissors className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Multi-Track Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("crop")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "crop"
                  ? "bg-slate-805 text-white shadow-md ring-1 ring-slate-800 font-extrabold bg-[#1e293b] border-b-2 border-violet-450"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              <Crop className="w-3.5 h-3.5 text-violet-400" />
              <span>Scale & Crop</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("filters")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "filters"
                  ? "bg-slate-805 text-white shadow-md ring-1 ring-slate-800 font-extrabold bg-[#1e293b] border-b-2 border-teal-450"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              <Layers3 className="w-3.5 h-3.5 text-teal-400" />
              <span>Filters & Overlay</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("audio")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "audio"
                  ? "bg-slate-805 text-white shadow-md ring-1 ring-slate-800 font-extrabold bg-[#1e293b] border-b-2 border-emerald-450"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              <Music className="w-3.5 h-3.5 text-emerald-400" />
              <span>EQ Voice Mixer</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("intro")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "intro"
                  ? "bg-slate-805 text-white shadow-md ring-1 ring-slate-800 font-extrabold bg-[#1e293b] border-b-2 border-slate-450"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              <Clapperboard className="w-3.5 h-3.5 text-slate-300" />
              <span>Intro Slides</span>
            </button>
          </div>
        </div>
               {/* Tab content 0.1: Multi-Layer Timeline */}
        {activeTab === "timeline" && (
          <div className="space-y-6 animate-fade-in" id="production-tab-timeline">
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
              <h4 className="text-xs font-black text-teal-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                <span>Multi-Layer Editor Studio</span>
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Stack video layers, B-roll overlays, custom audio tracks, and floating text overlays. Double-click or click to highlight any segment block to fine-tune bounds or cut sections.
              </p>

              {/* Action trigger deck: insertion and splitting in 1 click */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-850">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Insert layer:</span>
                  <button
                    type="button"
                    onClick={handleAddBRoll}
                    className="px-2.5 py-1 text-[10px] font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-indigo-100"
                  >
                    <Plus className="w-3 h-3 text-indigo-600" />
                    <span>V2: B-Roll overlay</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAudio}
                    className="px-2.5 py-1 text-[10px] font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-emerald-100"
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    <span>A2: Audio score</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddText}
                    className="px-2.5 py-1 text-[10px] font-black bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-amber-100"
                  >
                    <Plus className="w-3 h-3 text-amber-600" />
                    <span>T2: Graphic Text</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSplitAtPlayhead}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    title="Split the highlighted clip segment into two sequences at the current cursor playback point."
                  >
                    <Split className="w-3 h-3" />
                    <span>Cut Segment At Playhead ✂️</span>
                  </button>
                </div>
              </div>
            </div>

            {/* STACKED MULTI-TRACK CONTAINER */}
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-950 font-mono text-[9px] relative select-none">
              <div className="flex justify-between items-center text-slate-505 font-bold tracking-widest uppercase border-b border-slate-800/80 pb-2 mb-3">
                <span className="text-[8px] text-slate-400">Studio Track Layout View</span>
                <span className="text-slate-400">Max Duration: {formatTime(duration)}</span>
              </div>

              {/* Stack of three layered horizontal timelines */}
              <div className="space-y-4 relative animate-fade-in" id="timeline-tracks-stack">
                
                {/* Visual Playhead cursor overlay bar reaching all three tracks */}
                {duration > 0 && (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-500 pointer-events-none z-30 shadow-indigo-500 shadow-sm"
                    style={{ left: `${(playbackTime / duration) * 100}%` }}
                  >
                    {/* Tiny handle on playhead */}
                    <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full border border-white flex items-center justify-center font-bold text-[6px] text-white select-none shadow-sm shadow-rose-200">
                      ▶
                    </div>
                  </div>
                )}

                {/* Track 1: Video & B-Roll clips */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 font-extrabold tracking-wider text-[8px] uppercase">
                    <span>🎬 V1/V2 Video & B-Roll Track</span>
                  </div>
                  <div className="relative h-11 bg-slate-950/80 rounded-xl border border-slate-800 p-1 flex items-center">
                    {/* Background tickmarks */}
                    <div className="absolute inset-0 flex justify-between px-2 text-slate-800 opacity-40 text-[7px] pointer-events-none">
                      <span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span>
                    </div>

                    {timelineClips
                      .filter(clip => clip.type === "video" || clip.type === "b-roll")
                      .map(clip => {
                        const style = getProportionalStyle(clip.start, clip.end);
                        const isMain = clip.id === "clip-video-main";
                        const isSelected = clip.id === selectedClipId;
                        return (
                          <button
                            key={clip.id}
                            type="button"
                            onClick={() => setSelectedClipId(clip.id)}
                            style={style}
                            className={`absolute h-[82%] rounded-lg p-1.5 text-left transition-all border flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? "bg-rose-500/20 border-rose-500 text-rose-300 ring-2 ring-rose-500/50 shadow-md z-20"
                                : isMain
                                ? "bg-indigo-950/60 border-indigo-800 text-indigo-250 hover:border-slate-500 hover:bg-indigo-900/40 z-10"
                                : "bg-slate-800 border-slate-700 text-slate-350 hover:bg-slate-700/80 z-10"
                            }`}
                          >
                            <p className="truncate font-black text-[8px] tracking-tight leading-none uppercase">
                              {clip.id === "clip-video-main" ? "V1: Primary Capture" : clip.title}
                            </p>
                            <p className="text-[7px] text-slate-400/80 font-mono mt-0.5 leading-none">
                              {clip.start.toFixed(1)}s - {clip.end.toFixed(1)}s
                            </p>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Track 2: Audio tracks */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 font-extrabold tracking-wider text-[8px] uppercase">
                    <span>🎵 A1/A2 Audio FX Track</span>
                  </div>
                  <div className="relative h-11 bg-slate-950/80 rounded-xl border border-slate-800 p-1 flex items-center">
                    <div className="absolute inset-0 flex justify-between px-2 text-slate-800 opacity-40 text-[7px] pointer-events-none">
                      <span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span>
                    </div>

                    {timelineClips
                      .filter(clip => clip.type === "audio")
                      .map(clip => {
                        const style = getProportionalStyle(clip.start, clip.end);
                        const isSelected = clip.id === selectedClipId;
                        return (
                          <button
                            key={clip.id}
                            type="button"
                            onClick={() => setSelectedClipId(clip.id)}
                            style={style}
                            className={`absolute h-[82%] rounded-lg p-1.5 text-left transition-all border flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/50 shadow-md z-20"
                                : "bg-teal-950/40 border-teal-900 text-emerald-250 hover:border-slate-500 hover:bg-teal-900/30 z-10"
                            }`}
                          >
                            <p className="truncate font-black text-[8px] tracking-tight leading-none uppercase">
                              {clip.title}
                            </p>
                            <p className="text-[7px] text-slate-400/85 font-mono mt-0.5 leading-none">
                              {clip.start.toFixed(1)}s - {clip.end.toFixed(1)}s
                            </p>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Track 3: Text Custom overlays */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 font-extrabold tracking-wider text-[8px] uppercase">
                    <span>💬 T1/T2 Graphic Text Layers</span>
                  </div>
                  <div className="relative h-11 bg-slate-950/80 rounded-xl border border-slate-800 p-1 flex items-center">
                    <div className="absolute inset-0 flex justify-between px-2 text-slate-800 opacity-40 text-[7px] pointer-events-none">
                      <span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span>
                    </div>

                    {timelineClips
                      .filter(clip => clip.type === "text")
                      .map(clip => {
                        const style = getProportionalStyle(clip.start, clip.end);
                        const isSelected = clip.id === selectedClipId;
                        return (
                          <button
                            key={clip.id}
                            type="button"
                            onClick={() => setSelectedClipId(clip.id)}
                            style={style}
                            className={`absolute h-[82%] rounded-lg p-1.5 text-left transition-all border flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? "bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/50 shadow-md z-20"
                                : "bg-amber-950/30 border-amber-900 text-amber-250 hover:border-slate-500 hover:bg-amber-900/20 z-10"
                            }`}
                          >
                            <p className="truncate font-black text-[8px] tracking-tight leading-none uppercase">
                              {clip.title}
                            </p>
                            <p className="text-[7px] text-slate-400/85 font-mono mt-0.5 leading-none">
                              {clip.start.toFixed(1)}s - {clip.end.toFixed(1)}s
                            </p>
                          </button>
                        );
                      })}
                  </div>
                </div>

              </div>
            </div>

            {/* SEGMENT EDITING & INSPECTOR SECTION */}
            {timelineClips.find(c => c.id === selectedClipId) && (() => {
              const activeItem = timelineClips.find(c => c.id === selectedClipId)!;
              return (
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/50 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Inspector: <strong className="text-slate-950">{activeItem.title}</strong>
                      </h4>
                    </div>
                    {activeItem.id !== "clip-video-main" ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteClip(activeItem.id)}
                        className="px-2 py-1 text-[9px] font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 bg-white"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete Clip Segment</span>
                      </button>
                    ) : (
                      <span className="text-[8px] text-slate-400 font-mono font-bold uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">Primary V1 Lock</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                    
                    {/* Item title and parameters */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Clip Identifier Custom Banner Name</label>
                        <input
                          type="text"
                          value={activeItem.title}
                          onChange={(e) => handleSelectedClipPropChange("title", e.target.value)}
                          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-505"
                        />
                      </div>

                      {/* Display Volume slider IF it's audio */}
                      {activeItem.type === "audio" && (
                        <div>
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-450 uppercase mb-1.5">
                            <span>Sourced Track Volume Gain</span>
                            <span className="font-mono text-indigo-700 font-bold">{activeItem.volume ?? 100}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={activeItem.volume ?? 100}
                            onChange={(e) => handleSelectedClipPropChange("volume", parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>
                      )}

                      {/* Display Overlay Text IF it's text */}
                      {activeItem.type === "text" && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Banner Caption Content</label>
                          <input
                            type="text"
                            value={activeItem.text ?? ""}
                            onChange={(e) => handleSelectedClipPropChange("text", e.target.value)}
                            placeholder="e.g. DYNAMIC ANNOUNCEMENT"
                            className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-indigo-505"
                          />
                        </div>
                      )}
                    </div>

                    {/* Left and Right sliding edges for trim length changes */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                      <p className="text-[9px] text-slate-450 font-medium font-mono uppercase tracking-wide">
                        Trim edge parameters (dragging lengths equivalent)
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                            <span>Start Boundary</span>
                            <span className="font-mono text-indigo-700 font-bold">{activeItem.start.toFixed(1)}s</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={activeItem.end - 0.2}
                            step={0.1}
                            value={activeItem.start}
                            onChange={(e) => handleSelectedClipPropChange("start", parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                            <span>End Boundary</span>
                            <span className="font-mono text-indigo-700 font-bold">{activeItem.end.toFixed(1)}s</span>
                          </div>
                          <input
                            type="range"
                            min={activeItem.start + 0.2}
                            max={duration}
                            step={0.1}
                            value={activeItem.end}
                            onChange={(e) => handleSelectedClipPropChange("end", parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>
                      </div>

                      <div className="text-[9px] text-slate-400 flex justify-between bg-slate-50 p-2 rounded-lg font-bold">
                        <span>Min Start Limit: 0.0s</span>
                        <span className="text-indigo-600">Locked Span: {(activeItem.end - activeItem.start).toFixed(1)}s</span>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Tab content 0.2: Crop & Resize Dashboard */}
        {activeTab === "crop" && (
          <div className="space-y-6 animate-fade-in font-sans" id="production-tab-crop">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Presets Grid */}
              <div className="md:col-span-5 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Crop className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Choose Layout Preset</span>
                </h4>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                  Conform output dimensions to major presentation standards. Instantly centers content coordinates.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "16-9", label: "16:9 widescreen", ratioDesc: "YouTube / Desktop" },
                    { id: "9-16", label: "9:16 portrait", ratioDesc: "Shorts / TikTok" },
                    { id: "1-1", label: "1:1 square", ratioDesc: "Instagram Feed" },
                    { id: "4-3", label: "4:3 standard", ratioDesc: "Classic Standard" },
                    { id: "21-9", label: "21:9 Cinema", ratioDesc: "Ultra-widescreen" }
                  ].map((aspect) => (
                    <button
                      key={aspect.id}
                      type="button"
                      onClick={() => setAspectRatio(aspect.id)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        aspectRatio === aspect.id
                          ? "border-indigo-600 bg-indigo-50/60 text-indigo-900 ring-1 ring-indigo-500 font-bold"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <p className="text-[11px] font-bold capitalize">{aspect.label}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{aspect.ratioDesc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reposition & Zoom Calibration sliders */}
              <div className="md:col-span-7 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50 space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Precision Layout Reframing</span>
                </h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Fine-tune scale zoom factor, and pan horizontal/vertical focus coordinates to re-center subject captures.
                </p>

                <div className="space-y-4 pt-1">
                  
                  {/* Zoom Zoom Factor Slider */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      <span>Zoom / Scale Factor</span>
                      <span className="font-mono text-indigo-700 font-bold">{videoZoom}%</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={250}
                      step={1}
                      value={videoZoom}
                      onChange={(e) => setVideoZoom(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                    {/* Horizontal Pan offset Slider */}
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        <span>Horizontal Pan X</span>
                        <span className={`font-mono font-bold ${videoPanX > 0 ? "text-emerald-600" : videoPanX < 0 ? "text-rose-600" : "text-indigo-700"}`}>
                          {videoPanX > 0 ? `+${videoPanX}` : videoPanX}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-300}
                        max={300}
                        step={1}
                        value={videoPanX}
                        onChange={(e) => setVideoPanX(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    {/* Vertical Pan offset Slider */}
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        <span>Vertical Pan Y</span>
                        <span className={`font-mono font-bold ${videoPanY > 0 ? "text-emerald-600" : videoPanY < 0 ? "text-rose-600" : "text-indigo-700"}`}>
                          {videoPanY > 0 ? `+${videoPanY}` : videoPanY}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-300}
                        max={300}
                        step={1}
                        value={videoPanY}
                        onChange={(e) => setVideoPanY(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>

                </div>

                {/* Reset button crop */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVideoZoom(100);
                      setVideoPanX(0);
                      setVideoPanY(0);
                      setAspectRatio("16-9");
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Orientation Grid</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab content 1: Video Filters & Watermarks */}
        {activeTab === "filters" && (
          <div className="space-y-6 animate-fade-in" id="production-tab-filters">
            
            {/* Visual Filters grid */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Selected Video Filter</label>
                <span className="text-[10px] font-mono font-bold text-slate-400 capitalize bg-slate-50 px-2 py-0.5 rounded">Active: {videoFilter}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: "normal", label: "Normal (Clean)", previewBg: "bg-slate-200" },
                  { id: "vivid", label: "Vivid Color", previewBg: "bg-rose-100" },
                  { id: "warm", label: "Warm Gold", previewBg: "bg-amber-100" },
                  { id: "vintage", label: "Vintage Cine", previewBg: "bg-yellow-100/70" },
                  { id: "cool", label: "Cool Cyan", previewBg: "bg-cyan-100/75" },
                  { id: "grayscale", label: "Slate Mono", previewBg: "bg-slate-400" },
                  { id: "sepia", label: "Sepia Warm", previewBg: "bg-amber-250" },
                  { id: "invert", label: "Retro Invert", previewBg: "bg-slate-900" },
                ].map((filt) => (
                  <button
                    key={filt.id}
                    type="button"
                    onClick={() => {
                      setVideoFilter(filt.id);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      videoFilter === filt.id
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-1 ring-indigo-500"
                        : "border-slate-200 bg-white hover:border-slate-350 text-slate-700"
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded ${filt.previewBg} border border-slate-300 flex items-center justify-center`}>
                      {videoFilter === filt.id && <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
                    </div>
                    <span className="truncate">{filt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sub Watermark section */}
            <div className="border-t border-slate-150 pt-5">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Floating Branding Watermark</h4>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Input Text */}
                <div className="md:col-span-5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Watermark / Label Text</label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={24}
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="e.g. REVIEW DRAFT"
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-slate-850 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                      <Type className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Grid layout parameters and positioning */}
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Anchor Location</label>
                  <select
                    value={watermarkPosition}
                    onChange={(e) => setWatermarkPosition(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-705 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="bottom-right">Bottom Right (Default)</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="top-left">Top Left</option>
                    <option value="center-title">Centered Semi-transparent</option>
                  </select>
                </div>

                {/* Theme Selector */}
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Text Theme</label>
                  <div className="flex gap-1.5 bg-slate-50 p-1 border border-slate-200 rounded-xl h-[38px] items-center justify-around">
                    {[
                      { id: "white", color: "bg-white border-slate-350" },
                      { id: "indigo", color: "bg-indigo-500 border-indigo-600" },
                      { id: "yellow", color: "bg-yellow-300 border-yellow-400" },
                      { id: "amber", color: "bg-amber-500 border-amber-600" },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setWatermarkColor(theme.id)}
                        className={`w-5 h-5 rounded-full border cursor-pointer transition-all ${theme.color} ${
                          watermarkColor === theme.id ? "ring-2 ring-indigo-400 scale-110" : "opacity-80 hover:opacity-100"
                        }`}
                        title={`Label color: ${theme.id.toUpperCase()}`}
                      />
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Aspect Ratio and Precision Color Tuning Sliders */}
            <div className="border-t border-slate-150 pt-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 1. Format Aspect Ratio Selection */}
                <div className="lg:col-span-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Format & Aspect Ratio</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                    Automatically crop and conform output viewport dimensions to major social & presentation standards.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "16-9", label: "16:9 widescreen", ratioDesc: "YouTube / TV" },
                      { id: "9-16", label: "9:16 portrait", ratioDesc: "TikTok / Shorts" },
                      { id: "1-1", label: "1:1 square", ratioDesc: "Instagram Post" },
                      { id: "4-3", label: "4:3 classic", ratioDesc: "Retro Standard" },
                      { id: "21-9", label: "21:9 Cinema", ratioDesc: "Ultra-widescreen" }
                    ].map((aspect) => (
                      <button
                        key={aspect.id}
                        type="button"
                        onClick={() => setAspectRatio(aspect.id)}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          aspectRatio === aspect.id
                            ? "border-indigo-600 bg-indigo-50/60 text-indigo-900 ring-1 ring-indigo-500 font-bold"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <p className="text-[11px] font-bold capitalize">{aspect.label}</p>
                        <p className="text-[9px] text-slate-400 font-medium">{aspect.ratioDesc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Color Calibration Dials */}
                <div className="lg:col-span-8 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Granular Color Tuning</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                    Fine-tune hue rotation, visual contrast thresholds, and active chroma saturations in real-time.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Brightness slider */}
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        <span>Brightness</span>
                        <span className="font-mono text-indigo-700">{brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={150}
                        step={1}
                        value={brightness}
                        onChange={(e) => setBrightness(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    {/* Contrast slider */}
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        <span>Contrast</span>
                        <span className="font-mono text-indigo-700">{contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={150}
                        step={1}
                        value={contrast}
                        onChange={(e) => setContrast(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    {/* Saturation slider */}
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        <span>Saturation</span>
                        <span className="font-mono text-indigo-700">{saturation}%</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={200}
                        step={1}
                        value={saturation}
                        onChange={(e) => setSaturation(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    {/* Hue Rotate slider */}
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        <span>Hue Rotation</span>
                        <span className="font-mono text-indigo-700">{hueRotate}°</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={1}
                        value={hueRotate}
                        onChange={(e) => setHueRotate(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Reset fine tuning controls */}
                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setBrightness(100);
                        setContrast(100);
                        setSaturation(100);
                        setHueRotate(0);
                      }}
                      className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Color Grade</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Tab content 2: Advanced Audio gain Web Audio Equalizer */}
        {activeTab === "audio" && (
          <div className="space-y-6 animate-fade-in animate-duration-300" id="production-tab-audio">
            
            {/* Smart Audio Cleaning Controls */}
            <div className="bg-slate-900 border border-slate-950 p-5 rounded-2xl text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 w-60 h-60 bg-linear-to-bl from-cyan-500/10 via-indigo-500/10 to-transparent rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-bold tracking-widest text-[8px] uppercase ring-1 ring-cyan-500/20">
                      Studio FX Pro
                    </span>
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
                  </div>
                  <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
                    <span>✨ Smart Audio Cleaning System</span>
                  </h3>
                  <p className="text-[10px] text-slate-300 max-w-xl leading-relaxed">
                    Instantly filters out AC electrical line hum (50Hz / 60Hz Notch), high-frequency microphone floor hiss, and removes sub-bass environmental rumble below 80Hz.
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSmartAudioClean(!smartAudioClean);
                      initAudioEngine(); // assure initialized on user click
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase cursor-pointer transition-all flex items-center gap-2 shadow-lg ${
                      smartAudioClean
                        ? "bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-cyan-500/25"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-705"
                    }`}
                  >
                    <span>{smartAudioClean ? "Active & Cleaning ON" : "Clean Audio (Disabled)"}</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Status / Visualizer */}
              {smartAudioClean && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in font-mono text-[9px] text-slate-400">
                  <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <div className="leading-tight">
                      <p className="text-slate-350 font-bold uppercase text-[8px] tracking-wider">Sub-Bass HPF</p>
                      <p className="text-[7px] text-slate-500 font-mono">Filtered &lt; 80 Hz rumble</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                    <div className="leading-tight">
                      <p className="text-slate-350 font-bold uppercase text-[8px] tracking-wider">Mains Hum Filter</p>
                      <p className="text-[7px] text-slate-500 font-mono">60 Hz narrow notch active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
                    <div className="leading-tight">
                      <p className="text-slate-350 font-bold uppercase text-[8px] tracking-wider">Hiss Attenuator</p>
                      <p className="text-[7px] text-slate-500 font-mono">Dynamic high shelf cleaning</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Studio Booster volume slider */}
              <div className="md:col-span-6 bg-slate-50/50 p-4.5 rounded-2xl border border-slate-200/60">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Volume1 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Studio Output Gain Booster</span>
                  </label>
                  <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50/60 px-2 py-0.5 rounded border border-indigo-100">
                    {(audioBoost * 100).toFixed(0)}%
                  </span>
                </div>
                
                <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                  Amplify micro audio waves above standard browser volume levels. Web Audio API gain node processes inputs directly.
                </p>

                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-slate-400">0%</span>
                  <input
                    type="range"
                    min={0.0}
                    max={2.5}
                    step={0.1}
                    value={audioBoost}
                    onChange={(e) => {
                      setAudioBoost(parseFloat(e.target.value));
                    }}
                    className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="text-[10px] font-bold text-slate-500">250% Boost</span>
                </div>

                <div className="mt-4 flex items-start gap-1.5 bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-[10px] text-indigo-900 leading-relaxed font-semibold">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-500 animate-pulse" />
                  <span>To prevent microphone compression distortions, keep gain boosts below 180% unless original voice capture levels are extremely low.</span>
                </div>
              </div>

              {/* Biquad EQ Preset cards */}
              <div className="md:col-span-6">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Equalizer Voice Profiles</label>
                
                <div className="space-y-2">
                  {[
                    { id: "normal", label: "Flat Bypass (Default)", desc: "Direct unchanged audio pass filters." },
                    { id: "bass", label: "Warm Bass Booster 📣", desc: "Gain +12dB low-shelf shelf boost under 160Hz for deep acoustic profile." },
                    { id: "speech", label: "Speech Clarifier 🎙️", desc: "High-shelf amplification makes spoken syllables articulate." },
                    { id: "radio", label: "Retro Radio Tape 📻", desc: "Narrow peak filter band centering 1000Hz. Vintage texture output." },
                    { id: "lowpass", label: "Studio Low-Pass Buffer 🎛️", desc: "Muffles environmental static clicks by cutting anything above 1.1KHz." }
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAudioPreset(preset.id)}
                      className={`w-full text-left p-3 rounded-xl border text-xs flex justify-between items-center transition-all cursor-pointer ${
                        audioPreset === preset.id
                          ? "border-indigo-600 bg-indigo-50/40 text-indigo-900 ring-1 ring-indigo-500 font-bold"
                          : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs">{preset.label}</p>
                        <p className="text-[10px] text-slate-450 mt-0.5 font-medium leading-relaxed">{preset.desc}</p>
                      </div>
                      <div className="shrink-0 ml-4">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          audioPreset === preset.id ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-slate-50"
                        }`}>
                          {audioPreset === preset.id && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Custom 3-Band Parametric Equalizer Module */}
            <div className="border-t border-slate-150 pt-5 mt-6" id="audio-eq-sliders-block">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>3-Band Studio Parametric Equalizer</span>
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                Manually boost or cut specific audio bands on top of presets using dedicated Web Audio BiquadFilters (-15dB to +15dB).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Bass Frequency slider */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-700">Bass (150Hz)</span>
                    <span className={`font-mono text-xs font-black px-1.5 py-0.5 rounded ${
                      bassGain > 0 ? "text-emerald-700 bg-emerald-50" : bassGain < 0 ? "text-rose-700 bg-rose-50" : "text-slate-500 bg-slate-100"
                    }`}>
                      {bassGain > 0 ? `+${bassGain}` : bassGain} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-15}
                    max={15}
                    step={1}
                    value={bassGain}
                    onChange={(e) => {
                      setBassGain(parseInt(e.target.value));
                    }}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 mt-2">
                    <span>Cut (-15dB)</span>
                    <span>Flat</span>
                    <span>Boost (+15dB)</span>
                  </div>
                </div>

                {/* Mids Frequency slider */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-700">Vocal Mids (1000Hz)</span>
                    <span className={`font-mono text-xs font-black px-1.5 py-0.5 rounded ${
                      midGain > 0 ? "text-emerald-700 bg-emerald-50" : midGain < 0 ? "text-rose-700 bg-rose-50" : "text-slate-500 bg-slate-100"
                    }`}>
                      {midGain > 0 ? `+${midGain}` : midGain} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-15}
                    max={15}
                    step={1}
                    value={midGain}
                    onChange={(e) => {
                      setMidGain(parseInt(e.target.value));
                    }}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 mt-2">
                    <span>Cut (-15dB)</span>
                    <span>Flat</span>
                    <span>Boost (+15dB)</span>
                  </div>
                </div>

                {/* Treble Frequency slider */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-700">Presence Treble (4000Hz)</span>
                    <span className={`font-mono text-xs font-black px-1.5 py-0.5 rounded ${
                      trebleGain > 0 ? "text-emerald-700 bg-emerald-50" : trebleGain < 0 ? "text-rose-700 bg-rose-50" : "text-slate-500 bg-slate-100"
                    }`}>
                      {trebleGain > 0 ? `+${trebleGain}` : trebleGain} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-15}
                    max={15}
                    step={1}
                    value={trebleGain}
                    onChange={(e) => {
                      setTrebleGain(parseInt(e.target.value));
                    }}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 mt-2">
                    <span>Cut (-15dB)</span>
                    <span>Flat</span>
                    <span>Boost (+15dB)</span>
                  </div>
                </div>

              </div>
              
              {/* Reset EQ option */}
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setBassGain(0);
                    setMidGain(0);
                    setTrebleGain(0);
                  }}
                  className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset EQ Bands</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Tab content 3: Intro Slide Creator */}
        {activeTab === "intro" && (
          <div className="space-y-6 animate-fade-in" id="production-tab-intro">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-4.5 rounded-2xl border border-slate-200 gap-3">
              <div>
                <span className="font-bold text-xs text-slate-800 block">Prepend Intro Presentation Card</span>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">Toggle a gorgeous typography slate card with automatic fade in at the video's start.</p>
              </div>
              <label className="inline-flex items-center gap-2.5 cursor-pointer selection:bg-transparent select-none">
                <input
                  type="checkbox"
                  checked={introEnabled}
                  onChange={(e) => setIntroEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 h-4.5 w-4.5 cursor-pointer"
                />
                <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Enable Intro</span>
              </label>
            </div>

            {introEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-3 animate-fade-in" id="intro-config-subfields">
                
                {/* Intro Title */}
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Intro Slide Heading</label>
                  <input
                    type="text"
                    value={introTitle}
                    onChange={(e) => setIntroTitle(e.target.value)}
                    placeholder="e.g. Sales Metrics Review"
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-850 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Subtitle */}
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Presenter / Sub-Header Credits</label>
                  <input
                    type="text"
                    value={introSubtitle}
                    onChange={(e) => setIntroSubtitle(e.target.value)}
                    placeholder="e.g. Marie Curie - Research Dept"
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-850 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Duration */}
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Display Duration (Seconds)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1.5}
                      max={6.0}
                      step={0.5}
                      value={introDuration}
                      onChange={(e) => {
                        setIntroDuration(parseFloat(e.target.value) || 3.0);
                      }}
                      className="flex-1 accent-indigo-650 h-1 cursor-pointer bg-slate-100 rounded-lg appearance-none"
                    />
                    <span className="text-xs font-mono font-bold text-slate-800 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded shrink-0">{introDuration}s</span>
                  </div>
                </div>

                {/* Background Presets */}
                <div className="md:col-span-12 pt-3 border-t border-slate-100">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Slide Backdrop Color Themes</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      { id: "indigo", label: "Royal Blue Gradient", preview: "from-indigo-950 via-slate-900 to-indigo-900" },
                      { id: "slate", label: "Minimalist Charcoal", preview: "from-slate-950 via-slate-900 to-slate-800" },
                      { id: "emerald", label: "Aurora Teal", preview: "from-teal-980 via-slate-950 to-emerald-950" },
                      { id: "purple", label: "Deep Orchid", preview: "from-purple-950 via-slate-950 to-fuchsia-950" },
                      { id: "amber", label: "Desert Clay Gradient", preview: "from-amber-950 via-slate-950 to-orange-950" },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setIntroBg(theme.id)}
                        className={`p-2 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                          introBg === theme.id
                            ? "border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-500 font-bold"
                            : "border-slate-200 bg-white hover:border-slate-250 text-slate-700"
                        }`}
                      >
                        <div className={`h-8 w-full rounded-lg bg-gradient-to-tr ${theme.preview} border border-white/5 shadow-inner`}></div>
                        <span className="text-[10px] truncate block w-full text-center">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {!introEnabled && (
              <div className="flex items-center gap-3 bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/50" id="intro-card-disabled-tips">
                <BookOpen className="w-5 h-5 text-indigo-600 shrink-0" />
                <div className="text-[11px] leading-relaxed text-indigo-900">
                  <span className="font-bold block">Need an intro slide creator for your screencast?</span>
                  Enable this card to dynamically generate an elegant title slate card before your video recording captures begin playback! Ideal for online classrooms, tutorials, or corporate presentations.
                </div>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
