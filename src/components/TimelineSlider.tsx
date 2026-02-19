import { useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward } from 'lucide-react';
import { useStore } from '../store/useStore';

function formatTs(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export default function TimelineSlider() {
  const {
    transactions,
    timelineRange,
    currentTimelinePosition,
    isTimelinePlaying,
    timelineSpeed,
    setTimelineRange,
    setCurrentTimelinePosition,
    setIsTimelinePlaying,
    setTimelineSpeed,
  } = useStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute timeline range from transactions
  useEffect(() => {
    if (transactions.length === 0) {
      setTimelineRange(null);
      return;
    }
    const times = transactions.map(t => new Date(t.timestamp).getTime()).filter(t => !isNaN(t));
    if (times.length === 0) return;
    const min = Math.min(...times);
    const max = Math.max(...times);
    setTimelineRange({ min, max });
    setCurrentTimelinePosition(max);
  }, [transactions, setTimelineRange, setCurrentTimelinePosition]);

  // Auto-play interval
  const stepSize = useCallback(() => {
    if (!timelineRange) return 0;
    const totalRange = timelineRange.max - timelineRange.min;
    return (totalRange / 200) * timelineSpeed;
  }, [timelineRange, timelineSpeed]);

  useEffect(() => {
    if (isTimelinePlaying && timelineRange) {
      intervalRef.current = setInterval(() => {
        const current = useStore.getState().currentTimelinePosition ?? timelineRange.min;
        const next = current + stepSize();
        if (next >= timelineRange.max) {
          setIsTimelinePlaying(false);
          setCurrentTimelinePosition(timelineRange.max);
        } else {
          setCurrentTimelinePosition(next);
        }
      }, 500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isTimelinePlaying, timelineRange, timelineSpeed, stepSize, setCurrentTimelinePosition, setIsTimelinePlaying]);

  if (!timelineRange) return null;

  const position = currentTimelinePosition ?? timelineRange.max;
  const percentage = ((position - timelineRange.min) / (timelineRange.max - timelineRange.min)) * 100;

  return (
    <div className="w-full bg-slate-900 border-t border-slate-700 px-4 py-2 shrink-0">
      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <button
          onClick={() => {
            if (!isTimelinePlaying && position >= timelineRange.max) {
              setCurrentTimelinePosition(timelineRange.min);
            }
            setIsTimelinePlaying(!isTimelinePlaying);
          }}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
        >
          {isTimelinePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        {/* Speed controls */}
        <div className="flex items-center gap-1">
          {[1, 2, 5].map(speed => (
            <button
              key={speed}
              onClick={() => setTimelineSpeed(speed)}
              className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors ${timelineSpeed === speed
                ? 'bg-red-600 border-red-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Timestamp display */}
        <span className="text-xs text-slate-400 font-mono min-w-[130px]">
          {formatTs(position)}
        </span>

        {/* Slider */}
        <div className="flex-1 relative">
          <input
            type="range"
            min={timelineRange.min}
            max={timelineRange.max}
            value={position}
            onChange={(e) => {
              setIsTimelinePlaying(false);
              setCurrentTimelinePosition(Number(e.target.value));
            }}
            className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-red-300 [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-red-900/50"
          />
          {/* Progress fill */}
          <div
            className="absolute top-1/2 left-0 h-1.5 bg-red-600/40 rounded-full pointer-events-none -translate-y-1/2"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Skip to end */}
        <button
          onClick={() => {
            setIsTimelinePlaying(false);
            setCurrentTimelinePosition(timelineRange.max);
          }}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
