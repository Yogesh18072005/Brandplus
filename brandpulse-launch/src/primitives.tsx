import React from "react";
import { C, enter, p } from "./motion";
export function Mark({
  size = 64,
  light = false,
  progress = 1,
}: {
  size?: number;
  light?: boolean;
  progress?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="brand-blue" x1="10" y1="8" x2="54" y2="58">
          <stop stopColor="#60A6FB" />
          <stop offset="1" stopColor="#1055C5" />
        </linearGradient>
      </defs>
      <path
        d="M52.70 28.49A21 21 0 1 1 31.86 11.00"
        stroke={light ? "white" : "url(#brand-blue)"}
        strokeWidth="10"
        strokeLinecap="round"
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset={1 - progress}
      />
      <circle
        cx="45.5"
        cy="15.91"
        r={6.2 * progress}
        fill={light ? C.mint : "#1FC58A"}
      />
    </svg>
  );
}
export function Logo({
  size = 42,
  light = false,
}: {
  size?: number;
  light?: boolean;
}) {
  return (
    <div
      className="zc-logo"
      style={{
        fontSize: size,
        color: light ? "white" : C.ink,
        gap: size * 0.3,
      }}
    >
      <Mark size={size * 1.12} light={light} />
      <span>brandpulse</span>
    </div>
  );
}
export function Arrow({
  size = 30,
  color = "currentColor",
  direction = "right",
}: {
  size?: number;
  color?: string;
  direction?: "right" | "up";
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      style={{ rotate: direction === "up" ? "-90deg" : "0deg" }}
    >
      <path
        d="M6 16H25M18 8L26 16L18 24"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Search({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle
        cx="13.5"
        cy="13.5"
        r="8.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M20 20L27 27"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Tick({
  size = 22,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12L10 17L20 7"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Eyebrow({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <div className="eyebrow" style={{ color: light ? "#AFC4EE" : C.muted }}>
      <span
        className="signal-dot"
        style={{ background: light ? C.mint : C.blue }}
      />
      {children}
    </div>
  );
}
export function Heading({
  lines,
  t,
  start = 0,
  size = 100,
  color = C.ink,
  accent = C.blue,
  align = "left",
}: {
  lines: string[];
  t: number;
  start?: number;
  size?: number;
  color?: string;
  accent?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      style={{
        fontSize: size,
        lineHeight: 1.08,
        letterSpacing: "-.055em",
        fontWeight: 600,
        textAlign: align,
        color,
      }}
    >
      {lines.map((line, i) => (
        <div
          key={line}
          style={{ overflow: "hidden", paddingBottom: 10, marginBottom: -10 }}
        >
          <div
            style={{
              ...enter(t, start + i * 0.13, 0.8, 100),
              color: i === lines.length - 1 ? accent : color,
            }}
          >
            {line}
          </div>
        </div>
      ))}
    </div>
  );
}
export function Footer({
  chapter,
  light = false,
  example = false,
}: {
  chapter: string;
  light?: boolean;
  example?: boolean;
}) {
  return (
    <div
      className="film-footer"
      style={{ color: light ? "#AFC4EE" : "#64707D" }}
    >
      <span>
        brandpulse <span style={{ opacity: 0.4, padding: "0 18px" }}>/</span>{" "}
        {chapter}
      </span>
      {example && <span>ILLUSTRATIVE PRODUCT WORKFLOW</span>}
      <span>AI VISIBILITY, WITH A WAY FORWARD.</span>
    </div>
  );
}
export function Cursor({
  t,
  x,
  y,
  click = false,
}: {
  t: number;
  x: number;
  y: number;
  click?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        filter: "drop-shadow(0 3px 3px #0003)",
        transform: `scale(${click ? 1 - 0.13 * Math.sin(p(t, 0, 0.3) * Math.PI) : 1})`,
      }}
    >
      <svg width="35" height="42" viewBox="0 0 35 42">
        <path
          d="M3 2L31 23L19 25L14 38L3 2Z"
          fill={C.ink}
          stroke="white"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
