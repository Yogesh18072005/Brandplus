/* The 7 scenes rebuilt from the approved reference board (Zelios, Numtera, NIVO). Lighter type, soft light, glow. */
import type { CSSProperties, ReactNode } from "react";
import { At, Cam, Icon, K, Mark, MONO, bOut, c3, clamp, eIn, eIO, eOut, hand, kf, mix, pr } from "./kit";

const T: CSSProperties = { fontFamily: "Manrope, sans-serif", fontWeight: 500, letterSpacing: "-0.035em", lineHeight: 1.1, whiteSpace: "nowrap" };
const Grain = () => <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.05, mixBlendMode: "overlay", backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />;
const Full = ({ bg, children }: { bg: string; children: ReactNode }) => <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg, fontFamily: "Manrope, sans-serif" }}>{children}<Grain /></div>;
/** letter-by-letter type-on, colour settles from light to dark (Zelios "the prod") */
function TypeOn({ text, f, at, cps = 1.2, color = "#111", from = "#C9CCD6" }: { text: string; f: number; at: number; cps?: number; color?: string; from?: string }) {
  return <>{text.split("").map((ch, i) => { const t = (f - at) * cps - i; if (t < 0) return null; return <span key={i} style={{ color: t > 3 ? color : from, transition: "none" }}>{ch === " " ? " " : ch}</span>; })}</>;
}
const BRANDS = [
  { n: "Northstar", c: "#0B1640", g: "#FFD166", icon: "spark" },
  { n: "Atlas", c: "#16A34A", g: "#fff", icon: "globe" },
  { n: "Pipewell", c: "#F97316", g: "#fff", icon: "chart" },
];
function BrandChip({ b, s = 1, q = 1 }: { b: (typeof BRANDS)[number]; s?: number; q?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle", margin: "0 0.06em" }}>
      <span style={{ fontWeight: 300 }}>(</span>
      <span style={{ display: "inline-grid", placeItems: "center", width: `${0.82 * s}em`, height: `${0.82 * s}em`, borderRadius: "0.22em", background: `linear-gradient(145deg, ${b.c}, ${b.c}cc)`, boxShadow: "0 0.08em 0.18em rgba(0,0,0,.25), inset 0 0.04em 0 rgba(255,255,255,.35)", transform: `scale(${q}) rotate(${(1 - q) * -40}deg)`, margin: "0 0.04em" }}>
        <span style={{ width: "0.46em", height: "0.46em", display: "grid", placeItems: "center" }}><Icon name={b.icon} size={46} color={b.g} sw={2.6} /></span>
      </span>
      <span style={{ fontWeight: 300 }}>)</span>
    </span>
  );
}
const IconDefs = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <defs>
      <path id="ic-spark" d="M12 2c.6 4.8 2.9 7.4 10 10-7.1 2.6-9.4 5.2-10 10-.6-4.8-2.9-7.4-10-10 7.1-2.6 9.4-5.2 10-10z" fill="currentColor" stroke="none" />
      <g id="ic-globe"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></g>
      <path id="ic-chart" d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </defs>
  </svg>
);

