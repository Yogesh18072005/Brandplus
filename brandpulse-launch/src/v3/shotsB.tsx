/* HOW IT WORKS  (frames 480–1140) — every step uses a different camera language */
import type { CSSProperties, ReactNode } from "react";
import {
  C, P, Pill, Dot, Cross, Check, Spark, Caret, Letters, Sweep, Slam, Floor,
  arrive, camAt, clamp, expoOut, mix, pr, addPose, shake, typed, card, label, mono, vo, cubicInOut, FPS,
} from "./lib";
import { Stage, Ov } from "./stage";
import type { ShotProps } from "./shotsA";

const QUERY = "best CRM for a small sales team?";
const QUESTIONS: [string, string][] = [
  ["HubSpot alternatives for startups", "Alternatives"],
  ["cheapest CRM with email sequences", "Budget"],
  ["CRM that works inside Gmail", "Integration"],
  ["is Northstar CRM worth it?", "Brand check"],
  ["Pipewell vs Atlas for B2B sales", "Comparison"],
  ["easiest CRM to set up in a day", "Need"],
  ["CRM with a good mobile app", "Need"],
  ["which CRM do sales teams trust?", "Trust"],
  ["best CRM under $50 a month", "Budget"],
];

/** stepped word roll that moves to item i at frame times[i] */
function StepRoll({ f, items, times, style }: { f: number; items: string[]; times: number[]; style?: CSSProperties }) {
  let pos = 0;
  times.forEach((t, i) => {
    if (i > 0) pos += expoOut(pr(f, t, 10));
  });
  return (
    <span style={{ display: "inline-block", height: "1.12em", overflow: "hidden", verticalAlign: "bottom", ...style }}>
      <span style={{ display: "flex", flexDirection: "column", transform: `translateY(${-pos * 1.12}em)` }}>
        {items.map((w) => (
          <span key={w} style={{ height: "1.12em", lineHeight: "1.12em", whiteSpace: "nowrap" }}>{w}</span>
        ))}
      </span>
    </span>
  );
}

function StepTag({ n, text, dark = true }: { n: string; text: string; dark?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <span style={{ ...mono, fontSize: 22, fontWeight: 600, color: dark ? C.ink : "#fff", background: dark ? C.mint : C.blue, padding: "6px 14px", borderRadius: 10 }}>{n}</span>
      <span style={{ ...label, color: dark ? "#BFD0EE" : "#4A5A7A", fontSize: 20 }}>{text}</span>
    </div>
  );
}

/* S11 · 480–515 · "We ask [✦ AI]" — sentence with an inline engine chip, push + roll */
export function S11({ f, d }: ShotProps) {
  const A = 480;
  const ai = vo("ai", 16) - A;
  const pose = addPose(camAt([[0, { z: -120, rz: -4, ry: 14, x: -40 }], [35, { z: 240, rz: 1, ry: -3, x: 60 }]], f), shake(f, ai, 0.6));
  return (
    <Stage theme="dark" f={f} d={d} pose={pose} near="bar" hud="How it works">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <P key={i} x={120 + (i % 3) * 620} y={i < 3 ? 70 : 820} z={-700} w={520} h={120} blur={9} o={0.55} style={{ ...card("dark"), borderRadius: 20 }} />
      ))}
      <P x={230} y={250} z={40}><StepTag n="01" text="Buyer questions" /></P>
      <P x={230} y={380} style={{ display: "flex", alignItems: "center", gap: 40, color: "#fff", fontSize: 200, letterSpacing: "-0.05em", whiteSpace: "nowrap" }}>
        <span style={{ fontWeight: 300 }}><Letters text="We ask" f={f} at={vo("we", 16) - A - 2} /></span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 30, padding: "18px 56px 18px 40px", borderRadius: 140, background: "#fff", color: C.blue, transform: `scale(${f >= ai - 2 ? arrive(f, ai - 2, 12) : 0})`, fontWeight: 800 }}>
          <Spark size={150} />AI
        </span>
      </P>
      <P x={240} y={680} z={20} style={{ ...label, color: "#9FB6E2", fontSize: 24, opacity: clamp((f - ai) / 6) }}>Gemini · grounded with Google Search</P>
    </Stage>
  );
}

