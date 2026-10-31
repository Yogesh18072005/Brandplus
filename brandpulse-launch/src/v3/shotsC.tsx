/* PROOF · OFFER · BRAND  (frames 1140–1800) */
import type { ReactNode } from "react";
import {
  C, P, Dot, Cross, Check, Caret, Letters, Sweep, Slot, Slam, Floor, Mark, Cursor,
  arrive, camAt, clamp, expoOut, mix, pr, addPose, shake, typed, card, label, mono, vo, cubicInOut,
} from "./lib";
import { Stage, Ov } from "./stage";
import type { ShotProps } from "./shotsA";

/* S19 · 1140–1205 · "Real answers, as evidence." — slam + roll, quote cards stream past */
export function S19({ f, d }: ShotProps) {
  const A = 1140;
  const real = vo("real", 30) - A;
  const pose = addPose(camAt([[0, { z: 320, rz: -6, ry: 10 }], [30, { z: 80, rz: -1, ry: 2 }], [65, { z: 160, rz: 1.5, ry: -8, x: 40 }]], f), shake(f, real, 1));
  const quotes = ["“Northstar CRM is the strongest pick…”", "“Atlas is a solid budget option…”", "“Teams in Gmail prefer Pipewell…”"];
  return (
    <Stage theme="blue" f={f} d={d} pose={pose} near="card" hud="Proof">
      {quotes.map((q, i) => (
        <P key={q} x={mix(2100, -900, clamp((f + i * 22) / 70))} y={120 + i * 330} z={-500 - i * 200} w={760} h={170} blur={4 + i * 2} o={0.7}
          style={{ ...card("light"), padding: "34px 40px", fontSize: 34, fontWeight: 700, color: C.ink }}>{q}</P>
      ))}
      <P x={170} y={300} style={{ color: "#fff", fontSize: 250, letterSpacing: "-0.055em", lineHeight: 1, whiteSpace: "nowrap" }}>
        <div>
          <Slam f={f} at={real} style={{ fontWeight: 800 }}>Real</Slam>{" "}
          <span style={{ fontWeight: 300 }}><Letters text="answers," f={f} at={vo("answers", 38) - A - 2} stagger={1} /></span>
        </div>
        <div style={{ fontWeight: 300, marginTop: 10 }}>
          <Letters text="as " f={f} at={vo("as", 39) - A - 3} />
          {f >= vo("evidence") - A - 6 && <Sweep f={f} at={vo("evidence") - A - 6} color={C.mint} textColor={C.ink}><b style={{ fontWeight: 800 }}>evidence.</b></Sweep>}
        </div>
      </P>
    </Stage>
  );
}

