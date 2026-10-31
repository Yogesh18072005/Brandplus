/* V5 3D kit: deterministic camera, studio lighting, reflective floor, glossy brand materials, post FX. */
import { useMemo, useRef, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial, RoundedBox, Text } from "@react-three/drei";
import { EffectComposer, Bloom, DepthOfField, Vignette, Noise, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { continueRender, delayRender, staticFile } from "remotion";

export const FPS = 30;
export const COL = {
  ink: "#07080B",
  blue: "#1E5AE8",
  blueHi: "#4C86FF",
  mint: "#A9FFDF",
  green: "#1FC58A",
  red: "#FF3346",
  paper: "#F4F5F2",
};
export const FONT = {
  x: staticFile("v5/fonts/manrope-latin-800-normal.woff"),
  b: staticFile("v5/fonts/manrope-latin-700-normal.woff"),
  m: staticFile("v5/fonts/manrope-latin-500-normal.woff"),
};

/* easing */
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const pr = (f: number, s: number, d: number) => clamp((f - s) / d);
export const eOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
export const eIn = (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * clamp(t) - 10));
export const eIO = (t: number) => { t = clamp(t); return t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2; };
export const bOut = (t: number, s = 1.8) => { t = clamp(t); return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
/** damped spring 0→1 with overshoot */
export const spring = (f: number, s: number, k = 9, d = 0.32) => {
  const t = Math.max(0, (f - s) / FPS);
  return 1 - Math.exp(-t * k * d * 2) * Math.cos(t * k);
};

/* camera keyframes: position + look-at target + fov */
export type Cam = { p: [number, number, number]; t: [number, number, number]; fov?: number; roll?: number };
export function camAt(keys: [number, Cam][], f: number, ease = eIO): Cam {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, b] = keys[i], [f0, a] = keys[i - 1];
    if (f <= f1) {
      const q = ease((f - f0) / (f1 - f0));
      const v = (x: number[], y: number[]) => x.map((n, j) => mix(n, y[j], q)) as [number, number, number];
      return { p: v(a.p, b.p), t: v(a.t, b.t), fov: mix(a.fov ?? 35, b.fov ?? 35, q), roll: mix(a.roll ?? 0, b.roll ?? 0, q) };
    }
  }
  return keys[keys.length - 1][1];
}
/** applies a camera pose every frame, with a subtle handheld drift */
export function Rig({ cam, f, shake = 0 }: { cam: Cam; f: number; shake?: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const t = f / FPS;
  const dx = Math.sin(t * 1.3) * 0.02 + Math.sin(t * 2.9) * 0.008 + Math.sin(f * 2.7) * shake * 0.06;
  const dy = Math.cos(t * 1.1) * 0.016 + Math.cos(f * 3.3) * shake * 0.05;
  camera.position.set(cam.p[0] + dx, cam.p[1] + dy, cam.p[2]);
  camera.lookAt(cam.t[0], cam.t[1], cam.t[2]);
  camera.rotateZ(((cam.roll ?? 0) * Math.PI) / 180);
  camera.fov = cam.fov ?? 35;
  camera.near = 0.05;
  camera.far = 200;
  camera.updateProjectionMatrix();
  return null;
}

/** studio light rig: soft key, rim, and lightformers so glossy materials have something to reflect */
export function Studio({ tint = COL.blue, intensity = 1, warm = false }: { tint?: string; intensity?: number; warm?: boolean }) {
  return (
    <>
      <ambientLight intensity={0.15 * intensity} />
      <directionalLight position={[4, 8, 6]} intensity={2.2 * intensity} color={warm ? "#fff3e6" : "#ffffff"} />
      <directionalLight position={[-6, 3, -4]} intensity={1.4 * intensity} color={tint} />
      <pointLight position={[0, -1, 3]} intensity={8 * intensity} distance={10} color={tint} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 5, -6]} scale={[12, 2, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={2} position={[-6, 1, 0]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} color={tint} />
        <Lightformer form="rect" intensity={1.5} position={[6, 1, 2]} rotation-y={-Math.PI / 2} scale={[8, 1, 1]} color="#ffffff" />
        <Lightformer form="ring" intensity={2} position={[0, 3, 6]} scale={3} color={COL.mint} />
      </Environment>
    </>
  );
}

/** glossy reflective floor that fades into fog */
export function Floor({ y = 0, color = "#0B0D12", mirror = 0.6 }: { y?: number; color?: string; mirror?: number }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y}>
      <planeGeometry args={[80, 80]} />
      <MeshReflectorMaterial
        resolution={1024}
        mirror={mirror}
        mixBlur={1.2}
        mixStrength={2.2}
        blur={[400, 120]}
        roughness={0.85}
        depthScale={0.6}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.2}
        color={color}
        metalness={0.6}
      />
    </mesh>
  );
}

