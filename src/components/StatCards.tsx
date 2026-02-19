import { Users, AlertTriangle, Network, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';

interface CardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent: string;
  bg: string;
}

function Card({ icon, value, label, accent, bg }: CardProps) {
  return (
    <div className={`rounded-xl border border-slate-700 p-4 flex items-start gap-3 ${bg}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white leading-none mb-1">{value}</p>
        <p className="text-slate-400 text-xs leading-snug">{label}</p>
      </div>
    </div>
  );
}

export default function StatCards() {
  const { analysisResult } = useStore();

  const total = analysisResult?.summary.total_accounts_analyzed ?? '—';
  const flagged = analysisResult?.summary.suspicious_accounts_flagged ?? '—';
  const rings = analysisResult?.summary.fraud_rings_detected ?? '—';
  const time = analysisResult ? `${analysisResult.summary.processing_time_seconds}s` : '—';

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Card
        icon={<Users className="w-5 h-5 text-slate-300" />}
        value={total}
        label="Total Accounts Analyzed"
        accent="bg-slate-700"
        bg="bg-slate-900"
      />
      <Card
        icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
        value={flagged}
        label="Suspicious Accounts Flagged"
        accent="bg-red-500/20"
        bg="bg-slate-900"
      />
      <Card
        icon={<Network className="w-5 h-5 text-amber-400" />}
        value={rings}
        label="Fraud Rings Detected"
        accent="bg-amber-500/20"
        bg="bg-slate-900"
      />
      <Card
        icon={<Clock className="w-5 h-5 text-emerald-400" />}
        value={time}
        label="Processing Time"
        accent="bg-emerald-500/20"
        bg="bg-slate-900"
      />
    </div>
  );
}
