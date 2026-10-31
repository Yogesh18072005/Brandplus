import { Composition, Folder } from "remotion";
import { BrandPulseLaunch15 } from "./v8/Launch15";
import { LaunchV3, LaunchV3Silent } from "./v3/Film";
import { FilmV6, FilmV6Silent } from "./v6/Film";
import { FrameA, FrameB, FrameC } from "./v6/StyleFrames";
import { OpeningV4 } from "./v4/Opening";
import {
  Launch,
  HookPreview,
  GapPreview,
  BrandPreview,
  QuestionsPreview,
  EvidencePreview,
  ActionsPreview,
  RecheckPreview,
  LoopPreview,
  ProvenancePreview,
  EntryPreview,
  FinalPreview,
} from "./Composition";
export const RemotionRoot = () => (
  <>
    <Composition id="BrandPulse-Launch-15" component={BrandPulseLaunch15} durationInFrames={900} fps={60} width={1920} height={1080} />
    <Composition id="BrandPulse-V6-Final" component={FilmV6} durationInFrames={1800} fps={30} width={1920} height={1080} />
    <Composition id="Style-A-Glass" component={FrameA} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="Style-B-Editorial" component={FrameB} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="Style-C-Dark" component={FrameC} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="BrandPulse-V6" component={FilmV6Silent} durationInFrames={1800} fps={30} width={1920} height={1080} />
    <Composition id="BrandPulse-V4-Opening" component={OpeningV4} durationInFrames={420} fps={30} width={1920} height={1080} />
    <Composition id="BrandPulse-Launch-V3" component={LaunchV3} durationInFrames={1800} fps={30} width={1920} height={1080} />
    <Composition id="BrandPulse-Launch-V3-Silent" component={LaunchV3Silent} durationInFrames={1800} fps={30} width={1920} height={1080} />
    <Composition
      id="BrandPulse-Launch"
      component={Launch}
      durationInFrames={1800}
      fps={30}
      width={1920}
      height={1080}
    />
    <Folder name="Scenes">
      <Composition
        id="Hook"
        component={HookPreview}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Gap"
        component={GapPreview}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Brand"
        component={BrandPreview}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Questions"
        component={QuestionsPreview}
        durationInFrames={165}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Evidence"
        component={EvidencePreview}
        durationInFrames={165}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Actions"
        component={ActionsPreview}
        durationInFrames={165}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Recheck"
        component={RecheckPreview}
        durationInFrames={165}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Loop"
        component={LoopPreview}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Provenance"
        component={ProvenancePreview}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Free-entry"
        component={EntryPreview}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Final"
        component={FinalPreview}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
    </Folder>
  </>
);
