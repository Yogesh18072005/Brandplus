export function DataBar({
  label,
  value,
  maxValue = 100,
  isSelf,
  className = '',
}: {
  label: string;
  value: number;
  maxValue?: number;
  isSelf?: boolean;
  className?: string;
}) {
  const pct = Math.min((value / maxValue) * 100, 100);
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-content">{label}</span>
        <span className="font-mono text-[13px] font-semibold tabular-nums text-content">
          {value}%
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-overlay">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isSelf ? 'bg-absence' : 'bg-gradient-to-r from-signal to-presence'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
