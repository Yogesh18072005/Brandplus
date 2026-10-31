/* V4 opening (0–14 s). Art direction: type is the hero, one accent (Scan Blue) on flat paper/ink,
   hard cuts on the 120 BPM grid, rack-focus word slams, zoom-through a letter counter. */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import "../style.css";

const K = { paper: "#F2F2EE", ink: "#0B0B0C", blue: "#1E5AE8", red: "#F0383C", dot: "#1FC58A", grey: "#8A8A86", line: "#DEDED8" };
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const pr = (f: number, s: number, d: number) => clamp((f - s) / d);
const out = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
const inn = (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * clamp(t) - 10));
const back = (t: number) => { t = clamp(t); const s = 2.2; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };

const H: CSSProperties = { fontFamily: "Manrope, sans-serif", fontWeight: 800, letterSpacing: "-0.065em", lineHeight: 0.88, whiteSpace: "nowrap" };

/** a word that racks into focus: blur → sharp, slight scale-down, lands on frame `at` */
function W({ f, at, children, style, d = 6 }: { f: number; at: number; children: ReactNode; style?: CSSProperties; d?: number }) {
  if (f < at - 1) return <span style={{ ...style, opacity: 0, display: "inline-block" }}>{children}</span>;
  const q = out(pr(f, at - 1, d));
  return (
    <span style={{ display: "inline-block", filter: `blur(${(1 - q) * 26}px)`, transform: `scale(${mix(1.18, 1, q)})`, opacity: clamp(q * 2.5), ...style }}>
      {children}
    </span>
  );
}

/** full-frame shot with a continuous push and a touch of rotation; `shake` = impact frame */
function Shot({ f, bg, children, push = 0.07, rot = 0.6, shake, dur = 30, origin = "50% 50%" }: { f: number; bg: string; children: ReactNode; push?: number; rot?: number; shake?: number; dur?: number; origin?: string }) {
  const q = clamp(f / dur);
  let sx = 0, sy = 0;
  if (shake !== undefined && f >= shake && f < shake + 10) {
    const k = f - shake, e = Math.exp(-k / 2.5);
    sx = Math.sin(k * 3.1) * 18 * e; sy = Math.cos(k * 2.3) * 12 * e;
  }
  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ transformOrigin: origin, transform: `translate(${sx}px,${sy}px) scale(${1 + push * q}) rotate(${rot * (q - 0.5)}deg)` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
}
const Center = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", ...style }}>{children}</AbsoluteFill>
);

/* ---------------- shots ---------------- */

