import type { CSSProperties, ReactNode } from "react";
import { C, clamp, mix, p, smooth } from "../motion";
import { Arrow, Mark, Search, Tick } from "../primitives";
import { useWordStarts } from "./voice-clock";
export { C, clamp, mix, p, smooth, Arrow, Mark, Search, Tick };
export function k(t: number, keys: number[][]) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0])
      return mix(
        keys[i - 1][1],
        keys[i][1],
        smooth((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])),
      );
  }
  return keys[keys.length - 1][1];
}
export function pop(t: number, start = 0) {
  const v = Math.max(0, t - start);
  return v > 1.2 ? 1 : 1 - Math.exp(-7 * v) * Math.cos(v * 10);
}
export const at = (
  left: number,
  top: number,
  extra: CSSProperties = {},
): CSSProperties => ({ position: "absolute", left, top, ...extra });
export const fade = (t: number, start: number, end = 100) =>
  p(t, start, 0.4) * (1 - p(t, end, 0.35));
export function Backdrop({
  t,
  dark = false,
  blue = false,
}: {
  t: number;
  dark?: boolean;
  blue?: boolean;
}) {
  return (
    <>
      <div
        className="v2-backdrop"
        style={{ background: dark ? "#07101F" : blue ? "#1649C9" : "#EFF4FC" }}
      />
      <div
        className={`v2-light ${dark ? "is-dark" : ""}`}
        style={{
          opacity: dark ? 0.85 : 1,
          transform: `translateX(${Math.sin(t * 0.25) * 80}px) rotate(${-18 + Math.sin(t * 0.17) * 7}deg)`,
          background: dark
            ? "linear-gradient(105deg,transparent 25%,#246BFD66 48%,#91C7FF1A 60%,transparent 80%)"
            : blue
              ? "linear-gradient(105deg,transparent 15%,#9DCEFF70 44%,#307DFF90 58%,transparent 80%)"
              : "linear-gradient(105deg,transparent 20%,#FFFFFFEE 42%,#B6D2FFBB 55%,transparent 80%)",
        }}
      />
      <div
        className="v2-horizon"
        style={{
          opacity: dark ? 0.22 : 0.4,
          backgroundImage: `linear-gradient(${dark ? "#91BBFF" : "#486EAA"}22 1px,transparent 1px),linear-gradient(90deg,${dark ? "#91BBFF" : "#486EAA"}22 1px,transparent 1px)`,
          transform: `perspective(800px) rotateX(68deg) translateY(${(t * 10) % 70}px)`,
        }}
      />
      <div className="v2-vignette" style={{ opacity: dark ? 0.75 : 0.18 }} />
      <svg
        className="v2-grain"
        width="1920"
        height="1080"
        style={{ opacity: 0.035 }}
      >
        <filter id="zc-grain-v2">
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".78"
            numOctaves="2"
            seed="19"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect
          width="100%"
          height="100%"
          filter="url(#zc-grain-v2)"
          opacity=".65"
        />
      </svg>
    </>
  );
}
export function Meta({
  label,
  light = false,
  example = false,
}: {
  label: string;
  light?: boolean;
  example?: boolean;
}) {
  return (
    <>
      <div className="v2-meta" style={{ color: light ? "#F0F6FF" : "#3D516C" }}>
        <span>
          <i style={{ background: light ? C.mint : C.blue }} /> BRANDPULSE{" "}
          <b>/</b> {label}
        </span>
        <span>
          AI VISIBILITY ENGINE <b>↗</b>
        </span>
      </div>
      <div
        className="v2-bottom"
        style={{ color: light ? "#E6EFFF" : "#3F526B" }}
      >
        <span>OBSERVE. ACT. RECHECK.</span>
        {example && <span>ILLUSTRATIVE PRODUCT WORKFLOW</span>}
        <span>● &nbsp; PRODUCT FILM / 02</span>
      </div>
    </>
  );
}
export function Words({
  text,
  t,
  start = 0,
  size = 100,
  color = "inherit",
  stagger = 0.055,
  style = {},
}: {
  text: string;
  t: number;
  start?: number;
  size?: number;
  color?: string;
  stagger?: number;
  style?: CSSProperties;
}) {
  const timing = useWordStarts(text, start, stagger),
    time = timing.active ? timing.time : t;
  const parts = text.split(" ");
  return (
    <div className="v2-words" style={{ fontSize: size, color, ...style }}>
      {parts.map((word, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            position: "relative",
            marginRight: ".23em",
            paddingBottom: ".14em",
            marginBottom: "-.14em",
          }}
        >
          {/gap|evidence|found|questions|plan/i.test(word) && (
            <span
              style={{
                position: "absolute",
                left: "-.025em",
                right: "-.025em",
                top: ".06em",
                bottom: ".1em",
                background: "currentColor",
                opacity: 0.1,
                transformOrigin: "left",
                scale: `${p(time, timing.starts[i], 0.4)} 1`,
              }}
            />
          )}
          {word.split("").map((letter, j) => (
            <span
              key={j}
              style={{
                display: "inline-block",
                overflow: "hidden",
                paddingBottom: ".12em",
                marginBottom: "-.12em",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontWeight: i === parts.length - 1 ? 700 : 500,
                  transform: `translateY(${110 * (1 - p(time, timing.starts[i] + j * 0.008, 0.32))}%) rotate(${5 * (1 - p(time, timing.starts[i] + j * 0.008, 0.4))}deg)`,
                  opacity: p(time, timing.starts[i] + j * 0.008, 0.15),
                }}
              >
                {letter}
              </span>
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}
export function Pill({
  children,
  green = false,
  dark = false,
}: {
  children: ReactNode;
  green?: boolean;
  dark?: boolean;
}) {
  return (
    <span
      className="v2-pill"
      style={{
        background: green
          ? dark
            ? "#A9FFDF22"
            : "#DFF5E9"
          : dark
            ? "#FFFFFF10"
            : "#EAF0FA",
        color: green ? (dark ? C.mint : "#186E47") : dark ? "#C4D8FF" : "#46648A",
        borderColor: green ? "#63BD921F" : dark ? "#FFFFFF20" : "#B8C8E82F",
      }}
    >
      {children}
    </span>
  );
}
export function Window({
  children,
  title = "Your business / workspace",
  dark = false,
  style = {},
}: {
  children: ReactNode;
  title?: string;
  dark?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      data-layout-allow-overlap="true"
      className={`v2-window ${dark ? "v2-dark-window" : ""}`}
      style={style}
    >
      <div className="v2-window-top">
        <div className="v2-dots">
          <i />
          <i />
          <i />
        </div>
        <span>{title}</span>
        <div className="v2-window-top-right">
          <span className="v2-secure">◈</span> Connected
        </div>
      </div>
      {children}
    </div>
  );
}
export function AppSidebar({
  active = "Buyer questions",
  dark = false,
}: {
  active?: string;
  dark?: boolean;
}) {
  return (
    <div
      className="v2-sidebar"
      style={{ borderColor: dark ? "#FFFFFF14" : "#E3EAF5" }}
    >
      <div className="v2-sidebar-brand">
        <Mark size={30} light={dark} />
        brandpulse
      </div>
      <div className="v2-sidebar-business">
        <span className="v2-business-letter">Y</span>
        <div>
          Your business<small>Business workspace</small>
        </div>
        <span>⌄</span>
      </div>
      {["Overview", "Buyer questions", "Evidence", "Fix plan", "Activity"].map(
        (x, i) => (
          <div
            key={x}
            className={`v2-nav-item ${active === x ? "v2-nav-active" : ""}`}
          >
            <span className="v2-nav-glyph">{["◫", "≡", "▤", "↗", "◷"][i]}</span>
            {x}
            {active === x && <i />}
          </div>
        ),
      )}
      <div className="v2-sidebar-note">
        <i />
        Comparable benchmarks
        <br />
        <span>Every answer. Every change.</span>
      </div>
    </div>
  );
}
export function QueryBar({
  t = 20,
  text = "Which option is right for my business?",
  dark = false,
  style = {},
}: {
  t?: number;
  text?: string;
  dark?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div className={`v2-query ${dark ? "is-dark" : ""}`} style={style}>
      <Search size={28} />
      <span>
        {text.slice(0, Math.ceil(text.length * p(t, 0.1, 1.1)))}
        {t < 1.3 && <i className="v2-caret" />}
      </span>
      <span className="v2-query-arrow">
        <Arrow size={26} direction="up" />
      </span>
    </div>
  );
}
export function Paper({
  index = 1,
  title = "Service evidence",
  dark = false,
  style = {},
}: {
  index?: number;
  title?: string;
  dark?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      className="v2-paper"
      style={{
        background: dark ? "#152744" : "#FFFFFF",
        color: dark ? "#F0F5FF" : "#193153",
        ...style,
      }}
    >
      <div className="v2-paper-fold" />
      <div className="v2-paper-meta">
        SOURCE / 0{index}
        <span>↗</span>
      </div>
      <div className="v2-paper-title">{title}</div>
      <div className="v2-paper-lines">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="v2-paper-proof">
        <Tick size={17} /> Evidence connected
      </div>
    </div>
  );
}
export function Corner({ dark = false }: { dark?: boolean }) {
  return (
    <svg
      width="1920"
      height="1080"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: 0.3,
      }}
    >
      <path
        d="M58 100V58H100M1820 58H1862V100M58 980V1022H100M1820 1022H1862V980"
        stroke={dark ? "#B2D0FF" : "#55739A"}
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}
export function LensWipe({
  t,
  start,
  color = "#1E5AE8",
  cx = 960,
  cy = 540,
}: {
  t: number;
  start: number;
  color?: string;
  cx?: number;
  cy?: number;
}) {
  const v = smooth((t - start) / 0.6);
  return v > 0 ? (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: color,
        clipPath: `circle(${v * 2300}px at ${cx}px ${cy}px)`,
        zIndex: 50,
      }}
    />
  ) : null;
}
export function Pointer({
  x,
  y,
  click = 0,
}: {
  x: number;
  y: number;
  click?: number;
}) {
  return (
    <div style={at(x, y, { zIndex: 20 })}>
      {click > 0 && (
        <div
          style={{
            position: "absolute",
            width: 120,
            height: 120,
            left: -60,
            top: -60,
            border: `2px solid ${C.mint}`,
            borderRadius: "50%",
            scale: String(0.2 + click),
            opacity: 1 - click,
          }}
        />
      )}
      <svg
        width="34"
        height="42"
        viewBox="0 0 34 42"
        style={{
          filter: "drop-shadow(0 4px 6px #0005)",
          scale: String(1 - 0.18 * Math.sin(click * Math.PI)),
        }}
      >
        <path
          d="M3 2L30 24L18 25L13 38Z"
          fill="#FFFFFF"
          stroke="#1D3559"
          strokeWidth="2.2"
        />
      </svg>
    </div>
  );
}
