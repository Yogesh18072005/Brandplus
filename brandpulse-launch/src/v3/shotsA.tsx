/* HOOK · PROBLEM · REVEAL  (frames 0–480) */
import {
  C, P, Pill, Dot, Mark, Cross, Spark, SearchIcon, Caret, Letters, Sweep, Slot, Slam, Floor,
  arrive, camAt, clamp, expoOut, mix, pr, shake, addPose, typed, card, label, mono, vo, cubicInOut,
} from "./lib";
import { Stage, Ov } from "./stage";

export type ShotProps = { f: number; d: number };
const NAMES = ["Northstar CRM", "Atlas", "Pipewell"];
const QUERY = "best CRM for a small sales team?";

/* S1 · 0–45 · caret-follow extreme close-up of the buyer's question */
export function S01({ f, d }: ShotProps) {
  const shown = typed(QUERY, f, 3, 30);
  const caretX = 200 + 150 + shown.length * 63;
  const base = camAt([[0, { z: 430, ry: -26, rx: 12, rz: -3, y: 0 }], [45, { z: 520, ry: -14, rx: 6, rz: -1 }]], f);
  const pose = { ...base, x: mix(-260, caretX - 1080, cubicInOut(clamp(f / 40))) };
  return (
    <Stage theme="dark" f={f} d={d} pose={pose} near="bar" hud="09:41 · somewhere"
      overlay={
        <Ov x={110} y={760} style={{ color: "#fff", fontSize: 92, lineHeight: 1.04, letterSpacing: "-0.03em" }}>
          <div style={{ fontWeight: 300 }}><Letters text="A buyer just" f={f} at={vo("buyer") - 4} /></div>
          <div style={{ fontWeight: 800 }}>
            <Letters text="asked " f={f} at={vo("asked")} />
            {f >= vo("ai") - 2 && <Sweep f={f} at={vo("ai") - 2} color={C.blue}>AI.</Sweep>}
          </div>
        </Ov>
      }
    >
      <Floor y={980} color="#2A4C93" o={0.6} />
      {/* faint answer cards far behind */}
      {[0, 1, 2, 3].map((i) => (
        <P key={i} x={300 + i * 700} y={60 + (i % 2) * 120} z={-900} w={560} h={150} blur={10} o={0.5}
          style={{ ...card("dark"), borderRadius: 24 }} />
      ))}
      <P x={200} y={400} w={3100} h={260} style={{ background: "#fff", borderRadius: 130, boxShadow: "0 0 0 3px #3D74F0, 0 0 120px 10px #1E5AE866, 0 60px 120px -40px #000" }}>
        <div style={{ position: "absolute", left: 70, top: 72 }}><SearchIcon size={110} color="#9AA6BD" /></div>
        <div style={{ position: "absolute", left: 230, top: 50, fontSize: 124, fontWeight: 500, color: C.ink, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
          {shown}
          <Caret f={f} color={C.blue} solid={shown.length < QUERY.length} />
        </div>
      </P>
      <P x={250} y={300} z={60} style={{ ...label, color: "#8FB0F0", fontSize: 26 }}>Ask anything</P>
    </Stage>
  );
}

/* S2 · 45–105 · crane up off the floor: the question becomes an AI answer loading */
export function S02({ f, d }: ShotProps) {
  const A = 45;
  const pose = camAt([[0, { rx: 50, z: 40, y: 60, ry: -12 }], [42, { rx: 16, z: 260, y: -60, ry: 8 }], [60, { rx: 12, z: 330, y: -70, ry: 11 }]], f);
  const shimmer = (f * 26) % 1400;
  return (
    <Stage theme="dark" f={f} d={d} pose={pose} near="card" nearDir={-1} hud="AI answer · loading"
      overlay={
        <Ov x={110} y={760} style={{ color: "#fff", fontSize: 120, fontWeight: 300, letterSpacing: "-0.035em", lineHeight: 1 }}>
          <Letters text="who to " f={f} at={vo("who") - A - 3} />
          {f >= vo("who") - A + 2 && <Slot f={f} at={vo("who") - A + 2} dur={vo("choose") - vo("who") + 4} items={["hire?", "buy?", "trust?", "choose?"]} style={{ fontWeight: 800, color: C.mint }} />}
        </Ov>
      }
    >
      <Floor y={900} color="#2B4E99" o={0.7} />
      <P x={310} y={150} w={1300} h={600} style={{ ...card("dark"), padding: "46px 56px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Spark size={40} color={C.sky} />
          <span style={{ ...label, color: "#A9BEE6", fontSize: 20 }}>AI answer</span>
          <span style={{ flex: 1 }} />
          <Pill bg="#1E5AE833" fg="#A9C7FF" style={{ fontSize: 17 }}><Dot c={C.sky} s={9} />Searching the web</Pill>
        </div>
        <div style={{ marginTop: 34, fontSize: 52, fontWeight: 700, letterSpacing: "-0.02em" }}>{QUERY}</div>
        <div style={{ marginTop: 44, display: "grid", gap: 26 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: "flex", gap: 22, alignItems: "center", opacity: clamp((f - 8 - i * 6) / 8) }}>
              <div style={{ width: 54, height: 54, borderRadius: 14, background: "#1C2C4E" }} />
              <div style={{ flex: 1, height: 22, borderRadius: 11, background: "#1C2C4E", position: "relative", overflow: "hidden", maxWidth: 900 - i * 170 }}>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: shimmer - 400 - i * 120, width: 300, background: "linear-gradient(90deg,transparent,#4D7CE0aa,transparent)" }} />
              </div>
            </div>
          ))}
        </div>
      </P>
    </Stage>
  );
}

