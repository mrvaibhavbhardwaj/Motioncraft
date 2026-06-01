import React from "react";
import { Monitor, Video, Mic, Volume2, ShieldAlert, CheckCircle2, Sliders, ChevronDown } from "lucide-react";
import { RecordOptions, AudioCategory } from "../types";

interface Props {
  options: RecordOptions;
  onChange: (options: RecordOptions) => void;
  isRecording: boolean;
}

export default function RecorderOptions({ options, onChange, isRecording }: Props) {
  const toggleRecordCamera = () => {
    if (isRecording) return;
    onChange({ ...options, recordCamera: !options.recordCamera });
  };

  const setAudioCategory = (category: AudioCategory) => {
    if (isRecording) return;
    onChange({ ...options, audioCategory: category });
  };

  const setResolution = (res: "720p" | "1080p" | "1440p") => {
    if (isRecording) return;
    onChange({ ...options, resolution: res });
  };

  const setFrameRate = (fps: 30 | 60) => {
    if (isRecording) return;
    onChange({ ...options, frameRate: fps });
  };

  const setExportFormat = (fmt: "webm" | "mp4") => {
    if (isRecording) return;
    onChange({ ...options, exportFormat: fmt });
  };

  return (
    <div id="recorder-options-panel" className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
          <Sliders className="w-5 h-5" id="sliders-icon" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Recording Presets</h2>
          <p className="text-xs text-gray-500">Configure your capturing feeds and quality rules</p>
        </div>
      </div>

      {/* Preset Feeds - Elegant vertical list to prevent horizontal squishing in narrower sidebar spaces */}
      <div className="flex flex-col gap-3 mb-6" id="presets-stack-container">
        {/* Screen Only */}
        <button
          id="preset-screen-only"
          type="button"
          disabled={isRecording}
          onClick={() => onChange({ ...options, recordCamera: false, audioCategory: "none" })}
          className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
            !options.recordCamera && options.audioCategory === "none"
              ? "border-indigo-600 bg-indigo-50/40 text-indigo-950 ring-1 ring-indigo-600 shadow-sm"
              : "border-gray-200 hover:border-gray-300 bg-white text-gray-700 hover:bg-slate-50/30"
          } ${isRecording ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="p-2.5 bg-white border border-gray-150 rounded-lg shadow-sm text-indigo-600 shrink-0">
            <Monitor className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5 font-semibold text-sm text-gray-950">
              <span>Screen Record Only</span>
              {!isRecording && !options.recordCamera && options.audioCategory === "none" && (
                <div className="w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Capture your screen or window feed cleanly. No camera overlay or audio stream is integrated.
            </p>
          </div>
        </button>

        {/* Screen + Audio */}
        <button
          id="preset-screen-audio"
          type="button"
          disabled={isRecording}
          onClick={() => onChange({ ...options, recordCamera: false, audioCategory: "both" })}
          className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
            !options.recordCamera && options.audioCategory !== "none"
              ? "border-indigo-600 bg-indigo-50/40 text-indigo-950 ring-1 ring-indigo-600 shadow-sm"
              : "border-gray-200 hover:border-gray-300 bg-white text-gray-700 hover:bg-slate-50/30"
          } ${isRecording ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="p-2.5 bg-white border border-gray-150 rounded-lg shadow-sm text-teal-600 shrink-0">
            <Mic className="w-5 h-5 text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5 font-semibold text-sm text-gray-950">
              <span>Screen with Audio</span>
              {!isRecording && !options.recordCamera && options.audioCategory !== "none" && (
                <div className="w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Capture your screen along with microphoned voice narration and device audio tracks.
            </p>
          </div>
        </button>

        {/* Full Creator Suite */}
        <button
          id="preset-creator-suite"
          type="button"
          disabled={isRecording}
          onClick={() => onChange({ ...options, recordCamera: true, audioCategory: "both" })}
          className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
            options.recordCamera
              ? "border-indigo-600 bg-indigo-50/40 text-indigo-950 ring-1 ring-indigo-600 shadow-sm"
              : "border-gray-200 hover:border-gray-300 bg-white text-gray-700 hover:bg-slate-50/30"
          } ${isRecording ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="p-2.5 bg-white border border-gray-150 rounded-lg shadow-sm text-rose-500 shrink-0">
            <Video className="w-5 h-5 text-rose-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5 font-semibold text-sm text-gray-950">
              <span>Screen, Audio & Camera</span>
              {!isRecording && options.recordCamera && (
                <div className="w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Full presenter setup. Merges floating circular webcam overlays with mixed voice audio tracks.
            </p>
          </div>
        </button>
      </div>

      <div className="border-t border-gray-100 pt-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 tracking-tight">Fine-tuned Specifications</h3>
        {/* Clean, container-safe 2x2 grid designed for sidebars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="specifications-fine-grid">
          {/* Camera Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Camera PiP</label>
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50/50 gap-0.5">
              <button
                id="camera-pip-on"
                type="button"
                disabled={isRecording}
                onClick={toggleRecordCamera}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  options.recordCamera
                    ? "bg-white text-indigo-950 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                On
              </button>
              <button
                id="camera-pip-off"
                type="button"
                disabled={isRecording}
                onClick={toggleRecordCamera}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  !options.recordCamera
                    ? "bg-white text-indigo-950 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Off
              </button>
            </div>
          </div>

          {/* Audio feeds selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Audio Track</label>
            <div className="relative">
              <select
                id="audio-source-select"
                disabled={isRecording}
                value={options.audioCategory}
                onChange={(e) => setAudioCategory(e.target.value as AudioCategory)}
                className="w-full text-xs font-medium bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer"
              >
                <option value="none">No Audio (Muted)</option>
                <option value="mic">Microphone Only</option>
                <option value="system">System Audio Only</option>
                <option value="both">Mic & System Mixed</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-gray-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Resolution selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Resolution</label>
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50/50 gap-0.5">
              {(["720p", "1080p", "1440p"] as const).map((r) => (
                <button
                  id={`res-option-${r}`}
                  key={r}
                  type="button"
                  disabled={isRecording}
                  onClick={() => setResolution(r)}
                  className={`flex-1 py-1.5 text-[11.5px] font-semibold rounded-md transition-all cursor-pointer ${
                    options.resolution === r
                      ? "bg-white text-indigo-950 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Export Format Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Export Format</label>
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50/50 gap-0.5">
              {(["webm", "mp4"] as const).map((fmt) => (
                <button
                  id={`format-option-${fmt}`}
                  key={fmt}
                  type="button"
                  disabled={isRecording}
                  onClick={() => setExportFormat(fmt)}
                  className={`flex-1 py-1.5 text-[11.5px] font-semibold rounded-md uppercase transition-all cursor-pointer ${
                    options.exportFormat === fmt
                      ? "bg-white text-indigo-950 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* System & Mic permission notice helper */}
        <div className="mt-5 p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 leading-relaxed">
          <ShieldAlert className="w-4.5 h-4.5 shrink-0 text-amber-600 mt-0.2" id="shield-alert-icon" />
          <div>
            <span className="font-semibold">Permissions Check:</span> Your browser will ask for display/screen capture permission when you click Record. To overlay your Face Cam, camera permissions will also be requested. Make sure to toggle "Share System Audio" when selecting the screen tab to record background music!
          </div>
        </div>
      </div>
    </div>
  );
}
