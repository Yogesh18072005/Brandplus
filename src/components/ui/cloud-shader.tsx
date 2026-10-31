"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export type CloudShaderProps = {
  className?: string;
  children?: React.ReactNode;
  /** Animation speed multiplier. 1 = default drift. */
  speed?: number;
  /** Number of clouds (1-6). */
  count?: number;
  /** Cloud tint color (hex or rgb string). */
  cloudColor?: string;
  /** Sky color at the top (hex or rgb string). */
  skyTopColor?: string;
  /** Sky color at the bottom (hex or rgb string). */
  skyBottomColor?: string;
};

const VERT = `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

// Original cloud shader for Aceternity UI.
// Each cloud is an asymmetric envelope (dome top, flat base) filled with
// domain-warped billow noise. A second density sample above the pixel
// approximates self-shadowing. Clouds drift horizontally and wrap around.
const FRAG = `
precision highp float;

varying vec2 v_uv;

uniform vec2 u_res;
uniform float u_time;
uniform float u_count;
uniform vec3 u_cloud;
uniform vec3 u_skyTop;
uniform vec3 u_skyBottom;

const mat2 R = mat2(0.80, 0.60, -0.60, 0.80);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.31, 289.17))) * 26737.367);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * vnoise(p);
    p = R * p * 2.03 + 19.19;
    amp *= 0.5;
  }
  return sum;
}

// billow noise: sharp puffy ridges, like cauliflower cloud tops
float billow(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * (1.0 - abs(2.0 * vnoise(p) - 1.0));
    p = R * p * 2.11 + 13.37;
    amp *= 0.5;
  }
  return sum;
}

// raw density for one cloud at point p
float cloudDensity(vec2 p, vec2 c, vec2 r, float seed, float t) {
  vec2 q = p - c;

  // envelope: dome above the center, flat base below
  float ry = q.y > 0.0 ? r.y : r.y * 0.42;
  float env = 1.0 - length(vec2(q.x / r.x, q.y / ry));
  if (env < -0.35) return 0.0;

  // domain-warped billow detail, moves with the cloud, evolves slowly
  vec2 dp = q * (2.4 / r.x) + seed;
  dp += 0.6 * vec2(
    fbm(dp * 1.4 + t * 0.04),
    fbm(dp * 1.4 + 7.7 - t * 0.03)
  );
  float detail = billow(dp * 1.6);

  return env + (detail - 0.62) * 0.62;
}

// shades one cloud and blends it over the current color
vec3 shadeCloud(vec3 color, vec3 sky, vec2 p, vec2 c, vec2 r, float seed, float t, float dist) {
  float d = cloudDensity(p, c, r, seed, t);
  if (d < 0.02) return color;

  // sample density toward the sun (straight up) for self-shadowing
  float dUp = cloudDensity(p + vec2(0.0, r.y * 0.55), c, r, seed, t);
  float occl = clamp((dUp - d) * 1.1 + d * 0.55, 0.0, 1.0);

  vec3 lit = u_cloud * 1.04;
  vec3 shadow = mix(u_cloud * 0.60, sky, 0.38);
  vec3 cloudCol = mix(lit, shadow, occl * 0.85);

  float alpha = smoothstep(0.02, 0.38, d);

  // silver lining on thin edges
  float rim = smoothstep(0.02, 0.14, d) * (1.0 - smoothstep(0.14, 0.40, d));
  cloudCol += rim * 0.10;

  // atmospheric perspective: far clouds fade into the sky
  cloudCol = mix(cloudCol, sky, dist * 0.35);
  alpha *= mix(1.0, 0.8, dist);

  return mix(color, cloudCol, alpha);
}