/** post stack: bloom for emissive glow, depth of field on focus distance, grain, vignette */
export function Post({ focus = 6, bokeh = 3, bloom = 0.9, ca = 0.0006, children }: { focus?: number; bokeh?: number; bloom?: number; ca?: number; children?: ReactNode }) {
  const off = useMemo(() => new THREE.Vector2(ca, ca), [ca]);
  return (
    <EffectComposer multisampling={4}>
      <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={bokeh} target={undefined} worldFocusDistance={focus} worldFocusRange={2.5} />
      <Bloom intensity={bloom} luminanceThreshold={0.55} luminanceSmoothing={0.25} mipmapBlur />
      <ChromaticAberration offset={off} blendFunction={BlendFunction.NORMAL} radialModulation={false} modulationOffset={0} />
      <Noise opacity={0.045} premultiply />
      <Vignette offset={0.25} darkness={0.75} />
      <>{children}</>
    </EffectComposer>
  );
}

/* ---------- brand objects ---------- */
export const glossBlue = () => (
  <meshPhysicalMaterial color={COL.blue} metalness={0.35} roughness={0.12} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={1.6} />
);

/** the BrandPulse ring mark in 3D: a ~300° glossy torus arc with a glowing green dot */
export function RingMark({ draw = 1, dot = 1, scale = 1, dotGlow = 3 }: { draw?: number; dot?: number; scale?: number; dotGlow?: number }) {
  const arc = Math.max(0.001, (300 / 360) * Math.PI * 2 * clamp(draw));
  return (
    <group scale={scale}>
      {/* start the arc at the dot's position (upper right) and sweep clockwise-looking */}
      <group rotation-z={Math.PI * 0.33}>
        <mesh>
          <torusGeometry args={[1, 0.24, 48, 160, arc]} />
          {glossBlue()}
        </mesh>
      </group>
      <mesh position={[0.62, 0.86, 0.05]} scale={clamp(dot, 0, 2)}>
        <sphereGeometry args={[0.2, 48, 48]} />
        <meshStandardMaterial color={COL.green} emissive={COL.green} emissiveIntensity={dotGlow} roughness={0.2} />
      </mesh>
    </group>
  );
}

/** a frosted glass / white UI card with text on its face */
export function Card({
  w = 3, h = 1, r = 0.12, depth = 0.08, color = "#ffffff", children, glass = false, opacity = 1,
}: { w?: number; h?: number; r?: number; depth?: number; color?: string; children?: ReactNode; glass?: boolean; opacity?: number }) {
  return (
    <group>
      <RoundedBox args={[w, h, depth]} radius={Math.min(r, h / 2 - 0.001)} smoothness={6}>
        {glass ? (
          <meshPhysicalMaterial color={color} transmission={0.9} thickness={0.4} roughness={0.18} ior={1.4} clearcoat={1} transparent opacity={opacity} />
        ) : (
          <meshPhysicalMaterial color={color} roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.2} transparent={opacity < 1} opacity={opacity} />
        )}
      </RoundedBox>
      <group position-z={depth / 2 + 0.002}>{children}</group>
    </group>
  );
}

/** flat text on a card face / in space */
export function T({
  children, size = 0.2, color = "#0B0B0C", weight = "x", anchorX = "left", anchorY = "middle", position = [0, 0, 0], maxWidth, opacity = 1, letterSpacing = -0.04, emissive,
}: { children: string; size?: number; color?: string; weight?: "x" | "b" | "m"; anchorX?: "left" | "center" | "right"; anchorY?: "middle" | "top" | "bottom"; position?: [number, number, number]; maxWidth?: number; opacity?: number; letterSpacing?: number; emissive?: number }) {
  // hold the Remotion frame until troika has laid out this exact string
  const key = `${children}|${size}|${weight}|${maxWidth}`;
  const last = useRef<string | null>(null);
  const pending = useRef<number | null>(null);
  if (last.current !== key) {
    if (pending.current !== null) continueRender(pending.current);
    pending.current = delayRender(`text ${children.slice(0, 20)}`, { timeoutInMilliseconds: 60000 });
    last.current = key;
  }
  const onSync = () => {
    if (pending.current !== null) { continueRender(pending.current); pending.current = null; }
  };
  return (
    <Text onSync={onSync} font={FONT[weight]} fontSize={size} color={color} anchorX={anchorX} anchorY={anchorY} position={position} maxWidth={maxWidth} letterSpacing={letterSpacing} fillOpacity={opacity} lineHeight={1}>
      {children}
      {emissive ? <meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} /> : null}
    </Text>
  );
}
