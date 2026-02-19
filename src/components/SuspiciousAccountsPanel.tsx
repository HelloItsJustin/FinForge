import { AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import PatternBadge from './PatternBadge';

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-red-500' :
    score >= 50 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 bg-slate-700 rounded-full h-1.5 min-w-[60px]">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-200 w-8 text-right shrink-0">{score}%</span>
    </div>
  );
}

export default function SuspiciousAccountsPanel() {
  const { analysisResult } = useStore();

  if (!analysisResult || analysisResult.suspicious_accounts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No suspicious accounts detected yet. Run an analysis to see results.</p>
      </div>
    );
  }

  const accounts = [...analysisResult.suspicious_accounts].sort(
    (a, b) => b.suspicion_score - a.suspicion_score
  );

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <span className="text-white font-semibold text-sm">Suspicious Accounts</span>
        <span className="ml-auto text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
          {accounts.length} flagged
        </span>
      </div>

      <div className="divide-y divide-slate-800 max-h-[480px] overflow-y-auto">
        {accounts.map(acct => (
          <div key={acct.account_id} className="px-4 py-3 hover:bg-slate-800/40 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-slate-200 font-mono text-xs font-semibold truncate">
                  {acct.account_id}
                </span>
                {acct.ring_id && acct.ring_id !== 'unassigned' && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                    {acct.ring_id}
                  </span>
                )}
              </div>
            </div>

            <div className="mb-2">
              <ScoreBar score={acct.suspicion_score} />
            </div>

            <div className="flex flex-wrap gap-1">
              {acct.detected_patterns.map(p => (
                <PatternBadge key={p} pattern={p} small />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
