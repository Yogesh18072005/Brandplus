/* Replacement scenes: fast graphic moments instead of card/terminal UI. Same slots as the v6 scenes they replace. */
import type { CSSProperties, ReactNode } from "react";
import { At, BlueBg, Cam, Cursor, Frame, H, Icon, InkBg, K, Mark, MONO, PaperBg, W, bOut, c3, clamp, eIn, eIO, eOut, hand, kf, mix, pr, shakeAt } from "./kit";


/* ---------- R2 · 60–165 · scoreboard: names slam in full frame, yours is struck out, then "But are YOU in it?" ---------- */
const BOARD = [["Northstar CRM", 4], ["Atlas", 14], ["Pipewell", 24]] as const;
export function R2({ f }: { f: number }) {
  if (f < 62) {
    const row = 230;
    const idx = f < 14 ? 0 : f < 24 ? 1 : f < 36 ? 2 : 3;
    const y = kf(f, [[0, 380], [12, 380], [16, 380 - row], [24, 380 - row], [28, 380 - row * 2], [36, 380 - row * 2], [40, 380 - row * 3]], eOut);
    const strike = eOut(pr(f, 46, 6));
    const sh = shakeAt(f, 46, 1.4);
    const redFlash = f >= 46 && f < 52 ? 1 - (f - 46) / 6 : 0;
    const flick = f >= 36 && f < 46 && Math.floor(f / 2) % 3 === 0 ? 0.3 : 1;
    return (
      <Frame bg={<BlueBg f={f} />}>
        <div style={{ position: "absolute", left: 120, top: 60, fontFamily: MONO, fontSize: 24, letterSpacing: "0.12em", color: "#ffffffaa" }}>AI ANSWER · BEST CRM FOR A SMALL SALES TEAM?</div>
        <div style={{ position: "absolute", left: 120 + sh.x, top: y + sh.y, transform: `scale(${1 + f * 0.0015})`, transformOrigin: "0 50%" }}>
          {BOARD.map(([n, at], i) => (
            <div key={n} style={{ height: row, display: "flex", alignItems: "center", gap: 50, opacity: f < at ? 0 : i === idx ? 1 : 0.32, filter: i === idx ? undefined : "blur(1.5px)" }}>
              <span style={{ fontFamily: MONO, fontSize: 48, color: "#ffffff88", width: 60 }}>0{i + 1}</span>
              <span style={{ ...H, fontSize: 200, color: "#fff" }}><W f={f} at={at} d={5} blur={30} from={1.25}>{n}</W></span>
              <span style={{ width: 150, height: 150, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", transform: `scale(${bOut(pr(f, at + 3, 9))})` }}><Icon name="check" size={90} color={K.blue} sw={3.4} /></span>
            </div>
          ))}
          <div style={{ height: row, display: "flex", alignItems: "center", gap: 50, position: "relative", opacity: f < 36 ? 0 : flick }}>
            <span style={{ fontFamily: MONO, fontSize: 48, color: "#FFB3B8", width: 60 }}>—</span>
            <span style={{ ...H, fontSize: 200, color: "transparent", WebkitTextStroke: "4px #fff" }}>Your brand</span>
            <div style={{ position: "absolute", left: 70, top: "50%", height: 34, marginTop: -17, width: 1180, background: K.red, transformOrigin: "left", transform: `scaleX(${strike}) rotate(-3deg)`, boxShadow: "0 0 40px rgba(229,72,77,.7)" }} />
          </div>
        </div>
        <div style={{ position: "absolute", inset: 0, background: K.red, opacity: redFlash * 0.55, mixBlendMode: "multiply" }} />
      </Frame>
    );
  }
  // "But are YOU in it?" — giant slam on paper, glitch out (the cut smear handles the edge)
  const g = f - 62;
  const sh = shakeAt(g, 8, 1.6);
  const glitch = g >= 33 ? Math.sin(pr(g, 33, 10) * Math.PI) : 0;
  const body = (dx = 0, tint?: string) => (
    <div style={{ position: "absolute", inset: 0, transform: `translate(${sh.x + dx}px,${sh.y}px) scale(${1 + g * 0.004})`, filter: tint }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center", ...H, fontSize: 150, color: K.text }}><W f={g} at={0} d={5}>But are</W></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 320, textAlign: "center" }}>
        <span style={{ display: "inline-block", ...H, fontSize: 470, color: "#fff", background: K.blue, padding: "0 60px 30px", lineHeight: 0.95, transform: `scale(${g < 8 ? 0 : mix(1.6, 1, eOut(pr(g, 8, 6)))})`, opacity: g < 8 ? 0 : 1 }}>YOU</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 820, textAlign: "center", ...H, fontSize: 150, color: K.text }}><W f={g} at={16} d={5}>in it?</W></div>
    </div>
  );
  return (
    <Frame bg={<PaperBg f={f} />}>
      {body()}
      {glitch > 0 && (
        <>
          <div style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", clipPath: `inset(${(g * 97) % 60}% 0 ${(g * 53) % 30}% 0)` }}>{body(-50 * glitch, "hue-rotate(140deg) saturate(4)")}</div>
          <div style={{ position: "absolute", inset: 0, mixBlendMode: "screen", opacity: 0.7, clipPath: `inset(${(g * 41) % 70}% 0 ${(g * 29) % 20}% 0)` }}>{body(60 * glitch, "hue-rotate(-90deg) saturate(5)")}</div>
        </>
      )}
    </Frame>
  );
}

/* ---------- R6 · 400–480 · exploded isometric product: the report's layers fly apart in 3D ---------- */
function Layer({ w, h, children, style }: { w: number; h: number; children?: ReactNode; style?: CSSProperties }) {
  return <div style={{ width: w, height: h, borderRadius: 28, background: "#fff", boxShadow: "0 0 0 2px rgba(30,90,232,.15), 0 40px 80px -30px rgba(12,42,120,.4)", position: "relative", overflow: "hidden", ...style }}>{children}</div>;
}
export function R6({ f }: { f: number }) {
  const ex = eOut(pr(f, 14, 26));
  const orbit = kf(f, [[0, -40], [80, -24]]);
  const up = c3(pr(f, 0, 18));
  const wipe = eIn(pr(f, 70, 10));
  const gap = 230 * ex;
  return (
    <Frame bg={<PaperBg f={f} />}>
      <div style={{ position: "absolute", left: 0, right: 0, top: mix(440, 60, up), display: "flex", justifyContent: "center", alignItems: "center", gap: 20, ...H, fontSize: mix(170, 64, up), color: K.text }}>
        <span style={{ fontWeight: 500, letterSpacing: "-0.04em" }}>Meet</span><Mark size={mix(170, 64, up)} /><span>BrandPulse<span style={{ color: K.blue }}>.</span></span>
      </div>
      <Cam rx={52} rz={orbit} z={kf(f, [[0, -400], [24, 40], [80, 120]], c3)} y={-170} x={40}>
        <At x={460} y={240} w={1000} h={640} z={0} o={up}><Layer w={1000} h={640} style={{ background: "linear-gradient(135deg,#1E5AE8,#3E78F5)" }}><div style={{ position: "absolute", left: 40, top: 40, display: "flex", gap: 12, alignItems: "center", fontWeight: 800, fontSize: 34, color: "#fff" }}><Mark size={44} ring="#fff" />BrandPulse</div></Layer></At>
        <At x={500} y={300} w={460} h={300} z={gap} o={up}><Layer w={460} h={300}><div style={{ padding: 34 }}><div style={{ fontFamily: MONO, fontSize: 18, color: K.mute }}>AI ANSWERS THAT NAME YOU</div><div style={{ display: "flex", alignItems: "baseline", gap: 14 }}><span style={{ fontWeight: 700, fontSize: 170, color: K.red, letterSpacing: "-0.04em", lineHeight: 1 }}>1</span><span style={{ fontWeight: 700, fontSize: 60, color: "#5D6676" }}>of 10</span></div></div></Layer></At>
        <At x={1000} y={300} w={420} h={300} z={gap * 1.6} o={up}><Layer w={420} h={300}><div style={{ padding: 30 }}>{[["Northstar", 80], ["Atlas", 60], ["Pipewell", 50], ["You", 10]].map(([n, v]) => <div key={n as string} style={{ marginTop: 14 }}><div style={{ fontWeight: 700, fontSize: 18, color: n === "You" ? K.red : K.text }}>{n}</div><div style={{ height: 14, borderRadius: 7, background: "#EEE" }}><div style={{ height: "100%", width: `${(v as number) * ex}%`, borderRadius: 7, background: n === "You" ? K.red : K.blue }} /></div></div>)}</div></Layer></At>
        <At x={500} y={640} w={920} h={200} z={gap * 2.3} o={up}><Layer w={920} h={200}><div style={{ padding: "26px 30px", borderLeft: `8px solid ${K.blue}`, height: "100%" }}><span style={{ fontFamily: MONO, fontSize: 18, color: K.blue }}>✦ GEMINI · EVIDENCE</span><div style={{ fontSize: 30, marginTop: 10, fontWeight: 600 }}>“Northstar CRM is the strongest pick for small teams…”</div><div style={{ marginTop: 10, color: K.red, fontWeight: 800, fontSize: 24 }}>Your Brand — not mentioned</div></div></Layer></At>
        <At x={1180} y={180} w={300} h={110} z={gap * 3} o={up} style={{ borderRadius: 999, background: K.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontWeight: 800, fontSize: 30, boxShadow: "0 30px 60px -20px #000a" }}><Icon name="wrench" size={30} color="#fff" />Fix plan</At>
      </Cam>
      {wipe > 0 && <div style={{ position: "absolute", inset: -200, background: K.blue, clipPath: `polygon(${mix(130, -40, wipe)}% 0, 140% 0, 140% 100%, ${mix(160, -10, wipe)}% 100%)` }} />}
    </Frame>
  );
}

/* ---------- R10 · 720–780 · one giant Run button: click → shockwaves → 10 questions burst past the lens ---------- */
const QS = ["best CRM for a small team?", "HubSpot alternatives", "cheapest CRM with email", "CRM inside Gmail", "is Northstar worth it?", "Pipewell vs Atlas", "easiest CRM to set up", "CRM with a mobile app", "CRM sales teams trust", "best CRM under $50"];
export function R10({ f }: { f: number }) {
  const click = 16;
  const pressed = f >= click;
  const cx = kf(f, [[0, 1600], [14, 1040]], c3), cy = kf(f, [[0, 960], [14, 610]], c3);
  const h = hand(f, 1);
  const count = Math.min(10, Math.max(0, Math.floor((f - click - 4) / 2)));
  return (
    <Frame bg={<InkBg f={f} />}>
      {pressed && [0, 1, 2].map((i) => { const q = eOut(pr(f, click + i * 4, 22)); return <div key={i} style={{ position: "absolute", left: 960 - 280, top: 560 - 280, width: 560, height: 560, borderRadius: "50%", border: `${10 - i * 3}px solid ${K.blue2}`, transform: `scale(${1 + q * 6})`, opacity: 1 - q }} />; })}
      {pressed && QS.map((q, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.3;
        const t = eIn(pr(f, click + 2 + i * 1.2, 26));
        const d = 220 + t * 1500;
        const s = 0.6 + t * 1.8;
        return <div key={q} style={{ position: "absolute", left: 960 + Math.cos(a) * d, top: 540 + Math.sin(a) * d * 0.62, transform: `translate(-50%,-50%) scale(${s})`, filter: `blur(${t * 6}px)`, opacity: 1 - clamp((t - 0.8) * 5), background: i % 3 === 0 ? K.blue : "#fff", color: i % 3 === 0 ? "#fff" : K.text, borderRadius: 999, padding: "18px 34px", fontWeight: 700, fontSize: 36, whiteSpace: "nowrap", display: "flex", gap: 10, alignItems: "center" }}><Icon name="search" size={22} color={i % 3 === 0 ? "#fff" : "#9AA0AE"} />{q}</div>;
      })}
      <div style={{ position: "absolute", left: 960 - 280 + h.x, top: 560 - 280 + h.y, width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #6E96FF, #1E5AE8 55%, #1546BE)", boxShadow: `0 0 ${pressed ? 160 : 90}px rgba(62,120,245,.7), inset 0 4px 0 rgba(255,255,255,.35)`, display: "grid", placeItems: "center", transform: `scale(${pressed ? mix(0.88, 1, eOut(pr(f, click, 10))) : bOut(pr(f, 0, 10))})` }}>
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div style={{ ...H, fontSize: pressed ? 240 : 140 }}>{pressed ? count : "Run"}</div>
          <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: "0.12em", opacity: 0.85 }}>{pressed ? "QUESTIONS ASKED" : "FREE AUDIT"}</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: cx, top: cy, opacity: f < click + 8 ? 1 : 0 }}><Cursor press={pressed ? Math.max(0, 1 - (f - click) / 6) : 0} /></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 80, textAlign: "center", ...H, fontSize: 96, color: "#fff" }}><W f={f} at={0}>Run an</W> <W f={f} at={4} style={{ color: K.blue2 }}>audit.</W></div>
    </Frame>
  );
}

