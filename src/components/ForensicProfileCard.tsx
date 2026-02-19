import { useMemo } from 'react';
import { X, Crown, AlertTriangle } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useStore } from '../store/useStore';
import PatternBadge from './PatternBadge';

export default function ForensicProfileCard() {
  const { analysisResult, forensicCardAccount, transactions, setForensicCardAccount } = useStore();

  const account = useMemo(() => {
    if (!forensicCardAccount || !analysisResult) return null;
    return analysisResult.suspicious_accounts.find(a => a.account_id === forensicCardAccount) ?? null;
  }, [forensicCardAccount, analysisResult]);

  const recentTxs = useMemo(() => {
    if (!forensicCardAccount) return [];
    return transactions
      .filter(t => t.sender_id === forensicCardAccount || t.receiver_id === forensicCardAccount)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [forensicCardAccount, transactions]);

  if (!forensicCardAccount || !account) return null;

  const radarData = [
    { dimension: 'Cycle', value: account.score_breakdown.cycle_score, max: 40 },
    { dimension: 'Velocity', value: account.score_breakdown.velocity_score, max: 25 },
    { dimension: 'Fan', value: account.score_breakdown.fan_score, max: 20 },
    { dimension: 'Shell', value: account.score_breakdown.shell_score, max: 15 },
  ];

  const scoreColor =
    account.suspicion_score >= 80 ? 'text-red-400' :
      account.suspicion_score >= 50 ? 'text-amber-400' : 'text-emerald-400';

  const scoreBarColor =
    account.suspicion_score >= 80 ? 'bg-red-500' :
      account.suspicion_score >= 50 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={() => setForensicCardAccount(null)}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[380px] max-w-full bg-slate-900 border-l border-slate-700 z-50 shadow-2xl shadow-black/50 flex flex-col overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-white font-mono text-sm font-bold truncate">{account.account_id}</span>
          </div>
          <button
            onClick={() => setForensicCardAccount(null)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Suspicion Score */}
            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Suspicion Score</p>
              <div className="flex items-end gap-2 mb-2">
                <span className={`text-4xl font-bold ${scoreColor}`}>{account.suspicion_score}</span>
                <span className="text-slate-500 text-sm mb-1">/ 100</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${scoreBarColor}`}
                  style={{ width: `${account.suspicion_score}%` }}
                />
              </div>
            </div>

            {/* Mastermind indicator */}
            {account.is_mastermind && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center gap-3">
                <Crown className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-yellow-300 text-sm font-bold">Ring Mastermind</p>
                  <p className="text-yellow-400/70 text-xs">
                    Score: {account.mastermind_score?.toFixed(1) ?? 'N/A'}
                  </p>
                </div>
              </div>
            )}

            {/* Radar Chart */}
            <div className="bg-slate-800 rounded-xl p-3">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Score Dimensions</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 40]} tick={false} axisLine={false} />
                    <Radar
                      name="Score"
                      dataKey="value"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detected Patterns */}
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Detected Patterns</p>
              <div className="flex flex-wrap gap-1.5">
                {account.detected_patterns.map(p => (
                  <PatternBadge key={p} pattern={p} />
                ))}
              </div>
            </div>

            {/* Ring Membership */}
            {account.ring_id && (
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Ring Membership</p>
                <span className="text-xs font-mono text-slate-200 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                  {account.ring_id}
                </span>
              </div>
            )}

            {/* Recent Transactions */}
            {recentTxs.length > 0 && (
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Recent Transactions</p>
                <div className="bg-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="px-2.5 py-2 text-left text-slate-500 font-medium">Time</th>
                        <th className="px-2.5 py-2 text-right text-slate-500 font-medium">Amount</th>
                        <th className="px-2.5 py-2 text-left text-slate-500 font-medium">Counterparty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {recentTxs.map(tx => {
                        const isSender = tx.sender_id === forensicCardAccount;
                        const counterparty = isSender ? tx.receiver_id : tx.sender_id;
                        const d = new Date(tx.timestamp);
                        const ts = `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
                        return (
                          <tr key={tx.transaction_id} className="hover:bg-slate-700/30">
                            <td className="px-2.5 py-1.5 text-slate-400 font-mono">{ts}</td>
                            <td className={`px-2.5 py-1.5 text-right font-mono font-medium ${isSender ? 'text-red-400' : 'text-emerald-400'}`}>
                              {isSender ? '-' : '+'}${tx.amount.toLocaleString()}
                            </td>
                            <td className="px-2.5 py-1.5 text-slate-300 font-mono truncate max-w-[100px]">{counterparty}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
