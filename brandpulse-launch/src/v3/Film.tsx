import { useEffect, useState, type CSSProperties, type FC } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import "../style.css";
import { clamp, cubicInOut, expoIn, expoOut, mix } from "./lib";
import { S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, type ShotProps } from "./shotsA";
import { S11, S12, S13, S14, S15, S16, S17, S18 } from "./shotsB";
import { S19, S20, S21, S22, S23, S24, S25 } from "./shotsC";

export type Cut = "whip" | "blade" | "match" | "glitch" | "split" | "flash" | "zoom" | "iris" | "end";
export type ShotDef = { id: string; from: number; to: number; C: FC<ShotProps>; out: Cut; flash?: string; blade?: string };

/* frame table — 30 fps; cuts sit on the 15-frame beat grid or on a VO word */
export const SHOTS: ShotDef[] = [
  { id: "S01 question", from: 0, to: 45, C: S01, out: "whip" },
  { id: "S02 loading", from: 45, to: 105, C: S02, out: "blade", blade: "#1E5AE8" },
  { id: "S03 three names", from: 105, to: 150, C: S03, out: "match" },
  { id: "S04 not mentioned", from: 150, to: 180, C: S04, out: "glitch" },
  { id: "S05 none are you", from: 180, to: 210, C: S05, out: "split" },
  { id: "S06 never know", from: 210, to: 255, C: S06, out: "flash", flash: "#ffffff" },
  { id: "S07 zero of ten", from: 255, to: 315, C: S07, out: "zoom" },
  { id: "S08 dot chase", from: 315, to: 360, C: S08, out: "iris" },
  { id: "S09 meet", from: 360, to: 420, C: S09, out: "zoom" },
  { id: "S10 gap found", from: 420, to: 480, C: S10, out: "blade", blade: "#0A1222" },
  { id: "S11 we ask AI", from: 480, to: 515, C: S11, out: "zoom" },
  { id: "S12 question fan", from: 515, to: 645, C: S12, out: "match" },
  { id: "S13 capture terminal", from: 645, to: 720, C: S13, out: "whip" },
  { id: "S14 sources ride", from: 720, to: 810, C: S14, out: "iris" },
  { id: "S15 head to head", from: 810, to: 862, C: S15, out: "split" },
  { id: "S16 why quote", from: 862, to: 975, C: S16, out: "blade", blade: "#1FC58A" },
  { id: "S17 fix route", from: 975, to: 1080, C: S17, out: "whip" },
  { id: "S18 recheck", from: 1080, to: 1140, C: S18, out: "flash", flash: "#1E5AE8" },
  { id: "S19 real answers", from: 1140, to: 1205, C: S19, out: "whip" },
  { id: "S20 side by side", from: 1205, to: 1280, C: S20, out: "zoom" },
  { id: "S21 re-checked", from: 1280, to: 1350, C: S21, out: "blade", blade: "#0A1222" },
  { id: "S22 proof grid", from: 1350, to: 1410, C: S22, out: "flash", flash: "#ffffff" },
  { id: "S23 free audit", from: 1410, to: 1495, C: S23, out: "whip" },
  { id: "S24 no account", from: 1495, to: 1620, C: S24, out: "zoom" },
  { id: "S25 brand", from: 1620, to: 1800, C: S25, out: "end" },
];
export const TOTAL = 1800;
const T = 8; // transition length in frames, centred on the cut

function Shot({ s, frame, style }: { s: ShotDef; frame: number; style?: CSSProperties }) {
  const f = frame - s.from;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
      <s.C f={f} d={s.to - s.from} />
    </div>
  );
}

