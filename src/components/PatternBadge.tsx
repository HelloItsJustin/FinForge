interface Props {
  pattern: string;
  small?: boolean;
}

const PATTERN_STYLES: Record<string, string> = {
  cycle_length_3: 'text-red-400 bg-red-500/15 border-red-500/30',
  cycle_length_4: 'text-red-400 bg-red-500/15 border-red-500/30',
  cycle_length_5: 'text-red-400 bg-red-500/15 border-red-500/30',
  high_velocity: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  fan_in: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  fan_out: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  shell_chain: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  low_transaction_intermediary: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
};

export default function PatternBadge({ pattern, small = false }: Props) {
  const style = PATTERN_STYLES[pattern] ?? 'text-slate-400 bg-slate-700 border-slate-600';
  const size = small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  return (
    <span className={`inline-block font-mono rounded border ${style} ${size} whitespace-nowrap`}>
      {pattern}
    </span>
  );
}
