/* ACT A · 0–400: aisle hook → answer + NOT MENTIONED → engine montage → rail break → Meet BrandPulse */
import type { ReactNode } from "react";
import { Field, Sweep, At, BlueBg, Box, Build, Cam, Chip, Cursor, Frame, H, Icon, InkBg, K, Mark, Meta, MONO, PaperBg, Stamp, W, bOut, c3, card, clamp, eIn, eIO, eOut, hand, kf, mix, pr, shakeAt, typed } from "./kit";

export const Q = "best CRM for a small sales team?";
const NAMES = ["Northstar CRM", "Atlas", "Pipewell"];

/* ---------- S1 · 0–60 · dolly down an aisle of AI answers, tracking the buyer's question ---------- */
function AisleCard({ i, tone }: { i: number; tone: number }) {
  const bg = tone === 0 ? "#16181F" : tone === 1 ? K.blue : tone === 2 ? "#E9ECF4" : "#20242E";
  const ln = tone === 2 ? "#BFC7D9" : tone === 1 ? "#9DBBFF" : "#2E3442";
  return (
    <div style={{ width: 340, height: 190, borderRadius: 18, background: bg, padding: 22, boxShadow: "0 0 0 1px #ffffff10" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: tone === 1 ? "#fff" : K.blue, display: "grid", placeItems: "center" }}><Icon name="spark" size={14} color={tone === 1 ? K.blue : "#fff"} /></div>
        <div style={{ height: 9, width: 110 + ((i * 37) % 80), borderRadius: 5, background: ln }} />
      </div>
      {[0.9, 0.7, 0.8].map((w, j) => <div key={j} style={{ height: 9, width: `${w * 100 - ((i + j) * 13) % 25}%`, borderRadius: 5, background: ln, marginTop: 18 }} />)}
    </div>
  );
}
export function S1({ f }: { f: number }) {
  const z = kf(f, [[0, -300], [44, 1500]], c3);
  const h = hand(f, 1.2);
  const wall = (side: 1 | -1) => (
    <At x={side < 0 ? 140 : 1780 - 6000} y={60} w={6000} h={960} origin={side < 0 ? "0 50%" : "100% 50%"} style={{ transform: `rotateY(${side < 0 ? 90 : -90}deg)` }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(16, 360px)", gap: 24, direction: side < 0 ? "ltr" : "rtl" }}>
        {Array.from({ length: 64 }, (_, i) => <AisleCard key={i} i={i} tone={(i * 7 + (side < 0 ? 1 : 3)) % 5 === 0 ? 1 : (i * 3) % 4 === 0 ? 2 : (i % 2) * 3} />)}
      </div>
    </At>
  );
  // hero question card lives in screen space and grows as the camera closes in (tracked object)
  const near = kf(f, [[0, 0.36], [40, 1]], c3);
  const n = typed(Q, f, 6, 1.1);
  return (
    <Frame bg={K.ink}>
      <Cam z={z} x={h.x} y={h.y} rz={h.r} p={900}>
        {wall(-1)}
        {wall(1)}
        <At x={-1000} y={960} w={3920} h={8000} rx={-90} origin="50% 0" style={{ backgroundColor: "#0B0C10", backgroundImage: "radial-gradient(18% 70% at 50% 40%, #3E78F540, transparent 70%), linear-gradient(90deg, transparent 49.7%, #6E96FF 49.7%, #6E96FF 50.3%, transparent 50.3%), repeating-linear-gradient(180deg, transparent 0 260px, #ffffff10 260px 268px)" }} />
        <At x={-1000} y={60} w={3920} h={8000} rx={-90} origin="50% 0"  style={{ backgroundImage: "repeating-linear-gradient(180deg, transparent 0 400px, #ffffffcc 400px 412px, transparent 412px 800px)", opacity: 0.5, filter: "blur(2px)" }} />
      </Cam>
      {/* volumetric light at the vanishing point, god rays, speed streaks */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, #8FB3FF66 0%, #1E5AE840 10%, #09090B00 34%)" }} />
      <div style={{ position: "absolute", left: -240, top: -660, width: 2400, height: 2400, borderRadius: "50%", background: "repeating-conic-gradient(from 0deg, #8FB3FF14 0deg 3deg, transparent 3deg 14deg)", transform: `rotate(${f * 0.25}deg)`, maskImage: "radial-gradient(circle, #000 0%, transparent 55%)", WebkitMaskImage: "radial-gradient(circle, #000 0%, transparent 55%)", opacity: 0.8 }} />
      {f < 50 && Array.from({ length: 26 }, (_, i) => {
        const a = (i / 26) * Math.PI * 2 + i * 0.37;
        const t = (f * 0.045 + ((i * 0.618) % 1)) % 1;
        const r0 = 120 + t * 1100;
        return <div key={i} style={{ position: "absolute", left: 960 + Math.cos(a) * r0, top: 540 + Math.sin(a) * r0, width: 40 + t * 260, height: 2, background: "linear-gradient(90deg, transparent, #BFD3FF)", transformOrigin: "0 50%", transform: `rotate(${(a * 180) / Math.PI}deg)`, opacity: t * 0.5 }} />;
      })}
      <div style={{ position: "absolute", left: 960, top: 520, width: 1500, height: 210, marginLeft: -750, marginTop: -105, transform: `scale(${near}) translate(${h.x * -2}px,${h.y * -2}px)`, background: "linear-gradient(180deg,#FFFFFF,#EEF2FB)", borderRadius: 105, display: "flex", alignItems: "center", padding: "0 0 0 70px", boxShadow: `inset 0 2px 0 #fff, inset 0 -6px 16px rgba(30,90,232,.12), 0 0 0 2px rgba(143,179,255,.8), 0 60px 120px -30px #000, 0 0 ${110 + Math.sin(f / 4) * 30}px rgba(62,120,245,.65)` }}>
        <Icon name="search" size={64} color="#9AA0AE" sw={2.6} />
        <span style={{ fontWeight: 600, fontSize: 70, letterSpacing: "-0.03em", color: K.text, marginLeft: 30, whiteSpace: "nowrap" }}>{n}</span>
        <span style={{ width: 6, height: 84, background: K.blue, boxShadow: `0 0 18px ${K.blue}`, marginLeft: 6, opacity: n.length < Q.length || Math.floor(f / 6) % 2 ? 1 : 0 }} />
        <span style={{ flex: 1 }} />
        <span style={{ width: 158, height: 158, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #6E96FF, #1E5AE8 60%, #1546BE)", boxShadow: "inset 0 2px 0 rgba(255,255,255,.4), 0 14px 30px rgba(30,90,232,.55)", marginRight: 26, display: "grid", placeItems: "center", flex: "none" }}><Icon name="up" size={70} color="#fff" sw={3} /></span>
      </div>
      <div style={{ position: "absolute", left: 90, bottom: 110, color: "#fff", ...H, fontSize: 92, lineHeight: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 56, letterSpacing: "-0.03em", opacity: 0.9 }}><W f={f} at={10}>Your buyer is</W></div>
        <W f={f} at={22} d={6}>asking AI</W><W f={f} at={30} style={{ color: K.blue2 }}>.</W>
      </div>
      {/* the send button swells into a blue disc: hand-off to S2 */}
      {f >= 46 && (
        <div style={{ position: "absolute", left: 960 + 750 - 105, top: 520, width: 10, height: 10 }}>
          <div style={{ position: "absolute", width: 4000, height: 4000, left: -2000, top: -2000, borderRadius: "50%", background: K.blue, transform: `scale(${mix(0.04, 1, eIn(pr(f, 46, 14)))})` }} />
        </div>
      )}
    </Frame>
  );
}

/* ---------- S2 · 60–165 · disc shrinks into the AI avatar; answer names three; you are NOT MENTIONED ---------- */
export function S2({ f }: { f: number }) {
  const shrink = eOut(pr(f, 0, 12));
  const scroll = c3(pr(f, 64, 14));
  const h = hand(f);
  const rows = [...NAMES.map((n, i) => ({ n, ok: true, at: 22 + i * 8 })), { n: "Your brand", ok: false, at: 66 }];
  const glitch = f >= 95 ? Math.sin(pr(f, 95, 10) * Math.PI) : 0;
  const sh = shakeAt(f, 84, 0.8);
  const scene = (dx = 0, tint?: string) => (
    <Cam ry={kf(f, [[0, -22], [105, -9]])} rx={kf(f, [[0, 8], [105, 4]])} z={kf(f, [[0, -40], [105, 90]])} x={h.x + sh.x + dx} y={h.y + sh.y + mix(0, 330, scroll)}>
      <At x={720} y={110} w={1120} h={1060} style={{ ...card, borderRadius: 30, padding: "50px 56px", filter: tint }}>
        <Sweep f={f} at={40} dur={26} />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 76, height: 76, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #6E96FF, #1E5AE8 60%, #1546BE)", boxShadow: "0 10px 26px rgba(30,90,232,.45)", display: "grid", placeItems: "center" }}><Icon name="spark" size={38} color="#fff" /></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 40, color: K.text }}>AI answer</div>
            <div style={{ fontFamily: MONO, fontSize: 26, color: K.mute, marginTop: 4 }}>› {Q}</div>
          </div>
        </div>
        <div style={{ fontSize: 50, fontWeight: 600, letterSpacing: "-0.025em", color: K.text, marginTop: 34, lineHeight: 1.2 }}>{typed("For a small sales team, the strongest picks are:", f, 10, 3)}</div>
        <div style={{ marginTop: 26 }}>
          {rows.map((r, i) => (
            <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 26, height: 150, borderBottom: i < 3 ? `2px solid ${K.line}` : "none", background: r.ok ? undefined : "linear-gradient(90deg,#FCE9EA,#FDF3F3)", boxShadow: r.ok ? undefined : `0 0 0 ${2 + Math.max(0, Math.sin(pr(f, 70, 14) * Math.PI)) * 10}px rgba(229,72,77,${0.25 + Math.max(0, Math.sin(pr(f, 70, 14) * Math.PI)) * 0.25})`, borderRadius: r.ok ? 0 : 18, padding: r.ok ? 0 : "0 26px", marginTop: r.ok ? 0 : 18, opacity: clamp((f - r.at) / 4), transform: `translateX(${(1 - eOut(pr(f, r.at, 10))) * 80}px)` }}>
              <span style={{ fontFamily: MONO, fontSize: 30, color: r.ok ? K.blue : K.red, width: 40 }}>{r.ok ? i + 1 : "—"}</span>
              <span style={{ ...H, fontSize: 82, color: r.ok ? K.text : "#B4B4B0", flex: 1 }}>{r.n}</span>
              {r.ok ? (
                <span style={{ width: 62, height: 62, borderRadius: "50%", background: "#E3F8EF", display: "grid", placeItems: "center", transform: `scale(${bOut(pr(f, r.at + 4, 10))})` }}><Icon name="check" size={34} color="#0F9D6C" sw={3.2} /></span>
              ) : (
                <span style={{ fontWeight: 700, fontSize: 30, color: K.red }}>not mentioned</span>
              )}
            </div>
          ))}
        </div>
        {f >= 84 && <div style={{ position: "absolute", left: 160, top: 860 }}><Stamp f={f} at={84} text="NOT MENTIONED" size={86} rot={-9} style={{ boxShadow: "0 24px 48px -12px rgba(229,72,77,.5)" }} /></div>}
      </At>
    </Cam>
  );
  return (
    <Frame bg={<PaperBg f={f} />}>
      <Field f={f} n={9} seed={3} />
      <Meta text="AI answer · live" />
      {scene()}
      {glitch > 0 && (
        <>
          <div style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", opacity: 0.8, clipPath: `inset(${(f * 97) % 60}% 0 ${(f * 53) % 30}% 0)` }}>{scene(-40 * glitch, "hue-rotate(120deg) saturate(4)")}</div>
          <div style={{ position: "absolute", inset: 0, mixBlendMode: "screen", opacity: 0.6, clipPath: `inset(${(f * 41) % 70}% 0 ${(f * 29) % 20}% 0)` }}>{scene(50 * glitch, "hue-rotate(-90deg) saturate(5)")}</div>
        </>
      )}
      <div style={{ position: "absolute", left: 90, top: 640, ...H, fontSize: 124, color: K.text, opacity: f < 40 ? 0 : 1 }}>
        <W f={f} at={40}>But are</W><br /><Box f={f} at={48} bg={K.blue}><W f={f} at={46}>you</W></Box> <W f={f} at={52}>in it?</W>
      </div>
      {/* opening: the blue disc closing down onto the avatar (screen position of the avatar) */}
      {shrink < 1 && (
        <div style={{ position: "absolute", left: 860, top: 250, width: 10, height: 10 }}>
          <div style={{ position: "absolute", width: 4000, height: 4000, left: -2000, top: -2000, borderRadius: "50%", background: K.blue, transform: `scale(${mix(1, 0.02, shrink)})` }} />
        </div>
      )}
    </Frame>
  );
}

/* ---------- S3 · 165–255 · engine montage → Invisible. ---------- */
export function S3({ f }: { f: number }) {
  if (f < 20) {
    // ChatGPT. on a dark floor of answer tiles
    const h = hand(f);
    return (
      <Frame bg={K.ink}>
        <Cam rx={58} z={kf(f, [[0, -200], [20, 0]])} y={-120} x={h.x}>
          <At x={-800} y={400} w={3520} h={1400} style={{ display: "grid", gridTemplateColumns: "repeat(16, 200px)", gap: 20 }}>
            {Array.from({ length: 96 }, (_, i) => <div key={i} style={{ height: 120, borderRadius: 16, background: i % 9 === 0 ? "#1E5AE844" : "#15171D", boxShadow: "0 0 0 1px #ffffff0d", display: "grid", placeItems: "center" }}>{i % 9 === 0 && <Icon name="chat" size={36} color="#4B7BEF" />}</div>)}
          </At>
        </Cam>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#09090B 10%, #09090B00 55%)" }} />
        <div style={{ position: "absolute", left: 460, top: 640, width: 1000, height: 200, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(62,120,245,.45), transparent)", filter: "blur(10px)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", ...H, fontSize: 250, color: "#fff", textShadow: "0 0 60px rgba(62,120,245,.45)" }}><W f={f} at={0} d={6} blur={40}>ChatGPT.</W></div>
      </Frame>
    );
  }
  if (f < 40) {
    const g = f - 20;
    const flip = eOut(pr(g, 0, 9));
    return (
      <Frame bg={<BlueBg f={f} />}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 400, textAlign: "center", perspective: 900 }}>
          <div style={{ position: "absolute", left: 560, top: -170, width: 800, height: 560, borderRadius: 40, background: "linear-gradient(160deg,rgba(255,255,255,.22),rgba(255,255,255,.04))", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.25)", transform: `perspective(1200px) rotateY(${-30 + g * 2}deg) rotateX(12deg)`, filter: "blur(2px)" }} />
          <div style={{ ...H, fontSize: 280, color: "#fff", transform: `rotateX(${(1 - flip) * -180}deg)`, transformOrigin: "50% 60%", display: "inline-block", textShadow: "0 20px 60px rgba(0,20,90,.45)", position: "relative" }}>Gemini.</div>
        </div>
        <div style={{ position: "absolute", left: 1330, top: 330 }}><Stamp f={g} at={8} text="NAMED YOU?" color="#fff" rot={8} size={40} style={{ background: "transparent" }} /></div>
      </Frame>
    );
  }
  if (f < 60) {
    const g = f - 40;
    return (
      <Frame bg={<PaperBg f={f} />}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 400, textAlign: "center", ...H, fontSize: 240, color: K.text }}>
          <W f={g} at={0} d={6} blur={30}>Perplexity</W><W f={g} at={3}>.</W><Chip f={g} at={6} icon="search" />
        </div>
        {/* an answer card passing the lens */}
        <div style={{ position: "absolute", left: mix(2100, -900, g / 20), top: 520, width: 760, height: 520, ...card, filter: "blur(16px)", transform: "rotate(-6deg)", opacity: 0.9 }} />
      </Frame>
    );
  }
  const g = f - 60;
  const ms = Math.floor(((g / 30) * 1000) % 1000);
  return (
    <Frame bg={<InkBg f={f} />}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 26, color: "#9DB6F5", letterSpacing: "0.12em", opacity: clamp(g / 4) }}>
          ● ANSWERS THAT NAME YOU · 0 / 10 · T+00:0{8 + Math.floor(g / 30)}.{String(ms).padStart(3, "0")}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: -120, ...H, fontSize: 620, color: "#1E5AE812", transform: `scale(${1 + g * 0.003})` }}>0/10</div>
        <div style={{ ...H, fontSize: 290, color: K.blue2, marginTop: 30, position: "relative", textShadow: "0 0 80px rgba(62,120,245,.55)" }}><W f={g} at={3} d={6} blur={36} from={1.3}>Invisible.</W></div>
      </div>
    </Frame>
  );
}