/* S12 · 515–645 · 3D card fan of buyer questions, orbit, then fly to the selected one */
export function S12({ f, d }: ShotProps) {
  const A = 515;
  const fan = (i: number) => expoOut(pr(f, 2 + i * 2.2, 18));
  const pull = expoOut(pr(f, 66, 22));
  const pose = camAt([[0, { ry: 32, z: -260, rx: 14, y: 40 }], [60, { ry: -10, z: -60, rx: 6, y: 0 }], [104, { ry: 0, z: 470, rx: 2, y: -250, x: 0 }], [130, { z: 560, y: -260, ry: 2 }]], f);
  const overlayOut = clamp((f - 78) / 8);
  const run = clamp((f - 92) / 34);
  return (
    <Stage theme="blue" f={f} d={d} pose={pose} near="card" hud="10 buyer questions" demo
      overlay={
        <Ov x={110} y={820} style={{ color: "#fff", fontSize: 96, letterSpacing: "-0.04em", lineHeight: 1.05, opacity: 1 - overlayOut, transform: `translateY(${overlayOut * 40}px)` }}>
          <div style={{ fontWeight: 300 }}>
            The <Sweep f={f} at={vo("real") - A} color="#fff" textColor={C.blue}><b style={{ fontWeight: 800 }}>real</b></Sweep> questions
          </div>
          <div style={{ fontWeight: 300, opacity: f >= vo("your", 17) - A - 3 ? 1 : 0 }}>
            <Letters text="your buyers " f={f} at={vo("your", 17) - A - 3} stagger={0.8} />
            <Slam f={f} at={vo("ask", 18) - A} style={{ fontWeight: 800, color: C.mint }}>ask.</Slam>
          </div>
        </Ov>
      }
    >
      <Floor y={1040} color="#7FB0FF" o={0.35} />
      {QUESTIONS.map(([q, tag], i) => {
        const a = fan(i);
        const ang = (i - 4) * 10.5 * a;
        return (
          <P key={q} x={730} y={300} w={460} h={190} z={-i * 4} rz={ang} origin="50% 1700px" o={clamp(a * 3)}
            style={{ ...card("light"), padding: "26px 34px" }}>
            <div style={{ ...label, fontSize: 15, color: C.blue }}>Q{String(i + 2).padStart(2, "0")} · {tag}</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 10, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{q}</div>
          </P>
        );
      })}
      <P x={560} y={mix(330, 70, pull)} z={mix(10, 120, pull)} w={800} h={220} s={mix(0.8, 1.05, pull)} o={clamp(fan(9) * 3)}
        style={{ ...card("light"), padding: "30px 40px", boxShadow: `0 0 0 ${pull * 5}px ${C.mint}, 0 50px 100px -30px #0A1A5Aaa` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ ...label, fontSize: 16, color: C.blue }}>Q01 · Best / top</span>
          <span style={{ flex: 1 }} />
          {pull > 0.5 && <Pill bg="#E8F0FF" fg={C.blue} style={{ fontSize: 15 }}><Dot c={C.blue} s={8} />{run < 1 ? "Asking AI" : "10 / 10 asked"}</Pill>}
        </div>
        <div style={{ fontSize: 46, fontWeight: 800, marginTop: 16, letterSpacing: "-0.025em" }}>{QUERY}</div>
        <div style={{ marginTop: 20, height: 10, borderRadius: 5, background: "#E6ECF7", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${run * 100}%`, background: C.blue, borderRadius: 5 }} />
        </div>
      </P>
    </Stage>
  );
}

const ANSWER: [string, boolean][] = [
  ["For a small sales team, ", false],
  ["Northstar CRM", true],
  [" is the strongest pick, with a simple pipeline and built-in email. ", false],
  ["Atlas", true],
  [" is a solid budget option, and ", false],
  ["Pipewell", true],
  [" suits teams that live in Gmail.", false],
];
function Streamed({ f, at, cps = 70, size = 40 }: { f: number; at: number; cps?: number; size?: number }) {
  let budget = Math.max(0, Math.floor(((f - at) / FPS) * cps));
  const out: ReactNode[] = [];
  let used = 0;
  ANSWER.forEach(([t, hi], i) => {
    if (budget <= 0) return;
    const s = t.slice(0, budget);
    budget -= s.length;
    const startAt = at + (used / cps) * FPS;
    used += t.length;
    out.push(hi ? (
      <span key={i} style={{ background: `rgba(30,90,232,${clamp((f - startAt - 6) / 6) * 0.35})`, color: "#fff", borderRadius: 8, padding: "0 6px", fontWeight: 800 }}>{s}</span>
    ) : <span key={i}>{s}</span>);
  });
  return <span style={{ fontSize: size }}>{out}{budget >= 0 && <Caret f={f} color={C.mint} />}</span>;
}

/* S13 · 645–720 · dark terminal split: logs on the left, the answer streams on the right */
export function S13({ f, d }: ShotProps) {
  const A = 645;
  const pose = camAt([[0, { x: -470, z: 430, ry: 18, rx: 4, y: 40 }], [38, { x: -120, z: 300, ry: 4, rx: 2, y: 40 }], [75, { x: 330, z: 420, ry: -14, rx: 3, y: 40 }]], f);
  const lines: [number, string, string][] = [
    [1, "$ brandpulse audit --questions 10", "#E8EEFA"],
    [7, "› engine   gemini · google search grounding", "#8EA6D6"],
    [14, "› q01      " + QUERY, "#8EA6D6"],
    [26, "✓ answer   captured · 214 words", C.mint],
    [40, "✓ sources  6 citations saved", C.mint],
    [54, "✓ brands   3 named · you: 0", "#FF8C97"],
  ];
  return (
    <Stage theme="dark" f={f} d={d} pose={pose} near="bar" nearDir={-1} hud="02 · Capture" demo
      overlay={
        <Ov x={110} y={80} style={{ color: "#fff", fontSize: 90, letterSpacing: "-0.04em", fontWeight: 300 }}>
          <Letters text="We capture " f={f} at={vo("capture") - A - 4} stagger={0.8} />
          {f >= vo("every", 21) - A - 2 && <Sweep f={f} at={vo("every", 21) - A - 2} color={C.mint} textColor={C.ink}><b style={{ fontWeight: 800 }}>every answer.</b></Sweep>}
        </Ov>
      }
    >
      <P x={60} y={270} w={820} h={600} z={-60} ry={10} style={{ background: "#050A14", borderRadius: 22, boxShadow: "0 0 0 1px #233457, 0 50px 120px -30px #000", padding: "28px 34px", ...mono }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <Dot key={c} c={c} s={14} />)}
          <span style={{ marginLeft: 16, color: "#56698F", fontSize: 16 }}>brandpulse · audit run</span>
        </div>
        {lines.map(([t, s, c]) => (
          <div key={s} style={{ color: c, fontSize: 25, lineHeight: "54px", whiteSpace: "nowrap", opacity: clamp((f - t) / 3), transform: `translateX(${(1 - expoOut(pr(f, t, 8))) * -30}px)` }}>
            {typed(s, f, t, 120)}
          </div>
        ))}
        <div style={{ position: "absolute", left: 34, right: 34, bottom: 30, height: 8, background: "#14213D", borderRadius: 4 }}>
          <div style={{ width: `${clamp(f / 70) * 100}%`, height: "100%", background: C.blue, borderRadius: 4 }} />
        </div>
      </P>
      <P x={960} y={240} w={900} h={660} ry={-6} style={{ ...card("dark"), padding: "40px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Spark size={30} color={C.sky} /><span style={{ ...label, color: "#A9BEE6" }}>AI answer · Q01</span>
          <span style={{ flex: 1 }} />
          <Pill bg="#1FC58A22" fg={C.mint} style={{ fontSize: 15 }}><Check size={16} color={C.mint} />Captured</Pill>
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, marginTop: 20, color: "#fff" }}>{QUERY}</div>
        <div style={{ marginTop: 26, lineHeight: 1.45, color: "#C9D6EE", fontWeight: 500 }}>
          <Streamed f={f} at={10} size={36} />
        </div>
      </P>
    </Stage>
  );
}

const SOURCES: [string, string, number, number][] = [
  ["g2.com", "4×", 1050, 300],
  ["reddit.com", "3×", 1560, 640],
  ["capterra.com", "3×", 2080, 260],
  ["northstarcrm.com", "2×", 2600, 620],
  ["youtube.com", "1×", 3100, 300],
];
const routeY = (x: number) => 520 + Math.sin((x - 300) / 330) * 170;

/* S14 · 720–810 · ride along a citation dot from the answer to every source, then crane up */
export function S14({ f, d }: ShotProps) {
  const A = 720;
  const ride = cubicInOut(clamp(f / 60));
  const dx = mix(520, 3150, ride);
  const reveal = cubicInOut(clamp((f - 58) / 30));
  const pose = {
    x: mix(dx - 960, 900, reveal),
    y: mix((routeY(dx) - 540) * 0.6, 0, reveal),
    z: mix(320, -1500, reveal),
    rx: mix(10, 26, reveal),
    ry: mix(-16, -4, reveal),
    rz: mix(-1.5, 0, reveal),
  };
  const path = Array.from({ length: 120 }, (_, i) => { const x = mix(520, 3150, i / 119); return `${i ? "L" : "M"}${x},${routeY(x)}`; }).join(" ");
  return (
    <Stage theme="dark" f={f} d={d} pose={pose} near="dot" hud="02 · Sources" demo
      overlay={
        <Ov x={110} y={80} style={{ color: "#fff", fontSize: 90, letterSpacing: "-0.04em", fontWeight: 300 }}>
          <Letters text="Every source " f={f} at={vo("source") - A - 6} stagger={0.8} />
          {f >= vo("it", 24) - A - 2 && <Sweep f={f} at={vo("it", 24) - A - 2} color={C.mint} textColor={C.ink}><b style={{ fontWeight: 800 }}>it trusts.</b></Sweep>}
        </Ov>
      }
    >
      <Floor y={1000} color="#24447F" o={0.5} size={6000} />
      <P x={0} y={0} w={3400} h={1080}>
        <svg width={3400} height={1080} style={{ overflow: "visible" }}>
          <path d={path} fill="none" stroke="#2C4D8E" strokeWidth={5} strokeDasharray="3 16" strokeLinecap="round" />
          <path d={path} fill="none" stroke={C.mint} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - ride} />
          {SOURCES.map(([n, , x, y]) => <line key={n} x1={x} y1={routeY(x)} x2={x} y2={y + 90} stroke="#3B5FA6" strokeWidth={3} />)}
        </svg>
      </P>
      <P x={120} y={360} w={420} h={300} z={20} style={{ ...card("dark"), padding: 30 }}>
        <div style={{ ...label, color: "#A9BEE6", fontSize: 15 }}>AI answer · Q01</div>
        {[1, 0.8, 0.9, 0.6].map((w, i) => <div key={i} style={{ height: 14, width: `${w * 100}%`, background: "#22345A", borderRadius: 7, marginTop: 22 }} />)}
        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>{[1, 2, 3].map((n) => <span key={n} style={{ ...mono, fontSize: 15, color: C.mint, border: `1px solid ${C.mint}66`, borderRadius: 6, padding: "2px 8px" }}>[{n}]</span>)}</div>
      </P>
      {SOURCES.map(([n, c, x, y], i) => {
        const hit = arrive(f, (clamp(((x - 520) / (3150 - 520))) * 60) - 2, 14);
        return (
          <P key={n} x={x - 210} y={y - 60} z={i % 2 ? -80 : 60} w={420} h={150} s={mix(0.6, 1, hit)} o={clamp(hit * 2)}
            style={{ ...card("light"), padding: "24px 30px", boxShadow: `0 0 0 ${hit > 0.9 ? 3 : 0}px ${C.mint}, 0 40px 90px -30px #000` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.paper2, display: "grid", placeItems: "center", ...mono, fontSize: 20, color: C.blue, fontWeight: 700 }}>{n[0].toUpperCase()}</div>
              <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em" }}>{n}</span>
            </div>
            <div style={{ ...label, fontSize: 15, marginTop: 14 }}>Cited {c} across answers</div>
          </P>
        );
      })}
      <P x={dx} y={routeY(dx)} z={30} center>
        <div style={{ position: "absolute", width: 34, height: 34, borderRadius: "50%", background: C.mint, boxShadow: `0 0 40px 14px ${C.green}aa`, transform: "translate(-50%,-50%)" }} />
      </P>
    </Stage>
  );
}

