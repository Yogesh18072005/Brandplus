export interface ChartPoint {
  label: string;
  value: number;
  date?: string;
}

interface VisibilityChartProps {
  data: ChartPoint[];
  height?: number;
  className?: string;
}

export function VisibilityChart({ data, height = 180, className = '' }: VisibilityChartProps) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((point) => point.value), 1);

  return (
    <div className={className}>
      <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
        {data.map((point, index) => {
          const barHeight = Math.max((point.value / max) * (height - 48), 6);
          const latest = index === data.length - 1;
          return (
            <div key={`${point.label}-${index}`} className="flex flex-1 flex-col items-center justify-end" title={`${point.value}${point.date ? ` · ${point.date}` : ''}`}>
              <span className={`mb-2 font-mono text-[10px] tabular-nums sm:text-[11px] ${latest ? 'font-semibold text-content' : 'text-tertiary'}`}>{point.value}</span>
              <div className={`w-full max-w-[40px] rounded-t-sm ${latest ? 'bg-signal' : 'bg-signal/20'}`} style={{ height: barHeight }} />
              <span className="mt-2 text-center text-[9px] tabular-nums text-muted sm:text-[10px]">{point.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
