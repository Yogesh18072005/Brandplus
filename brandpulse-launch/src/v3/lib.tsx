import type { CSSProperties, ReactNode } from "react";
import words from "./words.json";

export const FPS = 30;
export const C = {
  void: "#040914",
  ink: "#0A1222",
  ink2: "#121C31",
  line: "#22304D",
  blue: "#1E5AE8",
  blue2: "#2874E1",
  sky: "#60A6FB",
  paper: "#F6F7F4",
  paper2: "#E9EEF6",
  mint: "#A9FFDF",
  green: "#1FC58A",
  red: "#FF4D5E",
  amber: "#FFC24B",
  mute: "#7D8AA5",
};

/* ---------- easing ---------- */
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
export const expoIn = (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * clamp(t) - 10));
export const cubicInOut = (t: number) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const quintInOut = (t: number) => {
  t = clamp(t);
  return t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2;
};
export const backOut = (t: number, s = 1.9) => {
  t = clamp(t);
  const c3 = s + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
};
/** progress of frame f inside [start, start+dur] */
export const pr = (f: number, start: number, dur: number) =>
  clamp((f - start) / Math.max(1, dur));
/** arrive with overshoot */
export const arrive = (f: number, start: number, dur = 14) =>
  backOut(pr(f, start, dur));
/** exit sharply */
export const leave = (f: number, start: number, dur = 8) =>
  expoIn(pr(f, start, dur));

/* ---------- voice clock ---------- */
type W = { word: string; start: number; end: number };
const W_ = words as W[];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
/** absolute frame where the nth occurrence (after `after` seconds) of a word starts */
export function vo(word: string, after = 0): number {
  const hit = W_.find((w) => w.start >= after && norm(w.word) === norm(word));
  if (!hit) throw new Error(`VO word not found: ${word} after ${after}`);
  return Math.round(hit.start * FPS);
}

/* ---------- camera ---------- */
export type Pose = { x: number; y: number; z: number; rx: number; ry: number; rz: number };
export type Key = [number, Partial<Pose>];
const P0: Pose = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
export function camAt(keys: Key[], f: number, ease = quintInOut): Pose {
  const full: [number, Pose][] = [];
  let prev = P0;
  for (const [t, p] of keys) {
    prev = { ...prev, ...p };
    full.push([t, prev]);
  }
  if (f <= full[0][0]) return full[0][1];
  for (let i = 1; i < full.length; i++) {
    const [t1, b] = full[i];
    const [t0, a] = full[i - 1];
    if (f <= t1) {
      const q = ease((f - t0) / (t1 - t0));
      return {
        x: mix(a.x, b.x, q),
        y: mix(a.y, b.y, q),
        z: mix(a.z, b.z, q),
        rx: mix(a.rx, b.rx, q),
        ry: mix(a.ry, b.ry, q),
        rz: mix(a.rz, b.rz, q),
      };
    }
  }
  return full[full.length - 1][1];
}
/** subtle handheld drift, always on */
export function drift(f: number, amt = 1): Pose {
  const t = f / FPS;
  return {
    x: (Math.sin(t * 1.3) * 5 + Math.sin(t * 3.1) * 1.6) * amt,
    y: (Math.cos(t * 1.1) * 4 + Math.sin(t * 2.7) * 1.2) * amt,
    z: 0,
    rx: Math.sin(t * 0.9) * 0.35 * amt,
    ry: Math.cos(t * 0.7) * 0.45 * amt,
    rz: Math.sin(t * 1.7) * 0.18 * amt,
  };
}
/** decaying shake after an impact frame */
export function shake(f: number, at: number, power = 1): Pose {
  const d = f - at;
  if (d < 0 || d > 14) return P0;
  const e = Math.exp(-d / 3.2) * power;
  return { x: Math.sin(d * 2.9) * 14 * e, y: Math.cos(d * 3.7) * 10 * e, z: 0, rx: 0, ry: 0, rz: Math.sin(d * 2.3) * 0.7 * e };
}
export const addPose = (...ps: Pose[]): Pose =>
  ps.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z, rx: a.rx + b.rx, ry: a.ry + b.ry, rz: a.rz + b.rz }), P0);

