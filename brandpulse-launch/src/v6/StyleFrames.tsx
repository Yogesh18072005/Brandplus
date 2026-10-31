/* Three style-frame treatments of the v6 "But are you in it?" moment, to pick a craft level before animating. */
import { useEffect, useState, type CSSProperties } from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import "../style.css";
import { At, Cam, H, Icon, K, MONO, Stamp } from "./kit";

function Fonts() {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => { Promise.all([document.fonts.load("800 50px Manrope"), document.fonts.load("600 50px Manrope"), document.fonts.load("400 20px Plex")]).then(() => continueRender(h)); }, [h]);
  return null;
}
const NAMES = ["Northstar CRM", "Atlas", "Pipewell"];
const Tick = ({ c = "#0F9D6C", bg = "#E3F8EF", s = 62 }: { c?: string; bg?: string; s?: number }) => (
  <span style={{ width: s, height: s, borderRadius: "50%", background: bg, display: "grid", placeItems: "center", flex: "none" }}><Icon name="check" size={s * 0.55} color={c} sw={3.2} /></span>
);
const Headline = ({ color = "#fff", style }: { color?: string; style?: CSSProperties }) => (
  <div style={{ position: "absolute", ...H, fontSize: 132, color, lineHeight: 0.98, ...style }}>
    But are<br /><span style={{ background: K.blue, color: "#fff", padding: "0 0.12em" }}>you</span> in it?
  </div>
);

/* A · Glass & light: frosted glass panels floating in lit blue space, depth of field */
function GlassPanel({ blurAmt = 0, dim = 1 }: { blurAmt?: number; dim?: number }) {
  return (
    <div style={{ width: 1060, padding: "46px 52px", borderRadius: 34, background: "linear-gradient(160deg, rgba(255,255,255,.82), rgba(236,242,255,.62))", boxShadow: "inset 0 1px 0 rgba(255,255,255,.9), inset 0 0 0 1.5px rgba(255,255,255,.55), 0 80px 160px -40px rgba(8,22,80,.65), 0 0 120px rgba(120,160,255,.25)", backdropFilter: "blur(24px)", filter: blurAmt ? `blur(${blurAmt}px)` : undefined, opacity: dim }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 70, height: 70, borderRadius: "50%", background: "linear-gradient(140deg,#5B8BFF,#1E5AE8)", display: "grid", placeItems: "center", boxShadow: "0 10px 30px rgba(30,90,232,.5)" }}><Icon name="spark" size={34} color="#fff" /></div>
        <div><div style={{ fontWeight: 800, fontSize: 36, color: "#0B1430" }}>AI answer</div><div style={{ fontFamily: MONO, fontSize: 22, color: "#5B6785" }}>› best CRM for a small sales team?</div></div>
      </div>
      <div style={{ fontWeight: 600, fontSize: 40, color: "#1A2440", marginTop: 30, letterSpacing: "-0.02em" }}>For a small sales team, the strongest picks are:</div>
      {NAMES.map((n, i) => (
        <div key={n} style={{ display: "flex", alignItems: "center", gap: 24, height: 118, borderBottom: "1.5px solid rgba(30,60,140,.12)" }}>
          <span style={{ fontFamily: MONO, color: K.blue, fontSize: 26, width: 30 }}>{i + 1}</span>
          <span style={{ ...H, fontSize: 70, color: "#0B1430", flex: 1 }}>{n}</span>
          <Tick />
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 24, height: 118, marginTop: 18, borderRadius: 20, padding: "0 24px", background: "linear-gradient(90deg, rgba(255,77,94,.16), rgba(255,77,94,.06))", boxShadow: "inset 0 0 0 1.5px rgba(255,77,94,.35)" }}>
        <span style={{ fontFamily: MONO, color: K.red, fontSize: 26, width: 30 }}>—</span>
        <span style={{ ...H, fontSize: 70, color: "rgba(11,20,48,.35)", flex: 1 }}>Your brand</span>
        <span style={{ fontWeight: 700, fontSize: 28, color: K.red }}>not mentioned</span>
      </div>
    </div>
  );
}
export function FrameA() {
  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 120% at 70% 20%, #3D74FF 0%, #1E4FD8 28%, #0B1E66 62%, #050B24 100%)", overflow: "hidden", fontFamily: "Manrope" }}>
      <Fonts />
      {/* light beams */}
      {[0, 1, 2].map((i) => <div key={i} style={{ position: "absolute", top: -400, left: 700 + i * 380, width: 200 - i * 40, height: 2200, background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(190,215,255,.18), rgba(255,255,255,0))", transform: "rotate(24deg)", filter: "blur(6px)" }} />)}
      <Cam ry={-20} rx={6} z={-20} x={-40}>
        <At x={1180} y={-60} z={-700}><GlassPanel blurAmt={10} dim={0.55} /></At>
        <At x={260} y={600} z={-900}><GlassPanel blurAmt={14} dim={0.45} /></At>
        <At x={780} y={150}><GlassPanel /></At>
      </Cam>
      <div style={{ position: "absolute", left: 1120, top: 870, transform: "rotate(-8deg)" }}><Stamp f={10} at={0} text="NOT MENTIONED" size={84} rot={0} style={{ background: "rgba(255,255,255,.9)" }} /></div>
      <Headline style={{ left: 100, top: 560 }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(130% 100% at 50% 50%, transparent 55%, rgba(0,0,10,.55) 100%)" }} />
    </AbsoluteFill>
  );
}

/* B · Editorial macro: paper, extreme crop of the UI, shallow depth of field on the missing row */
export function FrameB() {
  return (
    <AbsoluteFill style={{ background: K.paper, overflow: "hidden", fontFamily: "Manrope" }}>
      <Fonts />
      <div style={{ position: "absolute", width: 1600, height: 1600, left: -500, top: -800, borderRadius: "50%", background: "radial-gradient(circle, #DCE6FB 0%, #DCE6FB00 65%)" }} />
      <Cam rx={28} ry={-14} rz={-4} z={260} x={160} y={120}>
        <At x={500} y={-260} w={1700} h={1500} style={{ background: "#fff", borderRadius: 40, boxShadow: "0 0 0 1px #E6E6E1, 0 80px 160px -60px rgba(12,42,120,.45)", padding: "60px 80px" }}>
          {NAMES.map((n, i) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 40, height: 230, borderBottom: `3px solid ${K.line}`, filter: `blur(${(2 - i) * 3 + 2}px)`, opacity: 0.85 }}>
              <span style={{ fontFamily: MONO, color: K.blue, fontSize: 44, width: 50 }}>{i + 1}</span>
              <span style={{ ...H, fontSize: 150, color: K.text, flex: 1 }}>{n}</span>
              <Tick s={110} />
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 40, height: 250, marginTop: 30, borderRadius: 30, padding: "0 40px", background: K.redBg, position: "relative" }}>
            <span style={{ fontFamily: MONO, color: K.red, fontSize: 44, width: 50 }}>—</span>
            <span style={{ ...H, fontSize: 150, color: "#C4C4BE", flex: 1 }}>Your brand</span>
            <span style={{ fontWeight: 700, fontSize: 52, color: K.red }}>not mentioned</span>
            <div style={{ position: "absolute", left: 360, top: 150 }}><Stamp f={10} at={0} text="NOT MENTIONED" size={120} rot={-8} /></div>
          </div>
        </At>
      </Cam>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 360, background: "linear-gradient(0deg, #F5F4F0 30%, #F5F4F000)" }} />
      <Headline color={K.text} style={{ left: 100, top: 760, fontSize: 120 }} />
    </AbsoluteFill>
  );
}