/* ---------- R11 · 780–885 · bar race, then dive into your tiny red bar ---------- */
const RACE = [["Northstar CRM", 80], ["Atlas", 60], ["Pipewell", 50], ["Your Brand", 10]] as const;
export function R11({ f }: { f: number }) {
  const grow = (i: number) => eOut(pr(f, 6 + i * 3, 30));
  const dive = eIO(pr(f, 66, 30));
  const split = eIO(pr(f, 94, 11));
  const h = hand(f, 0.8);
  return (
    <Frame bg={<InkBg f={f} />}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: "300px 830px", transform: `scale(${1 + dive * 1.6}) translate(${h.x}px,${h.y}px) rotate(${-dive * 2}deg)` }}>
        <div style={{ position: "absolute", left: 120, top: 80, ...H, fontSize: 110, color: "#fff" }}><W f={f} at={0}>See the</W> <W f={f} at={4} style={{ color: K.blue2 }}>gap.</W></div>
        {RACE.map(([n, v], i) => {
          const me = i === 3;
          const w = (1500 * v) / 100 * grow(i);
          return (
            <div key={n} style={{ position: "absolute", left: 120, top: 290 + i * 170, width: 1700 }}>
              <div style={{ fontWeight: 700, fontSize: 30, color: me ? "#FF8C91" : "#9DB6F5", marginBottom: 10 }}>{n}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
                <div style={{ height: 96, width: Math.max(12, w), borderRadius: 14, background: me ? `linear-gradient(90deg,#B8262D,${K.red})` : "linear-gradient(90deg,#1546BE,#3E78F5)", boxShadow: me ? "0 0 40px rgba(229,72,77,.6)" : "0 0 40px rgba(30,90,232,.45)", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent)", transform: `translateX(${mix(-100, 200, pr(f, 10 + i * 3, 30))}%)` }} />
                </div>
                <span style={{ ...H, fontSize: 96, color: me ? K.red : "#fff" }}>{Math.round(v * grow(i))}%</span>
              </div>
            </div>
          );
        })}
        {f >= 44 && (
          <div style={{ position: "absolute", left: 300, top: 790, width: 1060, height: 4, background: "#ffffff55", transformOrigin: "left", transform: `scaleX(${eOut(pr(f, 44, 12))})` }}>
            <div style={{ position: "absolute", right: -10, top: -40, fontFamily: MONO, fontSize: 24, color: "#fff", whiteSpace: "nowrap", opacity: clamp((f - 52) / 4) }}>−70 PTS · THE GAP</div>
          </div>
        )}
      </div>
      <div style={{ position: "absolute", left: 120, bottom: 40, fontFamily: MONO, fontSize: 16, color: "#ffffff55", letterSpacing: "0.14em" }}>SHARE OF AI ANSWERS · ILLUSTRATIVE</div>
      {split > 0 && <div style={{ position: "absolute", inset: 0, background: K.ink, clipPath: `polygon(${mix(115, 0, split)}% 0, 100% 0, 100% 100%, ${mix(135, -20, split)}% 100%)` }} />}
    </Frame>
  );
}

