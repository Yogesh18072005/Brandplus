/* v6 kit — KI grammar: one accent on ink/paper, heavy type with one coloured word, inline icon chips,
   real UI cropped big in 3D, object-motivated transitions. Everything is a pure function of frame. */
import type { CSSProperties, ReactNode } from "react";

export const K = {
  ink: "#09090B",
  ink2: "#121216",
  paper: "#F5F4F0",
  blue: "#1E5AE8",
  blue2: "#3E78F5",
  blueDeep: "#0C2A78",
  wash: "#DCE6FB",
  red: "#E5484D",
  redBg: "#FBEBEC",
  green: "#1FC58A",
  text: "#0B0B0F",
  mute: "#6B7280",
  line: "#E4E4E0",
};
export const FONT = "Manrope, sans-serif";
export const MONO = "Plex, monospace";

/* ---------- time ---------- */
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const pr = (f: number, s: number, d: number) => clamp((f - s) / Math.max(1, d));
export const eOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
export const eIn = (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * clamp(t) - 10));
export const eIO = (t: number) => { t = clamp(t); return t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2; };
export const c3 = (t: number) => { t = clamp(t); return t < 0.5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const bOut = (t: number, s = 1.7) => { t = clamp(t); return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
/** keyframed number: [[frame, value], ...] with ease between */
export function kf(f: number, keys: [number, number][], ease = eIO) {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (f <= keys[i][0]) return mix(keys[i - 1][1], keys[i][1], ease((f - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
  return keys[keys.length - 1][1];
}
/** subtle handheld */
export const hand = (f: number, a = 1) => ({ x: (Math.sin(f / 19) * 5 + Math.sin(f / 7.3) * 1.5) * a, y: (Math.cos(f / 23) * 4 + Math.sin(f / 9.1) * 1.2) * a, r: Math.sin(f / 31) * 0.25 * a });
export function shakeAt(f: number, at: number, p = 1) {
  const d = f - at;
  if (d < 0 || d > 12) return { x: 0, y: 0 };
  const e = Math.exp(-d / 2.6) * p;
  return { x: Math.sin(d * 3.1) * 16 * e, y: Math.cos(d * 2.4) * 11 * e };
}

/* ---------- frame + camera ---------- */
export function Frame({ bg, children, style }: { bg: ReactNode | string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", fontFamily: FONT, ...style }}>
      {typeof bg === "string" ? <div style={{ position: "absolute", inset: 0, background: bg }} /> : bg}
      {children}
      <Grain />
    </div>
  );
}
/** 3D camera: world is a 1920x1080 plane; rx/ry/rz in degrees, z pushes toward the viewer */
export function Cam({ x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, p = 1600, origin = "960px 540px", children }: { x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number; s?: number; p?: number; origin?: string; children: ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0, perspective: p, perspectiveOrigin: origin, zIndex: 0, isolation: "isolate" }}>
      <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transformOrigin: origin, transform: `translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s}) translate(${-x}px,${-y}px)` }}>
        {children}
      </div>
    </div>
  );
}
/** absolutely placed element in the world (optionally in 3D) */
export function At({ x = 0, y = 0, z = 0, w, h, rx = 0, ry = 0, rz = 0, s = 1, o = 1, blur = 0, origin = "50% 50%", style, children }: { x?: number; y?: number; z?: number; w?: number; h?: number; rx?: number; ry?: number; rz?: number; s?: number; o?: number; blur?: number; origin?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: o, transformStyle: "preserve-3d", transformOrigin: origin, transform: `translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`, filter: blur > 0.25 ? `blur(${blur}px)` : undefined, ...style }}>
      {children}
    </div>
  );
}