/** extruded 3D bar: front, right side, top */
function Bar({ x, base, h, w = 210, depth = 140, front, side, top }: { x: number; base: number; h: number; w?: number; depth?: number; front: string; side: string; top: string }) {
  return (
    <>
      <P x={x} y={base - h} w={w} h={h} style={{ background: front, borderRadius: "6px 6px 0 0" }} />
      <P x={x + w} y={base - h} w={depth} h={h} ry={90} origin="0 50%" style={{ background: side }} />
      <P x={x} y={base - h - depth} w={w} h={depth} rx={-90} origin="50% 100%" style={{ background: top }} />
    </>
  );
}

/* S15 · 810–862 · crane low across extruded bars: who gets named instead of you */
export function S15({ f, d }: ShotProps) {
  const A = 810;
  const you = vo("you", 28) - A;
  const data: [string, number, boolean][] = [["Northstar", 8, false], ["Atlas", 6, false], ["Pipewell", 5, false], ["You", 1, true]];
  const pose = addPose(camAt([[0, { x: -330, z: 160, ry: 24, rx: -8, y: -160 }], [52, { x: 300, z: 240, ry: -14, rx: -4, y: -120 }]], f), shake(f, you, 0.6));
  return (
    <Stage theme="paper" f={f} d={d} pose={pose} near="bar" hud="03 · Head to head" demo
      overlay={
        <Ov x={110} y={80} style={{ fontSize: 92, letterSpacing: "-0.04em", color: C.ink, lineHeight: 1.04 }}>
          <div style={{ fontWeight: 300 }}><Letters text="Who gets named" f={f} at={vo("who", 27) - A - 3} stagger={0.8} /></div>
          <div style={{ fontWeight: 300, opacity: f >= vo("instead") - A - 3 ? 1 : 0 }}>
            <Letters text="instead of " f={f} at={vo("instead") - A - 3} stagger={0.8} />
            <Slam f={f} at={you} style={{ fontWeight: 800, color: C.red }}>you.</Slam>
          </div>
        </Ov>
      }
    >
      <Floor y={900} color="#A9BEE0" o={0.9} />
      {data.map(([n, v, me], i) => {
        const x = 470 + i * 300;
        const h = 50 * v * expoOut(pr(f, 4 + i * 5, 22));
        return (
          <div key={n}>
            <Bar x={x} base={900} h={Math.max(4, h)} front={me ? "linear-gradient(180deg,#FF6B79,#E23B4D)" : "linear-gradient(180deg,#3F80FF,#1E5AE8)"} side={me ? "#B82A3A" : "#1444B8"} top={me ? "#FF9AA5" : "#7FB0FF"} />
            <P x={x - 20} y={900 - h - 240} w={260} z={40} style={{ textAlign: "center", opacity: clamp((f - 8 - i * 5) / 6) }}>
              <div style={{ fontSize: 84, fontWeight: 800, color: me ? C.red : C.ink, letterSpacing: "-0.04em" }}>{v}<span style={{ fontSize: 40, color: "#8C98B0", fontWeight: 500 }}>/10</span></div>
              <div style={{ fontSize: 30, fontWeight: 700, color: me ? C.red : "#3B4966" }}>{n}</div>
            </P>
          </div>
        );
      })}
    </Stage>
  );
}