/** a 3D world viewed by a camera. Children are absolutely placed in a 1920x1080 plane. */
export function World({ pose, children, perspective = 1500 }: { pose: Pose; children: ReactNode; perspective?: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, perspective, perspectiveOrigin: "50% 50%", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transformOrigin: "960px 540px",
          transform: `translateZ(${pose.z}px) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) rotateZ(${pose.rz}deg) translate(${-pose.x}px,${-pose.y}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** positioned plane inside a World */
export function P({
  x = 0, y = 0, z = 0, w, h, rx = 0, ry = 0, rz = 0, s = 1, o = 1, blur = 0, origin = "50% 50%", style, children, center = false,
}: {
  x?: number; y?: number; z?: number; w?: number; h?: number; rx?: number; ry?: number; rz?: number; s?: number; o?: number; blur?: number; origin?: string; style?: CSSProperties; children?: ReactNode; center?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        transformOrigin: origin,
        transform: `${center ? "translate(-50%,-50%) " : ""}translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`,
        opacity: o,
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ---------- depth layers (screen space) ---------- */
export type Theme = "dark" | "blue" | "paper" | "mint";
export function Far({ theme, f, pose }: { theme: Theme; f: number; pose: Pose }) {
  const px = -pose.x * 0.12 - pose.ry * 6;
  const py = -pose.y * 0.12 + pose.rx * 6;
  const t = f / FPS;
  const base =
    theme === "dark"
      ? `radial-gradient(120% 90% at 60% 40%, #13254A 0%, ${C.ink} 45%, ${C.void} 100%)`
      : theme === "blue"
        ? `radial-gradient(110% 100% at 40% 30%, #3F80FF 0%, ${C.blue} 45%, #0E3BB0 100%)`
        : theme === "mint"
          ? `radial-gradient(110% 100% at 50% 40%, #D8FFF0 0%, ${C.mint} 60%, #7BE8C2 100%)`
          : `radial-gradient(110% 100% at 50% 30%, #FFFFFF 0%, ${C.paper} 55%, #DCE5F3 100%)`;
  const dot = theme === "dark" ? "#5B8CFF" : theme === "blue" ? "#BFD8FF" : theme === "mint" ? "#ffffff" : "#8FB3F5";
  const bokeh = [
    [180, 210, 160, 0.16], [1620, 160, 220, 0.12], [1380, 860, 260, 0.1], [420, 900, 190, 0.12], [980, 120, 120, 0.1], [1780, 620, 140, 0.12],
  ];
  return (
    <div style={{ position: "absolute", inset: 0, background: base, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: -200, transform: `translate(${px}px,${py}px)` }}>
        {bokeh.map(([x, y, r, o], i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + 200 + Math.sin(t * 0.6 + i) * 30,
              top: y + 200 + Math.cos(t * 0.5 + i * 2) * 24,
              width: r,
              height: r,
              borderRadius: "50%",
              background: dot,
              opacity: o,
              filter: "blur(38px)",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            transform: `rotate(-14deg) translateX(${Math.sin(t * 0.3) * 120}px)`,
            background:
              theme === "paper"
                ? "linear-gradient(100deg,transparent 30%,#ffffffcc 46%,#c9dcff66 54%,transparent 70%)"
                : "linear-gradient(100deg,transparent 30%,#ffffff14 46%,#7fb0ff22 54%,transparent 70%)",
            filter: "blur(30px)",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(130% 110% at 50% 50%, transparent 55%, #00000055 100%)",
          opacity: theme === "dark" ? 1 : 0.35,
        }}
      />
    </div>
  );
}

/** blurred object crossing in front of the lens */
export function Near({ f, dur, theme, kind = "bar", dir = 1, y = 0 }: { f: number; dur: number; theme: Theme; kind?: "bar" | "card" | "dot"; dir?: 1 | -1; y?: number }) {
  const q = f / Math.max(1, dur);
  const x = dir > 0 ? mix(-700, 2300, q) : mix(2300, -700, q);
  const color = theme === "dark" ? "#2A4E9A" : theme === "blue" ? "#9CC4FF" : theme === "mint" ? "#ffffff" : "#B9CCEB";
  const common: CSSProperties = { position: "absolute", left: x, pointerEvents: "none", opacity: 0.55, filter: "blur(26px)", background: color };
  if (kind === "dot") return <div style={{ ...common, top: 760 + y, width: 260, height: 260, borderRadius: "50%" }} />;
  if (kind === "card") return <div style={{ ...common, top: 620 + y, width: 520, height: 420, borderRadius: 40, transform: "rotate(-8deg)" }} />;
  return <div style={{ ...common, top: -200 + y, width: 180, height: 1500, transform: "rotate(14deg)", borderRadius: 30 }} />;
}

export function Grain() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: 0.07,
        mixBlendMode: "overlay",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      }}
    />
  );
}