/* ---------- backgrounds ---------- */
export const PaperBg = ({ f = 0, tint = K.wash }: { f?: number; tint?: string }) => (
  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#F7F6F2 0%,#EFEEE9 100%)" }}>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 70% at 50% 110%, rgba(30,90,232,.06), transparent 70%)" }} />
    <div style={{ position: "absolute", width: 1500, height: 1500, left: -400 + Math.sin(f / 60) * 60, top: -650, borderRadius: "50%", background: `radial-gradient(circle, ${tint} 0%, ${tint}00 65%)` }} />
    <div style={{ position: "absolute", width: 1200, height: 1200, right: -450, bottom: -700, borderRadius: "50%", background: `radial-gradient(circle, ${tint}cc 0%, ${tint}00 65%)` }} />
  </div>
);
export const InkBg = ({ glow = K.blue, f = 0 }: { glow?: string; f?: number }) => (
  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 50% 0%, #11131A 0%, #09090B 60%)" }}>
    {[0, 1].map((i) => <div key={i} style={{ position: "absolute", top: -300, left: 500 + i * 700 + Math.sin(f / 70 + i) * 40, width: 240, height: 1700, background: `linear-gradient(90deg, transparent, ${glow}12, transparent)`, transform: "rotate(22deg)", filter: "blur(10px)" }} />)}
    <div style={{ position: "absolute", width: 1400, height: 1400, right: -520 + Math.sin(f / 50) * 40, bottom: -760, borderRadius: "50%", background: `radial-gradient(circle, ${glow}55 0%, ${glow}00 62%)` }} />
    <div style={{ position: "absolute", width: 900, height: 900, left: -380, top: -520, borderRadius: "50%", background: `radial-gradient(circle, ${glow}22 0%, ${glow}00 62%)` }} />
  </div>
);
export const BlueBg = ({ f = 0 }: { f?: number }) => (
  <div style={{ position: "absolute", inset: 0, background: K.blue, overflow: "hidden" }}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ position: "absolute", top: -300, left: 300 + i * 520 + Math.sin(f / 40 + i) * 30, width: 260 - i * 60, height: 1800, background: "linear-gradient(90deg,#ffffff00,#ffffff14,#ffffff00)", transform: "rotate(28deg)" }} />
    ))}
  </div>
);
export function Grain() {
  return <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.06, mixBlendMode: "overlay", backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />;
}
/** small top-left meta line, as in KI (// 02 / 04 · label) */
export const Meta = ({ text, dark = false }: { text: string; dark?: boolean }) => (
  <div style={{ position: "absolute", left: 64, top: 46, fontFamily: MONO, fontSize: 15, letterSpacing: "0.14em", color: dark ? "#ffffff66" : "#00000055", textTransform: "uppercase", display: "flex", gap: 12, alignItems: "center" }}>
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: K.blue }} />{text}
  </div>
);

/* ---------- type ---------- */
export const H: CSSProperties = { fontFamily: FONT, fontWeight: 800, letterSpacing: "-0.055em", lineHeight: 0.92, whiteSpace: "nowrap" };
/** word that racks into focus on frame `at` */
export function W({ f, at, children, style, d = 7, from = 1.15, blur = 22, dy = 0 }: { f: number; at: number; children: ReactNode; style?: CSSProperties; d?: number; from?: number; blur?: number; dy?: number }) {
  const q = eOut(pr(f, at, d));
  return (
    <span style={{ display: "inline-block", opacity: f < at ? 0 : clamp(q * 2.4), filter: q < 1 ? `blur(${(1 - q) * blur}px)` : undefined, transform: `translateY(${(1 - q) * dy}px) scale(${mix(from, 1, q)})`, transformOrigin: "50% 60%", ...style }}>
      {children}
    </span>
  );
}
/** letter-by-letter build with mask (KI "Meet Krishnavi") */
export function Build({ f, at, text, step = 1.2, style }: { f: number; at: number; text: string; step?: number; style?: CSSProperties }) {
  return (
    <span style={{ display: "inline-block", ...style }}>
      {text.split("").map((ch, i) => {
        const q = eOut(pr(f, at + i * step, 8));
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.1em", marginBottom: "-0.1em" }}>
            <span style={{ display: "inline-block", transform: `translateY(${(1 - q) * 100}%)`, filter: q < 1 ? `blur(${(1 - q) * 6}px)` : undefined }}>{ch === " " ? " " : ch}</span>
          </span>
        );
      })}
    </span>
  );
}
/** coloured highlight block behind a word (KI "paperwork?") */
export function Box({ f, at, children, bg = K.blue, color = "#fff", d = 8, pad = "0.02em 0.14em" }: { f: number; at: number; children: ReactNode; bg?: string; color?: string; d?: number; pad?: string }) {
  const q = eOut(pr(f, at, d));
  return (
    <span style={{ position: "relative", display: "inline-block", padding: pad }}>
      <span style={{ position: "absolute", inset: "0.04em 0", background: bg, transformOrigin: "left", transform: `scaleX(${q})` }} />
      <span style={{ position: "relative", color: q > 0.5 ? color : undefined }}>{children}</span>
    </span>
  );
}