/* S16 · 862–975 · "Why?" slam pulls back into the evidence quote and its reasons */
export function S16({ f, d }: ShotProps) {
  const back = cubicInOut(pr(f, 14, 26));
  const pose = addPose(camAt([[0, { z: 0, rz: 3 }], [14, { z: 0, rz: 0 }], [40, { z: 0, ry: 6, rx: 3 }], [80, { z: 330, ry: -6, x: 20, y: 40 }], [113, { z: 430, ry: -10, x: 90, y: 60, rx: 4 }]], f), shake(f, 1, 1));
  const reasons = ["Listed on G2 comparisons", "Named in Reddit threads", "Has a “vs” page"];
  return (
    <Stage theme="dark" f={f} d={d} pose={pose} near="card" hud="03 · Evidence" demo>
      <P x={960} y={mix(540, 205, back)} z={mix(300, 40, back)} center s={mix(1, 0.2, back)}>
        <div style={{ transform: "translate(-50%,-50%)", fontSize: 460, fontWeight: 800, color: back > 0.6 ? C.mint : "#fff", letterSpacing: "-0.06em", whiteSpace: "nowrap" }}>
          <Slam f={f} at={1}>Why?</Slam>
        </div>
      </P>
      <P x={300} y={330} w={1320} h={470} o={clamp((back - 0.4) * 3)} s={mix(0.85, 1, back)} style={{ ...card("dark"), padding: "56px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ ...label, color: "#A9BEE6" }}>Evidence · real answer · Q01</span>
        </div>
        <div style={{ fontSize: 58, fontWeight: 600, color: "#fff", lineHeight: 1.22, marginTop: 26, letterSpacing: "-0.02em" }}>
          “For a small sales team,{" "}
          <Sweep f={f} at={44} color={C.blue}><b style={{ fontWeight: 800 }}>Northstar CRM</b></Sweep>{" "}
          is the strongest pick.”
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 44, flexWrap: "wrap" }}>
          {reasons.map((r, i) => (
            <span key={r} style={{ transform: `translateY(${(1 - arrive(f, 58 + i * 7, 12)) * 40}px)`, opacity: clamp((f - 58 - i * 7) / 5), display: "inline-block" }}>
              <Pill bg="#A9FFDF1F" fg={C.mint} style={{ fontSize: 22 }}><Check size={20} color={C.mint} />{r}</Pill>
            </span>
          ))}
        </div>
      </P>
    </Stage>
  );
}