// A 0–18  "Your buyers"
const A = (f: number) => (
  <Shot f={f} bg={K.paper} dur={18} push={0.05}>
    <Center><div style={{ ...H, fontSize: 250, color: K.ink }}><W f={f} at={5}>Your</W> <W f={f} at={9}>buyers</W></div></Center>
  </Shot>
);
// B 18–30  "stopped"
const B = (f: number) => (
  <Shot f={f} bg={K.ink} dur={12} push={0.1} rot={-1}>
    <Center><div style={{ ...H, fontSize: 420, color: K.paper }}><W f={f} at={1} d={5}>stopped</W></div></Center>
  </Shot>
);
// C 30–60  "Googling." struck through; result lines fall away
const C = (f: number) => {
  const strike = out(pr(f, 10, 6));
  return (
    <Shot f={f} bg={K.paper} dur={30} push={0.06} shake={10}>
      {Array.from({ length: 9 }, (_, i) => {
        const fall = inn(pr(f, 12 + i * 1.5, 14));
        return (
          <div key={i} style={{ position: "absolute", left: 300 + (i % 3) * 40, top: 120 + i * 95 + fall * 900, width: 600 + ((i * 137) % 500), opacity: (1 - fall) * 0.9, transform: `rotate(${fall * (i % 2 ? 9 : -7)}deg)` }}>
            <div style={{ height: 22, width: "45%", background: "#3D63D4", borderRadius: 4, opacity: 0.35 }} />
            <div style={{ height: 14, width: "90%", background: K.line, borderRadius: 4, marginTop: 14 }} />
          </div>
        );
      })}
      <Center>
        <div style={{ position: "relative", ...H, fontSize: 330, color: K.ink }}>
          <W f={f} at={1}>Googling.</W>
          <div style={{ position: "absolute", left: -30, right: -30, top: "50%", height: 46, marginTop: -10, background: K.blue, transformOrigin: "left", transform: `scaleX(${strike}) rotate(-2deg)` }} />
        </div>
      </Center>
    </Shot>
  );
};
// D 60–72  "They ask" on blue (kick drops at 60)
const D = (f: number) => (
  <Shot f={f} bg={K.blue} dur={12} push={0.1} rot={1}>
    <Center><div style={{ ...H, fontSize: 380, color: "#fff" }}><W f={f} at={3} d={5}>They</W> <W f={f} at={6} d={5}>ask</W></div></Center>
  </Shot>
);
// E 72–90  "AI." giant, then whip down into the chat field
const E = (f: number) => {
  const whip = inn(pr(f, 12, 6));
  return (
    <Shot f={f} bg={K.paper} dur={18} push={0.12} shake={1}>
      <AbsoluteFill style={{ transform: `translateY(${-whip * 1080}px)`, filter: whip > 0.02 ? `blur(${Math.sin(whip * Math.PI) * 30}px)` : undefined }}>
        <Center><div style={{ ...H, fontSize: 820, color: K.ink, letterSpacing: "-0.08em" }}><W f={f} at={1} d={4}>AI.</W></div></Center>
      </AbsoluteFill>
    </Shot>
  );
};
// F 90–135  chat input: question typed huge, camera tracks the caret, send pressed
const Q = "best CRM for a small sales team?";
const F = (f: number) => {
  const whipIn = out(pr(f, 0, 7));
  const n = Math.min(Q.length, Math.max(0, Math.floor((f - 2) * 1.5)));
  const sent = f >= 26;
  const caretX = 140 + n * 41;
  const camX = Math.max(0, caretX - 1300);
  const answer = out(pr(f, 29, 10));
  return (
    <Shot f={f} bg={K.paper} dur={45} push={0.04} rot={0}>
      <AbsoluteFill style={{ transform: `translateY(${(1 - whipIn) * 1080}px)`, filter: whipIn < 0.98 ? `blur(${(1 - whipIn) * 30}px)` : undefined }}>
        <div style={{ position: "absolute", left: 90 - camX * (1 - answer), top: mix(420, 120, answer), width: 1740 + camX, height: 200, background: "#fff", borderRadius: 100, border: `3px solid ${sent ? K.line : K.ink}`, display: "flex", alignItems: "center", padding: "0 0 0 70px", boxShadow: "0 40px 80px -40px rgba(0,0,0,.35)", transform: `scale(${mix(1, 0.62, answer)})`, transformOrigin: "left top" }}>
          <span style={{ fontFamily: "Manrope", fontWeight: 600, fontSize: 74, letterSpacing: "-0.03em", color: K.ink, whiteSpace: "nowrap" }}>{Q.slice(0, n)}</span>
          {!sent && <span style={{ width: 7, height: 92, background: K.blue, marginLeft: 6, opacity: Math.floor(f / 6) % 2 || n < Q.length ? 1 : 0 }} />}
          <span style={{ flex: 1 }} />
          <span style={{ width: 150, height: 150, borderRadius: "50%", background: K.blue, marginRight: 25, display: "grid", placeItems: "center", transform: `scale(${sent ? mix(0.82, 1, back(pr(f, 26, 8))) : 1})`, flex: "none" }}>
            <svg width={70} height={70} viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </div>
        <div style={{ position: "absolute", left: 90, top: 330, opacity: answer, transform: `translateY(${(1 - answer) * 60}px)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: K.ink, display: "grid", placeItems: "center" }}>
              <svg width={36} height={36} viewBox="0 0 24 24"><path d="M12 2c.6 4.8 2.9 7.4 10 10-7.1 2.6-9.4 5.2-10 10-.6-4.8-2.9-7.4-10-10 7.1-2.6 9.4-5.2 10-10z" fill="#fff" /></svg>
            </div>
            <span style={{ fontFamily: "Manrope", fontWeight: 700, fontSize: 40, color: K.grey }}>Answer</span>
          </div>
          <div style={{ fontFamily: "Manrope", fontWeight: 600, fontSize: 92, letterSpacing: "-0.04em", color: K.ink, marginTop: 36, lineHeight: 1.05, width: 1700 }}>
            For a small sales team, the best options are:
          </div>
        </div>
      </AbsoluteFill>
    </Shot>
  );
};
// G 135–165  three names flash, one per 10 frames
const NAMES = ["Northstar.", "Atlas.", "Pipewell."];
const G = (f: number) => {
  const i = Math.min(2, Math.floor(f / 10));
  const bg = [K.paper, K.ink, K.blue][i], fg = [K.ink, K.paper, "#fff"][i];
  const lf = f - i * 10;
  return (
    <Shot f={lf} bg={bg} dur={10} push={0.08} rot={i % 2 ? -0.8 : 0.8}>
      <div style={{ position: "absolute", left: 110, top: 120, fontFamily: "Manrope", fontWeight: 800, fontSize: 64, color: fg, opacity: 0.45 }}>0{i + 1}</div>
      <Center><div style={{ ...H, fontSize: 340, color: fg }}><W f={lf} at={0} d={4}>{NAMES[i]}</W></div></Center>
    </Shot>
  );
};
// H 165–183  the shortlist, and your brand isn't on it
const H_ = (f: number) => {
  const stamp = back(pr(f, 7, 8));
  return (
    <Shot f={f} bg={K.paper} dur={18} push={0.08} shake={8}>
      <div style={{ position: "absolute", left: 160, top: 130, width: 1600 }}>
        {["Northstar CRM", "Atlas", "Pipewell"].map((n, i) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 40, height: 170, borderBottom: `3px solid ${K.line}` }}>
            <span style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 56, color: K.blue, width: 70 }}>{i + 1}</span>
            <span style={{ ...H, fontSize: 120, color: K.ink }}>{n}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 40, height: 190, position: "relative" }}>
          <span style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 56, color: K.line, width: 70 }}>—</span>
          <span style={{ ...H, fontSize: 120, color: "#C9C9C3" }}>Your brand</span>
          <span style={{ position: "absolute", left: 900, top: 38, padding: "18px 40px", border: `8px solid ${K.red}`, color: K.red, ...H, fontSize: 84, letterSpacing: "-0.03em", borderRadius: 14, transform: `rotate(-6deg) scale(${mix(2.2, 1, stamp)})`, opacity: clamp(stamp * 3) }}>
            NOT MENTIONED
          </span>
        </div>
      </div>
    </Shot>
  );
};
// I 183–240  "None of them are YOU." then zoom through the O's counter
const YOU = { size: 760, left: 330, top: 300 };
const I = (f: number) => {
  const you = 10;
  const dive = inn(pr(f, 42, 15));
  // O counter centre (letters laid out at fixed advances below)
  const ox = YOU.left + YOU.size * (0.6 + 0.39), oy = YOU.top + YOU.size * 0.48;
  const s = 1 + dive * 60;
  return (
    <Shot f={f} bg={f < you ? K.paper : K.blue} dur={57} push={0.05} shake={you}>
      {f < you ? (
        <Center><div style={{ ...H, fontSize: 250, color: K.ink, textAlign: "center", lineHeight: 0.95 }}>
          <W f={f} at={0} d={4}>None</W> <W f={f} at={2} d={4}>of</W> <W f={f} at={3} d={4}>them</W><br /><W f={f} at={6} d={4}>are</W>
        </div></Center>
      ) : (
        <AbsoluteFill style={{ transformOrigin: `${ox}px ${oy}px`, transform: `scale(${s})` }}>
          <div style={{ position: "absolute", left: 120, top: 150, ...H, fontSize: 120, color: "#ffffffaa", opacity: 1 - dive * 4 }}>are</div>
          {[["Y", 0], ["O", 0.6], ["U", 1.38], [".", 2.08]].map(([ch, x]) => (
            <span key={ch as string} style={{ position: "absolute", left: YOU.left + (x as number) * YOU.size, top: YOU.top - YOU.size * 0.12, ...H, fontSize: YOU.size, color: "#fff", letterSpacing: 0 }}>
              <W f={f} at={you + (x as number) * 2} d={5}>{ch}</W>
            </span>
          ))}
        </AbsoluteFill>
      )}
    </Shot>
  );
};
// J 240–300  0/10 on blue
const J = (f: number) => {
  const zero = 3, ten = 15;
  const jitter = f > 40 && f < 52 ? Math.sin(f * 5) * 14 : 0;
  return (
    <Shot f={f} bg={K.blue} dur={60} push={0.08} shake={zero}>
      <Center style={{ flexDirection: "column" }}>
        <div style={{ ...H, fontSize: 640, color: "#fff", letterSpacing: "-0.06em" }}>
          <W f={f} at={zero} d={4} style={{ transform: `translateX(${jitter}px)`, color: f > 40 && f < 52 && f % 4 < 2 ? K.red : "#fff" }}>0</W>
          <W f={f} at={ten} d={5} style={{ opacity: 0.45 }}>/10</W>
        </div>
        <div style={{ fontFamily: "Manrope", fontWeight: 600, fontSize: 64, color: "#ffffffcc", letterSpacing: "-0.02em", marginTop: 30, opacity: clamp((f - 20) / 6) }}>
          AI answers that named you.
        </div>
      </Center>
    </Shot>
  );
};
// K 300–360  ten answers flip to ✕, then collapse into one dot; music stops at 330
const Kf = (f: number) => {
  const collapse = inn(pr(f, 32, 16));
  const dotOnly = f >= 48;
  return (
    <Shot f={f} bg={K.ink} dur={60} push={0.04} rot={0}>
      {!dotOnly && (
        <AbsoluteFill style={{ transform: `scale(${1 - collapse * 0.98})`, opacity: 1 - collapse * 0.3 }}>
          {Array.from({ length: 10 }, (_, i) => {
            const q = clamp((f - 2 - i * 2.5) / 4);
            const col = i % 5, row = Math.floor(i / 5);
            return (
              <div key={i} style={{ position: "absolute", left: 130 + col * 340, top: 250 + row * 320, width: 300, height: 280, borderRadius: 26, background: q > 0.5 ? K.red : "#1B1B1D", transform: `perspective(900px) rotateY(${q * 180}deg)`, display: "grid", placeItems: "center" }}>
                <span style={{ transform: q > 0.5 ? "scaleX(-1)" : undefined, ...H, fontSize: 120, color: q > 0.5 ? "#fff" : "#3A3A3D", letterSpacing: 0 }}>{q > 0.5 ? "✕" : `${i + 1}`}</span>
              </div>
            );
          })}
        </AbsoluteFill>
      )}
      <Center><div style={{ width: 36, height: 36, borderRadius: "50%", background: K.dot, opacity: clamp((f - 40) / 4), transform: `scale(${1 + Math.sin(clamp((f - 48) / 12) * Math.PI) * 0.25})` }} /></Center>
    </Shot>
  );
};
// L 360–420  drop: the dot bursts to blue, "Meet" → mark + "BrandPulse."
const Mark = ({ size, draw, dot }: { size: number; draw: number; dot: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
    <path d="M52.70 28.49A21 21 0 1 1 31.86 11.00" fill="none" stroke="#fff" strokeWidth={10} strokeLinecap="round" strokeDasharray={113} strokeDashoffset={113 * (1 - draw)} />
    <circle cx="45.5" cy="15.91" r={6.2 * dot} fill={K.dot} />
  </svg>
);
const L = (f: number) => {
  const burst = out(pr(f, 0, 8));
  const meetOut = inn(pr(f, 9, 5));
  const draw = out(pr(f, 10, 14));
  return (
    <Shot f={f} bg={K.ink} dur={60} push={0.05} rot={0} shake={3}>
      <div style={{ position: "absolute", left: 960, top: 540, width: 3000, height: 3000, marginLeft: -1500, marginTop: -1500, borderRadius: "50%", background: K.blue, transform: `scale(${0.012 + burst})` }} />
      {f < 15 && <Center><div style={{ ...H, fontSize: 460, color: "#fff", transform: `scale(${1 - meetOut * 0.5})`, filter: `blur(${meetOut * 20}px)`, opacity: 1 - meetOut }}><W f={f} at={3} d={4}>Meet</W></div></Center>}
      {f >= 9 && (
        <Center style={{ gap: 50 }}>
          <Mark size={300} draw={draw} dot={back(pr(f, 20, 10))} />
          <div style={{ ...H, fontSize: 260, color: "#fff", letterSpacing: "-0.06em" }}>
            {"BrandPulse.".split("").map((ch, i) => <W key={i} f={f} at={11 + i * 1.2} d={6}>{ch}</W>)}
          </div>
        </Center>
      )}
    </Shot>
  );
};

const CUTS: [number, number, (f: number) => ReactNode][] = [
  [0, 18, A], [18, 30, B], [30, 60, C], [60, 72, D], [72, 90, E], [90, 135, F], [135, 165, G],
  [165, 183, H_], [183, 240, I], [240, 300, J], [300, 360, Kf], [360, 420, L],
];

function Fonts() {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => { Promise.all([document.fonts.load("800 50px Manrope"), document.fonts.load("600 50px Manrope")]).then(() => continueRender(h)); }, [h]);
  return null;
}
export function OpeningV4() {
  const frame = useCurrentFrame();
  const [s, , render] = CUTS.find(([a, b]) => frame >= a && frame < b) ?? CUTS[CUTS.length - 1];
  return (
    <AbsoluteFill style={{ background: K.ink }}>
      <Fonts />
      {render(frame - s)}
      <Audio src={staticFile("v4/mix.wav")} />
    </AbsoluteFill>
  );
}