/* ---------- S4 · 255–360 · the journey rail breaks at the shortlist; text shatters into blue bars ---------- */
const NODES = [["chat", "Question"], ["spark", "AI answer"], ["list", "Shortlist"], ["bag", "Sale"]] as const;
export function S4({ f }: { f: number }) {
  const gap = 520;
  const dot = kf(f, [[0, -300], [46, gap * 2 - 40], [52, gap * 2 - 20]], c3);
  const broken = f >= 50;
  const camX = kf(f, [[0, -560], [46, gap * 2 - 760], [90, gap * 2 - 680]], eIO);
  const flash = f >= 50 && f < 56 ? 1 - (f - 50) / 6 : 0;
  const bars = pr(f, 86, 18);
  const sh = shakeAt(f, 50, 1.2);
  return (
    <Frame bg={<InkBg f={f} />}>
      <Meta text="The buyer journey" dark />
      <div style={{ position: "absolute", left: 90, top: 120, ...H, fontSize: 84, color: "#fff", opacity: 1 - eIn(pr(f, 56, 6)) }}>
        <W f={f} at={6}>Miss</W> <W f={f} at={10} style={{ color: K.blue2 }}>one</W> <W f={f} at={14}>answer…</W>
      </div>
      <Cam x={camX + sh.x} y={sh.y + 40} ry={-8} rx={5} z={320}>
        <At x={300} y={560} w={gap * 3 + 1200} h={6} style={{ background: "#2A2F3C", borderRadius: 3 }} />
        <At x={300} y={560} w={Math.max(0, Math.min(dot - 300 + 960, broken ? gap * 2 - 40 + 660 : 9999))} h={6} style={{ background: `linear-gradient(90deg, ${K.blue}, #8FB3FF)`, borderRadius: 3, boxShadow: `0 0 24px ${K.blue}` }} />
        {NODES.map(([ic, label], i) => {
          const x = 960 + (i - 1) * gap + 0;
          const lit = dot + 960 >= x + 960 - 960 && !(broken && i >= 2);
          const dead = broken && i >= 2;
          return (
            <At key={label} x={x - 70} y={490} w={140} h={140}>
              <div style={{ width: 140, height: 140, borderRadius: 34, background: dead ? "linear-gradient(180deg,#1E1F26,#141519)" : lit ? "radial-gradient(circle at 35% 25%, #6E96FF, #1E5AE8 60%, #1546BE)" : "linear-gradient(180deg,#22242C,#15161B)", display: "grid", placeItems: "center", boxShadow: lit && !dead ? `0 0 50px ${K.blue}88` : "0 0 0 2px #2A2F3C", transform: `scale(${lit && !dead ? 1.06 : 1})` }}>
                <Icon name={ic} size={60} color={dead ? "#3D4250" : "#fff"} />
              </div>
              <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.12em", color: dead ? "#4A4F5C" : "#C9D6F5", textTransform: "uppercase", textAlign: "center", marginTop: 22, width: 300, marginLeft: -80 }}>{label}</div>
            </At>
          );
        })}
        {Array.from({ length: 8 }, (_, t) => <At key={`tr${t}`} x={dot + 960 - 10 - t * 26} y={553} w={20 - t * 2} h={20 - t * 2} o={(broken ? 1 - pr(f, 50, 6) : 1) * (0.5 - t * 0.06)} style={{ borderRadius: "50%", background: "#8FB3FF", filter: "blur(2px)" }} />)}
        <At x={dot + 960 - 14 - 960 + 960} y={549} w={28} h={28} o={broken ? 1 - pr(f, 50, 6) : 1} style={{ borderRadius: "50%", background: "#fff", boxShadow: `0 0 30px 10px ${K.blue}` }} />
        <At x={300} y={640} w={gap * 3 + 1200} h={60} style={{ background: `linear-gradient(90deg, ${K.blue}00, ${K.blue}33, ${K.blue}00)`, filter: "blur(18px)" }} />
        {broken && (
          <At x={960 + gap - 230} y={700} w={560} z={80} s={bOut(pr(f, 52, 10))} style={{ ...card, padding: "26px 30px", transformOrigin: "50% 0" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontFamily: MONO, fontSize: 18, color: K.mute }}>SHORTLIST · Q01</span><span style={{ flex: 1 }} />
              <span style={{ background: K.red, color: "#fff", borderRadius: 999, padding: "4px 14px", fontWeight: 700, fontSize: 18 }}>Not on it</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: 36, marginTop: 12, color: K.text }}>Your brand wasn't named</div>
          </At>
        )}
      </Cam>
      <div style={{ position: "absolute", inset: 0, background: K.blue, opacity: flash * 0.85 }} />
      <div style={{ position: "absolute", left: 90, top: 120, ...H, fontSize: 104, color: "#fff", opacity: f < 60 ? 0 : 1 }}>
        <div style={{ fontWeight: 600, fontSize: 60, letterSpacing: "-0.03em" }}><W f={f} at={60}>and the sale</W></div>
        <Box f={f} at={68} bg={K.blue}><W f={f} at={66}>goes elsewhere.</W></Box>
      </div>
      {/* shatter: stepped blue bars rise to fill the frame — KI "STOPS." → bars */}
      {bars > 0 && Array.from({ length: 12 }, (_, i) => {
        const q = eIO(pr(f, 86 + ((i * 5) % 12) * 0.6, 12));
        return <div key={i} style={{ position: "absolute", left: i * 160, width: 161, bottom: 0, height: `${q * 100}%`, background: i % 2 ? K.blue : "#2E68F0" }} />;
      })}
    </Frame>
  );
}