/* ---------- N1 · 60–165 · "AI recommended (N)(A)(P) … but not your brand." ---------- */
function Fragment({ i, f }: { i: number; f: number }) {
  const spots = [[90, 90], [1420, 70], [80, 760], [1460, 780], [700, 40], [760, 880]];
  const [x, y] = spots[i];
  const depth = [0.5, 0.8, 0.9, 0.6, 0.35, 0.4][i];
  const b = BRANDS[i % 3];
  return (
    <div style={{ position: "absolute", left: x + Math.sin(f / 30 + i) * 14 + (f * (i % 2 ? 0.4 : -0.4)), top: y + Math.cos(f / 26 + i) * 10, width: 380 * (0.8 + depth * 0.4), padding: 18, borderRadius: 16, background: "#fff", boxShadow: "0 0 0 1px rgba(0,0,0,.05), 0 20px 40px -18px rgba(20,30,70,.25)", filter: `blur(${(1 - depth) * 5}px)`, opacity: 0.5 + depth * 0.5, transform: `scale(${0.75 + depth * 0.35})` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: K.blue, display: "grid", placeItems: "center" }}><Icon name="spark" size={14} color="#fff" /></span>
        <span style={{ fontWeight: 700, fontSize: 18, color: "#111" }}>AI answer</span>
        <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 700, color: "#0F9D6C", background: "#E3F8EF", borderRadius: 999, padding: "3px 10px" }}>✓ {b.n}</span>
      </div>
      <div style={{ height: 9, width: "92%", background: "#EEF0F4", borderRadius: 5, marginTop: 14 }} />
      <div style={{ height: 9, width: "70%", background: "#EEF0F4", borderRadius: 5, marginTop: 10 }} />
    </div>
  );
}
export function N1({ f }: { f: number }) {
  const shrink = eIO(pr(f, 0, 12));
  const line1 = "AI recommended";
  const chipAt = [30, 37, 44];
  const push = 1 + f * 0.0009;
  const box = eOut(pr(f, 74, 9));
  return (
    <Full bg="radial-gradient(120% 90% at 50% 40%, #FFFFFF 0%, #F3F4F7 70%, #E9EBF1 100%)">
      <IconDefs />
      {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ opacity: clamp((f - 8 - i * 3) / 10) }}><Fragment i={i} f={f} /></div>)}
      <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "50% 50%" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center", ...T, fontSize: 110, color: "#111" }}>
          <TypeOn text={line1} f={f} at={12} cps={0.9} />
          {chipAt.map((at, i) => f >= at && <BrandChip key={i} b={BRANDS[i]} q={bOut(pr(f, at, 10))} />)}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 530, textAlign: "center", ...T, fontSize: 110, color: "#111" }}>
          <TypeOn text="but not " f={f} at={56} cps={1} />
          {f >= 72 && (
            <span style={{ position: "relative", display: "inline-block", padding: "0 0.12em" }}>
              <span style={{ position: "absolute", inset: "0.08em 0 0.02em", background: K.blue, transformOrigin: "left", transform: `scaleX(${box})` }} />
              <span style={{ position: "relative", color: box > 0.5 ? "#fff" : "#111" }}>your brand.</span>
            </span>
          )}
          {f < 56 || (f >= 56 && f < 72) ? <span style={{ display: "inline-block", width: 6, height: 104, background: K.blue, verticalAlign: "middle", marginLeft: 4, opacity: Math.floor(f / 6) % 2 ? 1 : 0.2 }} /> : null}
        </div>
      </div>
      {/* hand-off from S1: the blue disc closes into the caret */}
      {shrink < 1 && <div style={{ position: "absolute", left: 960, top: 420, width: 4000, height: 4000, marginLeft: -2000, marginTop: -2000, borderRadius: "50%", background: K.blue, transform: `scale(${mix(1, 0.001, shrink)})` }} />}
    </Full>
  );
}