/* S3 · 105–150 · lateral dolly along three named companies */
export function S03({ f, d }: ShotProps) {
  const A = 105;
  const pose = camAt([[0, { x: -160, y: -80, z: 80, ry: 20, rx: 6 }], [45, { x: 220, y: 140, z: 210, ry: -9, rx: 3 }]], f);
  const beats = [vo("names") - A, vo("three") - A, vo("companies") - A];
  return (
    <Stage theme="paper" f={f} d={d} pose={pose} near="bar" hud="AI answer · 3 recommended" demo
      overlay={
        <Ov x={110} y={900} style={{ fontSize: 84, color: C.ink, letterSpacing: "-0.03em", fontWeight: 300 }}>
          It names <Slam f={f} at={beats[1]} style={{ fontWeight: 800, color: C.blue }}>three.</Slam>
        </Ov>
      }
    >
      <P x={700} y={-180} z={-1300} blur={7} style={{ fontSize: 1400, fontWeight: 800, color: "#D5E0F2", lineHeight: 1 }}>3</P>
      {NAMES.map((n, i) => {
        const q = arrive(f, beats[i], 16);
        return (
          <P key={n} x={300 + i * 190 + (1 - q) * 700} y={250 + i * 250} z={-i * 130} ry={(1 - q) * 35} o={clamp(q * 2)} w={1180} h={190}
            style={{ ...card("light"), display: "flex", alignItems: "center", padding: "0 52px", gap: 40 }}>
            <span style={{ ...mono, fontSize: 44, color: C.blue, fontWeight: 600 }}>0{i + 1}</span>
            <span style={{ fontSize: 86, fontWeight: 800, letterSpacing: "-0.035em", flex: 1 }}>{n}</span>
            <Pill bg="#DDF8EC" fg="#0F8A5F"><Dot c={C.green} />Recommended</Pill>
          </P>
        );
      })}
    </Stage>
  );
}