/* S20 · 1205–1280 · dolly down an aisle between two facing columns: them vs you */
export function S20({ f, d }: ShotProps) {
  const A = 1205;
  const pose = camAt([[0, { z: -420, ry: 6, y: 20 }], [75, { z: 420, ry: -5, y: 0 }]], f);
  const qs = ["best CRM for a small team", "HubSpot alternatives", "CRM inside Gmail", "cheapest CRM", "easiest CRM to set up"];
  const col = (them: boolean) => (
    <div style={{ ...card(them ? "light" : "light"), width: "100%", height: "100%", padding: "50px 54px" }}>
      <div style={{ ...label, color: them ? C.blue : C.red }}>{them ? "Competitor" : "Your brand"}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 10 }}>
        <span style={{ fontSize: 66, fontWeight: 800, letterSpacing: "-0.03em" }}>{them ? "Northstar CRM" : "You"}</span>
      </div>
      <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: "-0.05em", color: them ? C.blue : C.red, lineHeight: 1.05 }}>
        {them ? 8 : 1}<span style={{ fontSize: 60, color: "#9AA6BD", fontWeight: 400 }}>/10</span>
      </div>
      <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
        {qs.map((q, i) => {
          const yes = them ? i !== 3 : i === 2;
          return (
            <div key={q} style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, fontWeight: 600, opacity: clamp((f - 10 - i * 4) / 6) }}>
              {yes ? <Check size={30} q={pr(f, 12 + i * 4, 8)} /> : <Cross size={30} q={pr(f, 12 + i * 4, 8)} />}
              <span style={{ color: yes ? C.ink : "#9AA6BD" }}>{q}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
  return (
    <Stage theme="paper" f={f} d={d} pose={pose} near="none" hud="Side by side" demo
      overlay={
        <Ov x={0} y={70} style={{ width: 1920, textAlign: "center", fontSize: 88, letterSpacing: "-0.04em", color: C.ink }}>
          <div style={{ fontWeight: 300 }}><Letters text="Your competitors," f={f} at={vo("your", 40) - A - 3} stagger={0.7} /></div>
          <div style={{ opacity: f >= vo("side") - A - 3 ? 1 : 0 }}>
            <Sweep f={f} at={vo("side") - A - 3} color={C.blue} textColor="#fff"><b style={{ fontWeight: 800 }}>side by side.</b></Sweep>
          </div>
        </Ov>
      }
    >
      <Floor y={1010} color="#BACBE6" o={0.9} />
      <P x={60} y={280} w={780} h={760} ry={34} origin="0 50%">{col(true)}</P>
      <P x={1080} y={280} w={780} h={760} ry={-34} origin="100% 50%">{col(false)}</P>
      <P x={960} y={660} z={-300} center style={{ fontSize: 120, fontWeight: 800, color: "#C8D5EC" }}><div style={{ transform: "translate(-50%,-50%)" }}>vs</div></P>
    </Stage>
  );
}

/* S21 · 1280–1350 · orbit an extruded check mark: every fix, re-checked */
export function S21({ f, d }: ShotProps) {
  const A = 1280;
  const rc = vo("re-checked") - A;
  const pose = addPose(camAt([[0, { ry: 42, z: -80, x: -120, rx: 6 }], [40, { ry: 4, z: 60, x: 0, rx: 2 }], [70, { ry: -14, z: 140, x: 60, rx: 0 }]], f), shake(f, rc, 0.7));
  const draw = expoOut(pr(f, vo("every", 42) - A - 2, 22));
  return (
    <Stage theme="mint" f={f} d={d} pose={pose} near="dot" hud="Re-checked">
      {Array.from({ length: 16 }, (_, i) => (
        <P key={i} x={170} y={210} z={-i * 4} w={640} h={640}>
          <svg width={640} height={640} viewBox="0 0 24 24">
            <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={i === 0 ? C.ink : i < 3 ? "#1B3B33" : "#2E8F6B"} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={26} strokeDashoffset={26 * (1 - draw)} />
          </svg>
        </P>
      ))}
      <P x={880} y={350} z={60} style={{ color: C.ink, fontSize: 170, letterSpacing: "-0.05em", lineHeight: 1.02, whiteSpace: "nowrap" }}>
        <div style={{ fontWeight: 300 }}><Letters text="Every fix," f={f} at={vo("every", 42) - A - 3} /></div>
        <div><Slam f={f} at={rc} style={{ fontWeight: 800 }}>re-checked.</Slam></div>
      </P>
    </Stage>
  );
}

function Tile({ f, at, bg, fg, word, children }: { f: number; at: number; bg: string; fg: string; word: string; children: ReactNode }) {
  const q = expoOut(pr(f, at, 12));
  return (
    <div style={{ position: "relative", width: 940, height: 520, borderRadius: 26, overflow: "hidden", background: bg, opacity: clamp(q * 3), transform: `scale(${mix(1.25, 1, q)})` }}>
      {children}
      <div style={{ position: "absolute", left: 48, bottom: 36, fontSize: 96, fontWeight: 800, letterSpacing: "-0.05em", color: fg, whiteSpace: "nowrap" }}>
        <Slam f={f} at={at + 3}>{word}</Slam>
      </div>
    </div>
  );
}

/* S22 · 1350–1410 · 2×2 proof grid, each tile slams its word; camera pulls back */
export function S22({ f, d }: ShotProps) {
  const pose = camAt([[0, { z: 700, x: -480, y: -270, rz: -3 }], [16, { z: 520, x: -470, y: -260 }], [60, { z: -20, x: 0, y: 0, rz: 1, ry: -4 }]], f);
  return (
    <Stage theme="dark" f={f} d={d} pose={pose} near="none" hud="What you get">
      <P x={10} y={10} w={1900} h={1060} style={{ display: "grid", gridTemplateColumns: "940px 940px", gap: 20 }}>
        <Tile f={f} at={0} bg={`linear-gradient(140deg,#3F80FF,${C.blue})`} fg="#fff" word="REAL ANSWERS.">
          <div style={{ position: "absolute", left: 48, top: 20, fontSize: 300, fontWeight: 800, color: "#ffffff33", lineHeight: 1 }}>“</div>
          <div style={{ position: "absolute", left: 60, top: 150, right: 60, fontSize: 40, fontWeight: 600, color: "#fff", lineHeight: 1.25 }}>“For a small sales team, Northstar CRM is the strongest pick.”</div>
        </Tile>
        <Tile f={f} at={10} bg="#0D1830" fg="#fff" word="REAL SOURCES.">
          <svg width={940} height={340} style={{ position: "absolute", top: 20 }}>
            {[[160, 170], [380, 80], [560, 230], [760, 110]].map(([x, y], i, a) => (
              <g key={i}>
                {i > 0 && <line x1={a[i - 1][0]} y1={a[i - 1][1]} x2={x} y2={y} stroke="#3B5FA6" strokeWidth={4} strokeDasharray="3 10" />}
                <circle cx={x} cy={y} r={22} fill={i === 0 ? C.mint : C.sky} />
              </g>
            ))}
          </svg>
        </Tile>
        <Tile f={f} at={20} bg={C.paper} fg={C.ink} word="SIDE BY SIDE.">
          <div style={{ position: "absolute", left: 60, right: 60, top: 70, display: "flex", alignItems: "flex-end", gap: 40, height: 260 }}>
            {[8, 6, 5, 1].map((v, i) => <div key={i} style={{ flex: 1, height: v * 30 * expoOut(pr(f, 22 + i * 3, 14)), background: i === 3 ? C.red : C.blue, borderRadius: 10 }} />)}
          </div>
        </Tile>
        <Tile f={f} at={30} bg={C.mint} fg={C.ink} word="RE-CHECKED.">
          <div style={{ position: "absolute", right: 60, top: 40 }}><Check size={280} color={C.ink} q={pr(f, 32, 12)} /></div>
        </Tile>
      </P>
    </Stage>
  );
}

/* S23 · 1410–1495 · "Start with a free audit." then track right to the slot counter "10" */
export function S23({ f, d }: ShotProps) {
  const A = 1410;
  const ten = vo("ten") - A;
  const pose = camAt([[0, { x: -60, z: 60, ry: 10 }], [ten - 12, { x: 40, z: 100, ry: 2 }], [ten + 4, { x: 1060, z: 120, ry: -10 }], [85, { x: 1120, z: 220, ry: -6, rx: 2 }]], f);
  return (
    <Stage theme="paper" f={f} d={d} pose={pose} near="bar" hud="Free audit">
      <Floor y={1000} color="#BACBE6" o={0.8} size={6000} />
      <P x={150} y={330} style={{ color: C.ink, letterSpacing: "-0.05em", lineHeight: 1.04, whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 140, fontWeight: 300 }}><Letters text="Start with a" f={f} at={vo("start") - A - 2} stagger={0.8} /></div>
        <div style={{ fontSize: 200, opacity: f >= vo("free") - A - 4 ? 1 : 0 }}>
          <Sweep f={f} at={vo("free") - A - 4} color={C.blue} textColor="#fff"><b style={{ fontWeight: 800 }}>free audit.</b></Sweep>
        </div>
      </P>
      <P x={1700} y={180} z={40} style={{ display: "flex", alignItems: "center", gap: 50, opacity: clamp((f - ten + 14) / 6) }}>
        <div style={{ fontSize: 560, fontWeight: 800, color: C.blue, letterSpacing: "-0.06em", lineHeight: 1 }}>
          <Slot f={f} at={ten - 2} dur={16} items={["1", "3", "5", "7", "10"]} />
        </div>
        <div style={{ fontSize: 96, fontWeight: 300, color: C.ink, letterSpacing: "-0.04em", lineHeight: 1.05 }}>
          <Letters text="buyer" f={f} at={vo("buyer", 48) - A - 2} /><br />
          <b style={{ fontWeight: 800 }}><Letters text="questions." f={f} at={vo("questions", 48) - A - 3} stagger={0.8} /></b>
        </div>
      </P>
    </Stage>
  );
}

/* S24 · 1495–1620 · no account, no card — caret-follow on the one field, click, run */
export function S24({ f, d }: ShotProps) {
  const A = 1495;
  const acct = vo("account", 49) - A;
  const cardW = vo("card", 50) - A;
  const URL = "yourcompany.com";
  const typeAt = 44;
  const shown = typed(URL, f, typeAt, 20);
  const click = 96;
  const pose = camAt([[0, { z: -80, ry: 12, rx: 6, x: -60 }], [40, { z: 40, ry: 4, rx: 3, x: 0 }], [80, { z: 260, x: -130 + shown.length * 14, y: 40, ry: -3 }], [98, { z: 300, x: 300, y: 120, ry: -8 }], [125, { z: 420, x: 330, y: 125, ry: -4 }]], f);
  const pressed = f >= click;
  const run = clamp((f - click - 4) / 26);
  const cx = mix(1500, 1210, cubicInOut(pr(f, 72, 22))), cy = mix(980, 700, cubicInOut(pr(f, 72, 22)));
  const Strike = ({ text, at }: { text: string; at: number }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 92, fontWeight: 300, letterSpacing: "-0.04em", color: "#fff", opacity: clamp((f - at + 6) / 5) }}>
      <span style={{ position: "relative" }}>
        No <b style={{ fontWeight: 800 }}>{text}.</b>
        <span style={{ position: "absolute", left: "1.9em", right: "0.3em", top: "55%", height: 10, background: C.mint, borderRadius: 5, transformOrigin: "left", transform: `scaleX(${expoOut(pr(f, at + 2, 8))})` }} />
      </span>
    </div>
  );
  return (
    <Stage theme="blue" f={f} d={d} pose={pose} near="card" hud="No account · no card">
      <P x={120} y={190} z={80}>
        <Strike text="account" at={acct} />
        <div style={{ height: 20 }} />
        <Strike text="card" at={cardW} />
      </P>
      <P x={820} y={380} w={980} h={500} style={{ ...card("light"), padding: "48px 56px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Mark size={52} />
          <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em" }}>Free AI visibility audit</span>
        </div>
        <div style={{ ...label, marginTop: 30, fontSize: 16 }}>Your website</div>
        <div style={{ marginTop: 12, padding: "22px 26px", borderRadius: 16, border: `3px solid ${f >= typeAt - 4 ? C.blue : "#DCE4F2"}`, fontSize: 40, fontWeight: 600, color: C.ink, height: 96 }}>
          {shown}{f >= typeAt - 4 && f < click && <Caret f={f} color={C.blue} solid={shown.length < URL.length} />}
        </div>
        <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ position: "relative", overflow: "hidden", padding: "22px 40px", borderRadius: 16, background: pressed ? C.ink : C.blue, color: "#fff", fontSize: 32, fontWeight: 800, transform: `scale(${pressed ? mix(0.94, 1, expoOut(pr(f, click, 10))) : 1})`, minWidth: 470 }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${run * 100}%`, background: C.green, opacity: 0.9 }} />
            <span style={{ position: "relative" }}>{pressed ? (run < 1 ? "Asking 10 questions…" : "Audit running ✓") : "Run my free audit →"}</span>
          </div>
          <span style={{ ...mono, fontSize: 18, color: C.mute }}>10 buyer questions</span>
        </div>
      </P>
      <P x={cx} y={cy} z={120} o={clamp((f - 66) / 6)}><Cursor size={64} press={pressed ? Math.max(0, 1 - (f - click) / 6) : 0} /></P>
    </Stage>
  );
}

/* S25 · 1620–1800 · extruded mark orbits in, wordmark, tagline, CTA — then holds */
export function S25({ f, d }: ShotProps) {
  const A = 1620;
  const name = vo("zero", 54) - A;
  const tag = vo("get", 55) - A;
  const ai = vo("ai", 56) - A;
  const pose = camAt([[0, { ry: 58, z: 420, rz: -6, x: -260 }], [42, { ry: 6, z: 40, rz: 0, x: -20 }], [180, { ry: -5, z: 90, x: 10, rx: 2 }]], f);
  const draw = expoOut(pr(f, 0, 30));
  return (
    <Stage theme="dark" f={f} d={d} pose={pose} near={f < 60 ? "dot" : "none"} hud="zerociate.com">
      <P x={-200} y={-100} z={-900} w={2400} h={1400} blur={30} o={0.55} style={{ background: `radial-gradient(circle at 35% 45%, ${C.blue} 0%, transparent 45%)` }} />
      {Array.from({ length: 12 }, (_, i) => (
        <P key={i} x={330} y={300} z={-i * 3.5} w={300} h={300}>
          <Mark size={300} draw={draw} dot={i === 0 ? arrive(f, 22, 14) : 0} ring={i === 0 ? "url(#zcv3ring)" : i < 3 ? "#174CB0" : "#0E347E"} />
        </P>
      ))}
      <P x={720} y={330} z={20} style={{ color: "#fff", fontSize: 200, fontWeight: 800, letterSpacing: "-0.055em", lineHeight: 1 }}>
        <Letters text="BrandPulse" f={f} at={name - 2} stagger={1.3} dur={14} />
      </P>
      <P x={730} y={570} z={30} style={{ color: "#C8D6F2", fontSize: 76, fontWeight: 300, letterSpacing: "-0.035em", whiteSpace: "nowrap" }}>
        <Letters text="Get named by " f={f} at={tag - 3} stagger={0.8} />
        {f >= ai - 3 && <Sweep f={f} at={ai - 3} color={C.mint} textColor={C.ink}><b style={{ fontWeight: 800 }}>AI.</b></Sweep>}
      </P>
      <P x={740} y={740} z={40} style={{ display: "flex", alignItems: "center", gap: 28, opacity: clamp((f - 78) / 8), transform: `translateY(${(1 - expoOut(pr(f, 78, 14))) * 40}px)` }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "20px 34px", borderRadius: 999, background: "#fff", color: C.ink, fontSize: 32, fontWeight: 800 }}>
          <Dot c={C.green} s={14} />Get your free AI visibility audit →
        </span>
        <span style={{ ...mono, color: C.mint, fontSize: 30 }}>zerociate.com</span>
      </P>
    </Stage>
  );
}