/* ---------- N2 · 400–480 · "Meet BrandPulse" in blue light → positioning line → report UI gliding in soft light ---------- */
function Dashboard() {
  const row = (n: string, v: number, me = false) => (
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "14px 0", borderBottom: "1px solid #EEF0F4" }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, background: me ? K.blue : "#EEF1F6", display: "grid", placeItems: "center" }}>{me ? <Mark size={22} ring="#fff" /> : <Icon name="bag" size={18} color="#8A93A6" />}</span>
      <span style={{ fontWeight: 700, fontSize: 22, color: me ? K.blue : "#1A2033", width: 220 }}>{n}</span>
      <div style={{ flex: 1, height: 10, borderRadius: 5, background: "#EEF1F6" }}><div style={{ width: `${v}%`, height: "100%", borderRadius: 5, background: me ? K.red : K.blue }} /></div>
      <span style={{ fontWeight: 800, fontSize: 22, width: 60, textAlign: "right", color: me ? K.red : "#1A2033" }}>{v}%</span>
    </div>
  );
  return (
    <div style={{ width: 1500, height: 900, borderRadius: 26, background: "#fff", display: "flex", overflow: "hidden", boxShadow: "0 0 0 1px rgba(30,60,140,.08), 0 60px 120px -40px rgba(20,50,160,.45)" }}>
      <div style={{ width: 280, background: "#F8F9FC", borderRight: "1px solid #EEF0F4", padding: "30px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 24 }}><Mark size={30} />BrandPulse</div>
        {["Overview", "Buyer questions", "AI answers", "Competitors", "Fix plan", "Re-check"].map((t, i) => <div key={t} style={{ marginTop: i ? 6 : 34, padding: "12px 14px", borderRadius: 10, fontSize: 19, fontWeight: 600, background: i === 0 ? "#E9EFFD" : undefined, color: i === 0 ? K.blue : "#5A6275" }}>{t}</div>)}
      </div>
      <div style={{ flex: 1, padding: "34px 40px", background: "#FCFCFE" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}><span style={{ fontWeight: 800, fontSize: 30 }}>Your Brand</span><span style={{ fontFamily: MONO, fontSize: 16, color: "#8A93A6" }}>CRM SOFTWARE · 10 BUYER QUESTIONS · GEMINI</span></div>
        <div style={{ display: "flex", gap: 24, marginTop: 26 }}>
          {[["Visibility score", "6", "/100", K.red], ["Answers that name you", "1", "/10", K.red], ["Share of voice", "4", "%", K.text]].map(([k, v, u, c]) => (
            <div key={k} style={{ flex: 1, borderRadius: 18, padding: "22px 24px", background: "#fff", boxShadow: "0 0 0 1px #EEF0F4" }}>
              <div style={{ fontSize: 17, color: "#8A93A6", fontWeight: 600 }}>{k}</div>
              <div style={{ marginTop: 6 }}><span style={{ fontWeight: 700, fontSize: 64, color: c, letterSpacing: "-0.04em" }}>{v}</span><span style={{ fontSize: 26, color: "#8A93A6", fontWeight: 600 }}>{u}</span></div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, borderRadius: 18, padding: "18px 26px", background: "#fff", boxShadow: "0 0 0 1px #EEF0F4" }}>
          <div style={{ fontFamily: MONO, fontSize: 15, color: "#8A93A6", letterSpacing: "0.1em" }}>PRESENCE IN AI ANSWERS</div>
          {row("Northstar CRM", 80)}{row("Atlas", 60)}{row("Pipewell", 50)}{row("Your Brand", 10, true)}
        </div>
      </div>
    </div>
  );
}
export function N2({ f }: { f: number }) {
  const meetOut = eIn(pr(f, 20, 6));
  const lineIn = eOut(pr(f, 25, 8)), lineOut = eIn(pr(f, 42, 6));
  const ui = eOut(pr(f, 44, 26));
  return (
    <Full bg="linear-gradient(180deg, #FFFFFF 0%, #F4F7FF 30%, #A9C3FF 72%, #3E78F5 100%)">
      <div style={{ position: "absolute", left: -300, right: -300, bottom: -420, height: 900, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(30,90,232,.65), transparent)", filter: "blur(30px)" }} />
      {f < 27 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 440, textAlign: "center", ...T, fontWeight: 600, fontSize: 150, color: "#0B1640", opacity: 1 - meetOut, filter: `blur(${meetOut * 16}px)`, transform: `scale(${1 + f * 0.003})` }}>
          Meet <span style={{ color: K.blue }}>BrandPulse</span>
        </div>
      )}
      {f >= 24 && f < 50 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 480, textAlign: "center", ...T, fontSize: 70, color: "#0B1640", opacity: lineIn * (1 - lineOut), filter: `blur(${(1 - lineIn) * 12 + lineOut * 12}px)` }}>
          The <span style={{ color: K.blue }}>AI visibility</span> engine for growing brands
        </div>
      )}
      {f >= 42 && (
        <Cam rx={kf(f, [[44, 24], [80, 12]])} ry={kf(f, [[44, -12], [80, -5]])} z={kf(f, [[44, 60], [80, 320]], c3)} x={kf(f, [[44, -40], [80, 80]])} y={kf(f, [[44, -120], [80, 40]], c3)}>
          <At x={210} y={160} o={ui} style={{ maskImage: "linear-gradient(180deg, #000 55%, transparent 100%)", WebkitMaskImage: "linear-gradient(180deg, #000 55%, transparent 100%)" }}><Dashboard /></At>
        </Cam>
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg, transparent 30%, rgba(255,255,255,.35) 45%, transparent 60%)", transform: `translateX(${mix(-1400, 1400, pr(f, 44, 36))}px)`, mixBlendMode: "soft-light" }} />
    </Full>
  );
}

