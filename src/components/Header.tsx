import { Activity, Wifi, WifiOff } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Header() {
  const { backendConnected, lastAnalysisTime, totalProcessed } = useStore();

  return (
    <header className="w-full bg-slate-900 border-b border-slate-700 px-4 py-2.5 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-red-500" />
          <span className="text-white font-bold text-sm tracking-wide">FinForge</span>
          <span className="text-slate-400 text-xs hidden sm:inline">Money Muling Detection Engine</span>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400 text-xs font-medium">LIVE</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400">
        {lastAnalysisTime && (
          <span className="hidden md:inline">
            Last analysis: <span className="text-slate-300">{lastAnalysisTime}</span>
          </span>
        )}
        {totalProcessed > 0 && (
          <span className="hidden sm:inline">
            Processed: <span className="text-slate-300">{totalProcessed.toLocaleString()} txns</span>
          </span>
        )}
        <div className="flex items-center gap-1.5">
          {backendConnected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-400">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-amber-400">Mock Data</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
