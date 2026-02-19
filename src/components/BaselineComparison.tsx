import { useMemo } from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function BaselineComparison() {
  const { analysisResult, transactions } = useStore();

  const stats = useMemo(() => {
    if (!analysisResult || transactions.length === 0) return null;

    // Compute degree (connections) per account across entire dataset
    const connectionCount = new Map<string, Set<string>>();
    for (const tx of transactions) {
      if (!connectionCount.has(tx.sender_id)) connectionCount.set(tx.sender_id, new Set());
      if (!connectionCount.has(tx.receiver_id)) connectionCount.set(tx.receiver_id, new Set());
      connectionCount.get(tx.sender_id)!.add(tx.receiver_id);
      connectionCount.get(tx.receiver_id)!.add(tx.sender_id);
    }

    const allDegrees = [...connectionCount.values()].map(s => s.size);
    const networkBaseline = allDegrees.length > 0
      ? allDegrees.reduce((a, b) => a + b, 0) / allDegrees.length
      : 0;

    // Average connections for suspicious accounts
    const suspIds = new Set(analysisResult.suspicious_accounts.map(a => a.account_id));
    const suspDegrees = [...connectionCount.entries()]
      .filter(([id]) => suspIds.has(id))
      .map(([, conns]) => conns.size);
    const suspAvg = suspDegrees.length > 0
      ? suspDegrees.reduce((a, b) => a + b, 0) / suspDegrees.length
      : 0;

    const multiplier = networkBaseline > 0 ? suspAvg / networkBaseline : 0;
    const percentDiff = networkBaseline > 0
      ? ((suspAvg - networkBaseline) / networkBaseline) * 100
      : 0;

    return { networkBaseline, suspAvg, multiplier, percentDiff };
  }, [analysisResult, transactions]);

  if (!stats || !analysisResult) return null;

  const isHigher = stats.percentDiff > 0;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-slate-400" />
        <span className="text-white font-semibold text-sm">Connection Baseline Comparison</span>
      </div>

      <div className="flex items-stretch gap-3">
        {/* Network Baseline */}
        <div className="flex-1 bg-slate-800 rounded-lg p-3 border border-slate-700">
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Network Baseline</p>
          <p className="text-2xl font-bold text-slate-200">{stats.networkBaseline.toFixed(1)}</p>
          <p className="text-slate-500 text-xs">avg connections / account</p>
        </div>

        {/* Divider with arrow */}
        <div className="flex items-center">
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${isHigher ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            }`}>
            {isHigher && <TrendingUp className="w-3 h-3" />}
            {isHigher ? '+' : ''}{stats.percentDiff.toFixed(0)}%
          </div>
        </div>

        {/* Suspicious Average */}
        <div className="flex-1 bg-red-500/5 rounded-lg p-3 border border-red-500/20">
          <p className="text-red-400/70 text-xs uppercase tracking-wider mb-1">Suspicious Average</p>
          <p className="text-2xl font-bold text-red-400">{stats.suspAvg.toFixed(1)}</p>
          <p className="text-red-400/50 text-xs">avg connections / flagged account</p>
        </div>
      </div>

      {isHigher && (
        <p className="text-slate-400 text-xs mt-3">
          Suspicious accounts have <span className="text-red-400 font-bold">{stats.multiplier.toFixed(1)}x</span> more connections than baseline.
        </p>
      )}
    </div>
  );
}