/* ---------- N3 · 550–655 · NIVO "To measurement": one glowing input persists while big words cycle ---------- */
const PHASES = [
  ["From questions", "Which CRM should a small sales team use?"],
  ["To answers", "Gemini named 3 brands · yours wasn't one"],
  ["To fixes", "Draft the comparison page AI is missing"],
  ["To re-checks", "Re-check the same 10 buyer questions"],
] as const;
function GlowInput({ text, f, at }: { text: string; f: number; at: number }) {
  const n = Math.max(0, Math.floor((f - at) * 2.2));
  return (
    <div style={{ position: "absolute", left: 960 - 620, top: 600, width: 1240, height: 120, borderRadius: 60, padding: 3, background: "linear-gradient(90deg, #7A5CFF, #3E78F5 40%, #8FD3FF 70%, #7A5CFF)", boxShadow: "0 0 60px rgba(90,120,255,.55), 0 0 140px rgba(60,90,255,.35)" }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 60, background: "linear-gradient(180deg, rgba(20,24,90,.92), rgba(12,16,70,.92))", display: "flex", alignItems: "center", padding: "0 40px", gap: 20 }}>
        <span style={{ fontWeight: 500, fontSize: 34, color: "#E6EAFF", whiteSpace: "nowrap", overflow: "hidden" }}>{text.slice(0, n)}<span style={{ display: "inline-block", width: 3, height: 38, background: "#fff", verticalAlign: "middle", marginLeft: 3, opacity: n < text.length || Math.floor(f / 6) % 2 ? 1 : 0 }} /></span>
        <span style={{ marginLeft: "auto", width: 66, height: 66, borderRadius: "50%", background: "linear-gradient(140deg,#6E96FF,#3E5BF5)", display: "grid", placeItems: "center", boxShadow: "0 0 30px rgba(110,150,255,.8)", flex: "none" }}><Icon name="arrow" size={30} color="#fff" sw={2.8} /></span>
      </div>
    </div>
  );
}
export function N3({ f }: { f: number }) {
  const per = 26;
  const k = Math.min(3, Math.floor(f / per));
  const l = f - k * per;
  const inQ = eOut(pr(l, 0, 9)), outQ = k < 3 ? eIn(pr(l, per - 6, 6)) : 0;
  const h = hand(f, 0.6);
  return (
    <Full bg="radial-gradient(110% 90% at 50% 35%, #2B3BE0 0%, #1726B0 30%, #0B1270 65%, #060A3A 100%)">
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 700, background: "radial-gradient(60% 50% at 50% 0%, rgba(160,180,255,.35), transparent)" }} />
      <div style={{ position: "absolute", inset: 0, transform: `translate(${h.x}px,${h.y}px) scale(${1 + f * 0.0008})` }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center", ...T, fontWeight: 400, fontSize: 170, letterSpacing: "-0.03em", background: "linear-gradient(180deg, #FFFFFF 10%, #A9B8FF 100%)", WebkitBackgroundClip: "text", color: "transparent", opacity: inQ * (1 - outQ), filter: `blur(${(1 - inQ) * 18 + outQ * 18}px)`, transform: `translateY(${(1 - inQ) * 30 - outQ * 30}px) scale(${mix(1.08, 1, inQ)})` }}>
          {PHASES[k][0]}
        </div>
        <GlowInput text={PHASES[k][1]} f={f} at={k * per + 4} />
        <div style={{ position: "absolute", left: 960 - 500, top: 735, width: 1000, height: 3, background: "linear-gradient(90deg, transparent, #BFD0FF, transparent)", filter: "blur(1px)", opacity: 0.8 }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 790, display: "flex", justifyContent: "center", gap: 16 }}>
          {PHASES.map(([w], i) => <span key={w} style={{ width: i === k ? 46 : 12, height: 12, borderRadius: 6, background: i <= k ? "#C9D4FF" : "rgba(201,212,255,.25)" }} />)}
        </div>
      </div>
    </Full>
  );
}

