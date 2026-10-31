import { type CSSProperties } from "react";
import { chapters, shots, type Shot, type Pose } from "../production";
import { Opening } from "./Opening";
import { Absence } from "./Absence";
import { Reveal } from "./Reveal";
import { Intent } from "./Intent";
import { Proof } from "./Proof";
import { Intervention } from "./Intervention";
import { Recheck } from "./Recheck";
import { Engine } from "./Engine";
import { Provenance } from "./Provenance";
import { Entry } from "./Entry";
import { Close } from "./Close";
import { mix, smooth } from "./kit";
import words from "../voiceover-words.json";
import { VoiceContext } from "./voice-clock";
const components = {
  hook: Opening,
  problem: Absence,
  reveal: Reveal,
  intent: Intent,
  evidence: Proof,
  action: Intervention,
  recheck: Recheck,
  engine: Engine,
  provenance: Provenance,
  entry: Entry,
  close: Close,
};
export function SceneAt({
  time,
  chapterId,
}: {
  time: number;
  chapterId?: string;
}) {
  const section =
    chapters.find((c) =>
      chapterId ? c.id === chapterId : time >= c.start && time < c.end,
    ) ?? chapters[chapters.length - 1];
  const local = Math.min(
    section.end - section.start,
    Math.max(0, time - section.start),
  );
  const ratio = section.sourceDuration / (section.end - section.start);
  const Scene = components[section.id];
  return (
    <VoiceContext.Provider
      value={{
        time,
        sourceTime: local * ratio,
        chapterStart: section.start,
        chapterEnd: section.end,
        ratio,
      }}
    >
      <Scene t={local * ratio} />
    </VoiceContext.Provider>
  );
}
function poseAt(s: Shot, time: number): Pose {
  const q = smooth(
    Math.min(1, Math.max(0, (time - s.start) / (s.end - s.start))),
  );
  const driftX = Math.sin(time * 1.31) * 1.6 + Math.sin(time * 2.37) * 0.6,
    driftY = Math.cos(time * 1.17) * 1.2;
  return {
    x: mix(s.from.x, s.to.x, q) + driftX,
    y: mix(s.from.y, s.to.y, q) + driftY,
    scale: mix(s.from.scale, s.to.scale, q),
    yaw: mix(s.from.yaw, s.to.yaw, q) + Math.sin(time * 0.53) * 0.16,
    pitch: mix(s.from.pitch, s.to.pitch, q),
    roll: mix(s.from.roll, s.to.roll, q) + Math.sin(time * 0.83) * 0.045,
  };
}
function World({
  shot,
  time,
  style = {},
}: {
  shot: Shot;
  time: number;
  style?: CSSProperties;
}) {
  const c = poseAt(shot, time);
  const nearWord = words.find((w) => time >= w.start && time < w.start + 0.09);
  const hit = nearWord
    ? Math.sin((Math.PI * (time - nearWord.start)) / 0.09) * 0.0018
    : 0;
  return (
    <div className="v3-camera-world" style={style}>
      <div
        style={{
          position: "absolute",
          inset: -65,
          transformOrigin: "center",
          transform: `perspective(2600px) translate3d(${c.x}px,${c.y}px,0) rotateX(${c.pitch}deg) rotateY(${c.yaw}deg) rotateZ(${c.roll}deg) scale(${c.scale + hit})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 65,
            top: 65,
            width: 1920,
            height: 1080,
          }}
        >
          <SceneAt time={time} chapterId={shot.chapter} />
        </div>
      </div>
    </div>
  );
}
function Foreground({ time }: { time: number }) {
  const lane = (time % 3) / 3;
  const dark = ["hook", "problem", "action", "engine", "provenance"].includes(
    (chapters.find((c) => time >= c.start && time < c.end) ?? chapters[0]).id,
  );
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 80,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -420 + lane * 110,
          top: -280,
          width: 470,
          height: 1700,
          background: dark
            ? "linear-gradient(90deg,#010714E0,#19345222)"
            : "linear-gradient(90deg,#82ACEA55,#FFFFFF88)",
          borderRight: `2px solid ${dark ? "#608BD13F" : "#FFFFFFCC"}`,
          transform: `rotate(-18deg) translateY(${Math.sin(time * 0.9) * 24}px)`,
          filter: "blur(14px)",
          opacity: 0.46,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -430 + Math.sin(time * 0.33) * 35,
          top: -220,
          width: 460,
          height: 1550,
          background: dark
            ? "linear-gradient(90deg,transparent,#010816)"
            : "linear-gradient(90deg,transparent,#9FC0EC99)",
          borderLeft: `1px solid ${dark ? "#9FCBFF40" : "#FFFFFF99"}`,
          transform: `rotate(16deg) translateY(${Math.cos(time * 0.8) * 28}px)`,
          filter: "blur(16px)",
          opacity: 0.4,
        }}
      />
    </div>
  );
}
export function DirectedFilm({ frame }: { frame: number }) {
  const time = Math.min(59.999, Math.max(0, frame / 30));
  const shot =
    shots.find((s) => time >= s.start && time < s.end) ??
    shots[shots.length - 1];
  const index = shots.indexOf(shot),
    next = shots[index + 1];
  const cutDuration = 6 / 30;
  const transitioning = !!next && time >= shot.end - cutDuration;
  const q = transitioning
    ? smooth((time - (shot.end - cutDuration)) / (5 / 30))
    : 0;
  const nextTime = next ? Math.max(time, next.start) : time;
  const type = shot.out;
  let outgoing: CSSProperties = {},
    incoming: CSSProperties = {};
  const active = transitioning;
  if (active) {
    if (type === "whip") {
      outgoing = {
        transform: `translateX(${-q * 1920}px)`,
        filter: q < 1 ? `url(#v3-motion-x)` : "none",
      };
      incoming = {
        transform: `translateX(${(1 - q) * 1920}px)`,
        filter: q < 1 ? `url(#v3-motion-x)` : "none",
      };
    } else if (type === "zoom") {
      outgoing = { transform: `scale(${1 + q * 2.5})`, opacity: 1 - q };
      incoming = { transform: `scale(${1.24 - 0.24 * q})`, opacity: q };
    } else if (type === "blade") {
      incoming = {
        clipPath: `polygon(0 0,${q * 210}% 0,${q * 210 - 100}% 100%,0 100%)`,
      };
      outgoing = { transform: `translateX(${-q * 30}px)` };
    } else if (type === "split") {
      outgoing = {
        transform: `translateY(${-q * 100}px) rotate(${-q * 2}deg)`,
      };
      incoming = {
        clipPath: `polygon(0 0,100% 0,100% ${q * 210 - 100}%,0 ${q * 210}%)`,
        transform: `translateY(${(1 - q) * 50}px)`,
      };
    } else if (type === "iris") {
      incoming = { clipPath: `circle(${q * 2300}px at 50% 50%)` };
      outgoing = { transform: `scale(${1 + 0.16 * q})` };
    } else {
      outgoing = { opacity: 1 - q };
      incoming = { opacity: q };
    }
  }
  return (
    <div className="film-stage v3-directed">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="v3-motion-x" x="-30%" y="-10%" width="160%" height="120%">
          <feGaussianBlur
            stdDeviation={`${active && type === "whip" ? Math.sin(q * Math.PI) * 10 : 0} 0.2`}
          />
        </filter>
      </svg>
      <World shot={shot} time={time} style={outgoing} />
      {active && next && <World shot={next} time={nextTime} style={incoming} />}
      <Foreground time={active && q >= 1 ? nextTime : time} />
    </div>
  );
}