/* ---------- icons + chips ---------- */
const P: Record<string, ReactNode> = {
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L20 20" /></>,
  spark: <path d="M12 2c.6 4.8 2.9 7.4 10 10-7.1 2.6-9.4 5.2-10 10-.6-4.8-2.9-7.4-10-10 7.1-2.6 9.4-5.2 10-10z" fill="currentColor" stroke="none" />,
  check: <path d="M4 12.5l5 5L20 6.5" />,
  cross: <path d="M6 6l12 12M18 6L6 18" />,
  doc: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></>,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  bag: <><path d="M5 8h14l-1 13H6z" /><path d="M9 8V6a3 3 0 016 0v2" /></>,
  wrench: <path d="M14 6a4 4 0 005 5l-8 8a2 2 0 01-3-3l8-8a4 4 0 01-2-2z" />,
  refresh: <><path d="M20 11a8 8 0 10-2.3 5.7" /><path d="M20 4v7h-7" /></>,
  link: <><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  up: <path d="M12 19V5M5 12l7-7 7 7" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  card: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></>,
};
export function Icon({ name, size = 28, color = "currentColor", sw = 2.4 }: { name: keyof typeof P | string; size?: number; color?: string; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ color, display: "block" }}>
      {P[name as string]}
    </svg>
  );
}
/** inline icon chip that sits inside a sentence (KI "Customs [shield] clearance") */
export function Chip({ f, at, icon, size = 1, bg = K.blue, color = "#fff" }: { f: number; at: number; icon: string; size?: number; bg?: string; color?: string }) {
  const q = bOut(pr(f, at, 10));
  return (
    <span style={{ display: "inline-flex", verticalAlign: "middle", margin: "0 0.12em", transform: `scale(${f < at ? 0 : q}) rotate(${(1 - q) * -30}deg)` }}>
      <span style={{ display: "grid", placeItems: "center", width: `${0.95 * size}em`, height: `${0.78 * size}em`, borderRadius: `${0.26 * size}em`, background: bg, color }}>
        <svg viewBox="0 0 24 24" style={{ width: `${0.46 * size}em`, height: `${0.46 * size}em`, display: "block" }} fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">{P[icon]}</svg>
      </span>
    </span>
  );
}
/** rubber stamp slam (KI "MISSING", "Owned.") */
export function Stamp({ f, at, text, color = K.red, rot = -8, size = 64, style }: { f: number; at: number; text: string; color?: string; rot?: number; size?: number; style?: CSSProperties }) {
  const q = pr(f, at, 6);
  if (f < at) return null;
  return (
    <div style={{ position: "absolute", padding: `${size * 0.16}px ${size * 0.4}px`, border: `${Math.max(4, size * 0.09)}px solid ${color}`, borderRadius: size * 0.16, color, fontFamily: FONT, fontWeight: 800, fontSize: size, letterSpacing: "-0.02em", whiteSpace: "nowrap", transform: `rotate(${rot}deg) scale(${mix(2.4, 1, eOut(q))})`, opacity: clamp(q * 3), background: "#ffffffd9", ...style }}>
      {text}
    </div>
  );
}
export const Mark = ({ size = 120, draw = 1, dot = 1, ring = K.blue, dotColor = K.green }: { size?: number; draw?: number; dot?: number; ring?: string; dotColor?: string }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: "visible", display: "block" }}>
    <path d="M52.70 28.49A21 21 0 1 1 31.86 11.00" fill="none" stroke={ring} strokeWidth={10} strokeLinecap="round" strokeDasharray={113} strokeDashoffset={113 * (1 - clamp(draw))} />
    <circle cx="45.5" cy="15.91" r={6.2 * Math.max(0, dot)} fill={dotColor} />
  </svg>
);
export const Cursor = ({ press = 0 }: { press?: number }) => (
  <svg width={54} height={54} viewBox="0 0 24 24" style={{ transform: `scale(${1 - press * 0.18})`, filter: "drop-shadow(0 8px 10px #0005)", display: "block" }}>
    <path d="M4 2l15 10.5-6.6 1.3 3.9 7.4-3 1.5-3.8-7.5L4 20z" fill="#0B0B0F" stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
  </svg>
);
export const card: CSSProperties = { background: "linear-gradient(180deg,#FFFFFF 0%,#FBFBFA 100%)", borderRadius: 22, boxShadow: "inset 0 1px 0 #fff, 0 0 0 1px rgba(16,24,40,.07), 0 1px 2px rgba(16,24,40,.05), 0 6px 14px -4px rgba(12,42,120,.08), 0 28px 56px -16px rgba(12,42,120,.20), 0 80px 140px -50px rgba(12,42,120,.38)" };