/* ---------- N4 · 885–1015 · NIVO tilted wall of the pages we create, glowing status chips ---------- */
const PAGES = [
  ["Comparison", "Best CRM for small sales teams (2026)", "linear-gradient(140deg,#3E78F5,#7A5CFF)"],
  ["FAQ", "Is Your Brand good for a 10-person team?", "linear-gradient(140deg,#1E5AE8,#16A3D6)"],
  ["Versus", "Your Brand vs Northstar CRM", "linear-gradient(140deg,#5B3DF5,#C04CFF)"],
  ["Reviews", "Your Brand on G2 · 4.8★", "linear-gradient(140deg,#0EA5E9,#3E78F5)"],
  ["Guide", "Set up a CRM in one day", "linear-gradient(140deg,#4F46E5,#3E78F5)"],
  ["Community", "Answered on Reddit r/sales", "linear-gradient(140deg,#7C3AED,#3E78F5)"],
] as const;
function PageCard({ p, i }: { p: (typeof PAGES)[number]; i: number }) {
  return (
    <div style={{ width: 340, height: 470, borderRadius: 26, overflow: "hidden", background: "rgba(255,255,255,.08)", boxShadow: "0 0 0 1.5px rgba(170,190,255,.35), 0 40px 80px -30px rgba(0,0,40,.8)" }}>
      <div style={{ height: 250, background: p[2], position: "relative", padding: 22 }}>
        <span style={{ fontFamily: MONO, fontSize: 15, color: "rgba(255,255,255,.8)", letterSpacing: "0.12em" }}>{String(i + 1).padStart(2, "0")} · {p[0].toUpperCase()}</span>
        <div style={{ position: "absolute", left: 22, right: 22, bottom: 22, fontWeight: 700, fontSize: 30, color: "#fff", lineHeight: 1.12, letterSpacing: "-0.02em", whiteSpace: "normal" }}>{p[1]}</div>
      </div>
      <div style={{ padding: 22 }}>
        {[0.9, 0.75, 0.85, 0.6].map((w, j) => <div key={j} style={{ height: 10, width: `${w * 100}%`, borderRadius: 5, background: "rgba(200,212,255,.22)", marginTop: j ? 14 : 4 }} />)}
      </div>
    </div>
  );
}
export function N4({ f }: { f: number }) {
  const chips = [["Drafted", 20], ["Schema added", 40], ["Sources cited", 58], ["Published", 76]] as const;
  const zoom = eIn(pr(f, 108, 22));
  return (
    <Full bg="radial-gradient(110% 100% at 40% 30%, #2B3BE0 0%, #1726B0 35%, #0B1270 70%, #060A3A 100%)">
      <div style={{ position: "absolute", inset: 0, transformOrigin: "760px 470px", transform: `scale(${1 + zoom * 26})` }}>
        <Cam rx={18} ry={-26} rz={9} z={kf(f, [[0, -120], [110, 80]])} x={kf(f, [[0, -180], [110, 120]])} y={-40}>
          {PAGES.map((p, i) => {
            const col = i % 3, row = Math.floor(i / 3);
            const q = eOut(pr(f, i * 3, 14));
            return <At key={p[1]} x={300 + col * 380} y={60 + row * 510 + (1 - q) * 120} z={col * -20} o={q}><PageCard p={p} i={i} /></At>;
          })}
          <At x={1470} y={330} z={80} style={{ display: "grid", gap: 18 }}>
            {chips.map(([c, at]) => {
              const on = f >= at;
              return (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 30px", borderRadius: 999, background: on ? "rgba(120,150,255,.28)" : "rgba(120,150,255,.08)", boxShadow: on ? "0 0 0 2px rgba(190,205,255,.7), 0 0 40px rgba(110,140,255,.6)" : "0 0 0 1.5px rgba(160,180,255,.25)", color: on ? "#fff" : "rgba(220,228,255,.5)", fontWeight: 700, fontSize: 30, transform: `scale(${on ? bOut(pr(f, at, 10)) : 1})`, transformOrigin: "left" }}>
                  {c.toUpperCase()}
                  <span style={{ marginLeft: 20, width: 26, height: 26, borderRadius: "50%", background: on ? "#7DE8BF" : "rgba(255,255,255,.15)", display: "grid", placeItems: "center" }}>{on && <Icon name="check" size={16} color="#063" sw={3.6} />}</span>
                </div>
              );
            })}
          </At>
        </Cam>
      </div>
      <div style={{ position: "absolute", left: 100, top: 80, ...T, fontWeight: 400, fontSize: 76, color: "#fff", opacity: (1 - zoom) * clamp((f - 4) / 8) }}>We build the pages <span style={{ color: "#A9C3FF" }}>AI trusts.</span></div>
      {zoom > 0.5 && <div style={{ position: "absolute", inset: 0, background: K.blue, opacity: clamp((zoom - 0.5) * 3) }} />}
    </Full>
  );
}

