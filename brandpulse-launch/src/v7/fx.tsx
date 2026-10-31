/* v7 effects: extruded 3D type, particles, glow core, spotlights, pedestals. Pure functions of frame. */
import type { CSSProperties, ReactNode } from "react";
import { At, K, FONT, clamp, mix } from "../v6/kit";

export const rnd = (i: number, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

/** extruded type/object: N stacked copies receding in z; front face bright, sides darker */
export function Extrude({ children, depth = 60, layers = 16, front, side, style }: { children: ReactNode; depth?: number; layers?: number; front: string; side: string; style?: CSSProperties }) {
  return (
    <div style={{ position: "relative", transformStyle: "preserve-3d", ...style }}>
      {Array.from({ length: layers }, (_, i) => {
        const k = layers - 1 - i; // draw back to front
        const isFront = k === 0;
        return (
          <div key={k} style={{ position: k === 0 ? "relative" : "absolute", inset: k === 0 ? undefined : 0, transform: `translateZ(${-(k / (layers - 1)) * depth}px)`, color: isFront ? front : side, filter: isFront ? undefined : `brightness(${1 - (k / layers) * 0.45})` }}>
            {children}
          </div>
        );
      })}
    </div>
  );
}

/** big extruded word */
export function XWord({ text, size = 200, front = "#fff", side = "#1A3C9E", depth = 70, style }: { text: string; size?: number; front?: string; side?: string; depth?: number; style?: CSSProperties }) {
  return (
    <Extrude front={front} side={side} depth={depth} layers={18} style={style}>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: size, letterSpacing: "-0.055em", lineHeight: 1, whiteSpace: "nowrap" }}>{text}</div>
    </Extrude>
  );
}

/** glowing AI core (screen-space radial light) */
export function Core({ x, y, r, intensity = 1 }: { x: number; y: number; r: number; intensity?: number }) {
  return (
    <div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,255,255,${intensity}) 0%, rgba(140,180,255,${0.85 * intensity}) 12%, rgba(30,90,232,${0.55 * intensity}) 30%, rgba(30,90,232,0) 70%)` }} />
    </div>
  );
}

/** volumetric spotlight cone from above */
export function Spot({ x, top = -200, w = 700, h = 1300, color = "#9DBBFF", o = 0.35 }: { x: number; top?: number; w?: number; h?: number; color?: string; o?: number }) {
  return (
    <div style={{ position: "absolute", left: x - w / 2, top, width: w, height: h, background: `linear-gradient(${color}${Math.round(o * 255).toString(16).padStart(2, "0")}, ${color}00 85%)`, clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0 100%)", filter: "blur(18px)", mixBlendMode: "screen", pointerEvents: "none" }} />
  );
}

/** 3D box standing on a floor plane (world plane = floor; +z is up) */
export function Pedestal({ x, y, w, l, hgt, top, side, front, children }: { x: number; y: number; w: number; l: number; hgt: number; top: string; side: string; front: string; children?: ReactNode }) {
  if (hgt < 1) return null;
  return (
    <>
      <At x={x + w} y={y} w={hgt} h={l} origin="0 50%" style={{ transform: "rotateY(-90deg)", background: side }} />
      <At x={x - hgt} y={y} w={hgt} h={l} origin="100% 50%" style={{ transform: "rotateY(90deg)", background: side }} />
      <At x={x} y={y + l - hgt} w={w} h={hgt} origin="50% 100%" style={{ transform: "rotateX(-90deg)", background: front }}>{children}</At>
      <At x={x} y={y} w={w} h={l} z={hgt} style={{ background: top }} />
    </>
  );
}

/** deterministic particle burst / gather */
export function Particles({ n, from, to, q, size = 10, color = K.blue2, glow = true }: { n: number; from: (i: number) => [number, number]; to: (i: number) => [number, number]; q: (i: number) => number; size?: number; color?: string; glow?: boolean }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const t = clamp(q(i));
        const [x0, y0] = from(i), [x1, y1] = to(i);
        const x = mix(x0, x1, t), y = mix(y0, y1, t);
        const s = size * (0.5 + rnd(i, 3));
        return <div key={i} style={{ position: "absolute", left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: i % 3 ? 2 : "50%", background: color, boxShadow: glow ? `0 0 ${s * 1.5}px ${color}` : undefined, opacity: 0.4 + rnd(i, 7) * 0.6 }} />;
      })}
    </>
  );
}