/* ---------- S5 · 360–400 · bars retract to paper; Meet [mark] BrandPulse. builds ---------- */
export function S5({ f }: { f: number }) {
  const h = hand(f, 0.6);
  return (
    <Frame bg={<PaperBg f={f} />}>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${h.x}px,${h.y}px) scale(${1 + f * 0.0012})` }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 440, display: "flex", justifyContent: "center", alignItems: "center", gap: 34, ...H, fontSize: 170, color: K.text }}>
          <span style={{ fontWeight: 500, letterSpacing: "-0.04em", fontSize: 150 }}><Build f={f} at={6} text="Meet" /></span>
          <span style={{ transform: `scale(${bOut(pr(f, 14, 12))}) rotate(${(1 - eOut(pr(f, 14, 14))) * -90}deg)` }}><Mark size={170} draw={eOut(pr(f, 14, 14))} dot={bOut(pr(f, 24, 10))} /></span>
          <span><Build f={f} at={18} text="BrandPulse" step={1.1} /><W f={f} at={30} style={{ color: K.blue }}>.</W></span>
        </div>
      </div>
      {Array.from({ length: 12 }, (_, i) => {
        const q = eIO(pr(f, ((i * 7) % 12) * 0.5, 10));
        return <div key={i} style={{ position: "absolute", left: i * 160, width: 161, top: 0, height: `${(1 - q) * 100}%`, background: i % 2 ? K.blue : "#2E68F0" }} />;
      })}
    </Frame>
  );
}

export const ACT_A: [number, number, (p: { f: number }) => ReactNode][] = [
  [0, 60, S1], [60, 165, S2], [165, 255, S3], [255, 360, S4], [360, 400, S5],
];
export { Cursor };
