import { X, Eye } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function RingIsolationControls() {
  const { isolatedRingId, analysisResult, setIsolatedRingId } = useStore();

  if (!isolatedRingId || !analysisResult) return null;

  const ring = analysisResult.fraud_rings.find(r => r.ring_id === isolatedRingId);
  if (!ring) return null;

  return (
    <div className="absolute top-3 left-3 right-14 z-10 flex items-center justify-between bg-amber-900/90 backdrop-blur border border-amber-600/50 rounded-lg px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-amber-400" />
        <span className="text-amber-200 text-sm font-medium">
          Viewing {ring.ring_id} — {ring.member_accounts.length} member{ring.member_accounts.length !== 1 ? 's' : ''} isolated
        </span>
      </div>
      <button
        onClick={() => setIsolatedRingId(null)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-800 hover:bg-amber-700 border border-amber-600 text-amber-200 text-xs font-medium transition-colors"
      >
        <X className="w-3 h-3" />
        Exit Isolation
      </button>
    </div>
  );
}
