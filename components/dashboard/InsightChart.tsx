'use client';
import { useEffect, useRef, useState } from 'react';
export interface InsightPoint { label: string; value: number; date?: string }
export function InsightChart({ data, height = 240 }: { data: InsightPoint[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!ref.current || !data.length) return;
    let disposed = false; let chart: import('echarts').ECharts | undefined; let resize: ResizeObserver | undefined;
    import('echarts').then(echarts => {
      if (disposed || !ref.current) return;
      chart = echarts.init(ref.current, undefined, { renderer: 'svg' });
      chart.setOption({ animation: !matchMedia('(prefers-reduced-motion: reduce)').matches, animationDuration: 450, textStyle: { fontFamily: 'Inter, sans-serif' }, grid: { left: 38, right: 18, top: 22, bottom: 34 }, tooltip: { trigger: 'axis', confine: true, backgroundColor: '#262538', borderColor: '#54537e', textStyle: { color: '#f1f1f5' } }, xAxis: { type: 'category', data: data.map(p => p.label), boundaryGap: false, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#a7a6ca', fontSize: 12, margin: 14 } }, yAxis: { type: 'value', min: 0, max: 100, interval: 25, axisLabel: { color: '#a7a6ca', fontSize: 12 }, splitLine: { lineStyle: { color: '#363551', type: 'dashed' } } }, series: [{ name: 'Visibility score', data: data.map(p => p.value), type: 'line', smooth: false, showSymbol: data.length === 1, symbolSize: 7, lineStyle: { color: '#b4b4f2', width: 2.5 }, itemStyle: { color: '#b4b4f2' }, areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(180,180,242,.13)'},{offset:1,color:'rgba(180,180,242,0)'}]) } }] });
      resize = new ResizeObserver(() => chart?.resize()); resize.observe(ref.current);
    }).catch(() => setFailed(true));
    return () => { disposed = true; resize?.disconnect(); chart?.dispose(); };
  }, [data]);
  if (!data.length) return <div className="z-chart-empty" style={{ minHeight: height }}>Your first completed audit establishes the baseline.<br/>Future checks will appear here.</div>;
  return <div><div ref={ref} style={{ height, width: '100%' }} role="img" aria-label={`Visibility score history: ${data.map(p => `${p.label}: ${p.value} of 100`).join(', ')}`} />{failed && <p className="text-sm text-secondary">Chart unavailable. Measurements are listed below.</p>}<details className="z-chart-table"><summary>View measurements</summary><table><thead><tr><th>Check</th><th>Score / 100</th></tr></thead><tbody>{data.map((p,i) => <tr key={i}><td>{p.date ?? p.label}</td><td>{p.value}</td></tr>)}</tbody></table></details></div>;
}
