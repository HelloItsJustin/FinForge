import { useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';

interface ScoreRow {
  signal: string;
  weight: number;
  description: string;
  color: string;
}

const ROWS: ScoreRow[] = [
  { signal: 'Cycle Membership', weight: 40, description: 'Account participates in a detected circular flow (cycle length 3–5).', color: 'bg-red-500' },
  { signal: 'Temporal Velocity', weight: 25, description: 'Account has ≥8 transactions within any 72-hour window.', color: 'bg-amber-500' },
  { signal: 'Fan Ratio', weight: 20, description: 'High in-degree (many senders) or out-degree (many receivers) indicating structuring.', color: 'bg-orange-500' },
  { signal: 'Shell Hop Depth', weight: 15, description: 'Account is an intermediary in a low-value linear chain (≥2 hops).', color: 'bg-yellow-500' },
];

const PATTERNS = [
  { name: 'cycle_length_3', color: 'text-red-400 bg-red-500/15 border-red-500/30', desc: 'Triangular money loop' },
  { name: 'cycle_length_4', color: 'text-red-400 bg-red-500/15 border-red-500/30', desc: '4-node cycle' },
  { name: 'cycle_length_5', color: 'text-red-400 bg-red-500/15 border-red-500/30', desc: '5-node cycle' },
  { name: 'high_velocity', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30', desc: 'Rapid burst of txns' },
  { name: 'fan_in', color: 'text-orange-400 bg-orange-500/15 border-orange-500/30', desc: 'Many senders → one account' },
  { name: 'fan_out', color: 'text-orange-400 bg-orange-500/15 border-orange-500/30', desc: 'One account → many receivers' },
  { name: 'shell_chain', color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30', desc: 'Linear layering chain' },
  { name: 'low_transaction_intermediary', color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30', desc: 'Low-value hop node' },
];

export default function MethodologyPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-700">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
      >
        <Info className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-slate-300 text-sm font-medium flex-1">Score Methodology</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Suspicion Score (0–100)</p>
            {ROWS.map(row => (
              <div key={row.signal} className="bg-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-200 text-xs font-semibold">{row.signal}</span>
                  <span className="text-slate-400 text-xs font-mono">+{row.weight} pts</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5 mb-1.5">
                  <div
                    className={`h-1.5 rounded-full ${row.color}`}
                    style={{ width: `${row.weight}%` }}
                  />
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">{row.description}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Detection Patterns</p>
            <div className="flex flex-wrap gap-1.5">
              {PATTERNS.map(p => (
                <span
                  key={p.name}
                  title={p.desc}
                  className={`text-xs px-2 py-0.5 rounded border font-mono ${p.color}`}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
