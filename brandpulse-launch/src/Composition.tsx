import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
} from "remotion";
import "./style.css";
import "./v2/cinema.css";
import { DirectedFilm } from "./v2/Director";
function Fonts() {
  const [handle] = useState(() =>
    delayRender("Loading the local BrandPulse typefaces"),
  );
  useEffect(() => {
    Promise.all([
      document.fonts.load("500 50px Manrope"),
      document.fonts.load("400 20px Plex"),
    ]).then(() => continueRender(handle));
  }, [handle]);
  return null;
}
function DirectedChapter({ offset }: { offset: number }) {
  const frame = useCurrentFrame();
  return <DirectedFilm frame={frame + offset} />;
}
export function Launch() {
  return (
    <AbsoluteFill className="film-stage">
      <Fonts />
      <Sequence
        from={0}
        durationInFrames={180}
        name="01 · Into the answer field"
        premountFor={30}
      >
        <DirectedChapter offset={0} />
      </Sequence>
      <Sequence
        from={180}
        durationInFrames={180}
        name="02 · The unexplained gap"
        premountFor={30}
      >
        <DirectedChapter offset={180} />
      </Sequence>
      <Sequence
        from={360}
        durationInFrames={120}
        name="03 · Evidence connected"
        premountFor={30}
      >
        <DirectedChapter offset={360} />
      </Sequence>
      <Sequence
        from={480}
        durationInFrames={165}
        name="04 · Caret to buyer intent"
        premountFor={30}
      >
        <DirectedChapter offset={480} />
      </Sequence>
      <Sequence
        from={645}
        durationInFrames={165}
        name="05 · Source ride-along"
        premountFor={30}
      >
        <DirectedChapter offset={645} />
      </Sequence>
      <Sequence
        from={810}
        durationInFrames={165}
        name="06 · Evidence becomes action"
        premountFor={30}
      >
        <DirectedChapter offset={810} />
      </Sequence>
      <Sequence
        from={975}
        durationInFrames={165}
        name="07 · A comparable recheck"
        premountFor={30}
      >
        <DirectedChapter offset={975} />
      </Sequence>
      <Sequence
        from={1140}
        durationInFrames={180}
        name="08 · The connected engine"
        premountFor={30}
      >
        <DirectedChapter offset={1140} />
      </Sequence>
      <Sequence
        from={1320}
        durationInFrames={180}
        name="09 · Traceable evidence"
        premountFor={30}
      >
        <DirectedChapter offset={1320} />
      </Sequence>
      <Sequence
        from={1500}
        durationInFrames={180}
        name="10 · Ten-question entry"
        premountFor={30}
      >
        <DirectedChapter offset={1500} />
      </Sequence>
      <Sequence
        from={1680}
        durationInFrames={120}
        name="11 · Your next move"
        premountFor={30}
      >
        <DirectedChapter offset={1680} />
      </Sequence>
      <Audio
        src={staticFile("audio/brandpulse-final-mix.wav")}
        name="Neural VO + designed SFX · no music"
      />
    </AbsoluteFill>
  );
}
const Preview = ({ offset }: { offset: number }) => (
  <>
    <Fonts />
    <DirectedChapter offset={offset} />
  </>
);
export const HookPreview = () => <Preview offset={0} />;
export const GapPreview = () => <Preview offset={180} />;
export const BrandPreview = () => <Preview offset={360} />;
export const QuestionsPreview = () => <Preview offset={480} />;
export const EvidencePreview = () => <Preview offset={645} />;
export const ActionsPreview = () => <Preview offset={810} />;
export const RecheckPreview = () => <Preview offset={975} />;
export const LoopPreview = () => <Preview offset={1140} />;
export const ProvenancePreview = () => <Preview offset={1320} />;
export const EntryPreview = () => <Preview offset={1500} />;
export const FinalPreview = () => <Preview offset={1680} />;