/* ---------- depth + light ---------- */
const rr = (i: number, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
/** blurred UI cards drifting behind the subject: gives every frame a far layer */
export function Field({ f, dark = false, n = 9, seed = 1, speed = 0.6, o = 1 }: { f: number; dark?: boolean; n?: number; seed?: number; speed?: number; o?: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", opacity: o }}>
      {Array.from({ length: n }, (_, i) => {
        const w = 300 + rr(i, seed) * 360, h = w * (0.38 + rr(i, seed + 2) * 0.25);
        const depth = 0.4 + rr(i, seed + 4) * 0.6;
        const x = ((rr(i, seed + 6) * 2400 - 240 + f * speed * depth * (i % 2 ? 1 : -1)) % 2400 + 2400) % 2400 - 240;
        const y = rr(i, seed + 8) * 1080 - 100 + Math.sin(f / 40 + i) * 10;
        const accent = i % 4 === 0;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 22, filter: `blur(${8 + (1 - depth) * 14}px)`, opacity: 0.35 + depth * 0.35, transform: `scale(${0.7 + depth * 0.4}) rotate(${(rr(i, seed + 9) - 0.5) * 10}deg)`,
            background: dark ? (accent ? "#1E5AE8" : "#191B22") : accent ? "#C9D8FB" : "#FFFFFF", boxShadow: dark ? "0 0 0 1px #ffffff10" : "0 30px 60px -20px rgba(12,42,120,.25)", padding: 22 }}>
            <div style={{ height: 12, width: "50%", borderRadius: 6, background: dark ? "#2A2E3A" : "#E3E7F0" }} />
            <div style={{ height: 10, width: "85%", borderRadius: 5, background: dark ? "#23262F" : "#ECEEF3", marginTop: 16 }} />
            <div style={{ height: 10, width: "70%", borderRadius: 5, background: dark ? "#23262F" : "#ECEEF3", marginTop: 12 }} />
          </div>
        );
      })}
    </div>
  );
}
/** diagonal light sweep across a parent with overflow hidden */
export function Sweep({ f, at, dur = 22, dark = false }: { f: number; at: number; dur?: number; dark?: boolean }) {
  const q = pr(f, at, dur);
  if (q <= 0 || q >= 1) return null;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", pointerEvents: "none" }}><div style={{ position: "absolute", top: "-50%", bottom: "-50%", width: "30%", left: `${mix(-40, 120, eIO(q))}%`, background: `linear-gradient(90deg, transparent, ${dark ? "rgba(140,180,255,.18)" : "rgba(255,255,255,.75)"}, transparent)`, transform: "rotate(18deg)" }} /></div>;
}
export const typed = (s: string, f: number, at: number, cps = 1.4) => s.slice(0, Math.max(0, Math.floor((f - at) * cps)));
