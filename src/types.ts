export type RecordState = "idle" | "recording" | "paused" | "previewing";

export type AudioCategory = "none" | "mic" | "system" | "both";

export interface RecordOptions {
  recordScreen: boolean;
  recordCamera: boolean;
  audioCategory: AudioCategory;
  resolution: "720p" | "1080p" | "1440p";
  frameRate: 30 | 60;
  exportFormat: "webm" | "mp4";
}

export interface CaptionSegment {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

export interface AIContentAssets {
  titles: string[];
  description: string;
  chapters: { timestamp: string; title: string }[];
}

export interface LibraryItem {
  id: string;
  title: string;
  videoBlob: Blob;
  captions: CaptionSegment[];
  trimStart: number;
  trimEnd: number;
  duration: number;
  recordingMode: string;
  createdAt: number;
  aiAssets: AIContentAssets | null;
}
