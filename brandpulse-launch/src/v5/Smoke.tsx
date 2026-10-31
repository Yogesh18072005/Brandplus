import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Card, COL, Floor, Post, RingMark, Rig, Studio, T, camAt } from "./kit";
export function Smoke() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: COL.ink }}>
      <ThreeCanvas width={1920} height={1080} gl={{ antialias: true }} camera={{ fov: 35, position: [0, 1, 8] }}>
        <color attach="background" args={[COL.ink]} />
        <fog attach="fog" args={[COL.ink, 8, 22]} />
        <Rig f={f} cam={camAt([[0, { p: [-3, 1.6, 7], t: [0, 1, 0] }], [60, { p: [3, 1.2, 6], t: [0, 1, 0] }]], f)} />
        <Studio />
        <Floor />
        <group position={[-1.6, 1.3, 0]} rotation-y={0.25}><RingMark scale={0.9} /></group>
        <group position={[1.4, 1.1, 0.5]} rotation-y={-0.2}>
          <Card w={3.4} h={0.8}><T size={0.2} position={[-1.5, 0, 0]}>best CRM for a small team?</T></Card>
        </group>
        <Post focus={7} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
}
