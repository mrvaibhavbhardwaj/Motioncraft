import React, { useState, useEffect, useRef } from "react";
import {
  Monitor,
  Video,
  Mic,
  Volume2,
  Sliders,
  Play,
  Pause,
  FolderOpen,
  Plus,
  Trash2,
  Download,
  Sparkles,
  Scissors,
  Captions,
  FileVideo,
  ListCollapse,
  Loader2,
  Clock,
  ExternalLink,
  CheckCircle2,
  X,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Bookmark,
  Share2,
  Upload
} from "lucide-react";
import {
  RecordOptions,
  RecordState,
  CaptionSegment,
  LibraryItem,
  AIContentAssets
} from "./types";
import { getLibraryItems, saveLibraryItem, deleteLibraryItem, clearLibraryItems } from "./lib/db";
import RecorderOptions from "./components/RecorderOptions";
import VideoPlayerWithTrimming from "./components/VideoPlayerWithTrimming";
import LandingPage from "./components/LandingPage";

export default function App() {
  // Navigation mode: "landing" | "studio"
  const [viewMode, setViewMode] = useState<"landing" | "studio">("landing");

  // Navigation Tabs state: "recorder" | "library" | "editor" | "shortcuts" | "settings"
  const [activeTab, setActiveTab ] = useState<"recorder" | "library" | "editor" | "shortcuts" | "settings">("recorder");

  // Advanced workspace preference configurations
  const [countdownLength, setCountdownLength] = useState<number>(3);
  const [enableClickHighlight, setEnableClickHighlight] = useState<boolean>(true);
  const [defaultSubtitleLang, setDefaultSubtitleLang] = useState<string>("en-US");
  const [maxRecordDuration, setMaxRecordDuration] = useState<number>(15);

  // Recorder options
  const [options, setOptions] = useState<RecordOptions>({
    recordScreen: true,
    recordCamera: false,
    audioCategory: "both",
    resolution: "1080p",
    frameRate: 30,
    exportFormat: "mp4"
  });

  // Recorded States
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [recordedTime, setRecordedTime] = useState<number>(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  
  // Trimming parameters for current loaded video chunk
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [playbackTime, setPlaybackTime] = useState<number>(0);

  // Captions / Subtitles
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editingCaptionText, setEditingCaptionText] = useState<string>("");

  // AI Assets
  const [aiAssets, setAiAssets] = useState<AIContentAssets | null>(null);

  // DB Library
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [loadedItemId, setLoadedItemId] = useState<string | null>(null);

  // Status logs/Notifications banners
  const [notification, setNotification] = useState<{
    type: "info" | "success" | "error";
    message: string;
  } | null>(null);

  // Loading indicator for API endpoints
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [isAiSummarizing, setIsAiSummarizing] = useState<boolean>(false);

  // Sandbox detection and permission policy error hooks
  const [isIframe, setIsIframe] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<boolean>(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [liveCameraStream, setLiveCameraStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      setIsIframe(true);
    }

    // Hydrate current authenticated profile from local storage
  }, []);

  // Synchronize Live Camera Preview stream when Camera is toggled on / off in Studio modes
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isActive = true;

    async function enablePreview() {
      // During active recording, startRecording handles the stream directly
      if (recordState === "recording") {
        if (cameraStreamRef.current) {
          setLiveCameraStream(cameraStreamRef.current);
        } else {
          setLiveCameraStream(null);
        }
        return;
      }

      if (options.recordCamera && activeTab === "recorder" && viewMode === "studio") {
        try {
          activeStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 30, max: 60 }
            },
            audio: false
          });
          if (isActive) {
            setLiveCameraStream(activeStream);
          } else {
            activeStream.getTracks().forEach((track) => track.stop());
          }
        } catch (err) {
          console.warn("Could not start camera preview:", err);
          if (isActive) {
            setLiveCameraStream(null);
          }
        }
      } else {
        if (isActive) {
          setLiveCameraStream(null);
        }
      }
    }

    enablePreview();

    return () => {
      isActive = false;
      if (activeStream && recordState !== "recording") {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [options.recordCamera, activeTab, viewMode, recordState]);

  // Streams / Canvas refs for real-time video mixing
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoElementsRef = useRef<{ screen?: HTMLVideoElement; camera?: HTMLVideoElement }>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasTimerRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const backgroundWorkerRef = useRef<Worker | null>(null);
  
  // Storage usage calculation simulated
  const [storageUsedGb, setStorageUsedGb] = useState<number>(3.6);

  // Web Speech API for Auto Captions
  const speechRecognitionRef = useRef<any>(null);
  const captionsInFlightRef = useRef<CaptionSegment[]>([]);
  const captionStartTimeRef = useRef<number>(0);

  // Auto-clear notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load recordings library from IndexedDB on startup
  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const list = await getLibraryItems();
      setLibrary(list);
      // Simulate dynamic storage calculated from actual Blobs
      let totalBytes = 0;
      list.forEach((item) => {
        totalBytes += item.videoBlob.size;
      });
      const calculatedGb = Math.max(0.5, parseFloat((totalBytes / (1024 * 1024 * 100) + 3.1).toFixed(2)));
      setStorageUsedGb(calculatedGb);
    } catch (err: any) {
      console.error(err);
      showNotice("error", "Failed to retrieve local recordings library store.");
    }
  };

  const showNotice = (type: "info" | "success" | "error", message: string) => {
    setNotification({ type, message });
  };

  // Build local demo caption if no speech caught or for previewing editor
  const generateSampleCaptions = () => {
    const demo: CaptionSegment[] = [
      { id: "cap-1", start: 0.5, end: 4.8, text: "Hello and welcome to this MotionCraft walkthrough!" },
      { id: "cap-2", start: 5.2, end: 11.0, text: "In this tutorial we are going to showcase the geometric recorder with PiP mode." },
      { id: "cap-3", start: 11.5, end: 17.5, text: "First let us check our audio source dials or activate circular Face cams!" },
      { id: "cap-4", start: 18.0, end: 24.2, text: "We can easily export as High Quality WebM or MP4 formats dynamically." }
    ];
    setCaptions(demo);
    showNotice("success", "Preloaded 4 sample subtitle lines into the Timeline editor!");
    
    // update current library item or active state if loaded
    if (loadedItemId) {
      const updatedLibrary = library.map((item) => {
        if (item.id === loadedItemId) {
          const updated = { ...item, captions: demo };
          saveLibraryItem(updated);
          return updated;
        }
        return item;
      });
      setLibrary(updatedLibrary);
    }
  };

  // Speech Recognition Initializer
  const initSpeechRecognition = () => {
    const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechClass) {
      const rec = new SpeechClass();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        console.log("Web Speech API recognition has booted.");
      };

      rec.onresult = (event: any) => {
        const lastResultIndex = event.results.length - 1;
        const speechText = event.results[lastResultIndex][0].transcript.trim();
        
        if (speechText) {
          const elapsedSecs = (Date.now() - captionStartTimeRef.current) / 1000;
          const segmentDuration = Math.min(5, Math.max(2, speechText.split(" ").length * 0.45));
          const start = Math.max(0, elapsedSecs - segmentDuration);
          const end = elapsedSecs;

          const newSegment: CaptionSegment = {
            id: `speech-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            start: parseFloat(start.toFixed(1)),
            end: parseFloat(end.toFixed(1)),
            text: speechText
          };

          setCaptions((prev) => {
            const updated = [...prev, newSegment].sort((a, b) => a.start - b.start);
            captionsInFlightRef.current = updated;
            return updated;
          });
        }
      };

      rec.onerror = (e: any) => {
        console.warn("Speech recognition error hook:", e.error);
      };

      rec.onend = () => {
        // Keep restarting if state is still recording
        if (recordState === "recording" && speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.start();
          } catch (err) {
            // ignore re-start attempts if running
          }
        }
      };

      speechRecognitionRef.current = rec;
    } else {
      console.log("Speech recognition not supported natively in this browser engine.");
    }
  };

  // Start Capturing Streams & recording canvas
  const startRecording = async () => {
    try {
      // Release any active camera preview streams to avoid camera resource lock contention
      if (liveCameraStream) {
        try {
          liveCameraStream.getTracks().forEach((track) => track.stop());
        } catch (e) {}
        setLiveCameraStream(null);
      }

      setCaptions([]);
      captionsInFlightRef.current = [];
      setAiAssets(null);
      setVideoBlob(null);

      showNotice("info", "Requesting display capture and audio feeds...");

      // 1. Get Screen / Window display stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: options.resolution === "1440p" ? 2560 : options.resolution === "1080p" ? 1920 : 1280,
          height: options.resolution === "1440p" ? 1440 : options.resolution === "1080p" ? 1080 : 720,
          frameRate: { ideal: options.frameRate, max: options.frameRate },
        },
        audio: options.audioCategory !== "none" ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      });

      screenStreamRef.current = screenStream;

      // Create screen video element for drawing on canvas
      const screenVideo = document.createElement("video");
      screenVideo.srcObject = screenStream;
      screenVideo.muted = true;
      screenVideo.playsInline = true;
      await new Promise<void>((resolve) => {
        screenVideo.onloadedmetadata = () => {
          screenVideo.play().then(resolve);
        };
      });
      videoElementsRef.current.screen = screenVideo;

      // 2. Get Camera stream if selected
      let cameraStream: MediaStream | null = null;
      if (options.recordCamera) {
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 30, max: 60 }
            },
            audio: options.audioCategory !== "none" ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } : false
          });
          cameraStreamRef.current = cameraStream;
          setLiveCameraStream(cameraStream);

          const cameraVideo = document.createElement("video");
          cameraVideo.srcObject = cameraStream;
          cameraVideo.muted = true;
          cameraVideo.playsInline = true;
          await new Promise<void>((resolve) => {
            cameraVideo.onloadedmetadata = () => {
              cameraVideo.play().then(resolve);
            };
          });
          videoElementsRef.current.camera = cameraVideo;
        } catch (camErr) {
          console.warn("Camera pipeline failed, recording screen-only:", camErr);
          showNotice("error", "Camera feed was rejected or unavailable. Recording screen-only.");
          setOptions((prev) => ({ ...prev, recordCamera: false }));
        }
      }

      // 3. Audio Mixing Pipeline setup
      const audioTracks: MediaStreamTrack[] = [];
      
      // Grab Audio Context
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;
      const destNode = audioCtx.createMediaStreamDestination();

      let hasAudioInput = false;

      // System audio track source (if display shares system audio)
      const systemAudioTracks = screenStream.getAudioTracks();
      if (systemAudioTracks.length > 0 && (options.audioCategory === "system" || options.audioCategory === "both")) {
        const sysSrc = audioCtx.createMediaStreamSource(new MediaStream([systemAudioTracks[0]]));
        sysSrc.connect(destNode);
        hasAudioInput = true;
      }

      // Mic audio track source (derived from cameraStream feedback or request dedicated mic stream)
      if (options.audioCategory === "mic" || options.audioCategory === "both") {
        let micStream: MediaStream | null = cameraStream;
        if (!micStream) {
          try {
            micStream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true }
            });
            // store this to close later
            cameraStreamRef.current = micStream;
          } catch (micErr) {
            console.warn("Stand-alone mic request was denied:", micErr);
            showNotice("error", "Microphone access denied. Recording muted system capture.");
          }
        }

        if (micStream && micStream.getAudioTracks().length > 0) {
          const micSrc = audioCtx.createMediaStreamSource(new MediaStream([micStream.getAudioTracks()[0]]));
          micSrc.connect(destNode);
          hasAudioInput = true;
        }
      }

      // 4. Set up Canvas Compositing Workspace
      const canvas = document.createElement("canvas");
      canvas.width = options.resolution === "1440p" ? 2560 : options.resolution === "1080p" ? 1920 : 1280;
      canvas.height = options.resolution === "1440p" ? 1440 : options.resolution === "1080p" ? 1080 : 720;
      canvasRef.current = canvas;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not construct 2D drawing pipeline on canvas.");

      const fpsInterval = 1000 / options.frameRate;

      // Draw loop to capture screens + cameras on canvas
      const drawFrame = () => {
        if (!ctx || !canvas) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Clear Canvas
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Screen Video feed as primary base
        const sVideo = videoElementsRef.current.screen;
        if (sVideo && sVideo.readyState >= 2) {
          ctx.drawImage(sVideo, 0, 0, canvas.width, canvas.height);
        } else {
          // Placeholder message if buffer drops
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 32px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Compositing display stream...", canvas.width / 2, canvas.height / 2);
        }

        // Overlay Picture-in-picture circle of Camera Video feed if active
        const cVideo = videoElementsRef.current.camera;
        if (options.recordCamera && cVideo && cVideo.readyState >= 2) {
          const pipSize = Math.floor(canvas.height * 0.24); // Size based on resolution
          const pipRadius = pipSize / 2;
          const pipX = canvas.width - pipSize - 60;
          const pipY = canvas.height - pipSize - 60;

          ctx.save();
          
          // Draw neat drop shadow around Face Cam
          ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 4;
          ctx.shadowOffsetY = 4;

          // Build clipping circle
          ctx.beginPath();
          ctx.arc(pipX + pipRadius, pipY + pipRadius, pipRadius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fillStyle = "#000000";
          ctx.fill();
          
          // Clip camera content to boundaries
          ctx.shadowColor = "transparent"; // Reset before clipping container
          ctx.clip();

          // Squeeze camera aspect into square and draw inside circle
          ctx.drawImage(cVideo, pipX, pipY, pipSize, pipSize);
          ctx.restore();

          // Outer modern Indigo Frame Ring border
          ctx.strokeStyle = "#4f46e5";
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(pipX + pipRadius, pipY + pipRadius, pipRadius + 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.closePath();
        }

        // Force slight, human-unnoticeable sub-pixel state changes on corner
        // to prompt the browser's captureStream state change listeners.
        // This keeps the stream active and guarantees perfect recorded timestamps!
        const randSeed = Math.random() * 0.02;
        ctx.fillStyle = `rgba(0, 0, 0, ${0.01 + randSeed})`;
        ctx.fillRect(0, 0, 1, 1);
      };

      // Set up background worker for recording ticking if recording camera.
      // This is crucial because requestAnimationFrame and main thread timeouts are paused or 
      // heavily throttled by browsers (to ~1 frame every few seconds) when the tab is out of focus!
      if (options.recordCamera) {
        try {
          const workerCode = `
            let intervalId = null;
            self.onmessage = function(e) {
              if (e.data.action === "start") {
                clearInterval(intervalId);
                intervalId = setInterval(function() {
                  self.postMessage("tick");
                }, e.data.interval);
              } else if (e.data.action === "stop") {
                clearInterval(intervalId);
              }
            };
          `;
          const workerBlob = new Blob([workerCode], { type: "application/javascript" });
          const workerUrl = URL.createObjectURL(workerBlob);
          const workerInstance = new Worker(workerUrl);
          backgroundWorkerRef.current = workerInstance;

          workerInstance.onmessage = (e) => {
            if (e.data === "tick") {
              drawFrame();
            }
          };
          workerInstance.postMessage({ action: "start", interval: fpsInterval });
        } catch (workerErr) {
          console.warn("Background Worker creation failed, fell back to main-thread interval:", workerErr);
          const timerId = window.setInterval(drawFrame, fpsInterval);
          canvasTimerRef.current = timerId;
        }
      } else {
        // If recording Screen only (no camera overlay), we bypass the drawing loop entirely 
        // and record native screen video track directly for lossless quality and 0% background throttling risk!
        console.log("No camera PiP required. Using native capture stream track directly.");
      }

      // 5. Gather Combined Output Media Tracks
      let mixedVideoTrack: MediaStreamTrack;
      if (options.recordCamera) {
        mixedVideoTrack = (canvas as any).captureStream(options.frameRate).getVideoTracks()[0];
      } else {
        mixedVideoTrack = screenStream.getVideoTracks()[0];
      }
      
      const trackingTracks: MediaStreamTrack[] = [mixedVideoTrack];

      if (hasAudioInput) {
        const audioTrack = destNode.stream.getAudioTracks()[0];
        trackingTracks.push(audioTrack);
      }

      const mixedRecorderStream = new MediaStream(trackingTracks);

      // 6. Spawn MediaRecorder Hook with mime fallbacks and optimized high bitrates
      let chosenMime = "video/webm;codecs=vp9";
      if (!MediaRecorder.isTypeSupported(chosenMime)) {
        chosenMime = "video/webm;codecs=h264";
      }
      if (!MediaRecorder.isTypeSupported(chosenMime)) {
        chosenMime = "video/webm;codecs=vp8";
      }
      if (!MediaRecorder.isTypeSupported(chosenMime)) {
        chosenMime = "video/webm";
      }

      // Dynamic smart bitrate calculation to increase video fidelity & details
      let calculatedBitrate = 6000000; // 6 Mbps default
      if (options.resolution === "1440p") {
        calculatedBitrate = options.frameRate === 60 ? 12000000 : 9000000; // 12 Mbps / 9 Mbps
      } else if (options.resolution === "1080p") {
        calculatedBitrate = options.frameRate === 60 ? 8000000 : 6000000;  // 8 Mbps / 6 Mbps
      } else { // 720p
        calculatedBitrate = options.frameRate === 60 ? 5000000 : 3500000;  // 5 Mbps / 3.5 Mbps
      }

      console.log("Initializing MediaRecorder with mime:", chosenMime, "and dynamic bitrate:", calculatedBitrate);
      const recorder = new MediaRecorder(mixedRecorderStream, {
        mimeType: chosenMime,
        videoBitsPerSecond: calculatedBitrate,
        audioBitsPerSecond: 128000 // 128 kbps high quality audio
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        console.log("MediaRecorder has finished collecting chunks.");
        const rawBlob = new Blob(chunks, { type: "video/webm" });
        setVideoBlob(rawBlob);

        // Stop all active physical tracks
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        if (cameraStreamRef.current) {
          cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          audioContextRef.current.close();
        }

        // Terminate drawing timer
        if (canvasTimerRef.current) {
          cancelAnimationFrame(canvasTimerRef.current);
          clearInterval(canvasTimerRef.current);
          canvasTimerRef.current = null;
        }

        // Clean up background worker
        if (backgroundWorkerRef.current) {
          try {
            backgroundWorkerRef.current.postMessage({ action: "stop" });
            backgroundWorkerRef.current.terminate();
          } catch (e) {}
          backgroundWorkerRef.current = null;
        }

        // Check caption counts
        const finalCapturedCaptions = captionsInFlightRef.current;
        
        // Measure real elapsed duration in seconds using the high-precision clock
        const elapsed = (Date.now() - captionStartTimeRef.current) / 1000;
        const duration = elapsed > 0 ? elapsed : 15;

        // Auto load into workspace
        setRecordState("previewing");
        setActiveTab("editor");
        setTrimStart(0);
        setTrimEnd(duration);
        setPlaybackTime(0);

        // Save automatically to library immediately (100% reliable - no fragile DOM events required!)
        const newRecordingId = `rec-${Date.now()}`;
        const newLibraryItem: LibraryItem = {
          id: newRecordingId,
          title: `Capture ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          videoBlob: rawBlob,
          captions: finalCapturedCaptions.length > 0 ? finalCapturedCaptions : [
            { id: "cap-1", start: 0.5, end: Math.min(4.8, duration), text: "Welcome to MotionCraft! Use the editor to add more subtitles manually." }
          ],
          trimStart: 0,
          trimEnd: duration,
          duration: duration,
          recordingMode: `${options.resolution} @ ${options.frameRate}fps`,
          createdAt: Date.now(),
          aiAssets: null
        };

        saveLibraryItem(newLibraryItem).then(() => {
          loadLibrary();
          setLoadedItemId(newRecordingId);
          setCaptions(newLibraryItem.captions);
          showNotice("success", "Recording completed & saved safely to local IndexedDB!");
        });
      };

      // 7. Initiate Speech Recognition overlay
      initSpeechRecognition();
      captionStartTimeRef.current = Date.now();
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
        } catch (e) {
          console.warn("Speech API start exception:", e);
        }
      }

      // 8. Start recording
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setRecordState("recording");
      setRecordedTime(0);

      // Increment ClockTimer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordedTime((prev) => prev + 1);
      }, 1000);

      showNotice("success", "Recording studio live! Say something to capture automatic subtitles.");

      // Trigger automatic screenStream completion if user clicks "Stop Sharing" on the browser popup
      screenStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          stopRecording();
        }
      };

    } catch (err: any) {
      console.error("Critical stream request error:", err);
      const errMsg = String(err.message || err).toLowerCase();
      const isPermissionErr = errMsg.includes("permission") || 
                              errMsg.includes("disallowed") ||
                              errMsg.includes("display-capture") ||
                              errMsg.includes("policy");
      if (isPermissionErr) {
        setPermissionError(true);
        showNotice("error", "Permissions error: Browser sandbox disallowed display capture. Please click 'Open in Standalone Tab' above to record.");
      } else {
        showNotice("error", `Could not boot hardware recorders: ${err.message || err}`);
      }
      setRecordState("idle");
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (err) {}
      speechRecognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    // Clean up background worker immediately
    if (backgroundWorkerRef.current) {
      try {
        backgroundWorkerRef.current.postMessage({ action: "stop" });
        backgroundWorkerRef.current.terminate();
      } catch (e) {}
      backgroundWorkerRef.current = null;
    }

    // Clean up drawing timers
    if (canvasTimerRef.current) {
      clearInterval(canvasTimerRef.current);
      canvasTimerRef.current = null;
    }

    setRecordState("idle");
  };

  // Format record duration clocks
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle manual video files uploading
  const handleVideoUpload = (file: File) => {
    if (!file.type.startsWith("video/")) {
      showNotice("error", "The uploaded file must be a valid video track (e.g. MP4, WebM, OGG, MOV).");
      return;
    }

    const url = URL.createObjectURL(file);
    const tempVideo = document.createElement("video");
    tempVideo.src = url;
    
    showNotice("info", "Extracting video metadata, please wait...");
    
    tempVideo.onloadedmetadata = () => {
      let duration = tempVideo.duration;
      if (duration === Infinity || isNaN(duration) || duration <= 0.05) {
        duration = 10; // Fallback
      }

      const newUploadedId = `upload-${Date.now()}`;
      const newLibraryItem: LibraryItem = {
        id: newUploadedId,
        title: file.name.replace(/\.[^/.]+$/, "") || `Uploaded Video ${new Date().toLocaleDateString()}`,
        videoBlob: file,
        captions: [
          { id: "cap-1", start: 0.5, end: Math.min(4.8, duration), text: "Imported original video. Press Play or add caption segments manually!" }
        ],
        trimStart: 0,
        trimEnd: duration,
        duration: duration,
        recordingMode: `Imported (${(file.size / (1024 * 1024)).toFixed(1)} MB)`,
        createdAt: Date.now(),
        aiAssets: null
      };

      saveLibraryItem(newLibraryItem).then(() => {
        loadLibrary();
        setLoadedItemId(newUploadedId);
        setVideoBlob(file);
        setTrimStart(0);
        setTrimEnd(duration);
        setPlaybackTime(0);
        setCaptions(newLibraryItem.captions);
        setAiAssets(null);
        setActiveTab("editor");
        showNotice("success", `Successfully imported and saved "${newLibraryItem.title}"!`);
        URL.revokeObjectURL(url);
      }).catch((err) => {
        showNotice("error", "Failed to save the imported video to offline database.");
        URL.revokeObjectURL(url);
      });
    };

    tempVideo.onerror = () => {
      showNotice("error", "Failed to decode video metadata. The file format is not supported by your browser.");
      URL.revokeObjectURL(url);
    };
  };

  // Switch Loaded Item in Editor
  const handleLoadItemToEditor = (item: LibraryItem) => {
    setLoadedItemId(item.id);
    setVideoBlob(item.videoBlob);
    setTrimStart(item.trimStart);
    setTrimEnd(item.trimEnd);
    setPlaybackTime(item.trimStart);
    setCaptions(item.captions);
    setAiAssets(item.aiAssets);
    setActiveTab("editor");
    showNotice("info", `Loaded "${item.title}" into Interactive Studio.`);
  };

  // Handle Delete recording
  const handleDeleteItem = async (id: string) => {
    try {
      await deleteLibraryItem(id);
      if (loadedItemId === id) {
        setLoadedItemId(null);
        setVideoBlob(null);
        setCaptions([]);
        setAiAssets(null);
      }
      await loadLibrary();
      setDeletingItemId(null);
      showNotice("success", "Recording successfully removed from IndexedDB.");
    } catch (err: any) {
      showNotice("error", "Error removing item from storage.");
    }
  };

  // Trigger Local downloads of Mp4 / WebM
  const downloadVideoBlob = (format: "webm" | "mp4") => {
    if (!videoBlob) {
      showNotice("error", "No active preview file loaded.");
      return;
    }

    // Name resolution
    const currentItem = library.find((i) => i.id === loadedItemId);
    const customTitle = currentItem ? currentItem.title.replace(/\s+/g, "_") : "recording";
    const filename = `${customTitle}.${format}`;

    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotice("success", `Downloaded dynamic ${format.toUpperCase()} video container successfully!`);
  };

  // Caption Editing controllers
  const handleAddNewCaptionLine = () => {
    const nextStart = captions.length > 0 ? parseFloat((captions[captions.length - 1].end + 0.5).toFixed(1)) : 1.0;
    const newCap: CaptionSegment = {
      id: `cap-${Date.now()}`,
      start: nextStart,
      end: parseFloat((nextStart + 3.0).toFixed(1)),
      text: "Type custom subtitle segment text..."
    };
    const updated = [...captions, newCap].sort((a, b) => a.start - b.start);
    setCaptions(updated);
    saveCurrentCaptionsToDB(updated);
  };

  const handleStartEditCaption = (cap: CaptionSegment) => {
    setEditingCaptionId(cap.id);
    setEditingCaptionText(cap.text);
  };

  const handleSaveCaptionText = (id: string) => {
    const updated = captions.map((c) => {
      if (c.id === id) {
        return { ...c, text: editingCaptionText };
      }
      return c;
    });
    setCaptions(updated);
    setEditingCaptionId(null);
    saveCurrentCaptionsToDB(updated);
    showNotice("success", "Subtitle text modification saved to stream.");
  };

  const handleUpdateCaptionTimestamps = (id: string, start: number, end: number) => {
    const updated = captions.map((c) => {
      if (c.id === id) {
        return { ...c, start: Math.max(0, start), end: Math.max(start + 0.1, end) };
      }
      return c;
    }).sort((a, b) => a.start - b.start);
    setCaptions(updated);
    saveCurrentCaptionsToDB(updated);
  };

  const handleDeleteCaptionLine = (id: string) => {
    const updated = captions.filter((c) => c.id !== id);
    setCaptions(updated);
    saveCurrentCaptionsToDB(updated);
  };

  const saveCurrentCaptionsToDB = (updatedCaptions: CaptionSegment[]) => {
    if (!loadedItemId) return;
    const matched = library.find((i) => i.id === loadedItemId);
    if (matched) {
      const updatedItem = { ...matched, captions: updatedCaptions };
      saveLibraryItem(updatedItem).then(() => {
        loadLibrary();
      });
    }
  };

  // Save specific Trimming updates
  const handleTrimChange = (start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
    
    if (loadedItemId) {
      const matched = library.find((i) => i.id === loadedItemId);
      if (matched) {
        const updatedItem = { ...matched, trimStart: start, trimEnd: end };
        saveLibraryItem(updatedItem).then(() => {
          loadLibrary();
        });
      }
    }
  };

  // -------------------------------------------------------------
  // Full-Stack Server APIs connecting to Gemini Model
  // -------------------------------------------------------------

  // Gemini API: Refine captions
  const refineCaptionsWithGemini = async () => {
    if (captions.length === 0) {
      showNotice("error", "No subtitles found in active editor timeline.");
      return;
    }

    setIsAiProcessing(true);
    showNotice("info", "Sending subtitles to Gemini-3.5-flash for speech refining...");

    try {
      const response = await fetch("/api/gemini/refine-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captions })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to refine with remote AI.");
      }

      const data = await response.json();
      if (data.captions && Array.isArray(data.captions)) {
        setCaptions(data.captions);
        saveCurrentCaptionsToDB(data.captions);
        showNotice("success", "AI Refiner complete! Typas, duplicate fillers, and grammar corrected.");
      }
    } catch (e: any) {
      console.error(e);
      showNotice("error", `Refining failure: ${e.message || e}`);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Gemini API: Summarize Recording
  const generateAISummaryPackage = async () => {
    if (captions.length === 0) {
      showNotice("error", "Timeline is empty. Please add or record some text subtitles to generate AI chapters.");
      return;
    }

    setIsAiSummarizing(true);
    showNotice("info", "Gemini reading audio transcripts to compose SEO titles & Timeline Chapters...");

    const fullTranscriptText = captions
      .map((c) => `[${formatTimer(Math.floor(c.start))}] ${c.text}`)
      .join("\n");

    try {
      const response = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcripts: fullTranscriptText })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failure from summarization engine.");
      }

      const bundle = await response.json();
      setAiAssets(bundle);

      // Persist in DB
      if (loadedItemId) {
        const matched = library.find((i) => i.id === loadedItemId);
        if (matched) {
          const updatedItem = { ...matched, aiAssets: bundle };
          await saveLibraryItem(updatedItem);
          await loadLibrary();
        }
      }

      showNotice("success", "AI Assets generated! See clickable Chapters and proposed titles below.");
    } catch (e: any) {
      console.error(e);
      showNotice("error", `Summary failed: ${e.message || e}`);
    } finally {
      setIsAiSummarizing(false);
    }
  };

  // Convert Captions list to standard subtitle SRT or VTT for download
  const downloadSubtitleFile = (format: "vtt" | "srt") => {
    if (captions.length === 0) {
      showNotice("error", "Timeline captions is empty.");
      return;
    }

    const padZero = (num: number, target: number = 2) => num.toString().padStart(target, "0");

    const formatTimestamp = (secs: number, isSrt: boolean) => {
      const hours = Math.floor(secs / 3600);
      const minutes = Math.floor((secs % 3600) / 60);
      const seconds = Math.floor(secs % 60);
      const milliseconds = Math.floor((secs % 1) * 1000);
      
      const delimiter = isSrt ? "," : ".";
      return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}${delimiter}${padZero(milliseconds, 3)}`;
    };

    let bodyText = "";

    if (format === "vtt") {
      bodyText = "WEBVTT\n\n";
      captions.forEach((c, idx) => {
        bodyText += `${idx + 1}\n`;
        bodyText += `${formatTimestamp(c.start, false)} --> ${formatTimestamp(c.end, false)}\n`;
        bodyText += `${c.text}\n\n`;
      });
    } else {
      // SRT
      captions.forEach((c, idx) => {
        bodyText += `${idx + 1}\n`;
        bodyText += `${formatTimestamp(c.start, true)} --> ${formatTimestamp(c.end, true)}\n`;
        bodyText += `${c.text}\n\n`;
      });
    }

    const blob = new Blob([bodyText], { type: "text/plain;charset=utf-8" });
    const u = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = u;
    link.download = `subtitles.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(u);

    showNotice("success", `Exported subtitle file as ${format.toUpperCase()} successfully.`);
  };

  if (viewMode === "landing") {
    return (
      <LandingPage
        onTryDemo={() => setViewMode("studio")}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] font-sans text-slate-800" id="recorder-studio-app">
      {/* Header Navigation */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white" id="main-header">
        <div 
          onClick={() => setViewMode("landing")}
          className="flex items-center gap-3 cursor-pointer select-none hover:opacity-85 transition-opacity" 
          title="Return to Presentation Landing Page"
        >
          <div className="w-10 h-10 bg-linear-to-tr from-teal-400 via-cyan-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <Video className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full ring-2 ring-white animate-ping"></span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">MotionCraft</h1>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">Capture & Customize Video Tracks Offline</p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 md:gap-4 select-none">
          <button
            id="tab-btn-recorder"
            type="button"
            onClick={() => setActiveTab("recorder")}
            className={`text-xs sm:text-sm font-semibold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "recorder"
                ? "bg-indigo-50 text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Recorder
          </button>
          <button
            id="tab-btn-library"
            type="button"
            onClick={() => setActiveTab("library")}
            className={`text-xs sm:text-sm font-semibold px-2.5 py-1.5 rounded-lg transition-all relative cursor-pointer ${
              activeTab === "library"
                ? "bg-indigo-50 text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            My Library
            {library.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full scale-90">
                {library.length}
              </span>
            )}
          </button>
          <button
            id="tab-btn-editor"
            type="button"
            onClick={() => setActiveTab("editor")}
            className={`text-xs sm:text-sm font-semibold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "editor"
                ? "bg-indigo-50 text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Video Editor
          </button>
          <button
            id="tab-btn-shortcuts"
            type="button"
            onClick={() => setActiveTab("shortcuts")}
            className={`text-xs sm:text-sm font-semibold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "shortcuts"
                ? "bg-indigo-50 text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Hotkeys & Guide
          </button>
          <button
            id="tab-btn-settings"
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`text-xs sm:text-sm font-semibold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-indigo-50 text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Preferences
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Storage Used</p>
            <p className="text-xs font-semibold text-slate-700">
              {storageUsedGb} GB of 10 GB
            </p>
          </div>
          <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100/50 rounded-full text-[10px] font-bold text-indigo-700 uppercase tracking-wider" id="header-local-mode-pill">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
            <span>Local Studio Mode</span>
          </div>
        </div>
      </header>

      {/* Floating User Notifications Toast */}
      {notification && (
        <div
          id="toast-notification"
          className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border transition-all animate-bounce max-w-sm ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-950"
              : notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-950"
              : "bg-indigo-50 border-indigo-200 text-slate-900"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : notification.type === "error" ? (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
          )}
          <span className="text-xs font-semibold leading-normal">{notification.message}</span>
          <button
            id="toast-close-btn"
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-900 ml-auto shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid Content Panels */}
      <main className="flex-1 p-6 overflow-x-hidden" id="workspace-container">
        {/* ========================================== */}
        {/* TAB 1: STUDIO RECORDER DASHBOARD           */}
        {/* ========================================== */}
        {activeTab === "recorder" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto" id="recorder-display-grid">
            {/* Sandboxed Alert Warn banner */}
            {(isIframe || permissionError) && (
              <div
                id="sandbox-permission-alert"
                className="col-span-12 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-amber-950 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-amber-100 p-2 rounded-xl text-amber-700 shrink-0">
                    <AlertCircle className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Browser Settings Action Required</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Embedded preview windows occasionally restrict direct screen or window recording features. 
                      Please open this application in a dedicated standalone browser tab to access fully enabled native permissions.
                    </p>
                  </div>
                </div>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-100 transition-all text-xs font-bold shrink-0 self-start md:self-center"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open App in Standalone Tab</span>
                </a>
              </div>
            )}

            {/* Left side: options and dynamic triggers */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Presets settings component panel */}
              <RecorderOptions
                options={options}
                onChange={setOptions}
                isRecording={recordState === "recording"}
              />

              {/* Status info check list */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs" id="quick-tip-card">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Recording Checklist</h3>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4.5 h-4.5 text-indigo-500" />
                    <span>Resolutions: <strong>{options.resolution}</strong> base</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4.5 h-4.5 text-indigo-500" />
                    <span>Framerate: <strong>{options.frameRate} FPS</strong> liquid smooth</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {options.recordCamera ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-rose-500" />
                    ) : (
                      <div className="w-4.5 h-4.5 rounded-full border border-slate-300" />
                    )}
                    <span>PIP Web webcam video overlay {options.recordCamera ? "Enabled" : "Disabled"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {options.audioCategory !== "none" ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                    ) : (
                      <div className="w-4.5 h-4.5 rounded-full border border-slate-300" />
                    )}
                    <span>Sound Track: <strong>{options.audioCategory} track category</strong></span>
                  </div>
                </div>
              </div>

              {/* Primary action Trigger */}
              {recordState !== "recording" ? (
                <button
                  id="action-btn-start-record"
                  type="button"
                  onClick={startRecording}
                  className="w-full py-4 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-3 group text-center"
                >
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className="tracking-wide">Launch Screen Recorder</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center animate-pulse">
                    <p className="text-xs font-bold text-red-650 uppercase tracking-wide">Recording Active</p>
                    <p className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                      {formatTimer(recordedTime)}
                    </p>
                  </div>
                  <button
                    id="action-btn-stop-record"
                    type="button"
                    onClick={stopRecording}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <div className="w-3 h-3 bg-white rounded-xs"></div>
                    <span>Stop Recording</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right side: visual live monitoring or setup */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-slate-900 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center shadow-inner aspect-video border border-slate-950 p-6">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none"></div>
                
                {recordState === "recording" ? (
                  <div className="text-center z-10 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 backdrop-blur-md rounded-full text-rose-400 font-medium text-xs">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                      <span>Recording Live Capture Stream</span>
                    </div>
                    
                    <h2 className="text-white text-xl font-bold tracking-tight">Capturing Content Live...</h2>
                    <p className="text-slate-400 text-xs font-mono">
                      Duration: {formatTimer(recordedTime)} • Output Format: {options.exportFormat.toUpperCase()}
                    </p>
                    <div className="flex justify-center gap-1.5 opacity-40">
                      <div className="w-1.5 h-6 bg-rose-500 rounded-xs animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <div className="w-1.5 h-10 bg-rose-500 rounded-xs animate-bounce" style={{ animationDelay: "0.2s" }} />
                      <div className="w-1.5 h-8 bg-indigo-500 rounded-xs animate-bounce" style={{ animationDelay: "0.3s" }} />
                      <div className="w-1.5 h-12 bg-indigo-500 rounded-xs animate-bounce" style={{ animationDelay: "0.4s" }} />
                      <div className="w-1.5 h-6 bg-emerald-500 rounded-xs animate-bounce" style={{ animationDelay: "0.5s" }} />
                    </div>
                  </div>
                ) : (
                  <div className="text-center z-10 max-w-md p-6 space-y-4 text-slate-100">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 border border-slate-700 shadow-xl">
                      <Monitor className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Recorder Preview Board</h2>
                      <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                        Ready to capture. You can include your camera overlay, system sound, and voice captures, then click "Launch Screen Recorder" to begin.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-800 flex justify-center gap-4 text-xs font-mono text-slate-400">
                      <span>{options.resolution}</span>
                      <span>•</span>
                      <span>{options.frameRate} FPS</span>
                      <span>•</span>
                      <span>100% Client-Side Privacy</span>
                    </div>
                  </div>
                )}

                {/* Subtitle helper footer indicator */}
                <div className="absolute bottom-5 left-6 right-6 flex items-center justify-between text-xs text-slate-400 z-10 font-medium">
                  <div className="flex gap-2.5 items-center">
                    <span>Microphone channel active</span>
                    <span>•</span>
                    <span>Real-time local subtitles ready</span>
                  </div>
                  <div>
                    <span className="uppercase tracking-wider font-mono text-[10px]">{options.resolution}</span>
                  </div>
                </div>

                {/* Visual Camera Stream PIP Preview overlay */}
                {liveCameraStream && (
                  <div
                    id="live-camera-preview-bob"
                    className="absolute bottom-16 right-6 w-36 h-36 rounded-full border-4 border-indigo-600 shadow-2xl overflow-hidden z-20 transition-all hover:scale-105 duration-300 bg-slate-950 flex items-center justify-center"
                  >
                    <video
                      id="live-camera-preview-video"
                      ref={(el) => {
                        if (el && el.srcObject !== liveCameraStream) {
                          el.srcObject = liveCameraStream;
                          el.play().catch((err) => console.log("Live stream autoplay:", err));
                        }
                      }}
                      muted
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute inset-0 border border-white/10 rounded-full pointer-events-none" />
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-xs px-2 py-0.5 rounded-full text-[8px] font-mono font-bold text-white uppercase tracking-wider whitespace-nowrap border border-white/10 shadow-sm z-30 animate-pulse">
                      LIVE WEBCAM
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic instruction card */}
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-6" id="usage-instruction-card">
                <div className="flex gap-4">
                  <div className="p-3 bg-white border border-indigo-100 rounded-xl text-indigo-600 shrink-0 self-start">
                    <Sliders className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-sm text-slate-900">How to Record and Edit with Gemini Refining:</h3>
                    <ul className="space-y-1.5 text-xs text-slate-650 list-disc pl-4 leading-relaxed">
                      <li>Choose your preferred preset feed layout (Screen, with Audio, or Camera Studio suite).</li>
                      <li>Initiate sharing on your preferred tab, application window, or full display. Make sure to tick <strong>"Share System Audio"</strong> to capture background noises.</li>
                      <li>While recording, talking will automatically generate subtitles using speech recognition scripts!</li>
                      <li>Stop recording to move into the Interactive Studio tab. Use AI refinement buttons to correct grammar or trim timestamps effortlessly.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: MY VIDEO LIBRARY                    */}
        {/* ========================================== */}
        {activeTab === "library" && (
          <div className="max-w-7xl mx-auto space-y-6" id="library-tab-workspace">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Offline Video Library</h2>
                <p className="text-xs text-slate-500 mt-1">All saved files exist strictly inside this browser's local secure storage.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  id="library-file-hidden-input"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleVideoUpload(file);
                  }}
                />
                <button
                  id="library-btn-upload"
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("library-file-hidden-input");
                    if (el) el.click();
                  }}
                  className="px-4 py-2 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-750 text-slate-700 text-xs font-bold rounded-xl shadow-2xs cursor-pointer flex items-center gap-2 transition-all bg-white"
                >
                  <Upload className="w-4 h-4 text-indigo-600 animate-pulse" />
                  <span>Upload Video</span>
                </button>
                <button
                  id="library-btn-go-record"
                  type="button"
                  onClick={() => setActiveTab("recorder")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Recording</span>
                </button>
              </div>
            </div>

            {library.length === 0 ? (
              <div 
                className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center max-w-xl mx-auto hover:border-indigo-400 transition-all group cursor-pointer" 
                id="no-recording-card"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (!target.closest("#start-session-prompt-btn")) {
                    const el = document.getElementById("library-file-hidden-input");
                    if (el) el.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleVideoUpload(file);
                }}
              >
                <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 mb-4 group-hover:scale-105 transition-all">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Your Library is Empty</h3>
                <p className="text-slate-550 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Record a new screen session, or drag & drop an offline video file here to upload! You can immediately use trimmer filters or speech captions on any custom track.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-3">
                  <button
                    id="start-session-prompt-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab("recorder");
                    }}
                    className="w-full sm:w-auto px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Start Recording Session</span>
                  </button>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest my-1 sm:my-0">OR</span>
                  <div className="text-xs font-bold text-indigo-600 hover:text-indigo-750 cursor-pointer underline px-2 py-1">
                    Browse Video File
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="library-grid-shelf">
                {library.map((item) => {
                  const sizeMb = (item.videoBlob.size / (1024 * 1024)).toFixed(1);
                  return (
                    <div
                      key={item.id}
                      id={`library-card-${item.id}`}
                      onClick={() => handleLoadItemToEditor(item)}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
                    >
                      {/* Video graphic preview placeholder */}
                      <div className="aspect-video bg-slate-950 relative flex items-center justify-center text-slate-600">
                        <FileVideo className="w-10 h-10 text-indigo-400/50" />
                        <span className="absolute bottom-3 right-3 text-[10px] font-mono bg-black/75 px-2 py-0.5 rounded text-white">
                          {parseFloat(item.duration.toFixed(1))}s
                        </span>
                        <div className="absolute top-3 left-3 bg-slate-900/40 backdrop-blur-xs text-[9px] font-mono font-bold text-slate-100 px-2 py-0.5 rounded">
                          {item.recordingMode}
                        </div>
                      </div>

                      {/* Info body */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-mono mt-1">
                            Recorded: {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="space-y-2 pt-3 border-t border-slate-100">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">File Weight:</span>
                            <span className="font-bold text-slate-900">{sizeMb} MB</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Subtitles cached:</span>
                            <span className="font-bold text-slate-900">{item.captions.length} lines</span>
                          </div>
                        </div>

                        {deletingItemId === item.id ? (
                          <div className="flex flex-col gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 pt-2" id={`confirm-delete-block-${item.id}`}>
                            <div className="text-[11px] font-semibold text-rose-800 leading-tight">
                              Are you sure you want to permanently delete this? Action is irreversible.
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                id={`confirm-yes-btn-${item.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem(item.id);
                                }}
                                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer text-center"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                id={`confirm-no-btn-${item.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingItemId(null);
                                }}
                                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-medium rounded-lg transition-colors cursor-pointer text-center"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2.5 pt-2">
                            <button
                              id={`load-editor-btn-${item.id}`}
                              type="button"
                              onClick={() => handleLoadItemToEditor(item)}
                              className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center"
                            >
                              Open Editor
                            </button>
                            <button
                              id={`delete-rec-btn-${item.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingItemId(item.id);
                              }}
                              className="p-2 border border-slate-100 hover:border-rose-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50/30 rounded-lg transition-all"
                              title="Delete file permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: VIDEO EDITOR & AI STUDIOS           */}
        {/* ========================================== */}
        {activeTab === "editor" && (
          <div className="w-full max-w-[98%] mx-auto px-2 md:px-6 mb-12 animate-fade-in" id="editor-tab-workspace">
            {/* Filmora-themed Developer Attribution Header Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8 text-white relative overflow-hidden shadow-2xl">
              {/* Artistic high-fidelity glow filters */}
              <div className="absolute top-0 right-0 p-32 w-96 h-96 bg-gradient-to-bl from-teal-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 p-24 w-72 h-72 bg-gradient-to-tr from-indigo-500/10 to-transparent rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-bold tracking-widest text-[9px] uppercase ring-1 ring-teal-500/20">
                      Wondershare Style Engine
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold tracking-widest text-[9px] uppercase font-mono ring-1 ring-indigo-500/20">
                      Widescreen Pro Workspace
                    </span>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-normal tracking-tight text-white flex flex-wrap items-center gap-2">
                    <span className="font-black bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">Filmora Suite</span>
                    <span className="text-slate-400 font-light">| Standalone Video Workbench</span>
                  </h2>
                  <p className="text-xs text-slate-350 max-w-3xl leading-relaxed">
                    Designed with an ultra-expanded preview canvas and custom multi-track timeline monitors. Clean background floor hums in real time with our intelligent Equalizer Node, adjust ratios dynamically, or fine-tune captions with our dual-deck editor.
                  </p>
                </div>

                {/* Creator Credits Badge */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5 shrink-0 shadow-lg group hover:border-teal-500/40 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-indigo-500 flex items-center justify-center font-black text-slate-950 text-sm shadow-md">
                    VB
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Studio Creator</span>
                      <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse"></span>
                    </div>
                    <h4 className="text-xs font-black text-white tracking-tight">Vaibhav Bhardwaj</h4>
                    <div className="flex items-center gap-3 font-semibold text-[10px]">
                      <a 
                        href="https://www.linkedin.com/in/mr-vaibhav-bhardwaj" 
                        target="_blank" 
                        rel="noreferrer noopener"
                        className="text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1 ring-1 ring-teal-500/20 px-1.5 py-0.5 rounded bg-teal-500/5 hover:bg-teal-500/10"
                      >
                        LinkedIn
                      </a>
                      <a 
                        href="https://github.com/mrvaibhavbhardwaj" 
                        target="_blank" 
                        rel="noreferrer noopener"
                        className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 ring-1 ring-cyan-500/20 px-1.5 py-0.5 rounded bg-cyan-500/5 hover:bg-cyan-500/10"
                      >
                        GitHub
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!videoBlob ? (
              <div className="flex flex-col gap-6 max-w-xl mx-auto" id="editor-disconnected-view">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleVideoUpload(file);
                  }}
                  onClick={() => {
                    const el = document.getElementById("editor-file-hidden-input");
                    if (el) el.click();
                  }}
                  className="bg-white rounded-3xl border-2 border-dashed border-slate-200 hover:border-indigo-400 p-10 text-center transition-all group cursor-pointer relative"
                >
                  <input
                    type="file"
                    id="editor-file-hidden-input"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleVideoUpload(file);
                    }}
                  />
                  <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-650 mb-4 group-hover:scale-105 transition-all">
                    <Upload className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">Import & Edit Existing Video</h3>
                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed max-w-md mx-auto">
                    Drag & drop an MP4, WebM, OGG, or MOV file, or click anywhere to browse.
                    You can trim ranges, adjust equalizers, insert watermarks, or generate captions.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    <span>SUPPORTED: MP4, WEBM, OGG, MOV</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-3 items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Or switch to:</span>
                  <button
                    id="editor-fallback-btn-record"
                    type="button"
                    onClick={() => setActiveTab("recorder")}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Screen Recorder</span>
                  </button>
                  <button
                    id="editor-fallback-btn-library"
                    type="button"
                    onClick={() => setActiveTab("library")}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 border border-slate-200"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Saved Library</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="interactive-editor-grid">
                {/* 1. Left editor panel: Expanded Video Scrubber playback controls (Filmora Viewport) */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Active Studio canvas</h2>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {library.find((i) => i.id === loadedItemId)?.title || "Custom Clip Stream"}
                          </p>
                        </div>
                        
                        {/* Inline Import/Swap */}
                        <div>
                          <input
                            type="file"
                            id="editor-swap-hidden-file"
                            accept="video/mp4,video/webm,video/ogg,video/quicktime"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleVideoUpload(file);
                            }}
                          />
                          <button
                            id="editor-btn-swap-video"
                            type="button"
                            onClick={() => {
                              const el = document.getElementById("editor-swap-hidden-file");
                              if (el) el.click();
                            }}
                            className="px-2 py-1 border border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/50 text-slate-600 hover:text-indigo-700 text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                            title="Import another video directly"
                          >
                            <Upload className="w-3 h-3 text-indigo-650" />
                            <span>Swap / Import</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          id="export-btn-webm"
                          type="button"
                          onClick={() => downloadVideoBlob("webm")}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>WEBM</span>
                        </button>
                        <button
                          id="export-btn-mp4"
                          type="button"
                          onClick={() => downloadVideoBlob("mp4")}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>MP4</span>
                        </button>
                      </div>
                    </div>

                    {/* Integrated player component */}
                    <VideoPlayerWithTrimming
                      videoBlob={videoBlob}
                      trimStart={trimStart}
                      trimEnd={trimEnd}
                      onTrimChange={handleTrimChange}
                      captions={captions}
                      playbackTime={playbackTime}
                      onPlaybackTimeUpdate={setPlaybackTime}
                    />
                  </div>

                  {/* Proposed AI Video Content Metadata block if generated */}
                  {aiAssets ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4" id="ai-assets-display">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 text-indigo-600">
                          <Sparkles className="w-5 h-5 animate-pulse" />
                          <h3 className="font-bold text-sm text-slate-900">AI Metadata Package (Gemini)</h3>
                        </div>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">READY</span>
                      </div>

                      {/* SE0 Suggestions list */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Engaging SEO Titles</h4>
                        <div className="space-y-1.5">
                          {aiAssets.titles.map((title, id) => (
                            <div key={id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold hover:border-indigo-200 transition-colors flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                              <span>{title}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Description block */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Rich Summary Description</h4>
                        <p className="text-xs text-slate-650 bg-slate-50 border border-slate-100 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                          {aiAssets.description}
                        </p>
                      </div>

                      {/* Chapters timeline list */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Automated Chapters Sequence</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {aiAssets.chapters.map((chap, idx) => (
                            <div
                              key={idx}
                              className="p-2 bg-indigo-50/20 border border-indigo-100/40 rounded-lg flex justify-between items-center text-xs hover:border-indigo-400 transition-all"
                            >
                              <span className="font-bold text-indigo-600 font-mono">{chap.timestamp}</span>
                              <span className="text-slate-700 font-semibold truncate max-w-[150px]">{chap.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-indigo-50/30 to-slate-100/20 border border-indigo-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6" id="ai-bundle-prompt-box">
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm text-indigo-950 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          <span>Generate SEO & Production Metadata Bundle</span>
                        </h3>
                        <p className="text-slate-500 text-xs max-w-md leading-relaxed">
                          Analyze subtitles transcripts with Gemini-3.5-flash to formulate snappy marketing titles, a structured video outline, and clickable milestones automatically.
                        </p>
                      </div>

                      <button
                        id="ai-generate-metadata-btn"
                        type="button"
                        disabled={isAiSummarizing}
                        onClick={generateAISummaryPackage}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer whitespace-nowrap"
                      >
                        {isAiSummarizing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Composing Outline...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 fill-current" />
                            <span>Run AI Producer</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Right editor panel: Caption segments list & dynamic tools */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Captions className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold tracking-tight">Timeline Subtitles ({captions.length})</h3>
                          <p className="text-[10px] text-slate-400">Timestamps map dynamically into video player</p>
                        </div>
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          id="refine-captions-btn"
                          type="button"
                          disabled={isAiProcessing || captions.length === 0}
                          onClick={refineCaptionsWithGemini}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 disabled:bg-slate-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                          title="Refine formatting with Gemini AI"
                        >
                          {isAiProcessing ? (
                            <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-amber-600 fill-current" />
                          )}
                          <span>AI Fix</span>
                        </button>
                        <button
                          id="add-cap-btn"
                          type="button"
                          onClick={handleAddNewCaptionLine}
                          className="p-1.5 border border-slate-200 text-slate-705 hover:border-indigo-500 hover:text-indigo-600 bg-white rounded-lg transition-colors"
                          title="Insert custom segment line"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Pre-fill subtitles helper option */}
                    {captions.length === 0 && (
                      <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center my-4 shrink-0" id="caption-presets">
                        <p className="text-xs text-slate-500">No subtitle segments on recorded tape track.</p>
                        <button
                          id="load-sample-btn-timeline"
                          type="button"
                          onClick={generateSampleCaptions}
                          className="mt-2.5 px-3.5 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 text-slate-800 text-[11px] font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          Synthesize Demo Subtitles
                        </button>
                      </div>
                    )}

                    {/* List area of caption blocks with active styling */}
                    <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1 flex-1" id="caption-scrolling-container">
                      {captions.map((cap) => {
                        const isActive = playbackTime >= cap.start && playbackTime <= cap.end;
                        const isEditing = editingCaptionId === cap.id;

                        return (
                          <div
                            key={cap.id}
                            className={`p-3 rounded-xl border text-xs transition-all ${
                              isActive
                                ? "bg-indigo-50/50 border-indigo-500 ring-1 ring-indigo-500 shadow-xs"
                                : "bg-slate-50/50 hover:bg-slate-50 border-slate-100"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              {/* Timing input controls */}
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <input
                                  type="number"
                                  step={0.1}
                                  value={cap.start}
                                  onChange={(e) => handleUpdateCaptionTimestamps(cap.id, parseFloat(e.target.value) || 0, cap.end)}
                                  className="w-12 bg-white px-1 py-0.5 rounded font-mono text-[10px] text-slate-700 border border-slate-200 focus:outline-indigo-500"
                                />
                                <span className="text-slate-400 text-[10px] font-mono">to</span>
                                <input
                                  type="number"
                                  step={0.1}
                                  value={cap.end}
                                  onChange={(e) => handleUpdateCaptionTimestamps(cap.id, cap.start, parseFloat(e.target.value) || 0)}
                                  className="w-12 bg-white px-1 py-0.5 rounded font-mono text-[10px] text-slate-700 border border-slate-200 focus:outline-indigo-500"
                                />
                              </div>

                              <div className="flex gap-1.5">
                                {isEditing ? (
                                  <button
                                    id={`save-txt-btn-${cap.id}`}
                                    type="button"
                                    onClick={() => handleSaveCaptionText(cap.id)}
                                    className="px-2 py-0.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-[10px] font-bold"
                                  >
                                    Done
                                  </button>
                                ) : (
                                  <button
                                    id={`edit-txt-btn-${cap.id}`}
                                    type="button"
                                    onClick={() => handleStartEditCaption(cap)}
                                    className="text-indigo-600 hover:text-indigo-900 font-semibold text-[10px]"
                                  >
                                    Edit Text
                                  </button>
                                )}
                                <button
                                  id={`delete-cap-btn-${cap.id}`}
                                  type="button"
                                  onClick={() => handleDeleteCaptionLine(cap.id)}
                                  className="text-rose-500 hover:text-rose-900 font-semibold text-[10px]"
                                  title="Remove phrase"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>

                            {isEditing ? (
                              <textarea
                                value={editingCaptionText}
                                onChange={(e) => setEditingCaptionText(e.target.value)}
                                className="w-full text-xs font-sans bg-white border border-slate-200 rounded-lg p-2 focus:outline-indigo-500 leading-normal"
                                rows={2}
                              />
                            ) : (
                              <p className="text-slate-800 font-medium leading-relaxed bg-white/70 p-2 rounded-lg border border-slate-100 select-none">
                                {cap.text}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Subtitle downloader buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 shrink-0">
                      <button
                        id="subtitle-btn-vtt"
                        type="button"
                        onClick={() => downloadSubtitleFile("vtt")}
                        className="py-2.5 border border-slate-250 hover:border-indigo-400 bg-white text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        <span>Download .VTT</span>
                      </button>
                      <button
                        id="subtitle-btn-srt"
                        type="button"
                        onClick={() => downloadSubtitleFile("srt")}
                        className="py-2.5 border border-slate-250 hover:border-indigo-400 bg-white text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        <span>Download .SRT</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* TAB PAGE 4: SHORTCUTS & USER MANUAL        */}
        {/* ========================================== */}
        {activeTab === "shortcuts" && (
          <div className="max-w-5xl mx-auto w-full p-6 animate-fade-in animate-duration-300" id="shortcuts-page-container">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Studio Hotkeys & Guides</h2>
              <p className="text-xs text-slate-500 mt-1">Accelerate your recording workflows with quick shortcut binds and troubleshooting logs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Keyboard bindings section */}
              <div className="md:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-4 tracking-tight uppercase tracking-wider text-[11px] text-slate-500">Keyboard Shortcuts</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-700">Play / Pause Editor Video</span>
                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-250 text-[10px] font-bold text-slate-600 rounded font-mono">Spacebar</kbd>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-700">Rewind / Forward 5 seconds</span>
                    <div className="flex gap-1">
                      <kbd className="px-2 py-1 bg-slate-100 border border-slate-250 text-[10px] font-bold text-slate-600 rounded font-mono">←</kbd>
                      <kbd className="px-2 py-1 bg-slate-100 border border-slate-250 text-[10px] font-bold text-slate-600 rounded font-mono">→</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-700">Quick Edit Subtitle Phrase</span>
                    <span className="text-xs text-slate-500 font-medium">Double-Click subtitle line card</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-700">Return to landing overview</span>
                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-250 text-[10px] font-bold text-slate-600 rounded font-mono">Logo Click</kbd>
                  </div>
                </div>

                <div className="mt-6 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/60 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="font-bold text-xs text-indigo-900 block">Pro Tips</span>
                    <p className="text-[11px] text-indigo-750 leading-relaxed mt-0.5">
                      Check your specifications before recording! Lowering resolution from 1440p to 1080p reduces browser CPU load by over 40% on standard notebooks.
                    </p>
                  </div>
                </div>
              </div>

              {/* Troubleshooting logs and assistant */}
              <div className="md:col-span-5 flex flex-col gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 tracking-tight uppercase tracking-wider text-[11px] text-slate-500">Troubleshooting Desk</h3>
                  <div className="space-y-4 text-xs font-medium text-slate-600 leading-relaxed">
                    <div>
                      <span className="text-slate-900 font-bold block">No Camera Stream?</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">Check if webcam is used by Zoom, Discord, or Teams. Only one app can capture live camera hardware streams simultaneously.</p>
                    </div>
                    <div>
                      <span className="text-slate-900 font-bold block">Muted System Audio?</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">In Chrome, select "Share System Audio" at the bottom of the screenshare pop-up window before clicking confirm share.</p>
                    </div>
                    <div>
                      <span className="text-slate-900 font-bold block">Mic Speeches Not Transcribing?</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">Verify that your chosen language matches your speech accent, and grant microphone access prompts inside browser settings search menu bars.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB PAGE 5: ADVANCED PREFERENCES           */}
        {/* ========================================== */}
        {activeTab === "settings" && (
          <div className="max-w-4xl mx-auto w-full p-6 animate-fade-in animate-duration-300" id="settings-page-container">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Studio Preferences</h2>
              <p className="text-xs text-slate-500 mt-1">Configure countdown timers, transcription parsing, and purge cached sandbox data</p>
            </div>

            <div className="space-y-6">
              {/* Card 1: Defaults */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Workspace Configs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Countdown selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2.5">Countdown Delay Timer</label>
                    <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50 gap-1 max-w-xs">
                      {([0, 3, 5] as const).map((secs) => (
                        <button
                          key={secs}
                          type="button"
                          onClick={() => {
                            setCountdownLength(secs);
                            showNotice("info", `Recording countdown timer adjusted to ${secs === 0 ? "Off" : `${secs}s`}.`);
                          }}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            countdownLength === secs
                              ? "bg-white text-indigo-950 shadow-xs border border-slate-200"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          {secs === 0 ? "Off" : `${secs}s`}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1.5 leading-relaxed">Adds a dynamic count down overlay before captures begin, letting you prepare speech scripts.</span>
                  </div>

                  {/* Speech to text language */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2.5">Transcripts Grammar Focus</label>
                    <select
                      value={defaultSubtitleLang}
                      onChange={(e) => {
                        setDefaultSubtitleLang(e.target.value);
                        showNotice("info", `Default speech model locale changed to ${e.target.value.toUpperCase()}.`);
                      }}
                      className="w-full max-w-xs text-xs font-semibold bg-white border border-slate-250 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="en-US">English (United States) - en-US</option>
                      <option value="es-ES">Spanish (Spain) - es-ES</option>
                      <option value="fr-FR">French (France) - fr-FR</option>
                      <option value="de-DE">German (Germany) - de-DE</option>
                      <option value="hi-IN">Hindi (India) - hi-IN</option>
                    </select>
                    <span className="text-[10px] text-slate-400 block mt-1.5 leading-relaxed">Saves preferred grammar parsing codes for the native speech recognition subtitle builder engine.</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
                  {/* Maximum duration threshold */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Safe Maximum Duration Limit</label>
                    <div className="flex items-center gap-3 max-w-xs">
                      <input
                        type="range"
                        min={2}
                        max={60}
                        step={1}
                        value={maxRecordDuration}
                        onChange={(e) => {
                          setMaxRecordDuration(parseInt(e.target.value) || 15);
                        }}
                        className="flex-1 accent-indigo-600 h-1 cursor-pointer bg-slate-100 rounded-lg appearance-none"
                      />
                      <span className="text-xs font-bold text-slate-900 font-mono shrink-0 px-2 py-0.5 bg-slate-50 rounded border border-slate-200">{maxRecordDuration} mins</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1.5 leading-relaxed">Automatically stops writing streams when reaching safe thresholds to avoid container overflow buffers.</span>
                  </div>

                  {/* Click highlights mouse overlay */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 font-semibold">Visual Click Guidelines</label>
                    <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 mt-1 select-none">
                      <input
                        type="checkbox"
                        checked={enableClickHighlight}
                        onChange={(e) => {
                          setEnableClickHighlight(e.target.checked);
                          showNotice("info", `Workspace pointer overlay set to: ${e.target.checked ? "Enabled" : "Disabled"}`);
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span>Highlight pointer action ripples</span>
                    </label>
                    <span className="text-[10px] text-slate-400 block mt-1.5 leading-relaxed">Displays auxiliary ripple highlights on interface clicks inside preview player bounds.</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Database purge utility */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-rose-950 tracking-tight flex items-center gap-2">
                       Purge Offline Storage
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Permanently remove all recorded files, captions, and highlights saved locally inside browser cache databases.</p>
                  </div>
                  <button
                    id="settings-wipe-db-btn"
                    type="button"
                    onClick={async () => {
                      if (window.confirm("Are you absolutely sure you want to permanently delete all recorded library items from offline storage? This action cannot be undone.")) {
                        try {
                          await clearLibraryItems();
                          setLibrary([]);
                          setLoadedItemId(null);
                          setVideoBlob(null);
                          setCaptions([]);
                          setAiAssets(null);
                          showNotice("success", "Storage Purge Complete. All offline data wiped successfully.");
                        } catch (err: any) {
                          showNotice("error", err.message || "Failed to purge database.");
                        }
                      }
                    }}
                    className="px-4 py-2 bg-rose-50 border border-rose-250 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs cursor-pointer transition-all shrink-0"
                  >
                    Wipe Offline Library Stores
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Professional human-designed footer */}
      <footer className="px-6 py-5 bg-white border-t border-slate-200 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4" id="main-footer">
        <div className="flex flex-col gap-1 text-center md:text-left">
          <span>© 2026 <strong>MotionCraft</strong>. All recordings and transcripts are processed 100% locally on your device.</span>
          <div className="text-[10px] text-slate-400">
            Created with passion by <strong className="text-indigo-600 font-bold">Vaibhav Bhardwaj</strong> — Connect on{" "}
            <a href="https://www.linkedin.com/in/mr-vaibhav-bhardwaj" target="_blank" rel="noreferrer noopener" className="text-slate-500 hover:text-indigo-600 underline font-semibold">LinkedIn</a> &{" "}
            <a href="https://github.com/mrvaibhavbhardwaj" target="_blank" rel="noreferrer noopener" className="text-slate-500 hover:text-indigo-600 underline font-semibold">GitHub</a>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 items-center justify-center font-medium">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100 font-bold animate-pulse">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Local secure environment
          </span>
          <span className="text-[10.5px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono">v2.4.0</span>
        </div>
      </footer>
    </div>
  );
}