/* S4 · 150–180 · push into the plant: "NOT MENTIONED" */
export function S04({ f, d }: ShotProps) {
  const pill = 5;
  const pose = addPose(camAt([[0, { z: 0, x: 0, ry: 6, rx: 4 }], [30, { z: 600, x: 400, y: 150, ry: -5, rx: 2 }]], f), shake(f, pill + 4, 0.5));
  const rack = clamp((f - 6) / 18) * 6;
  return (
    <Stage theme="paper" f={f} d={d} pose={pose} near="none" hud="Your brand · 0 mentions" demo>
      <P x={340} y={110} w={1240} h={860} style={{ ...card("light"), padding: "44px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, filter: `blur(${rack}px)` }}>
          <Spark size={34} />
          <span style={{ ...label }}>AI answer</span>
        </div>
        <div style={{ marginTop: 20, fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", filter: `blur(${rack}px)` }}>{QUERY}</div>
        <div style={{ marginTop: 34, display: "grid", gap: 18 }}>
          {NAMES.map((n, i) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 24, padding: "22px 30px", borderRadius: 20, background: "#F3F6FB", filter: `blur(${rack}px)` }}>
              <span style={{ ...mono, color: C.blue, fontSize: 26 }}>0{i + 1}</span>
              <span style={{ fontSize: 46, fontWeight: 800, flex: 1, letterSpacing: "-0.02em" }}>{n}</span>
              <Pill bg="#DDF8EC" fg="#0F8A5F" style={{ fontSize: 18 }}><Dot c={C.green} s={10} />Recommended</Pill>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "22px 30px", borderRadius: 20, border: "3px dashed #FFB3BB", background: "#FFF3F4" }}>
            <span style={{ ...mono, color: C.red, fontSize: 26 }}>--</span>
            <span style={{ fontSize: 46, fontWeight: 800, flex: 1, color: "#9AA3B5", letterSpacing: "-0.02em" }}>Your brand</span>
            <span style={{ display: "inline-block", transform: `scale(${arrive(f, pill, 12)})` }}>
              <Pill bg={C.red} fg="#fff" style={{ fontSize: 22 }}><Cross size={22} color="#fff" q={pr(f, pill + 3, 8)} />Not mentioned</Pill>
            </span>
          </div>
        </div>
      </P>
    </Stage>
  );
}

/* S5 · 180–210 · orbit around "None of them are you." */
export function S05({ f, d }: ShotProps) {
  const A = 180;
  const you = vo("you", 6) - A;
  const pose = addPose(camAt([[0, { ry: -28, z: -60, x: -80, rx: 4 }], [30, { ry: 7, z: 140, x: 40, rx: -2 }]], f), shake(f, you, 1));
  return (
    <Stage theme="dark" f={f} d={d} pose={pose} near="dot" hud="The gap">
      <P x={-300} y={180} z={-1000} blur={9} o={0.9} style={{ fontSize: 300, fontWeight: 800, color: "#16274A", whiteSpace: "nowrap", letterSpacing: "-0.04em" }}>
        {NAMES.join(" · ")}
      </P>
      <P x={250} y={300} w={1500} style={{ color: "#fff", fontSize: 168, letterSpacing: "-0.045em", lineHeight: 1.02 }}>
        <div style={{ fontWeight: 300 }}><Letters text="None of them" f={f} at={vo("none") - A - 2} stagger={1} /></div>
        <div style={{ fontWeight: 300 }}>
          <Letters text="are " f={f} at={vo("are", 6) - A - 2} />
          {f >= you && (
            <Slam f={f} at={you} style={{ fontWeight: 800 }}>
              <Sweep f={f} at={you + 2} color={C.red} dur={7}>you.</Sweep>
            </Slam>
          )}
        </div>
      </P>
    </Stage>
  );
}

/* S6 · 210–255 · diagonal split: your dashboard says fine, AI says otherwise */
export function S06({ f, d }: ShotProps) {
  const A = 210;
  const seam = mix(1500, 1040, expoOut(pr(f, 0, 14)));
  const L = camAt([[0, { rz: -3, x: -60, z: 40, ry: 8 }], [45, { rz: 1, x: 40, z: 140, ry: -4 }]], f);
  const R = camAt([[0, { rz: 3, x: 80, z: 0, ry: -10 }], [45, { rz: -1, x: -30, z: 160, ry: 4 }]], f);
  const metrics: [string, string][] = [["Organic traffic", "+12%"], ["Google ranking", "Page 1"], ["Site health", "98 / 100"]];
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, clipPath: `polygon(0 0, ${seam}px 0, ${seam - 220}px 1080px, 0 1080px)` }}>
        <Stage theme="paper" f={f} d={d} pose={L} near="none" hud="">
          <P x={150} y={170} w={760} h={680} style={{ ...card("light"), padding: 44 }}>
            <div style={{ ...label }}>Your analytics</div>
            <div style={{ display: "grid", gap: 20, marginTop: 30 }}>
              {metrics.map(([k, v], i) => (
                <div key={k} style={{ display: "flex", alignItems: "center", padding: "26px 28px", borderRadius: 18, background: "#F2F7F4", opacity: clamp((f - i * 5) / 8), transform: `translateY(${(1 - arrive(f, i * 5, 12)) * 40}px)` }}>
                  <span style={{ fontSize: 34, fontWeight: 600, flex: 1 }}>{k}</span>
                  <span style={{ fontSize: 40, fontWeight: 800, color: "#0F8A5F" }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 34, fontSize: 30, color: "#0F8A5F", fontWeight: 700, display: "flex", gap: 12, alignItems: "center" }}><Dot c={C.green} /> Everything looks fine</div>
          </P>
        </Stage>
      </div>
      <div style={{ position: "absolute", inset: 0, clipPath: `polygon(${seam}px 0, 1920px 0, 1920px 1080px, ${seam - 220}px 1080px)` }}>
        <Stage theme="dark" f={f} d={d} pose={R} near="none" hud="What AI says">
          {[0, 1, 2].map((i) => (
            <P key={i} x={1100 + i * 40} y={140 + i * 250} z={-i * 90} w={700} h={210} style={{ ...card("dark"), padding: "30px 36px", opacity: clamp((f - 4 - i * 6) / 8) }}>
              <div style={{ ...label, color: "#8EA6D6", fontSize: 15 }}>AI answer · Q0{i + 2}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
                {NAMES.slice(0, 3 - (i % 2)).map((n) => <Pill key={n} bg="#1E5AE833" fg="#BFD3FF" style={{ fontSize: 20 }}>{n}</Pill>)}
                <Pill bg="#FF4D5E22" fg="#FF8C97" style={{ fontSize: 20 }}><Cross size={18} color="#FF8C97" />You</Pill>
              </div>
            </P>
          ))}
        </Stage>
      </div>
      <div style={{ position: "absolute", left: seam - 112, top: -40, width: 6, height: 1160, background: "#fff", transform: "rotate(11.5deg)", boxShadow: "0 0 30px #fff" }} />
      <Ov x={110} y={890} style={{ fontSize: 96, fontWeight: 300, letterSpacing: "-0.04em", color: C.ink, mixBlendMode: "normal" }}>
        <span style={{ background: "#ffffffd9", padding: "0 18px", borderRadius: 14 }}>
          <Letters text="And you'd never " f={f} at={vo("and", 7) - A - 3} stagger={0.8} />
          {f >= vo("even") - A - 2 && <Sweep f={f} at={vo("even") - A - 2} color={C.red} textColor="#fff"><b style={{ fontWeight: 800 }}>even know.</b></Sweep>}
        </span>
      </Ov>
    </div>
  );
}

/* S7 · 255–315 · crane over ten answers; every tile flips to "not named" */
export function S07({ f, d }: ShotProps) {
  const pose = camAt([[0, { rx: 32, z: -120, y: 20, x: 60 }], [60, { rx: 12, z: 250, y: -10, x: 40, rz: -2 }]], f);
  const flipped = (i: number) => clamp((f - 8 - i * 4) / 7);
  const count = Array.from({ length: 10 }, (_, i) => flipped(i) >= 1).filter(Boolean).length;
  return (
    <Stage theme="dark" f={f} d={d} pose={pose} near="bar" nearDir={-1} hud="10 buyer questions" demo
      overlay={
        <Ov x={110} y={70} style={{ color: "#fff" }}>
          <div style={{ fontSize: 200, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1 }}>
            0<span style={{ color: "#4A5F8C", fontWeight: 300 }}>/10</span>
          </div>
          <div style={{ ...label, color: "#A9BEE6", fontSize: 22, marginTop: 10 }}>answers that named you · {count} checked</div>
        </Ov>
      }
    >
      <Floor y={1000} color="#24447F" o={0.6} />
      {Array.from({ length: 10 }, (_, i) => {
        const col = i % 5, row = Math.floor(i / 5);
        const q = flipped(i);
        return (
          <P key={i} x={240 + col * 300} y={430 + row * 250} w={270} h={220} rx={14} ry={q * 180} style={{ transformStyle: "preserve-3d" }}>
            <div style={{ position: "absolute", inset: 0, ...card("dark"), borderRadius: 20, padding: 22, backfaceVisibility: "hidden" }}>
              <div style={{ ...label, fontSize: 14 }}>Q{String(i + 1).padStart(2, "0")}</div>
              <div style={{ height: 12, background: "#22345A", borderRadius: 6, marginTop: 22, width: "90%" }} />
              <div style={{ height: 12, background: "#22345A", borderRadius: 6, marginTop: 14, width: "70%" }} />
              <div style={{ height: 12, background: "#22345A", borderRadius: 6, marginTop: 14, width: "80%" }} />
            </div>
            <div style={{ position: "absolute", inset: 0, borderRadius: 20, background: "linear-gradient(160deg,#3A1220,#22101A)", boxShadow: "0 0 0 2px #FF4D5E88", transform: "rotateY(180deg)", backfaceVisibility: "hidden", display: "grid", placeItems: "center", textAlign: "center" }}>
              <div>
                <Cross size={56} q={1} />
                <div style={{ ...mono, color: "#FF8C97", fontSize: 18, marginTop: 8, letterSpacing: "0.12em" }}>NOT NAMED</div>
              </div>
            </div>
          </P>
        );
      })}
    </Stage>
  );
}

/* S8 · 315–360 · chase the brand dot along a path; words ride the route */
export function S08({ f, d }: ShotProps) {
  const q = cubicInOut(clamp(f / 40));
  const dotX = mix(-100, 2500, q);
  const dotY = 560 + Math.sin(q * Math.PI * 2) * 90;
  const pose = { x: dotX - 960, y: (dotY - 540) * 0.6, z: 150, rx: 8, ry: mix(-14, 10, q), rz: mix(-2, 2, q) };
  const words: [string, number, boolean][] = [["What if", 300, false], ["you could", 1050, false], ["see it?", 1850, true]];
  const grow = clamp((f - 36) / 9);
  return (
    <Stage theme="dark" f={f} d={d} pose={pose} near="dot" hud="">
      <P x={-300} y={0} w={3200} h={1080}>
        <svg width={3200} height={1080} style={{ overflow: "visible" }}>
          <path d={Array.from({ length: 81 }, (_, i) => { const t = i / 80; const x = mix(-100, 2500, t) + 300; const y = 560 + Math.sin(t * Math.PI * 2) * 90; return `${i ? "L" : "M"}${x},${y}`; }).join(" ")}
            fill="none" stroke="#2F4F8F" strokeWidth={4} strokeDasharray="4 18" strokeLinecap="round" />
        </svg>
      </P>
      {words.map(([w, x, hi], i) => (
        <P key={w} x={x} y={300 - (i % 2) * 40} z={80} style={{ fontSize: 150, fontWeight: hi ? 800 : 300, color: hi ? C.mint : "#fff", letterSpacing: "-0.045em", whiteSpace: "nowrap", opacity: clamp((dotX - x + 400) / 300) }}>
          {w}
        </P>
      ))}
      <P x={dotX} y={dotY} z={40} center>
        <div style={{ width: 46 + grow * 1400, height: 46 + grow * 1400, borderRadius: "50%", background: grow > 0 ? `radial-gradient(circle, ${C.green} ${Math.max(0, 3 - grow * 3) * 30}%, ${C.blue} ${Math.max(10, 40 - grow * 40)}%)` : C.green, boxShadow: `0 0 60px 20px ${C.green}88`, transform: "translate(-50%,-50%)", position: "absolute" }} />
      </P>
    </Stage>
  );
}

/* S9 · 360–420 · "Meet" slam, the mark draws, wordmark per-letter */
export function S09({ f, d }: ShotProps) {
  const A = 360;
  const meet = vo("meet") - A;
  const settle = expoOut(pr(f, meet + 8, 14));
  const pose = addPose(camAt([[0, { z: 420, rz: 5, ry: -10 }], [30, { z: 80, rz: 0, ry: 0 }], [60, { z: 0, ry: -7, x: 20, rx: 2 }]], f), shake(f, meet, 0.8));
  return (
    <Stage theme="blue" f={f} d={d} pose={pose} near="dot" hud="Introducing">
      <P x={-100} y={-200} z={-900} w={900} h={900} blur={60} o={0.5} style={{ borderRadius: "50%", background: "#8FC0FF" }} />
      <P x={1300} y={500} z={-1100} w={1000} h={1000} blur={70} o={0.35} style={{ borderRadius: "50%", background: C.mint }} />
      <P x={960} y={mix(540, 300, settle)} center s={mix(1, 0.32, settle)} style={{ color: "#fff", fontSize: 330, fontWeight: 800, letterSpacing: "-0.05em", transformOrigin: "0 0" }}>
        <div style={{ transform: "translate(-50%,-50%)" }}>
          <Slam f={f} at={meet}>Meet</Slam>
        </div>
      </P>
      <P x={360} y={410} z={60} style={{ opacity: f >= meet + 10 ? 1 : 0 }}>
        <Mark size={260} draw={expoOut(pr(f, meet + 10, 16))} dot={arrive(f, meet + 22, 12)} ring="#ffffff" />
      </P>
      <P x={680} y={430} z={30} style={{ color: "#fff", fontSize: 196, fontWeight: 800, letterSpacing: "-0.055em", lineHeight: 1 }}>
        <Letters text="BrandPulse" f={f} at={meet + 14} stagger={1.3} dur={14} />
      </P>
    </Stage>
  );
}

/* S10 · 420–480 · payoff: the "not mentioned" row is scanned into "gap found" */
export function S10({ f, d }: ShotProps) {
  const A = 420;
  const gap = vo("gap") - A;
  const pose = camAt([[0, { rx: 42, z: -140, y: 90, ry: -8 }], [40, { rx: 12, z: 160, y: 70, ry: 4 }], [60, { rx: 9, z: 230, y: 90, ry: 6 }]], f);
  const scan = expoOut(pr(f, 4, 18));
  const found = f >= 16;
  return (
    <Stage theme="paper" f={f} d={d} pose={pose} near="card" hud="Gap found" demo
      overlay={
        <Ov x={110} y={74} style={{ fontSize: 104, letterSpacing: "-0.045em", color: C.ink, fontWeight: 300 }}>
          We find{" "}
          <Sweep f={f} at={gap - 1} color={C.blue} textColor="#fff"><b style={{ fontWeight: 800 }}>the gap.</b></Sweep>
        </Ov>
      }
    >
      <P x={420} y={300} w={1080} h={720} style={{ ...card("light"), padding: "40px 52px", overflow: "hidden" }}>
        <div style={{ ...label }}>AI answer · {QUERY}</div>
        <div style={{ marginTop: 26, display: "grid", gap: 16 }}>
          {NAMES.map((n, i) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 20, padding: "18px 26px", borderRadius: 18, background: "#F3F6FB", opacity: 0.55 }}>
              <span style={{ ...mono, color: C.blue, fontSize: 22 }}>0{i + 1}</span>
              <span style={{ fontSize: 38, fontWeight: 800, flex: 1 }}>{n}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "22px 26px", borderRadius: 18, border: `3px ${found ? "solid" : "dashed"} ${found ? C.blue : "#FFB3BB"}`, background: found ? "#EAF1FF" : "#FFF3F4", transform: `scale(${found ? mix(1.06, 1, expoOut(pr(f, 16, 12))) : 1})` }}>
            <span style={{ fontSize: 40, fontWeight: 800, flex: 1, color: found ? C.ink : "#9AA3B5" }}>Your brand</span>
            {found ? (
              <span style={{ transform: `scale(${arrive(f, 16, 12)})`, display: "inline-block" }}>
                <Pill bg={C.blue} fg="#fff"><Dot c={C.mint} />Gap found · fixable</Pill>
              </span>
            ) : (
              <Pill bg={C.red} fg="#fff">Not mentioned</Pill>
            )}
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: mix(-40, 760, scan), height: 6, background: C.blue, boxShadow: `0 0 50px 18px ${C.blue}66`, opacity: scan < 1 ? 1 : 0 }} />
      </P>
    </Stage>
  );
}