/** renders the shot(s) visible at a frame, with the designed transition between them */
export function Director({ frame }: { frame: number }) {
  const i = SHOTS.findIndex((s) => frame >= s.from && frame < s.to);
  const idx = i < 0 ? SHOTS.length - 1 : i;
  const cur = SHOTS[idx];
  // are we in the window around the cut that ends `cur` or the one that started it?
  let a = cur, b: ShotDef | undefined, q = -1;
  if (SHOTS[idx + 1] && frame >= cur.to - T / 2) {
    b = SHOTS[idx + 1];
    q = (frame - (cur.to - T / 2)) / T;
  } else if (idx > 0 && frame < cur.from + T / 2) {
    a = SHOTS[idx - 1];
    b = cur;
    q = (frame - (cur.from - T / 2)) / T;
  }
  if (!b || q < 0) return <Shot s={cur} frame={frame} />;
  q = clamp(q);
  const type = a.out;
  const e = cubicInOut(q);
  const blurX = Math.sin(q * Math.PI) * 60;
  if (type === "whip") {
    return (
      <>
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id="whipblur" x="-20%" y="0" width="140%" height="100%"><feGaussianBlur stdDeviation={`${blurX} 0`} /></filter>
        </svg>
        <Shot s={a} frame={frame} style={{ transform: `translateX(${-e * 1920}px)`, filter: "url(#whipblur)" }} />
        <Shot s={b} frame={frame} style={{ transform: `translateX(${(1 - e) * 1920}px)`, filter: "url(#whipblur)" }} />
      </>
    );
  }
  if (type === "blade") {
    const x = mix(-700, 2600, e);
    const poly = `polygon(${x}px 0, ${x - 600}px 1080px, -2000px 1080px, -2000px 0)`;
    return (
      <>
        <Shot s={a} frame={frame} style={{ transform: `translateX(${-e * 120}px)` }} />
        <Shot s={b} frame={frame} style={{ clipPath: poly }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: x - 600, width: 900, background: a.blade ?? "#1E5AE8", clipPath: `polygon(600px 0, 780px 0, 180px 1080px, 0 1080px)` }} />
      </>
    );
  }
  if (type === "match") {
    const before = frame < a.to;
    return before
      ? <Shot s={a} frame={frame} style={{ transform: `scale(${1 + expoIn(q * 2) * 0.05})` }} />
      : <Shot s={b} frame={frame} style={{ transform: `scale(${mix(0.96, 1, expoOut((q - 0.5) * 2))})` }} />;
  }
  if (type === "glitch") {
    const before = frame < a.to;
    const s = before ? a : b;
    const k = Math.floor(frame * 7.13) % 5;
    const amp = Math.sin(q * Math.PI) * 60;
    return (
      <>
        <Shot s={s} frame={frame} />
        {[0, 1, 2, 3, 4].map((j) => (
          <div key={j} style={{ position: "absolute", left: 0, right: 0, top: ((j * 211 + k * 97) % 1000), height: 40 + ((j * 37 + k * 13) % 90), overflow: "hidden", mixBlendMode: "screen" }}>
            <div style={{ position: "absolute", left: 0, top: -((j * 211 + k * 97) % 1000), width: 1920, height: 1080, transform: `translateX(${(j % 2 ? 1 : -1) * amp}px)`, filter: "hue-rotate(-40deg) saturate(3)", opacity: 0.85 }}>
              <s.C f={frame - s.from} d={s.to - s.from} />
            </div>
          </div>
        ))}
        <div style={{ position: "absolute", inset: 0, background: "#FF4D5E", mixBlendMode: "multiply", opacity: Math.sin(q * Math.PI) * 0.35 }} />
      </>
    );
  }
  if (type === "split") {
    const xt = mix(2500, -700, e);
    return (
      <>
        <Shot s={a} frame={frame} style={{ transform: `translate(${-e * 260}px, ${e * 60}px) rotate(${-e * 2}deg)` }} />
        <Shot s={b} frame={frame} style={{ clipPath: `polygon(${xt}px 0, 2600px 0, 2600px 1080px, ${xt - 620}px 1080px)` }} />
        <div style={{ position: "absolute", left: xt - 620, top: 0, width: 640, height: 1080, pointerEvents: "none" }}>
          <svg width={640} height={1080}><line x1={620} y1={0} x2={0} y2={1080} stroke="#fff" strokeWidth={8} /></svg>
        </div>
      </>
    );
  }
  if (type === "flash") {
    const before = frame < a.to;
    return (
      <>
        {before ? <Shot s={a} frame={frame} style={{ transform: `scale(${1 + q * 0.06})` }} /> : <Shot s={b} frame={frame} />}
        <div style={{ position: "absolute", inset: 0, background: a.flash ?? "#fff", opacity: Math.pow(Math.sin(q * Math.PI), 0.6) }} />
      </>
    );
  }
  if (type === "zoom") {
    const out = expoIn(q);
    return (
      <>
        <Shot s={b} frame={frame} style={{ transform: `scale(${mix(0.55, 1, expoOut(q))})`, opacity: clamp(q * 2.2) }} />
        <Shot s={a} frame={frame} style={{ transform: `scale(${1 + out * 7})`, opacity: 1 - clamp((q - 0.45) * 3), filter: `blur(${out * 10}px)` }} />
      </>
    );
  }
  if (type === "iris") {
    return (
      <>
        <Shot s={a} frame={frame} style={{ transform: `scale(${1 + e * 0.12})` }} />
        <Shot s={b} frame={frame} style={{ clipPath: `circle(${expoIn(q) * 1250}px at 50% 52%)` }} />
      </>
    );
  }
  return <Shot s={cur} frame={frame} />;
}

function Fonts() {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all([document.fonts.load("800 50px Manrope"), document.fonts.load("300 50px Manrope"), document.fonts.load("400 20px Plex")]).then(() => continueRender(h));
  }, [h]);
  return null;
}

export function LaunchV3() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#040914", fontFamily: "Manrope, sans-serif", overflow: "hidden" }}>
      <Fonts />
      <Director frame={frame} />
      <Audio src={staticFile("v3/mix.wav")} />
    </AbsoluteFill>
  );
}
export function LaunchV3Silent() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#040914", fontFamily: "Manrope, sans-serif", overflow: "hidden" }}>
      <Fonts />
      <Director frame={frame} />
    </AbsoluteFill>
  );
}