/* C · Dark product: dark-mode UI with blue rim light, mirrored floor reflection */
function DarkPanel() {
  return (
    <div style={{ width: 1060, padding: "46px 52px", borderRadius: 30, background: "linear-gradient(180deg,#14161D,#0D0E13)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 0 0 1px rgba(110,150,255,.28), 0 0 80px rgba(30,90,232,.35), 0 60px 120px -30px #000" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 70, height: 70, borderRadius: "50%", background: K.blue, display: "grid", placeItems: "center", boxShadow: "0 0 40px rgba(30,90,232,.8)" }}><Icon name="spark" size={34} color="#fff" /></div>
        <div><div style={{ fontWeight: 800, fontSize: 36, color: "#fff" }}>AI answer</div><div style={{ fontFamily: MONO, fontSize: 22, color: "#7C86A3" }}>› best CRM for a small sales team?</div></div>
      </div>
      <div style={{ fontWeight: 600, fontSize: 40, color: "#C9D2E8", marginTop: 30 }}>For a small sales team, the strongest picks are:</div>
      {NAMES.map((n, i) => (
        <div key={n} style={{ display: "flex", alignItems: "center", gap: 24, height: 118, borderBottom: "1px solid #23262F" }}>
          <span style={{ fontFamily: MONO, color: "#6E96FF", fontSize: 26, width: 30 }}>{i + 1}</span>
          <span style={{ ...H, fontSize: 70, color: "#fff", flex: 1 }}>{n}</span>
          <Tick c="#fff" bg={K.blue} />
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 24, height: 118, marginTop: 18, borderRadius: 20, padding: "0 24px", background: "rgba(229,72,77,.12)", boxShadow: "inset 0 0 0 1.5px rgba(229,72,77,.6), 0 0 60px rgba(229,72,77,.3)" }}>
        <span style={{ fontFamily: MONO, color: "#FF6B70", fontSize: 26, width: 30 }}>—</span>
        <span style={{ ...H, fontSize: 70, color: "#4A4E5A", flex: 1 }}>Your brand</span>
        <span style={{ fontWeight: 700, fontSize: 28, color: "#FF6B70" }}>not mentioned</span>
      </div>
    </div>
  );
}
export function FrameC() {
  return (
    <AbsoluteFill style={{ background: "#07080B", overflow: "hidden", fontFamily: "Manrope" }}>
      <Fonts />
      <div style={{ position: "absolute", left: 600, top: -300, width: 1400, height: 1400, borderRadius: "50%", background: "radial-gradient(circle, rgba(30,90,232,.35), transparent 60%)" }} />
      <Cam ry={-24} rx={4} z={-60} x={-60} y={60}>
        <At x={800} y={40}><DarkPanel /></At>
        <At x={800} y={40} rx={180} origin="50% 1080px" o={0.18} blur={6} style={{ maskImage: "linear-gradient(0deg, transparent 40%, #000)", WebkitMaskImage: "linear-gradient(0deg, transparent 40%, #000)" }}><DarkPanel /></At>
      </Cam>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 260, background: "linear-gradient(0deg,#07080B 20%, transparent)" }} />
      <Headline style={{ left: 100, top: 560 }} />
    </AbsoluteFill>
  );
}
