import { useStore } from '../store/useStore';
import PatternBadge from './PatternBadge';

export default function NodeTooltip() {
  const { tooltip } = useStore();

  if (!tooltip.visible || !tooltip.nodeData) return null;

  const { nodeData, x, y } = tooltip;
  const OFFSET = 16;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: x + OFFSET,
    top: y - OFFSET,
    zIndex: 9999,
    pointerEvents: 'none',
  };

  return (
    <div style={style}>
      <div className="bg-slate-900 border border-slate-600 rounded-xl shadow-2xl p-3 min-w-[200px] max-w-[260px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-mono text-xs font-bold">{nodeData.id}</span>
          {nodeData.isSuspicious ? (
            <span className="text-red-400 text-xs font-semibold bg-red-500/15 px-1.5 py-0.5 rounded-full border border-red-500/30">
              SUSPICIOUS
            </span>
          ) : (
            <span className="text-emerald-400 text-xs font-semibold bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
              CLEAN
            </span>
          )}
        </div>

        {nodeData.isSuspicious && (
          <>
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-xs">Suspicion Score</span>
                <span className="text-white text-xs font-bold">{nodeData.suspicion_score}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    nodeData.suspicion_score >= 80 ? 'bg-red-500' :
                    nodeData.suspicion_score >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${nodeData.suspicion_score}%` }}
                />
              </div>
            </div>

            {nodeData.ring_id && nodeData.ring_id !== 'unassigned' && (
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-slate-400 text-xs">Ring:</span>
                <span className="text-slate-200 text-xs font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                  {nodeData.ring_id}
                </span>
              </div>
            )}

            {nodeData.detected_patterns.length > 0 && (
              <div>
                <p className="text-slate-400 text-xs mb-1.5">Patterns:</p>
                <div className="flex flex-wrap gap-1">
                  {nodeData.detected_patterns.map(p => (
                    <PatternBadge key={p} pattern={p} small />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
