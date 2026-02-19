import { useState } from 'react';
import { ChevronDown, ChevronUp, Crown, Eye } from 'lucide-react';
import { useStore } from '../store/useStore';
import { FraudRing } from '../types';

type SortField = 'risk_score' | 'member_accounts' | 'pattern_type';
type SortDir = 'asc' | 'desc';

export default function FraudRingTable() {
  const { analysisResult, setIsolatedRingId, isolatedRingId } = useStore();
  const [sortField, setSortField] = useState<SortField>('risk_score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  if (!analysisResult) return null;

  const toggle = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const sorted = [...analysisResult.fraud_rings].sort((a: FraudRing, b: FraudRing) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortField === 'risk_score') return (a.risk_score - b.risk_score) * dir;
    if (sortField === 'member_accounts') return (a.member_accounts.length - b.member_accounts.length) * dir;
    return a.pattern_type.localeCompare(b.pattern_type) * dir;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-0.5" />
      : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  const riskColor = (score: number) =>
    score >= 85 ? 'text-red-400 bg-red-500/15' :
      score >= 60 ? 'text-amber-400 bg-amber-500/15' :
        'text-emerald-400 bg-emerald-500/15';

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-white font-semibold text-sm">Detected Fraud Rings</h3>
        <p className="text-slate-500 text-xs mt-0.5">
          {analysisResult.fraud_rings.length} ring{analysisResult.fraud_rings.length !== 1 ? 's' : ''} identified
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-800/70">
            <tr>
              <th
                onClick={() => toggle('risk_score')}
                className="px-3 py-2.5 text-left text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
              >
                Ring ID <SortIcon field="risk_score" />
              </th>
              <th
                onClick={() => toggle('pattern_type')}
                className="px-3 py-2.5 text-left text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
              >
                Pattern <SortIcon field="pattern_type" />
              </th>
              <th
                onClick={() => toggle('member_accounts')}
                className="px-3 py-2.5 text-center text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
              >
                Members <SortIcon field="member_accounts" />
              </th>
              <th
                onClick={() => toggle('risk_score')}
                className="px-3 py-2.5 text-center text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
              >
                Risk <SortIcon field="risk_score" />
              </th>
              <th className="px-3 py-2.5 text-center text-slate-400 font-medium">
                Mastermind
              </th>
              <th className="px-3 py-2.5 text-center text-slate-400 font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {sorted.map(ring => (
              <tr key={ring.ring_id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-3 py-2.5 text-slate-200 font-mono font-medium">
                  {ring.ring_id}
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-slate-300 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-medium uppercase">
                    {ring.pattern_type.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center text-slate-300">
                  {ring.member_accounts.length}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${riskColor(ring.risk_score)}`}>
                    {ring.risk_score.toFixed(1)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {ring.mastermind_account ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[10px] font-bold">
                      <Crown className="w-3 h-3" />
                      {ring.mastermind_account}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <button
                    onClick={() => setIsolatedRingId(isolatedRingId === ring.ring_id ? null : ring.ring_id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${isolatedRingId === ring.ring_id
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
                      }`}
                  >
                    <Eye className="w-3 h-3" />
                    {isolatedRingId === ring.ring_id ? 'Viewing' : 'Isolate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-700 text-xs text-slate-500">
          Click "Isolate" to highlight a ring in the graph view
        </div>
      )}
    </div>
  );
}
