import { create } from 'zustand';
import { Transaction, AnalysisResult, TooltipState, TimelineRange } from '../types';

interface AppState {
  transactions: Transaction[];
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  analysisStatus: string;
  backendConnected: boolean;
  lastAnalysisTime: string | null;
  totalProcessed: number;
  selectedNodeId: string | null;
  tooltip: TooltipState;
  fileName: string | null;

  // New state slices
  analysisId: string | null;
  masterminds: string[];
  timelineRange: TimelineRange | null;
  currentTimelinePosition: number | null;
  isTimelinePlaying: boolean;
  timelineSpeed: number;
  isolatedRingId: string | null;
  threatLevel: 'CRITICAL' | 'ELEVATED' | 'MONITORED' | null;
  forensicCardAccount: string | null;
  toastMessage: string | null;

  setTransactions: (txs: Transaction[], fileName?: string) => void;
  setAnalysisResult: (result: AnalysisResult) => void;
  setIsAnalyzing: (val: boolean) => void;
  setAnalysisStatus: (status: string) => void;
  setBackendConnected: (val: boolean) => void;
  setLastAnalysisTime: (time: string) => void;
  setTotalProcessed: (count: number) => void;
  setSelectedNodeId: (id: string | null) => void;
  setTooltip: (tooltip: TooltipState) => void;

  // New setters
  setAnalysisId: (id: string | null) => void;
  setMasterminds: (ids: string[]) => void;
  setTimelineRange: (range: TimelineRange | null) => void;
  setCurrentTimelinePosition: (ts: number | null) => void;
  setIsTimelinePlaying: (val: boolean) => void;
  setTimelineSpeed: (speed: number) => void;
  setIsolatedRingId: (id: string | null) => void;
  setThreatLevel: (level: 'CRITICAL' | 'ELEVATED' | 'MONITORED' | null) => void;
  setForensicCardAccount: (id: string | null) => void;
  setToastMessage: (msg: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  transactions: [],
  analysisResult: null,
  isAnalyzing: false,
  analysisStatus: '',
  backendConnected: false,
  lastAnalysisTime: null,
  totalProcessed: 0,
  selectedNodeId: null,
  fileName: null,
  tooltip: { visible: false, x: 0, y: 0, nodeData: null },

  // New defaults
  analysisId: null,
  masterminds: [],
  timelineRange: null,
  currentTimelinePosition: null,
  isTimelinePlaying: false,
  timelineSpeed: 1,
  isolatedRingId: null,
  threatLevel: null,
  forensicCardAccount: null,
  toastMessage: null,

  setTransactions: (txs, fileName) => set({ transactions: txs, fileName: fileName ?? null }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setIsAnalyzing: (val) => set({ isAnalyzing: val }),
  setAnalysisStatus: (status) => set({ analysisStatus: status }),
  setBackendConnected: (val) => set({ backendConnected: val }),
  setLastAnalysisTime: (time) => set({ lastAnalysisTime: time }),
  setTotalProcessed: (count) => set({ totalProcessed: count }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setTooltip: (tooltip) => set({ tooltip }),

  // New setters
  setAnalysisId: (id) => set({ analysisId: id }),
  setMasterminds: (ids) => set({ masterminds: ids }),
  setTimelineRange: (range) => set({ timelineRange: range }),
  setCurrentTimelinePosition: (ts) => set({ currentTimelinePosition: ts }),
  setIsTimelinePlaying: (val) => set({ isTimelinePlaying: val }),
  setTimelineSpeed: (speed) => set({ timelineSpeed: speed }),
  setIsolatedRingId: (id) => set({ isolatedRingId: id }),
  setThreatLevel: (level) => set({ threatLevel: level }),
  setForensicCardAccount: (id) => set({ forensicCardAccount: id }),
  setToastMessage: (msg) => set({ toastMessage: msg }),
}));