/** floor grid plane, lies flat in world (rotateX 90) */
export function Floor({ color = "#3D63B0", o = 0.5, y = 760, size = 4000 }: { color?: string; o?: number; y?: number; size?: number }) {
  return (
    <P
      x={960 - size / 2}
      y={y - size / 2}
      w={size}
      h={size}
      rx={90}
      o={o}
      style={{
        backgroundImage: `linear-gradient(${color} 2px,transparent 2px),linear-gradient(90deg,${color} 2px,transparent 2px)`,
        backgroundSize: "120px 120px",
        maskImage: "radial-gradient(circle at 50% 50%, black 0%, transparent 55%)",
        WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 0%, transparent 55%)",
      }}
    />
  );
}

/* ---------- kinetic type ---------- */
/** per-letter mask reveal */
export function Letters({ text, f, at, stagger = 1.2, dur = 12, style, out }: { text: string; f: number; at: number; stagger?: number; dur?: number; style?: CSSProperties; out?: number }) {
  const outQ = out === undefined ? 0 : leave(f, out, 9);
  return (
    <span style={{ display: "inline-block", whiteSpace: "pre", ...style }}>
      {text.split("").map((ch, i) => {
        const q = arrive(f, at + i * stagger, dur);
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.08em", marginBottom: "-0.08em" }}>
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - q) * 105 - outQ * 105}%) rotate(${(1 - q) * 8}deg)`,
              }}
            >
              {ch === " " ? " " : ch}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** highlight box sweeping behind a word */
export function Sweep({ f, at, color = C.blue, children, textColor, dur = 10, pad = "0.02em 0.16em" }: { f: number; at: number; color?: string; children: ReactNode; textColor?: string; dur?: number; pad?: string }) {
  const q = expoOut(pr(f, at, dur));
  return (
    <span style={{ position: "relative", display: "inline-block", padding: pad }}>
      <span
        style={{
          position: "absolute",
          inset: "0.06em 0",
          background: color,
          borderRadius: "0.12em",
          transformOrigin: "left center",
          transform: `scaleX(${q})`,
        }}
      />
      <span style={{ position: "relative", color: q > 0.4 && textColor ? textColor : undefined }}>{children}</span>
    </span>
  );
}

/** slot-machine roll through words, landing on the last one */
export function Slot({ items, f, at, dur = 14, style }: { items: string[]; f: number; at: number; dur?: number; style?: CSSProperties }) {
  const q = expoOut(pr(f, at, dur));
  const idx = q * (items.length - 1);
  const blur = Math.sin(q * Math.PI) * 6 * (q < 1 ? 1 : 0);
  return (
    <span style={{ display: "inline-block", height: "1.12em", overflow: "hidden", verticalAlign: "bottom", ...style }}>
      <span style={{ display: "flex", flexDirection: "column", transform: `translateY(${-idx * 1.12}em)`, filter: `blur(${blur}px)` }}>
        {items.map((w, i) => (
          <span key={i} style={{ height: "1.12em", lineHeight: "1.12em", whiteSpace: "nowrap" }}>
            {w}
          </span>
        ))}
      </span>
    </span>
  );
}

/** one-word slam: big, overshoot from scale 1.7 with blur */
export function Slam({ f, at, children, style }: { f: number; at: number; children: ReactNode; style?: CSSProperties }) {
  const q = pr(f, at, 7);
  const s = f < at ? 0 : mix(1.8, 1, expoOut(q)) - Math.sin(clamp((f - at - 6) / 8) * Math.PI) * 0.03;
  return (
    <span
      style={{
        display: "inline-block",
        transform: `scale(${s})`,
        opacity: f < at ? 0 : clamp(q * 3),
        filter: `blur(${(1 - expoOut(q)) * 14}px)`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Caret({ f, h = "1em", color = C.blue, solid = false }: { f: number; h?: string; color?: string; solid?: boolean }) {
  const on = solid || Math.floor(f / 8) % 2 === 0;
  return <span style={{ display: "inline-block", width: "0.07em", height: h, background: color, marginLeft: "0.04em", verticalAlign: "-0.12em", opacity: on ? 1 : 0, borderRadius: 2 }} />;
}

/** typewriter: returns visible slice */
export const typed = (text: string, f: number, at: number, cps = 26) =>
  text.slice(0, Math.max(0, Math.floor(((f - at) / FPS) * cps)));

/* ---------- UI atoms ---------- */
export const mono: CSSProperties = { fontFamily: "Plex, monospace", letterSpacing: "0.04em" };
export function Pill({ children, bg, fg, style }: { children: ReactNode; bg: string; fg: string; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 18px",
        borderRadius: 999,
        background: bg,
        color: fg,
        fontWeight: 700,
        fontSize: 22,
        whiteSpace: "nowrap",
        ...mono,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
export function Dot({ c, s = 12 }: { c: string; s?: number }) {
  return <span style={{ display: "inline-block", width: s, height: s, borderRadius: "50%", background: c, flex: "none" }} />;
}
export function Mark({ size = 120, draw = 1, dot = 1, ring = "url(#zcv3ring)", style }: { size?: number; draw?: number; dot?: number; ring?: string; style?: CSSProperties }) {
  const len = 113;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: "visible", ...style }}>
      <defs>
        <linearGradient id="zcv3ring" x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7DB8FF" />
          <stop offset=".55" stopColor="#2874E1" />
          <stop offset="1" stopColor="#1055C5" />
        </linearGradient>
      </defs>
      <path
        d="M52.70 28.49A21 21 0 1 1 31.86 11.00"
        fill="none"
        stroke={ring}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - clamp(draw))}
      />
      <circle cx="45.5" cy="15.91" r={6.2 * clamp(dot, 0, 2)} fill={C.green} />
    </svg>
  );
}
export function Check({ size = 28, color = C.green, q = 1 }: { size?: number; color?: string; q?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={26} strokeDashoffset={26 * (1 - clamp(q))} />
    </svg>
  );
}
export function Cross({ size = 28, color = C.red, q = 1 }: { size?: number; color?: string; q?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeDasharray={34} strokeDashoffset={34 * (1 - clamp(q))} />
    </svg>
  );
}
export function SearchIcon({ size = 40, color = C.mute }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke={color} strokeWidth="2.4" />
      <path d="M15.5 15.5L20 20" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
export function Spark({ size = 34, color = C.blue }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 2c.6 4.8 2.9 7.4 10 10-7.1 2.6-9.4 5.2-10 10-.6-4.8-2.9-7.4-10-10 7.1-2.6 9.4-5.2 10-10z" fill={color} />
    </svg>
  );
}
export function Cursor({ size = 46, press = 0 }: { size?: number; press?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `scale(${1 - press * 0.15})`, filter: "drop-shadow(0 6px 10px #0006)" }}>
      <path d="M4 2l15 10.5-6.6 1.3 3.9 7.4-3 1.5-3.8-7.5L4 20z" fill="#fff" stroke="#0A1222" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
export const card = (theme: "dark" | "light" = "light"): CSSProperties =>
  theme === "light"
    ? { background: "#FFFFFF", borderRadius: 28, boxShadow: "0 40px 90px -30px #1A3C8A55, 0 2px 0 #ffffff inset, 0 0 0 1px #DCE4F2", color: C.ink }
    : { background: "linear-gradient(180deg,#14213D,#0D172C)", borderRadius: 28, boxShadow: "0 40px 100px -30px #000c, 0 0 0 1px #2A3B60, 0 1px 0 #3A5288 inset", color: "#E8EEFA" };
export const label: CSSProperties = { ...mono, fontSize: 18, textTransform: "uppercase", letterSpacing: "0.14em", color: C.mute, fontWeight: 500 };
