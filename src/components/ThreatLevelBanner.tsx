import { useEffect } from 'react';
import { ShieldAlert, Shield, ShieldCheck } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function ThreatLevelBanner() {
  const { analysisResult, threatLevel, setThreatLevel, lastAnalysisTime } = useStore();

  useEffect(() => {
    if (!analysisResult || analysisResult.fraud_rings.length === 0) {
      setThreatLevel(null);
      return;
    }
    const maxRisk = Math.max(...analysisResult.fraud_rings.map(r => r.risk_score));
    if (maxRisk > 85) setThreatLevel('CRITICAL');
    else if (maxRisk >= 60) setThreatLevel('ELEVATED');
    else setThreatLevel('MONITORED');
  }, [analysisResult, setThreatLevel]);

  if (!threatLevel || !analysisResult) return null;

  const ringCount = analysisResult.fraud_rings.length;
  const maxRisk = Math.max(...analysisResult.fraud_rings.map(r => r.risk_score), 0);

  const config = {
    CRITICAL: {
      bg: 'bg-red-900/80 border-red-700',
      text: 'text-red-200',
      icon: <ShieldAlert className="w-4 h-4 text-red-400" />,
      label: 'CRITICAL',
      labelClass: 'bg-red-500 text-white animate-pulse',
    },
    ELEVATED: {
      bg: 'bg-amber-900/60 border-amber-700',
      text: 'text-amber-200',
      icon: <Shield className="w-4 h-4 text-amber-400" />,
      label: 'ELEVATED',
      labelClass: 'bg-amber-500 text-white',
    },
    MONITORED: {
      bg: 'bg-slate-800/80 border-slate-700',
      text: 'text-slate-300',
      icon: <ShieldCheck className="w-4 h-4 text-slate-400" />,
      label: 'MONITORED',
      labelClass: 'bg-slate-600 text-slate-200',
    },
  }[threatLevel];

  return (
    <div className={`w-full px-4 py-2 flex items-center justify-between border-b shrink-0 ${config.bg}`}>
      <div className="flex items-center gap-3">
        {config.icon}
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${config.labelClass}`}>
          {config.label}
        </span>
        <span className={`text-xs ${config.text}`}>
          {ringCount} active ring{ringCount !== 1 ? 's' : ''} detected
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className={config.text}>
          Highest risk: <span className="font-bold">{maxRisk.toFixed(1)}</span>
        </span>
        {lastAnalysisTime && (
          <span className="text-slate-500">
            Updated: {lastAnalysisTime}
          </span>
        )}
      </div>
    </div>
  );
}