/* ---------- R12 · 885–1015 · "We fix it." fix blocks slam into your empty slot until it stands tall ---------- */
function Block({ x, y, w, l, hgt, front, side, top, children }: { x: number; y: number; w: number; l: number; hgt: number; front: string; side: string; top: string; children?: ReactNode }) {
  if (hgt < 1) return null;
  return (
    <>
      <At x={x + w} y={y} w={hgt} h={l} origin="0 50%" style={{ transform: "rotateY(-90deg)", background: side }} />
      <At x={x} y={y + l - hgt} w={w} h={hgt} origin="50% 100%" style={{ transform: "rotateX(-90deg)", background: front, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em", textAlign: "center" }}>{children}</At>
      <At x={x} y={y} w={w} h={l} z={hgt} style={{ background: top }} />
    </>
  );
}
const FIXES = [["Comparison page", "doc", 30], ["FAQ + schema", "list", 44], ["Cited sources", "link", 58], ["Published", "globe", 72]] as const;
export function R12({ f }: { f: number }) {
  const unit = 110;
  const zoom = eIn(pr(f, 108, 22));
  const glow = eOut(pr(f, 84, 14));
  const cam = { rx: kf(f, [[0, 62], [100, 58]]), rz: kf(f, [[0, -34], [100, -22]]), z: kf(f, [[0, -200], [100, 60]]), x: kf(f, [[0, -460], [100, -340]]) };
  const towers = [[200, 5, "Northstar"], [520, 4, "Atlas"], [840, 3.5, "Pipewell"]] as const;
  const slotX = 1160;
  const shakes = FIXES.reduce((acc, [, , at]) => { const s = shakeAt(f, at + 8, 0.7); return { x: acc.x + s.x, y: acc.y + s.y }; }, { x: 0, y: 0 });
  return (
    <Frame bg={<InkBg f={f} />}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: "1620px 470px", transform: `scale(${1 + zoom * 30})` }}>
        <Cam rx={cam.rx} rz={cam.rz} z={cam.z} x={cam.x + shakes.x} y={shakes.y} p={1500}>
          <At x={-400} y={-300} w={2800} h={1700} style={{ backgroundImage: "linear-gradient(#ffffff0a 2px, transparent 2px), linear-gradient(90deg, #ffffff0a 2px, transparent 2px)", backgroundSize: "110px 110px", maskImage: "radial-gradient(circle, #000 25%, transparent 60%)", WebkitMaskImage: "radial-gradient(circle, #000 25%, transparent 60%)" }} />
          {towers.map(([x, hgt, n]) => (
            <div key={n} style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
              <Block x={x} y={400} w={240} l={240} hgt={hgt * unit * eOut(pr(f, 0, 16))} front="#1E5AE8" side="#1546BE" top="#5B8BFF">{n}</Block>
            </div>
          ))}
          {/* the empty slot outline */}
          <At x={slotX} y={400} w={240} h={240} style={{ border: "4px dashed #FF6B70", borderRadius: 6, opacity: 1 - glow }} />
          {FIXES.map(([label, , at], i) => {
            const q = eOut(pr(f, at, 10));
            if (f < at) return null;
            const z = i * unit + mix(1400, 0, q);
            return (
              <div key={label} style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `translateZ(${z}px)` }}>
                <Block x={slotX} y={400} w={240} l={240} hgt={unit} front={glow > 0 ? `rgb(${mix(229, 31, glow)},${mix(72, 197, glow)},${mix(77, 138, glow)})` : ["#E5484D", "#D63B41", "#C9343A", "#BC2E34"][i]} side="#8E1F24" top={glow > 0 ? "#7DE8BF" : "#FF8C91"}>{label}</Block>
              </div>
            );
          })}
        </Cam>
        <div style={{ position: "absolute", left: 1500, top: 220, ...H, fontSize: 46, color: "#7DE8BF", opacity: glow }}>Your Brand ✓</div>
      </div>
      <div style={{ position: "absolute", left: 100, top: 70, ...H, fontSize: 110, color: "#fff", opacity: 1 - zoom, zIndex: 3 }}><W f={f} at={2}>We</W> <W f={f} at={7} style={{ color: K.blue2 }}>fix</W> <W f={f} at={12}>it.</W></div>
      <div style={{ position: "absolute", left: 110, top: 240, fontFamily: MONO, fontSize: 26, color: "#9DB6F5", letterSpacing: "0.1em", opacity: (1 - zoom) * clamp((f - 30) / 6) }}>{FIXES.filter(([, , at]) => f >= at + 6).map(([l]) => l.toUpperCase()).join(" · ")}</div>
      {zoom > 0.5 && <div style={{ position: "absolute", inset: 0, background: K.blue, opacity: clamp((zoom - 0.5) * 3) }} />}
    </Frame>
  );
}
