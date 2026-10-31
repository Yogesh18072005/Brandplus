/* v7 OPEN · 0–420: caret macro → question tunnel → AI core → three names on pedestals → your hologram shatters → particles fuse into the ring */
import type { ReactNode } from "react";
import { At, Box, Build, Cam, Frame, H, Icon, K, Mark, MONO, W, bOut, card, clamp, eIn, eIO, eOut, hand, kf, mix, pr, shakeAt } from "../v6/kit";
import { Core, Extrude, Particles, Pedestal, XWord, rnd } from "./fx";

const Q = "best CRM for a small sales team?";
const QS = ["best CRM for a small sales team?", "HubSpot alternatives for startups", "cheapest CRM with email sequences", "which CRM do sales teams trust?", "CRM that works inside Gmail", "is Northstar CRM worth it?", "Pipewell vs Atlas", "easiest CRM to set up in a day", "best CRM under $50 a month", "CRM with a good mobile app", "best project tool for agencies", "top accounting software for freelancers", "who builds the best Shopify apps?", "best SEO agency for SaaS", "best email tool for founders"];

/* ---------- 0–150 · caret macro → pull back → fly through the tunnel of questions into the core ---------- */
export function Hook({ f }: { f: number }) {
  // 0–26: macro pull-back off the caret
  const n = Q.slice(0, Math.min(Q.length, Math.floor(f * 1.6) + 4));
  const pull = eOut(pr(f, 0, 26));
  const caretX = 960 - 650 + 150 + n.length * 31.5;
  const macro = mix(9, 1, pull);
  // 22–150: camera flies forward down the tunnel, rolling
  const fly = eIO(pr(f, 22, 128));
  const camZ = mix(0, 11000, fly);
  const roll = mix(0, 70, fly);
  const core = eIn(pr(f, 96, 54));
  const flash = clamp((f - 138) / 10);
  const h = hand(f, 1.5);
  const bars = Array.from({ length: 150 }, (_, i) => {
    const k = Math.floor(i / 6), j = i % 6;
    const a = j * (Math.PI / 3) + k * 0.43;
    const R = 760 + rnd(i) * 260;
    return { i, a, R, z: -(k + 1) * 380 - rnd(i, 2) * 200, txt: QS[(i * 7) % QS.length], tone: i % 5 === 0 ? 1 : i % 3 === 0 ? 2 : 0 };
  });
  return (
    <Frame bg={K.ink}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, rgba(30,90,232,${0.15 + core * 0.5}) 0%, rgba(9,9,11,0) ${30 + core * 30}%)` }} />
      <div style={{ position: "absolute", inset: 0, transform: `rotate(${roll}deg) translate(${h.x}px,${h.y}px)`, transformOrigin: "960px 540px" }}>
        <Cam z={camZ} p={1100}>
          {bars.map((b) => {
            const d = b.z + camZ;
            if (d > 600 || d < -7000) return null;
            const near = clamp((d + 900) / 1200);
            const o = clamp((d + 7000) / 2500) * (1 - clamp((d - 300) / 300));
            return (
              <At key={b.i} x={960 + Math.cos(b.a) * b.R - 300} y={540 + Math.sin(b.a) * b.R - 50} z={b.z} w={600} h={100} rz={(b.a * 180) / Math.PI + 90} o={o * (f < 18 ? 0 : clamp((f - 18) / 10))} blur={near * 10}
                style={{ borderRadius: 50, background: b.tone === 1 ? K.blue : b.tone === 2 ? "#ffffff" : "#16181F", color: b.tone === 2 ? K.text : "#fff", display: "flex", alignItems: "center", gap: 18, padding: "0 30px", boxShadow: b.tone === 1 ? `0 0 40px ${K.blue}` : "0 0 0 1px #ffffff14", fontWeight: 600, fontSize: 30, whiteSpace: "nowrap", overflow: "hidden" }}>
                <Icon name="search" size={30} color={b.tone === 2 ? "#9AA0AE" : "#ffffff88"} />{b.txt}
              </At>
            );
          })}
        </Cam>
      </div>
      <Core x={960} y={540} r={mix(60, 1400, core)} intensity={0.4 + core * 0.6} />
      {/* the hero bar: macro → normal → recedes into the tunnel as bar zero */}
      {f < 46 && (
        <div style={{ position: "absolute", inset: 0, transformOrigin: `${caretX}px 540px`, transform: `scale(${macro * mix(1, 0.03, eIn(pr(f, 24, 20)))})`, filter: pull < 0.95 ? `blur(${(1 - pull) * 6}px)` : undefined, opacity: 1 - clamp((f - 38) / 6) }}>
          <div style={{ position: "absolute", left: 960 - 650, top: 540 - 70, width: 1300, height: 140, ...card, borderRadius: 70, display: "flex", alignItems: "center", padding: "0 0 0 46px", gap: 24, boxShadow: `0 0 0 3px ${K.blue}, 0 0 120px ${K.blue}88` }}>
            <Icon name="search" size={44} color="#9AA0AE" />
            <span style={{ fontWeight: 600, fontSize: 54, letterSpacing: "-0.02em", color: K.text, whiteSpace: "nowrap" }}>{n}</span>
            <span style={{ width: 5, height: 64, background: K.blue, marginLeft: -18, opacity: Math.floor(f / 5) % 2 || n.length < Q.length ? 1 : 0 }} />
          </div>
        </div>
      )}
      <div style={{ position: "absolute", left: 110, top: 380, color: "#fff", ...H, fontSize: 132, lineHeight: 1.0, opacity: 1 - clamp((f - 112) / 10), zIndex: 2 }}>
        <div style={{ fontWeight: 600, fontSize: 64, letterSpacing: "-0.03em" }}><W f={f} at={34}>Every day,</W></div>
        <div><W f={f} at={46}>buyers ask</W> <Box f={f} at={56} bg={K.blue}><W f={f} at={54}>AI</W></Box></div>
        <div style={{ color: "#9DB6F5" }}><W f={f} at={72}>who to choose.</W></div>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash }} />
    </Frame>
  );
}

/* ---------- 150–300 · three names fly out of the core onto lit pedestals; your hologram shatters ---------- */
const PEDS = [
  { x: 180, y: 520, hgt: 200, name: "Atlas", at: 20 },
  { x: 700, y: 400, hgt: 300, name: "Northstar", at: 8 },
  { x: 1220, y: 520, hgt: 160, name: "Pipewell", at: 32 },
  { x: 1740, y: 640, hgt: 120, name: "Your brand", at: -1 },
];
export function Stage({ f, named = false }: { f: number; named?: boolean }) {
  const flashIn = 1 - clamp(f / 8);
  const cam = {
    rx: kf(f, [[0, 70], [60, 74], [150, 76]]),
    ry: kf(f, [[0, 22], [70, -8], [150, -14]]),
    rz: kf(f, [[0, -3], [150, 2]]),
    z: kf(f, [[0, 0], [60, 260], [100, 380], [150, 470]]),
    x: kf(f, [[0, -40], [70, -60], [104, 900], [150, 960]], eIO),
    y: kf(f, [[0, -40], [60, 20], [150, 120]]),
  };
  const sh = shakeAt(f, 8, 1.1), sh2 = shakeAt(f, 20, 0.6), sh3 = shakeAt(f, 32, 0.6);
  const shatter = !named && f >= 112;
  const holo = Math.floor(f / 2) % 5 === 0 ? 0.35 : 1;
  return (
    <Frame bg={K.ink}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 50% 0%, #10204A 0%, #09090B 60%)" }} />
      <Cam rx={cam.rx} ry={cam.ry} rz={cam.rz} z={cam.z} x={cam.x + sh.x + sh2.x + sh3.x} y={cam.y + sh.y} p={1300}>
        {/* floor: grid + light pools */}
        <At x={-1500} y={-1500} w={5000} h={4000} style={{ backgroundImage: "linear-gradient(#ffffff0b 2px, transparent 2px), linear-gradient(90deg, #ffffff0b 2px, transparent 2px)", backgroundSize: "120px 120px", maskImage: "radial-gradient(circle at 50% 55%, #000 15%, transparent 55%)", WebkitMaskImage: "radial-gradient(circle at 50% 55%, #000 15%, transparent 55%)" }} />
        {PEDS.map((p, i) => (
          <At key={`pool${i}`} x={p.x - 260} y={p.y - 240} w={840} h={800} style={{ borderRadius: "50%", background: `radial-gradient(circle, ${i === 3 && !named ? "#FF4D5E33" : "#3E78F555"} 0%, transparent 65%)` }} />
        ))}
        {PEDS.map((p, i) => {
          const me = i === 3;
          const rise = bOut(pr(f, me ? 70 : p.at - 6, 16), 1.3);
          return (
            <div key={p.name} style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
              <Pedestal x={p.x} y={p.y} w={320} l={320} hgt={p.hgt * rise} top={me ? (named ? "#5B8BFF" : "#22242C") : "#5B8BFF"} side={me ? (named ? "#1546BE" : "#14151A") : "#1546BE"} front={me ? (named ? K.blue : "#1A1B21") : K.blue}>
                <div style={{ position: "absolute", left: 22, bottom: 18, fontFamily: MONO, fontSize: 22, color: "#ffffffaa" }}>0{me ? 4 : [2, 1, 3][i]}</div>
              </Pedestal>
            </div>
          );
        })}
        {/* names flying out of the core (far back, high) to stand on the pedestals */}
        {PEDS.slice(0, named ? 4 : 3).map((p, i) => {
          const at = named && i === 3 ? 40 : p.at;
          const q = eOut(pr(f, at, 14));
          if (f < at) return null;
          const x = mix(960, p.x + 160, q), y = mix(-2400, p.y + 160, q), z = mix(1400, p.hgt, q);
          const me = i === 3;
          return (
            <At key={p.name} x={x - 400} y={y - 160} z={z} w={800} h={160} origin="50% 100%" style={{ transform: `translateZ(${z}px) rotateX(-90deg)`, display: "flex", justifyContent: "center", alignItems: "flex-end" }}>
              <XWord text={p.name} size={me ? 150 : 140} front={me ? "#fff" : "#fff"} side={me ? K.green : K.blueDeep} depth={60} />
            </At>
          );
        })}
        {/* your hologram on the empty pedestal */}
        {!named && !shatter && f >= 74 && (
          <At x={PEDS[3].x + 160 - 340} y={PEDS[3].y + 160 - 170} w={680} h={170} origin="50% 100%" style={{ transform: `translateZ(${PEDS[3].hgt}px) rotateX(-90deg)`, opacity: holo * clamp((f - 74) / 6), display: "flex", justifyContent: "center", alignItems: "flex-end" }}>
            <div style={{ fontWeight: 800, fontSize: 150, letterSpacing: "-0.05em", color: "transparent", WebkitTextStroke: "4px #FF6B7A", backgroundImage: "repeating-linear-gradient(0deg, #FF6B7A44 0 3px, transparent 3px 7px)", WebkitBackgroundClip: "text", whiteSpace: "nowrap", lineHeight: 1, filter: "drop-shadow(0 0 18px #FF4D5E)" }}>Your brand</div>
          </At>
        )}
      </Cam>
      {/* shatter: the hologram explodes into particles (screen space, centred where the camera framed it) */}
      {shatter && <Particles n={260} from={(i) => [740 + rnd(i) * 440, 330 + rnd(i, 2) * 120]} to={(i) => [960 + (rnd(i, 4) - 0.5) * 2200, 420 + (rnd(i, 5) - 0.5) * 1300]} q={(i) => eOut(pr(f, 112 + rnd(i, 6) * 6, 30))} color={rnd(0) > 2 ? "#fff" : "#FF6B7A"} size={12} />}
      <div style={{ position: "absolute", left: 100, top: 880, color: "#fff", ...H, fontSize: 110, zIndex: 2 }}>
        {named ? (
          <><W f={f} at={44}>Now it</W> <W f={f} at={50} style={{ color: K.green }}>names you.</W></>
        ) : f < 76 ? (
          <><W f={f} at={10}>AI picks</W> <W f={f} at={18} style={{ color: "#8FB3FF" }}>three.</W></>
        ) : (
          <><W f={f} at={78}>You're not</W> <W f={f} at={86} style={{ color: "#FF6B7A" }}>one of them.</W></>
        )}
      </div>
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flashIn }} />
    </Frame>
  );
}

/* ---------- 300–420 · particles swirl and fuse into the extruded ring; Meet BrandPulse on the drop ---------- */
export function Fuse({ f }: { f: number }) {
  const R = 190;
  const ringPt = (i: number): [number, number] => { const a = ((i / 260) * 300 - 90 + 66) * (Math.PI / 180); return [960 + Math.cos(a) * R, 470 + Math.sin(a) * R]; };
  const gather = (i: number) => eIO(pr(f, rnd(i, 8) * 10, 34));
  const solid = eOut(pr(f, 36, 10));
  const spin = kf(f, [[30, 70], [70, -8], [120, 0]], eOut);
  const ignite = pr(f, 56, 10);
  const slide = eIO(pr(f, 46, 18));
  return (
    <Frame bg={K.ink}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 44%, rgba(30,90,232,${0.25 + solid * 0.3}) 0%, rgba(9,9,11,0) 45%)` }} />
      {solid < 1 && (
        <div style={{ opacity: 1 - solid }}>
          <Particles n={260} from={(i) => [960 + (rnd(i, 4) - 0.5) * 2200, 420 + (rnd(i, 5) - 0.5) * 1300]} to={ringPt} q={gather} color="#8FB3FF" size={12} />
        </div>
      )}
      <div style={{ position: "absolute", left: mix(960, 560, slide) - 210, top: 470 - 210, width: 420, height: 420, perspective: 1200, opacity: solid }}>
        <div style={{ width: 420, height: 420, transformStyle: "preserve-3d", transform: `rotateY(${spin}deg) rotateX(${spin * 0.25}deg) scale(${mix(1, 0.78, slide)})` }}>
          <Extrude front={K.blue2} side={K.blueDeep} depth={70} layers={20}>
            <Mark size={420} ring="currentColor" dot={0} />
          </Extrude>
          <div style={{ position: "absolute", left: 420 * 0.711 - 40, top: 420 * 0.249 - 40, width: 80, height: 80, borderRadius: "50%", background: K.green, transform: `translateZ(10px) scale(${bOut(ignite)})`, boxShadow: `0 0 ${80 * ignite}px ${30 * ignite}px ${K.green}aa` }} />
        </div>
      </div>
      {ignite > 0 && ignite < 1 && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 63% 30%, rgba(31,197,138,${(1 - ignite) * 0.6}) 0%, transparent 50%)` }} />}
      <div style={{ position: "absolute", left: 830, top: 330, color: "#fff", zIndex: 2, opacity: clamp((f - 60) / 4) }}>
        <div style={{ fontWeight: 600, fontSize: 80, letterSpacing: "-0.03em" }}><W f={f} at={60}>Meet</W></div>
        <div style={{ ...H, fontSize: 230 }}><Build f={f} at={66} text="BrandPulse" step={1.1} /><W f={f} at={78} style={{ color: K.green }}>.</W></div>
      </div>
    </Frame>
  );
}

export const OPEN: [number, number, (p: { f: number }) => ReactNode][] = [[0, 150, Hook], [150, 300, Stage], [300, 420, Fuse]];
export const Named = ({ f }: { f: number }) => <Stage f={f} named />;
export { Extrude };
