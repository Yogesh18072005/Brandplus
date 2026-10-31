import type { CSSProperties, ReactNode } from "react";
import { C, Far, Grain, Near, World, addPose, drift, mono, type Pose, type Theme } from "./lib";

/** one shot: far background, camera world, passing foreground, screen overlay */
export function Stage({
  theme,
  f,
  d,
  pose,
  children,
  overlay,
  near = "bar",
  nearDir = 1,
  perspective,
  hud,
  demo = false,
}: {
  theme: Theme;
  f: number;
  d: number;
  pose: Pose;
  children: ReactNode;
  overlay?: ReactNode;
  near?: "bar" | "card" | "dot" | "none";
  nearDir?: 1 | -1;
  perspective?: number;
  hud?: string;
  demo?: boolean;
}) {
  const p = addPose(pose, drift(f));
  const dark = theme === "dark" || theme === "blue";
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <Far theme={theme} f={f} pose={p} />
      <World pose={p} perspective={perspective}>
        {children}
      </World>
      {overlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translate(${-p.ry * 5 + p.rz * 3}px,${p.rx * 4}px) rotate(${p.rz * 0.4}deg)`,
          }}
        >
          {overlay}
        </div>
      )}
      {near !== "none" && <Near f={f} dur={d} theme={theme} kind={near} dir={nearDir} />}
      <Hud dark={dark} label={hud} demo={demo} />
      <Grain />
    </div>
  );
}

function Hud({ dark, label, demo }: { dark: boolean; label?: string; demo: boolean }) {
  const col = dark ? "#9FB4DA" : "#6A7896";
  const s: CSSProperties = { ...mono, position: "absolute", fontSize: 15, letterSpacing: "0.18em", color: col, textTransform: "uppercase", opacity: 0.85 };
  return (
    <>
      <div style={{ ...s, left: 56, top: 44, display: "flex", gap: 14, alignItems: "center" }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.green, display: "inline-block" }} />
        BrandPulse
        <span style={{ opacity: 0.5 }}>/</span>
        AI visibility
      </div>
      {label && <div style={{ ...s, right: 56, top: 44 }}>{label}</div>}
      {demo && <div style={{ ...s, left: 56, bottom: 40, fontSize: 13 }}>Illustrative example</div>}
    </>
  );
}

/** screen-space absolutely positioned block */
export function Ov({ x, y, children, style }: { x: number; y: number; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: "absolute", left: x, top: y, ...style }}>{children}</div>;
}
