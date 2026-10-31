import type { CSSProperties } from "react";
export const FPS = 60,
  DURATION = 56;
export const C = {
  blue: "#1E5AE8",
  bright: "#246BFD",
  ink: "#101826",
  paper: "#F6F7F4",
  muted: "#64707D",
  mint: "#A9FFDF",
  green: "#1F8A5B",
  red: "#D64545",
  rule: "#DDE3E9",
};
export const clamp = (v: number) => Math.min(1, Math.max(0, v));
export const ease = (v: number) => 1 - Math.pow(1 - clamp(v), 4);
export const smooth = (v: number) => {
  const t = clamp(v);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const p = (t: number, start: number, duration = 0.8) =>
  ease((t - start) / duration);
export const mix = (a: number, b: number, t: number) => a + (b - a) * clamp(t);
export const enter = (
  t: number,
  start = 0,
  duration = 0.75,
  y = 45,
): CSSProperties => ({
  opacity: p(t, start, duration),
  transform: `translateY(${y * (1 - p(t, start, duration))}px)`,
  filter: `blur(${7 * (1 - p(t, start, duration))}px)`,
});
export const scenes = [
  { id: "Hook", start: 0, duration: 6 },
  { id: "Gap", start: 6, duration: 4 },
  { id: "Brand", start: 10, duration: 4 },
  { id: "Questions", start: 14, duration: 7 },
  { id: "Evidence", start: 21, duration: 7 },
  { id: "Actions", start: 28, duration: 7 },
  { id: "Recheck", start: 35, duration: 7 },
  { id: "Loop", start: 42, duration: 6 },
  { id: "Final", start: 48, duration: 8 },
];