/* S17 · 975–1080 · ride-along route on the floor: write → publish → re-check */
export function S17({ f, d }: ShotProps) {
  const A = 975;
  const t = [vo("write") - A, vo("publish") - A, vo("re-check") - A];
  const nodes: [number, number][] = [[700, 0], [1500, -520], [2300, -1040]];
  // dot position along the route: piecewise between nodes, arriving at each on its VO word
  const seg = (a: [number, number], b: [number, number], q: number): [number, number] => [mix(a[0], b[0], q), mix(a[1], b[1], q)];
  let pos: [number, number];
  if (f < t[0]) pos = seg([0, 420], nodes[0], cubicInOut(clamp(f / t[0])));
  else if (f < t[1]) pos = seg(nodes[0], nodes[1], cubicInOut(pr(f, t[0] + 6, t[1] - t[0] - 6)));
  else if (f < t[2]) pos = seg(nodes[1], nodes[2], cubicInOut(pr(f, t[1] + 6, t[2] - t[1] - 6)));
  else pos = nodes[2];
  const pose = { x: pos[0] - 960 + 60, y: 20, z: -pos[1] + 330, rx: 14, ry: -14, rz: -1.5 };
  const FY = 820;
  const rise = (i: number) => expoOut(pr(f, t[i] - 14, 16));
  const size = 4000;
  const toFloor = (x: number, z: number) => [x - (960 - size / 2), z + size / 2];
  const pts = [[0, 420], ...nodes, [2900, -1400]] as [number, number][];
  return (
    <Stage theme="paper" f={f} d={d} pose={pose} near="none" hud="04 · We fix it" demo
      overlay={
        <Ov x={110} y={80} style={{ fontSize: 110, letterSpacing: "-0.045em", color: C.ink, fontWeight: 300 }}>
          Then we{" "}
          <StepRoll f={f} times={[0, t[1] - 2, t[2] - 2]} items={["write.", "publish.", "re-check."]} style={{ fontWeight: 800, color: C.blue }} />
        </Ov>
      }
    >
      <P x={960 - size / 2} y={FY - size / 2} w={size} h={size} rx={90}>
        <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <pattern id="fl" width="120" height="120" patternUnits="userSpaceOnUse"><path d="M120 0H0V120" fill="none" stroke="#C5D3EA" strokeWidth="2" /></pattern>
            <radialGradient id="flm"><stop offset="0" stopColor="#fff" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /></radialGradient>
            <mask id="flmask"><rect width={size} height={size} fill="url(#flm)" /></mask>
          </defs>
          <rect width={size} height={size} fill="url(#fl)" mask="url(#flmask)" />
          <polyline points={pts.map(([x, z]) => toFloor(x, z).join(",")).join(" ")} fill="none" stroke="#B7C7E4" strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={[...pts.slice(0, 1 + nodes.filter((_, i) => f >= t[i]).length), pos].map(([x, z]) => toFloor(x, z).join(",")).join(" ")} fill="none" stroke={C.blue} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
          {nodes.map(([x, z], i) => { const [u, v] = toFloor(x, z); return <circle key={i} cx={u} cy={v} r={f >= t[i] ? 70 : 44} fill={f >= t[i] ? C.blue : "#C9D6EC"} />; })}
        </svg>
      </P>
      <P x={pos[0]} y={FY - 30} z={pos[1]} center>
        <div style={{ position: "absolute", width: 60, height: 60, borderRadius: "50%", background: C.green, boxShadow: `0 0 50px 16px ${C.green}88`, transform: "translate(-50%,-50%)" }} />
      </P>
      {/* 01 write */}
      <P x={nodes[0][0] - 360} y={FY - 600} z={nodes[0][1] - 40} w={720} h={540} rx={(1 - rise(0)) * 90} origin="50% 100%" style={{ ...card("light"), padding: 34 }}>
        <div style={{ ...label, color: C.blue }}>01 · Page draft</div>
        <div style={{ fontSize: 34, fontWeight: 800, marginTop: 16, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{typed("Best CRM for small sales teams (2026)", f, t[0], 40)}<Caret f={f} /></div>
        {[0.95, 0.8, 0.9, 0.6, 0.85].map((w, i) => <div key={i} style={{ height: 12, borderRadius: 6, background: "#E4EAF4", marginTop: 18, width: `${w * clamp((f - t[0] - 8 - i * 3) / 10) * 100}%` }} />)}
      </P>
      {/* 02 publish */}
      <P x={nodes[1][0] - 360} y={FY - 600} z={nodes[1][1] - 40} w={720} h={540} rx={(1 - rise(1)) * 90} origin="50% 100%" style={{ ...card("light"), padding: 34 }}>
        <div style={{ ...label, color: C.blue }}>02 · Published</div>
        <div style={{ ...mono, marginTop: 20, padding: "14px 18px", borderRadius: 12, background: "#F1F4FA", fontSize: 20, color: "#3B4966" }}>yourcompany.com/best-crm-small-teams</div>
        <div style={{ marginTop: 30, display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ transform: `scale(${arrive(f, t[1] + 8, 12)})`, display: "inline-block" }}><Pill bg="#DDF8EC" fg="#0F8A5F"><Check size={20} />Live</Pill></span>
          <span style={{ ...mono, fontSize: 18, color: C.mute }}>schema · FAQ · comparison</span>
        </div>
        <div style={{ marginTop: 34, height: 120, borderRadius: 16, background: "linear-gradient(135deg,#E8F0FF,#F6F9FF)" }} />
      </P>
      {/* 03 re-check */}
      <P x={nodes[2][0] - 360} y={FY - 600} z={nodes[2][1] - 40} w={720} h={540} rx={(1 - rise(2)) * 90} origin="50% 100%" style={{ ...card("light"), padding: 34 }}>
        <div style={{ ...label, color: C.blue }}>03 · Re-check</div>
        <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 30 }}>
          <svg width={160} height={160} viewBox="0 0 100 100">
            <circle cx={50} cy={50} r={40} fill="none" stroke="#E4EAF4" strokeWidth={10} />
            <circle cx={50} cy={50} r={40} fill="none" stroke={C.blue} strokeWidth={10} strokeLinecap="round" strokeDasharray={251} strokeDashoffset={251 * (1 - clamp((f - t[2]) / 30))} transform="rotate(-90 50 50)" />
          </svg>
          <div>
            <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.04em" }}>{Math.min(10, Math.max(0, Math.floor((f - t[2]) / 3)))}<span style={{ color: C.mute, fontWeight: 400 }}>/10</span></div>
            <div style={{ ...label, fontSize: 15 }}>Same questions</div>
          </div>
        </div>
      </P>
    </Stage>
  );
}

