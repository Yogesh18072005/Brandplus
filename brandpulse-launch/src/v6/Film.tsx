import { useEffect, useState, type ReactNode } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import "../style.css";
import { ACT_A } from "./actA";
import { ACT_B } from "./actB";
import { ACT_C } from "./actC";
import { R10, R11 } from "./actR";
import { N1, N2, N3, N4, N5, N6, N7 } from "./actN";

const SWAP: Record<number, (p: { f: number }) => ReactNode> = { 60: N1, 400: N2, 550: N3, 720: R10, 780: R11, 885: N4, 1135: N5, 1310: N6, 1620: N7 };
export const SCENES: [number, number, (p: { f: number }) => ReactNode][] = [...ACT_A, ...ACT_B, ...ACT_C].map(([a, b, C]) => [a, b, SWAP[a] ?? C]);
export const TOTAL = SCENES[SCENES.length - 1][1];

function Fonts() {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => { Promise.all([document.fonts.load("800 50px Manrope"), document.fonts.load("600 50px Manrope"), document.fonts.load("500 50px Manrope"), document.fonts.load("400 20px Plex")]).then(() => continueRender(h)); }, [h]);
  return null;
}
export function FilmV6({ audio = true }: { audio?: boolean }) {
  const frame = useCurrentFrame();
  const [s, , Scene] = SCENES.find(([a, b]) => frame >= a && frame < b) ?? SCENES[SCENES.length - 1];
  // cut smoothing: 2 frames either side of every boundary get a directional smear and a small scale punch
  const d = Math.min(...SCENES.slice(1).map(([a]) => Math.abs(frame + 0.5 - a)));
  const k = d < 2.5 ? 1 - d / 2.5 : 0;
  return (
    <AbsoluteFill style={{ background: "#09090B" }}>
      <Fonts />
      <div style={{ position: "absolute", inset: 0, filter: k ? `blur(${k * 7}px)` : undefined, transform: k ? `scale(${1 + k * 0.035})` : undefined }}>
        <Scene f={frame - s} />
      </div>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(130% 110% at 50% 50%, transparent 60%, rgba(0,0,0,.28) 100%)" }} />
      {audio && <Audio src={staticFile("v6/mix.wav")} />}
    </AbsoluteFill>
  );
}
export const FilmV6Silent = () => <FilmV6 audio={false} />;
