import { useEffect, useState, type ReactNode } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import "../style.css";
import { OPEN } from "./open";

export const SCENES: [number, number, (p: { f: number }) => ReactNode][] = [...OPEN];

function Fonts() {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => { Promise.all([document.fonts.load("800 50px Manrope"), document.fonts.load("600 50px Manrope"), document.fonts.load("500 50px Manrope"), document.fonts.load("400 20px Plex")]).then(() => continueRender(h)); }, [h]);
  return null;
}
export function FilmV7({ audio = true }: { audio?: boolean }) {
  const frame = useCurrentFrame();
  const [s, , Scene] = SCENES.find(([a, b]) => frame >= a && frame < b) ?? SCENES[SCENES.length - 1];
  return (
    <AbsoluteFill style={{ background: "#09090B" }}>
      <Fonts />
      <Scene f={frame - s} />
      {audio && <Audio src={staticFile("v7/mix.wav")} />}
    </AbsoluteFill>
  );
}
export const FilmV7Silent = () => <FilmV7 audio={false} />;