/* S18 · 1080–1140 · callback to the ten tiles: the re-check flips some to "named" */
export function S18({ f, d }: ShotProps) {
  const pose = camAt([[0, { rx: 10, z: 160, rz: -1 }], [60, { rx: 30, z: -140, rz: 2, y: 30 }]], f);
  const win = [1, 3, 4, 7];
  const flip = (i: number) => { const k = win.indexOf(i); return k < 0 ? 0 : clamp((f - 6 - k * 6) / 7); };
  const named = win.filter((i) => flip(i) >= 1).length;
  return (
    <Stage theme="dark" f={f} d={d} pose={pose} near="bar" hud="Re-check · same 10 questions" demo
      overlay={
        <Ov x={110} y={70} style={{ color: "#fff" }}>
          <div style={{ fontSize: 200, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1 }}>
            <span style={{ color: named ? C.mint : "#fff" }}>{named}</span><span style={{ color: "#4A5F8C", fontWeight: 300 }}>/10</span>
          </div>
          <div style={{ ...label, color: "#A9BEE6", fontSize: 22, marginTop: 10 }}>answers that now name you</div>
        </Ov>
      }
    >
      <Floor y={1000} color="#24447F" o={0.6} />
      {Array.from({ length: 10 }, (_, i) => {
        const col = i % 5, row = Math.floor(i / 5);
        const q = flip(i);
        return (
          <P key={i} x={240 + col * 300} y={430 + row * 250} w={270} h={220} rx={14} ry={q * 180} s={1 + Math.sin(q * Math.PI) * 0.12} style={{ transformStyle: "preserve-3d" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 20, background: "linear-gradient(160deg,#3A1220,#22101A)", boxShadow: "0 0 0 2px #FF4D5E55", backfaceVisibility: "hidden", display: "grid", placeItems: "center" }}>
              <div style={{ textAlign: "center" }}><Cross size={48} /><div style={{ ...mono, color: "#FF8C97", fontSize: 16, marginTop: 6, letterSpacing: "0.12em" }}>NOT NAMED</div></div>
            </div>
            <div style={{ position: "absolute", inset: 0, borderRadius: 20, background: "linear-gradient(160deg,#0F4A3A,#0B2A24)", boxShadow: `0 0 0 3px ${C.mint}, 0 0 60px ${C.green}66`, transform: "rotateY(180deg)", backfaceVisibility: "hidden", display: "grid", placeItems: "center" }}>
              <div style={{ textAlign: "center" }}><Check size={60} color={C.mint} /><div style={{ ...mono, color: C.mint, fontSize: 16, marginTop: 6, letterSpacing: "0.12em" }}>NAMED</div></div>
            </div>
          </P>
        );
      })}
    </Stage>
  );
}