/* ---------- N5 · 1135–1310 · NIVO isometric glossy tiles: your site + the sources AI trusts, stack into one ---------- */
function Slab({ size, label, icon, big = false, glow = 0 }: { size: number; label?: string; icon: string; big?: boolean; glow?: number }) {
  const th = big ? 36 : 22;
  return (
    <div style={{ position: "relative", width: size, height: size, transformStyle: "preserve-3d" }}>
      {/* thickness: two side faces */}
      <div style={{ position: "absolute", left: 0, top: size, width: size, height: th, background: "linear-gradient(90deg,#3A2BB8,#5B3DF5)", transformOrigin: "50% 0", transform: "rotateX(-90deg)" }} />
      <div style={{ position: "absolute", left: size, top: 0, width: th, height: size, background: "#2E22A0", transformOrigin: "0 50%", transform: "rotateY(90deg)" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 10, background: big ? "linear-gradient(135deg,#5B8BFF 0%,#7A5CFF 55%,#B05CFF 100%)" : "linear-gradient(135deg,#6E96FF,#6A4BFF)", boxShadow: `inset 0 2px 0 rgba(255,255,255,.4), 0 0 ${glow * 80}px rgba(140,170,255,${glow})`, transform: `translateZ(${th}px)`, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", color: "#fff", transform: "rotate(45deg)" }}>
          <div style={{ display: "grid", placeItems: "center", opacity: 0.92 }}><Icon name={icon} size={big ? 70 : 44} color="#fff" sw={2} /></div>
          {label && <div style={{ fontWeight: 700, fontSize: big ? 40 : 26, marginTop: 6, letterSpacing: "-0.02em" }}>{label}</div>}
        </div>
      </div>
    </div>
  );
}
const SAT = [["G2", "chart", -340, -40], ["Reddit", "spark", -60, -380], ["YouTube", "globe", 330, -260], ["Reviews", "spark", 380, 120], ["Docs", "chart", 60, 400], ["News", "globe", -380, 300]] as const;
export function N5({ f }: { f: number }) {
  const gather = (i: number) => eIO(pr(f, 104 + i * 3, 24));
  const shift = eIO(pr(f, 128, 22));
  const lbl = eOut(pr(f, 138, 14));
  const spin = kf(f, [[0, -52], [175, -38]]);
  return (
    <Full bg="radial-gradient(120% 100% at 50% 20%, #FFFFFF 0%, #EEF0FF 45%, #C9CFFF 100%)">
      <IconDefs />
      <div style={{ position: "absolute", left: 0, top: 70, width: 1920, textAlign: "center", ...T, fontWeight: 400, fontSize: 64, color: "#141A44", opacity: clamp((f - 10) / 8) * (1 - shift) }}>Where AI looks <span style={{ color: "#5B3DF5" }}>before it answers.</span></div>
      <div style={{ position: "absolute", left: mix(960, 700, shift), top: 580, width: 0, height: 0, perspective: 2000, transform: "scale(1.55)" }}>
        <div style={{ transformStyle: "preserve-3d", transform: `rotateX(58deg) rotateZ(${spin}deg)` }}>
          {/* dotted connectors on the floor */}
          <svg width={1200} height={1200} style={{ position: "absolute", left: -600, top: -600, overflow: "visible" }}>
            {SAT.map(([n, , x, y], i) => <line key={n} x1={600} y1={600} x2={600 + x} y2={600 + y} stroke="#8F7BFF" strokeWidth={4} strokeDasharray="6 12" opacity={clamp((f - 20 - i * 5) / 8) * (1 - gather(i))} />)}
          </svg>
          <div style={{ position: "absolute", left: -150, top: -150, transformStyle: "preserve-3d", transform: `translateZ(${Math.sin(f / 18) * 8}px)` }}><Slab size={300} label="Your site" icon="globe" big glow={shift} /></div>
          {SAT.map(([n, ic, x, y], i) => {
            const q = bOut(pr(f, 14 + i * 5, 14));
            const g = gather(i);
            const z = mix(40 + Math.sin(f / 16 + i) * 18, 60 + (i + 1) * 26, g);
            return (
              <div key={n} style={{ position: "absolute", left: mix(x, 0, g) - 80, top: mix(y, 0, g) - 80, transformStyle: "preserve-3d", transform: `translateZ(${z}px) scale(${q * mix(1, 1.6, g)})`, opacity: clamp(q * 3) * (1 - clamp((g - 0.85) * 6)) }}>
                <Slab size={160} label={n} icon={ic} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: 1180, top: 540, display: "flex", alignItems: "center", gap: 18, opacity: lbl, transform: `translateX(${(1 - lbl) * 40}px)` }}>
        <span style={{ width: 16, height: 16, borderRadius: 3, background: "#5B3DF5" }} />
        <span style={{ ...T, fontSize: 72, color: "#3B2BC8" }}>Sources AI trusts</span>
        <span style={{ width: 160 * lbl, height: 2, background: "#8F7BFF" }} />
      </div>
    </Full>
  );
}

/* ---------- N6 · 1310–1480 · Zelios split panels with chips, then NIVO rows of big pill chips ---------- */
function PanelScene({ k, f }: { k: number; f: number }) {
  if (k === 0)
    return (
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#0E1450,#060A2E)" }}>
        <div style={{ position: "absolute", left: "8%", right: "8%", top: "22%", padding: 30, borderRadius: 22, background: "rgba(255,255,255,.06)", boxShadow: "0 0 0 1.5px rgba(160,180,255,.3)" }}>
          <span style={{ fontFamily: MONO, fontSize: 18, color: "#A9C3FF" }}>✦ GEMINI · Q01</span>
          <div style={{ fontSize: 44, color: "#fff", marginTop: 14, lineHeight: 1.3, fontWeight: 500, whiteSpace: "normal" }}>“Northstar CRM is the strongest pick for small teams…”</div>
          <div style={{ marginTop: 18, fontWeight: 700, fontSize: 24, color: "#FF8C91" }}>Your Brand — not mentioned</div>
        </div>
      </div>
    );
  if (k === 1)
    return (
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#3E78F5,#1E3FD0)" }}>
        <div style={{ position: "absolute", left: "12%", right: "12%", bottom: "28%", top: "22%", display: "flex", alignItems: "flex-end", gap: "6%" }}>
          {[80, 60, 50, 10].map((v, i) => <div key={i} style={{ flex: 1, height: `${v * eOut(pr(f, 4 + i * 2, 18))}%`, borderRadius: "14px 14px 0 0", background: i === 3 ? "#FF8C91" : "rgba(255,255,255,.9)" }} />)}
        </div>
      </div>
    );
  return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#F4F6FF,#D9E1FF)" }}>
      <svg viewBox="0 0 100 60" style={{ position: "absolute", left: "10%", top: "24%", width: "80%", height: "40%" }} preserveAspectRatio="none">
        <polyline points="0,55 20,52 40,40 60,30 80,14 100,6" fill="none" stroke={K.blue} strokeWidth={2.4} strokeDasharray={160} strokeDashoffset={160 * (1 - eOut(pr(f, 4, 26)))} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
const PCHIPS = ["Real answers", "Side by side", "Re-checked"];
const PILLS = [["Buyer questions", "chat"], ["AI answers", "spark"], ["Citations", "link"], ["Competitors", "bag"], ["Fix plan", "wrench"], ["Re-check", "refresh"], ["Share of voice", "chart"]] as const;
export function N6({ f }: { f: number }) {
  if (f < 104) {
    // one panel → two → three (Zelios 46–49.5s)
    const n = f < 34 ? 1 : f < 68 ? 2 : 3;
    const local = f - (n - 1) * 34;
    const slide = eOut(pr(local, 0, 10));
    return (
      <Full bg="#000">
        {Array.from({ length: n }, (_, i) => {
          const w = 1920 / n;
          const isNew = i === n - 1;
          return (
            <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: isNew && n > 1 ? mix(1920, i * w, slide) : i * w, width: w, overflow: "hidden", borderLeft: i ? "4px solid #000" : undefined, transition: "none" }}>
              <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + (f - i * 34) * 0.0015})` }}><PanelScene k={i} f={f - i * 34} /></div>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 300, textAlign: "center" }}>
                <span style={{ display: "inline-block", background: "#C6F36B", color: "#111", fontWeight: 600, fontSize: 40, padding: "8px 22px", borderRadius: 10, transform: `scale(${bOut(pr(f - i * 34, 8, 10))})` }}>{PCHIPS[i]}</span>
              </div>
            </div>
          );
        })}
      </Full>
    );
  }
  const g = f - 104;
  return (
    <Full bg="radial-gradient(120% 120% at 50% 50%, #F4F6FF 0%, #DCE3FF 60%, #B9C6FF 100%)">
      {[0, 1, 2].map((row) => (
        <div key={row} style={{ position: "absolute", top: 70 + row * 330, left: 0, display: "flex", gap: 34, transform: `translateX(${[-900, -380, -1500][row] + (row % 2 ? -1 : 1) * g * 9}px)` }}>
          {[...PILLS.slice(row * 2), ...PILLS, ...PILLS.slice(0, row * 2), ...PILLS].map(([t, ic], i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 22, padding: "44px 72px", borderRadius: 999, background: "linear-gradient(180deg,#5B6CFF,#3E4BE8)", color: "#fff", fontWeight: 500, fontSize: 88, letterSpacing: "-0.02em", whiteSpace: "nowrap", boxShadow: "inset 0 2px 0 rgba(255,255,255,.3), 0 20px 40px -16px rgba(40,50,180,.6)", opacity: clamp(g / 6) }}>
              <Icon name={ic} size={78} color="#fff" sw={2.2} />{t}
            </span>
          ))}
        </div>
      ))}
    </Full>
  );
}

/* ---------- N7 · 1620–1800 · Zelios minimal black ending: dots → ring → line → url ---------- */
export function N7({ f }: { f: number }) {
  const merge = eIO(pr(f, 22, 16));
  const draw = eOut(pr(f, 38, 22));
  const lineQ = eOut(pr(f, 70, 12)), lineOut = eIn(pr(f, 118, 8));
  const url = eOut(pr(f, 124, 12));
  const dots = [[-60, -70], [-90, 0], [-40, 70]];
  const bob = (i: number) => Math.sin(f / 5 + i * 1.7) * 18 * (1 - merge);
  return (
    <Full bg="#0B0B0C">
      {f < 70 && (
        <div style={{ position: "absolute", left: 960, top: 520 }}>
          {f < 40 && dots.map(([x, y], i) => <div key={i} style={{ position: "absolute", left: mix(x, 46, merge) - 14, top: mix(y + bob(i), -46, merge) - 14, width: 28, height: 28, borderRadius: "50%", background: K.green, boxShadow: `0 0 24px ${K.green}66` }} />)}
          {f >= 38 && <div style={{ position: "absolute", left: -70, top: -70 }}><Mark size={140} draw={draw} dot={1} ring="#fff" /></div>}
        </div>
      )}
      {f >= 68 && f < 128 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 500, textAlign: "center", ...T, fontWeight: 400, fontSize: 62, color: "#fff", opacity: lineQ * (1 - lineOut), filter: `blur(${(1 - lineQ) * 8 + lineOut * 8}px)` }}>
          Get named by AI <span style={{ display: "inline-block", verticalAlign: "middle", margin: "0 6px" }}>(<span style={{ display: "inline-block", verticalAlign: "-0.12em", margin: "0 6px" }}><Mark size={44} ring="#fff" /></span>)</span>
        </div>
      )}
      {f >= 122 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 500, display: "flex", justifyContent: "center", alignItems: "center", gap: 14, opacity: url }}>
          <Mark size={40} ring="#fff" />
          <span style={{ fontWeight: 500, fontSize: 52, color: "#fff", letterSpacing: "-0.02em", textDecoration: "underline", textUnderlineOffset: 8, textDecorationColor: "#ffffff66" }}>zerociate.com</span>
        </div>
      )}
      {f >= 136 && <div style={{ position: "absolute", left: 0, right: 0, top: 590, textAlign: "center", fontWeight: 500, fontSize: 26, color: "#ffffff88", opacity: eOut(pr(f, 136, 12)) }}>Free AI visibility audit · 10 buyer questions</div>}
    </Full>
  );
}