// one drifting cloud: horizontal wrap + gentle vertical bob
vec3 cloudPass(vec3 color, vec3 sky, vec2 p, float aspect, float t,
               float spd, float phase, float y, vec2 r, float seed, float dist) {
  float cx = mix(-r.x - 0.25, aspect + r.x + 0.25, fract(t * spd + phase));
  float cy = y + sin(t * 0.05 + phase * 6.2831) * 0.012;
  return shadeCloud(color, sky, p, vec2(cx, cy), r, seed, t, dist);
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(v_uv.x * aspect, v_uv.y);
  float t = u_time;

  vec3 sky = mix(u_skyBottom, u_skyTop, v_uv.y);
  vec3 color = sky;

  // faint haze band near the horizon
  color = mix(color, u_skyBottom * 1.06, smoothstep(0.35, 0.0, v_uv.y) * 0.5);

  // soft sun glow, upper area
  vec2 sunPos = vec2(aspect * 0.78, 0.92);
  float sunDist = length(p - sunPos);
  color += vec3(1.0, 0.95, 0.82) * exp(-sunDist * sunDist * 5.0) * 0.28;

  // thin cirrus streaks, stretched horizontally, high in the sky
  float cirrusBand = smoothstep(0.55, 0.8, v_uv.y) * (1.0 - smoothstep(0.9, 1.0, v_uv.y));
  if (cirrusBand > 0.01) {
    float streak = fbm(vec2(p.x * 1.6 - t * 0.006, p.y * 12.0));
    float wisp = smoothstep(0.52, 0.78, streak) * cirrusBand;
    color = mix(color, u_cloud * 0.98, wisp * 0.35);
  }

  // BrandPulse customization: a broad, readable cloud bank through the hero's
  // middle. Domain warping keeps the silhouette organic while the vertical
  // envelope leaves clear sky around the headline and product surface.
  vec2 bankP = vec2(p.x * 1.45 - t * 0.012, p.y * 4.8);
  bankP += vec2(fbm(bankP * 0.72 + 4.7), fbm(bankP * 0.86 - 2.4)) * 0.72;
  float bankNoise = billow(bankP * 1.15) + fbm(bankP * 0.58) * 0.34;
  float bankShape = smoothstep(0.46, 0.72, bankNoise);
  float bankBand = smoothstep(0.14, 0.36, v_uv.y) * (1.0 - smoothstep(0.70, 0.92, v_uv.y));
  color = mix(color, u_cloud, bankShape * bankBand * 0.78);

  // far layer: small, high, slow
  if (u_count > 5.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.006, 0.10, 0.84, vec2(0.20, 0.10), 43.7, 1.0);
  }
  if (u_count > 4.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.008, 0.62, 0.73, vec2(0.24, 0.12), 71.3, 0.85);
  }

  // middle layer
  if (u_count > 3.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.011, 0.33, 0.60, vec2(0.34, 0.16), 17.3, 0.55);
  }
  if (u_count > 2.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.013, 0.80, 0.47, vec2(0.30, 0.15), 29.9, 0.45);
  }

  // near layer: big, low, fast
  if (u_count > 1.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.016, 0.05, 0.35, vec2(0.46, 0.20), 91.1, 0.15);
  }
  color = cloudPass(color, sky, p, aspect, t, 0.020, 0.48, 0.20, vec2(0.56, 0.24), 57.2, 0.0);

  // A composed silhouette guarantees a recognizable cloud field even on
  // darker brand palettes where the stock density pass can become too quiet.
  float drift = sin(t * 0.025) * 0.06;
  float blobA = 1.0 - smoothstep(0.76, 1.08, length(vec2((p.x - aspect * 0.12 - drift) / 0.52, (p.y - 0.43) / 0.17)));
  float blobB = 1.0 - smoothstep(0.74, 1.08, length(vec2((p.x - aspect * 0.38 - drift) / 0.68, (p.y - 0.48) / 0.23)));
  float blobC = 1.0 - smoothstep(0.74, 1.08, length(vec2((p.x - aspect * 0.69 - drift) / 0.62, (p.y - 0.42) / 0.20)));
  float blobD = 1.0 - smoothstep(0.76, 1.08, length(vec2((p.x - aspect * 0.94 - drift) / 0.48, (p.y - 0.50) / 0.16)));
  float puffA = 1.0 - smoothstep(0.72, 1.06, length(vec2((p.x - aspect * 0.23 - drift) / 0.26, (p.y - 0.58) / 0.13)));
  float puffB = 1.0 - smoothstep(0.72, 1.06, length(vec2((p.x - aspect * 0.48 - drift) / 0.31, (p.y - 0.62) / 0.15)));
  float puffC = 1.0 - smoothstep(0.72, 1.06, length(vec2((p.x - aspect * 0.78 - drift) / 0.28, (p.y - 0.56) / 0.13)));
  float puffD = 1.0 - smoothstep(0.72, 1.06, length(vec2((p.x - aspect * 0.88 - drift) / 0.22, (p.y - 0.37) / 0.11)));
  float silhouette = max(max(max(blobA, blobB), max(blobC, blobD)), max(max(puffA, puffB), max(puffC, puffD)));
  float cloudTexture = billow(vec2(p.x * 2.1 - t * 0.009, p.y * 7.4));
  float shapedCloud = smoothstep(0.12, 0.62, silhouette + (cloudTexture - 0.54) * 0.82);
  vec3 heroCloud = mix(u_cloud * 0.62, u_cloud * 1.04, smoothstep(0.28, 0.78, cloudTexture));
  color = mix(color, heroCloud, shapedCloud * 0.78);

  gl_FragColor = vec4(color, 1.0);
}
`;

export const CloudShader = ({
  className,
  children,
  speed = 1,
  count = 6,
  cloudColor = "#fbf8f2",
  skyTopColor = "#4445be",
  skyBottomColor = "#979ee5",
}: CloudShaderProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paramsRef = useRef({
    speed,
    count,
    cloudColor,
    skyTopColor,
    skyBottomColor,
  });

  paramsRef.current = {
    speed,
    count,
    cloudColor,
    skyTopColor,
    skyBottomColor,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const uniforms = {
      u_res: { value: new THREE.Vector2(1, 1) },
      u_time: { value: 0 },
      u_count: { value: count },
      u_cloud: { value: new THREE.Color(cloudColor) },
      u_skyTop: { value: new THREE.Color(skyTopColor) },
      u_skyBottom: { value: new THREE.Color(skyBottomColor) },
    };
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let frame = 0;
    let running = true;
    let visible = true;
    const clock = new THREE.Clock(false);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      uniforms.u_res.value.set(canvas.width, canvas.height);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const draw = () => {
      if (!running || !visible) return;
      const p = paramsRef.current;
      uniforms.u_time.value = reduceMotion ? 0 : clock.getElapsedTime() * p.speed;
      uniforms.u_count.value = Math.min(6, Math.max(1, p.count));
      uniforms.u_cloud.value.set(p.cloudColor);
      uniforms.u_skyTop.value.set(p.skyTopColor);
      uniforms.u_skyBottom.value.set(p.skyBottomColor);
      renderer.render(scene, camera);
      if (!reduceMotion) frame = requestAnimationFrame(draw);
    };

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      const nextVisible = Boolean(entry?.isIntersecting);
      if (nextVisible === visible) return;
      visible = nextVisible;
      if (visible && running && !reduceMotion) {
        clock.start();
        frame = requestAnimationFrame(draw);
      } else {
        clock.stop();
        cancelAnimationFrame(frame);
      }
    }, { rootMargin: "120px" });
    visibilityObserver.observe(canvas);

    if (reduceMotion) draw();
    else {
      clock.start();
      frame = requestAnimationFrame(draw);
    }

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      className={["h-full min-h-80 w-full overflow-hidden bg-[#262085]", className].filter(Boolean).join(" ")}
      aria-hidden={children ? undefined : true}
      style={{
        backgroundColor: skyBottomColor,
        backgroundImage: `radial-gradient(ellipse 34% 19% at 18% 38%, ${cloudColor} 0%, ${cloudColor} 42%, transparent 72%), radial-gradient(ellipse 40% 22% at 72% 54%, ${cloudColor} 0%, ${cloudColor} 38%, transparent 70%), radial-gradient(ellipse 28% 16% at 92% 25%, ${cloudColor} 0%, transparent 72%), linear-gradient(180deg, ${skyTopColor}, ${skyBottomColor})`,
      }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      {children ? (
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
};
