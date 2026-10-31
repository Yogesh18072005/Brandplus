/* ACT B · 400–1015: product → chip line → route floor → caret → run → score fan → fix terminal */
import type { ReactNode } from "react";
import { Field, Sweep, At, BlueBg, Cam, Chip, Cursor, Frame, H, Icon, InkBg, K, Mark, Meta, MONO, PaperBg, Stamp, W, bOut, c3, card, clamp, eIn, eIO, eOut, hand, kf, mix, pr, shakeAt, typed } from "./kit";

/* ---------- product UI pieces (from the real BrandPulse report) ---------- */
function Headline() {
  return (
    <div style={{ ...card, borderRadius: 18, padding: "34px 40px", width: 820 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
        <span style={{ fontFamily: "Manrope", fontWeight: 600, fontSize: 170, color: K.red, letterSpacing: "-0.04em", lineHeight: 0.9 }}>1</span>
        <span style={{ fontWeight: 600, fontSize: 76, color: "#5D6676", letterSpacing: "-0.03em" }}>of 10</span>
      </div>
      <div style={{ fontSize: 30, color: K.text, marginTop: 22, lineHeight: 1.4 }}>AI answers mention Your Brand (10%). <b>Northstar CRM appears in 80%.</b></div>
      <div style={{ fontSize: 22, color: K.mute, marginTop: 16 }}>Visibility score <b>6/100</b> · Share of voice <b>4%</b></div>
    </div>
  );
}
function Evidence({ w = 820 }: { w?: number }) {
  return (
    <div style={{ ...card, borderRadius: 18, padding: "28px 34px", width: w }}>
      <div style={{ fontFamily: MONO, fontSize: 24, color: "#5D6676" }}>› best CRM for a small sales team</div>
      <div style={{ borderLeft: `5px solid ${K.blue}`, paddingLeft: 26, marginTop: 20 }}>
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center", background: "#E9EFFD", color: K.blue, borderRadius: 999, padding: "6px 18px", fontFamily: MONO, fontSize: 20 }}><Icon name="spark" size={16} color={K.blue} />Gemini</span>
        <div style={{ fontSize: 30, lineHeight: 1.45, marginTop: 14, color: K.text }}>“Northstar CRM is the strongest pick for small teams, with a simple pipeline and built-in email…”</div>
      </div>
      <div style={{ marginTop: 22, background: K.redBg, color: K.red, fontWeight: 700, fontSize: 26, borderRadius: 12, padding: "16px 22px" }}>Your Brand — not mentioned</div>
    </div>
  );
}
function Sidebar() {
  const items = ["Overview", "Buyer questions", "Evidence", "Competitors", "Fix plan", "Re-check"];
  return (
    <div style={{ width: 300, height: 1000, background: "#FBFBF9", borderRight: `1px solid ${K.line}`, padding: "34px 26px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 800, fontSize: 28 }}><Mark size={36} />BrandPulse</div>
      <div style={{ marginTop: 40, display: "grid", gap: 6 }}>
        {items.map((t, i) => <div key={t} style={{ padding: "14px 16px", borderRadius: 12, fontSize: 21, fontWeight: 600, background: i === 0 ? "#E9EFFD" : undefined, color: i === 0 ? K.blue : "#4B5263" }}>{t}</div>)}
      </div>
    </div>
  );
}

/* S6 · 400–480 · logo lifts away, the report rises in 3D, the evidence card lifts off */
export function S6({ f }: { f: number }) {
  const up = c3(pr(f, 0, 22));
  const lift = eOut(pr(f, 36, 22));
  const wipe = eIn(pr(f, 70, 10));
  const h = hand(f);
  return (
    <Frame bg={<PaperBg f={f} />}>
      <div style={{ position: "absolute", left: 0, right: 0, top: mix(440, 70, up), display: "flex", justifyContent: "center", alignItems: "center", gap: 34 * mix(1, 0.5, up), ...H, fontSize: 170 * mix(1, 0.42, up), color: K.text, transformOrigin: "50% 0" }}>
        <span style={{ fontWeight: 500, letterSpacing: "-0.04em", fontSize: 150 * mix(1, 0.42, up) }}>Meet</span>
        <Mark size={170 * mix(1, 0.42, up)} />
        <span>BrandPulse<span style={{ color: K.blue }}>.</span></span>
      </div>
      <Cam rx={kf(f, [[0, 34], [40, 14], [80, 10]])} ry={kf(f, [[0, 10], [80, -8]])} z={kf(f, [[0, 0], [30, 300], [80, 420]])} y={kf(f, [[0, 700], [26, 60], [44, 60], [80, 330]], c3) + h.y} x={kf(f, [[0, 0], [80, -60]]) + h.x}>
        <At x={180} y={250} w={1560} h={1000} style={{ ...card, overflow: "hidden", display: "flex" }}>
          <Sidebar />
          <div style={{ padding: "40px 46px", flex: 1, background: "#F7F7F5" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontWeight: 800, fontSize: 34 }}>Your Brand</span>
              <span style={{ fontFamily: MONO, fontSize: 18, color: K.mute }}>CRM software · 10 buyer questions · Gemini</span>
            </div>
            <div style={{ display: "flex", gap: 30, marginTop: 30 }}>
              <Headline />
              <div style={{ ...card, borderRadius: 18, padding: 30, flex: 1 }}>
                <div style={{ fontFamily: MONO, fontSize: 17, color: K.mute, letterSpacing: "0.1em" }}>PRESENCE VS COMPETITORS</div>
                {[["Northstar CRM", 80], ["Atlas", 60], ["Pipewell", 50], ["Your Brand", 10]].map(([n, v]) => (
                  <div key={n as string} style={{ marginTop: 22 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: n === "Your Brand" ? K.red : K.text }}>{n}</div>
                    <div style={{ height: 14, borderRadius: 7, background: "#EDEDEA", marginTop: 8 }}><div style={{ height: "100%", width: `${(v as number) * clamp((f - 20) / 20)}%`, borderRadius: 7, background: n === "Your Brand" ? K.red : K.blue }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 30, opacity: 1 - lift }}><Evidence /></div>
          </div>
        </At>
        {/* the evidence card lifts off the dashboard */}
        <At x={526} y={760} z={lift * 260} ry={lift * -10} rx={lift * -6} s={1 + lift * 0.12} o={lift > 0 ? 1 : 0} style={{ boxShadow: `0 ${60 * lift}px 120px -30px rgba(12,42,120,${0.45 * lift})`, borderRadius: 18 }}>
          <Evidence />
        </At>
      </Cam>
      {wipe > 0 && <div style={{ position: "absolute", inset: -200, background: K.blue, clipPath: `polygon(${mix(130, -40, wipe)}% 0, 140% 0, 140% 100%, ${mix(160, -10, wipe)}% 100%)` }} />}
    </Frame>
  );
}

/* S7 · 480–550 · "AI [✦] visibility audit." / "& done-for-you [🔧] fixes." → pill expands to paper */
export function S7({ f }: { f: number }) {
  const pill = eIO(pr(f, 56, 14));
  const h = hand(f);
  const blurIn = (at: number) => ({ filter: `blur(${(1 - eOut(pr(f, at, 7))) * 18}px)`, transform: `translateX(${(1 - eOut(pr(f, at, 9))) * 120}px)`, opacity: clamp((f - at) / 3), display: "inline-block" });
  return (
    <Frame bg={<BlueBg f={f} />}>
      <div style={{ position: "absolute", left: -40, top: 250, ...H, fontSize: 470, color: "#ffffff10", transform: `translateX(${-f * 3}px)` }}>VISIBILITY</div>
      <Meta text="What we do" dark />
      <div style={{ position: "absolute", left: 150 + h.x, top: 360 + h.y, ...H, fontSize: 132, color: "#fff", lineHeight: 1.08 }}>
        <div><span style={blurIn(0)}>AI</span><Chip f={f} at={5} icon="spark" bg="#fff" color={K.blue} /><span style={{ ...blurIn(8), fontWeight: 500, letterSpacing: "-0.04em" }}>visibility audit.</span></div>
        <div style={{ marginLeft: 120 }}><span style={{ ...blurIn(24), fontWeight: 500 }}>&amp; done-for-you</span><Chip f={f} at={30} icon="wrench" bg="#fff" color={K.blue} /><span style={blurIn(34)}>fixes.</span></div>
      </div>
      {f >= 56 && (
        <div style={{ position: "absolute", left: 960, top: 540, width: mix(200, 2400, pill), height: mix(120, 1500, pill), marginLeft: -mix(200, 2400, pill) / 2, marginTop: -mix(120, 1500, pill) / 2, borderRadius: mix(60, 0, pill), background: K.paper }} />
      )}
    </Frame>
  );
}

/* ---------- S8 · 550–655 · route on a 3D floor: boxes rise at 01–04 ---------- */
function Cube({ x, y, w, l, hgt, color, side, top, label, icon, num }: { x: number; y: number; w: number; l: number; hgt: number; color: string; side: string; top: string; label: string; icon: string; num: string }) {
  if (hgt < 2) return null;
  return (
    <>
      <At x={x + w} y={y} w={hgt} h={l} origin="0 50%" style={{ transform: "rotateY(-90deg)", background: side }} />
      <At x={x - hgt} y={y} w={hgt} h={l} origin="100% 50%" style={{ transform: "rotateY(90deg)", background: side }} />
      <At x={x} y={y + l - hgt} w={w} h={hgt} origin="50% 100%" style={{ transform: "rotateX(-90deg)", background: color, padding: 26, color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ width: 70, height: 70, borderRadius: 18, background: "#ffffff2a", display: "grid", placeItems: "center" }}><Icon name={icon} size={40} color="#fff" /></div>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 18, opacity: 0.7 }}>{num}</div>
          <div style={{ fontWeight: 800, fontSize: 40, letterSpacing: "-0.03em" }}>{label}</div>
        </div>
      </At>
      <At x={x} y={y} w={w} h={l} z={hgt} style={{ background: top }} />
    </>
  );
}
const STOPS = [
  { x: 700, y: 900, label: "Questions", icon: "chat", at: 12 },
  { x: 1180, y: 300, label: "Answers", icon: "spark", at: 30 },
  { x: 740, y: -300, label: "Gaps", icon: "chart", at: 48 },
  { x: 1220, y: -900, label: "Fixes", icon: "wrench", at: 66 },
];
export function S8({ f }: { f: number }) {
  const ride = c3(pr(f, 0, 92));
  // camera follows the route head in floor coordinates
  const pts: [number, number][] = [[960, 1500], ...STOPS.map((s) => [s.x + 160, s.y + 300] as [number, number]), [960, -1500]];
  const segs = pts.length - 1, u = ride * (segs - 1), i = Math.min(segs - 2, Math.floor(u)), q = u - i;
  const hx = mix(pts[i][0], pts[i + 1][0], q), hy = mix(pts[i][1], pts[i + 1][1], q);
  const sh = shakeAt(f, 66, 0.6);
  const whip = eIn(pr(f, 96, 9));
  return (
    <Frame bg={<PaperBg f={f} />}>
      <Meta text="How it works · one loop" />
      <Cam rx={56} rz={-8} x={hx - 960 + 260 + sh.x} y={hy - 540 - 60 + sh.y} z={120} p={1400}>
        <At x={-2000} y={-2600} w={6000} h={5200} style={{ backgroundImage: `linear-gradient(${K.line} 2px, transparent 2px), linear-gradient(90deg, ${K.line} 2px, transparent 2px)`, backgroundSize: "160px 160px", maskImage: "radial-gradient(circle at 50% 50%, #000 20%, transparent 60%)", WebkitMaskImage: "radial-gradient(circle at 50% 50%, #000 20%, transparent 60%)" }} />
        <At x={0} y={-2000} w={2000} h={4000}>
          <svg width={2000} height={4000} viewBox="0 -2000 2000 4000" style={{ overflow: "visible", position: "absolute", top: 0 }}>
            <polyline points={pts.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="#C9D3EA" strokeWidth={26} strokeLinejoin="round" strokeLinecap="round" />
            <polyline points={[...pts.slice(0, i + 1), [hx, hy]].map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke={K.blue} strokeWidth={26} strokeLinejoin="round" strokeLinecap="round" />
            {STOPS.map((s) => <circle key={s.label} cx={s.x + 160} cy={s.y + 300} r={f >= s.at ? 44 : 30} fill={f >= s.at ? K.blue : "#C9D3EA"} />)}
          </svg>
        </At>
        {STOPS.map((s, k) => (
          <div key={s.label} style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
            <At x={s.x - 260} y={s.y + 360} style={{ ...H, fontSize: 280, color: f >= s.at ? "#1E5AE822" : "#00000010", fontStyle: "italic" }}>0{k + 1}</At>
            <Cube x={s.x} y={s.y} w={300} l={230} hgt={250 * bOut(pr(f, s.at, 14), 1.4)} color={k === 3 ? K.ink : K.blue} side={k === 3 ? "#000" : "#1546BE"} top={k === 3 ? "#2A2B30" : "#5B8BFF"} label={s.label} icon={s.icon} num={`0${k + 1}`} />
          </div>
        ))}
        <At x={hx - 22} y={hy - 22} w={44} h={44} z={4} style={{ borderRadius: "50%", background: "#fff", boxShadow: `0 0 0 10px ${K.blue}55, 0 0 40px ${K.blue}` }} />
      </Cam>
      <div style={{ position: "absolute", left: 90, top: 110, ...H, fontSize: 92, color: K.text }}>
        {f < 52 ? (
          <><W f={f} at={4}>One</W> <W f={f} at={8} style={{ color: K.blue }}>connected</W> <W f={f} at={13}>loop.</W></>
        ) : (
          <><W f={f} at={52}>First question</W><Chip f={f} at={56} icon="refresh" /><W f={f} at={60} style={{ color: K.blue }}>re-check.</W></>
        )}
      </div>
      {f >= 72 && <div style={{ position: "absolute", left: 1120, top: 620 }}><Stamp f={f} at={72} text="Done for you." color={K.ink} rot={-7} size={58} /></div>}
      {whip > 0 && <div style={{ position: "absolute", inset: 0, background: K.paper, opacity: whip, filter: "blur(4px)" }} />}
    </Frame>
  );
}

/* S9 · 655–720 · caret-follow close-up on the website field, then pull back */
export function S9({ f }: { f: number }) {
  const URL = "yourcompany.com";
  const n = typed(URL, f, 6, 0.55);
  const caret = 260 + n.length * 102;
  const back = eIO(pr(f, 44, 21));
  const x = mix(Math.max(0, caret - 1350), 0, back);
  const s = mix(1, 0.5, back);
  return (
    <Frame bg={<PaperBg f={f} />}>
      <Field f={f} n={8} seed={11} />
      <div style={{ position: "absolute", left: 90, top: 100, display: "flex", gap: 16, alignItems: "center", ...H, fontSize: 52, color: K.text, opacity: 0.95 }}><Mark size={52} />New audit</div>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `translateX(${-x}px) scale(${s})`, transformOrigin: "120px 560px" }}>
        <div style={{ position: "absolute", left: 120, top: 420, width: 2600, height: 280, ...card, borderRadius: 40, boxShadow: `0 0 0 4px ${K.blue}, 0 0 ${60 + Math.sin(f / 5) * 20}px rgba(62,120,245,.35), 0 60px 120px -40px rgba(12,42,120,.45)`, display: "flex", alignItems: "center", padding: "0 70px", gap: 40 }}>
          <Icon name="globe" size={100} color="#9AA0AE" sw={2} />
          <span style={{ fontWeight: 600, fontSize: 170, letterSpacing: "-0.035em", color: n ? K.text : "#C4C4BE", whiteSpace: "nowrap" }}>{n || "Your website"}</span>
          <span style={{ width: 10, height: 170, background: K.blue, marginLeft: -26, opacity: n.length < URL.length || Math.floor(f / 6) % 2 ? 1 : 0 }} />
        </div>
        <div style={{ position: "absolute", left: 140, top: 740, fontFamily: MONO, fontSize: 26, letterSpacing: "0.14em", color: K.mute }}>WEBSITE · WE READ IT TO FIND YOUR BUYER QUESTIONS</div>
      </div>
    </Frame>
  );
}

/* S10 · 720–780 · "Run an audit." → cursor clicks → toast */
export function S10({ f }: { f: number }) {
  const click = 30;
  const pressed = f >= click;
  const cx = kf(f, [[0, 1500], [26, 1160]], c3), cy = kf(f, [[0, 980], [26, 790]], c3);
  const h = hand(f);
  const smear = eIn(pr(f, 52, 8));
  return (
    <Frame bg={<PaperBg f={f} />}>
      <Field f={f} n={9} seed={17} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 90, textAlign: "center", ...H, fontSize: 96, color: K.text }}>
        <W f={f} at={0}>Run an</W> <W f={f} at={5} style={{ color: K.blue }}>audit.</W>
      </div>
      <Cam z={kf(f, [[0, 160], [60, 320]])} rx={6} ry={kf(f, [[0, -8], [60, 4]])} x={h.x + smear * 900} y={h.y}>
        <At x={460} y={280} w={1000} h={620} style={{ ...card, borderRadius: 30, padding: "44px 52px", filter: smear > 0 ? `blur(${smear * 30}px)` : undefined }}>
          <Sweep f={f} at={4} dur={24} />
          {[["Website", "yourcompany.com"], ["Category", "CRM software"]].map(([k, v]) => (
            <div key={k} style={{ marginBottom: 22 }}>
              <div style={{ fontFamily: MONO, fontSize: 17, color: K.mute, letterSpacing: "0.1em", textTransform: "uppercase" }}>{k}</div>
              <div style={{ marginTop: 8, padding: "16px 20px", border: `2px solid ${K.line}`, borderRadius: 14, fontSize: 30, fontWeight: 600 }}>{v}</div>
            </div>
          ))}
          <div style={{ fontFamily: MONO, fontSize: 17, color: K.mute, letterSpacing: "0.1em" }}>COMPETITORS</div>
          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>{["Northstar CRM", "Atlas", "Pipewell"].map((c) => <span key={c} style={{ padding: "10px 18px", borderRadius: 999, background: "#F1F1EE", fontWeight: 700, fontSize: 22 }}>{c}</span>)}</div>
          <div style={{ marginTop: 34, display: "inline-flex", alignItems: "center", gap: 14, padding: "22px 38px", borderRadius: 16, background: pressed ? K.ink : "linear-gradient(180deg,#3E78F5,#1E5AE8)", color: "#fff", fontWeight: 800, fontSize: 30, position: "relative", boxShadow: pressed ? "0 10px 24px rgba(0,0,0,.25)" : `0 14px 34px rgba(30,90,232,${0.45 + Math.sin(f / 4) * 0.15}), inset 0 1px 0 rgba(255,255,255,.35)`, transform: `scale(${pressed ? mix(0.93, 1, eOut(pr(f, click, 8))) : 1})` }}>
            {pressed && <span style={{ position: "absolute", left: "50%", top: "50%", width: 40, height: 40, marginLeft: -20, marginTop: -20, borderRadius: "50%", border: "3px solid #3E78F5", transform: `scale(${1 + eOut(pr(f, click, 14)) * 9})`, opacity: 1 - pr(f, click, 14) }} />}
            Run free audit <Icon name="arrow" size={28} color="#fff" sw={3} />
          </div>
        </At>
        {[1, 2, 3].map((t) => <At key={t} x={kf(f - t * 2, [[0, 1500], [26, 1160]], c3)} y={kf(f - t * 2, [[0, 980], [26, 790]], c3)} z={40} o={f < click ? 0.18 - t * 0.04 : 0}><Cursor /></At>)}
        <At x={cx - 460 + 460} y={cy - 280 + 280} z={40}><Cursor press={pressed ? Math.max(0, 1 - (f - click) / 6) : 0} /></At>
        {f >= click + 4 && (
          <At x={620} y={930} z={80} s={bOut(pr(f, click + 4, 10))} style={{ background: K.ink, color: "#fff", borderRadius: 999, padding: "18px 30px", display: "flex", gap: 14, alignItems: "center", fontWeight: 700, fontSize: 28, boxShadow: "0 30px 60px -20px #0008" }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", background: K.green, display: "grid", placeItems: "center" }}><Icon name="check" size={22} color="#fff" sw={3.4} /></span>
            10 buyer questions queued
          </At>
        )}
      </Cam>
    </Frame>
  );
}

/* S11 · 780–885 · "See the gap." — score cards fan in 3D, yours lifts; chips tick; diagonal split to ink */
const SC = [
  { n: "Northstar CRM", v: 8, c: K.text },
  { n: "Your Brand", v: 1, c: K.red, me: true },
  { n: "Atlas", v: 6, c: K.text },
];
export function S11({ f }: { f: number }) {
  const h = hand(f);
  const fan = (i: number) => eOut(pr(f, i * 3 - 2, 14));
  const sel = eOut(pr(f, 34, 16));
  const split = eIO(pr(f, 92, 13));
  const chips = ["Mentions", "Citations", "Rank", "Sources"];
  return (
    <Frame bg={<PaperBg f={f} />}>
      <Meta text="03 · The gap" />
      <div style={{ position: "absolute", left: 0, right: 0, top: 90, textAlign: "center", ...H, fontSize: 96, color: K.text }}><W f={f} at={0}>See the</W> <W f={f} at={5} style={{ color: K.blue }}>gap.</W></div>
      <Cam rx={8} ry={kf(f, [[0, 14], [100, -10]])} z={kf(f, [[0, -80], [100, 60]])} x={h.x} y={h.y}>
        {SC.map((c, i) => {
          const a = fan(i);
          const me = !!c.me;
          const pos = [-1, 0, 1][i];
          return (
            <At key={c.n} x={960 - 230 + pos * 420 * a} y={300 + (me ? -40 * sel : 30)} w={460} h={560} z={me ? 120 * sel : -40} ry={pos * -14 * a} rz={pos * 5 * a} s={me ? 1 + 0.08 * sel : 0.94} o={clamp(a * 3)}
              style={{ ...card, padding: 36, boxShadow: me ? `0 0 0 ${4 * sel}px ${K.blue}, 0 0 ${120 * sel}px ${K.blue}66, 0 60px 100px -40px rgba(12,42,120,.5)` : card.boxShadow, filter: !me && sel > 0 ? `blur(${sel * 2}px)` : undefined }}>
              <div style={{ width: 70, height: 70, borderRadius: 18, background: me ? K.blue : "#EEEEEA", display: "grid", placeItems: "center" }}>{me ? <Mark size={44} ring="#fff" /> : <Icon name="bag" size={36} color="#6B7280" />}</div>
              <div style={{ fontWeight: 800, fontSize: 36, marginTop: 24, letterSpacing: "-0.02em" }}>{c.n}</div>
              <div style={{ fontFamily: MONO, fontSize: 18, color: K.mute, marginTop: 6 }}>named in AI answers</div>
              <div style={{ ...H, fontSize: 200, color: c.c, marginTop: 30 }}>{c.v}<span style={{ fontSize: 70, color: "#A5A5A0", fontWeight: 600 }}>/10</span></div>
              <div style={{ display: "flex", gap: 6, marginTop: 18 }}>{Array.from({ length: 10 }, (_, k) => <div key={k} style={{ flex: 1, height: 14, borderRadius: 4, background: k < c.v ? (me ? K.red : K.blue) : "#ECECE8" }} />)}</div>
            </At>
          );
        })}
      </Cam>
      <div style={{ position: "absolute", left: 0, right: 0, top: 940, display: "flex", justifyContent: "center", gap: 14, alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 20, color: K.mute, opacity: clamp((f - 48) / 5) }}>COMPARED ON</span>
        {chips.map((c, i) => (
          <span key={c} style={{ padding: "12px 22px", borderRadius: 999, background: "#fff", boxShadow: `0 0 0 1px ${K.line}`, fontWeight: 700, fontSize: 24, display: "inline-flex", gap: 10, alignItems: "center", transform: `scale(${bOut(pr(f, 52 + i * 5, 10))})` }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: K.blue, display: "grid", placeItems: "center" }}><Icon name="check" size={16} color="#fff" sw={3.6} /></span>{c}
          </span>
        ))}
      </div>
      {split > 0 && <div style={{ position: "absolute", inset: 0, background: K.ink, clipPath: `polygon(${mix(115, 0, split)}% 0, 100% 0, 100% 100%, ${mix(135, -20, split)}% 100%)` }} />}
    </Frame>
  );
}

/* S12 · 885–1015 · dark terminal "We fix it." — log ticks per beat; zoom into the progress bar */
const LOG: [string, string, string][] = [
  ["▸", "run fix-plan · yourcompany.com", "PLAN"],
  ["✓", "comparison page drafted · best CRM for small teams", "PAGE"],
  ["✓", "FAQ + structured data added", "SCHEMA"],
  ["✓", "cited-source outreach · g2.com · reddit.com", "SOURCES"],
  ["✓", "published · /best-crm-for-small-sales-teams", "LIVE"],
  ["◌", "re-check queued · same 10 questions", "RE-CHECK"],
];
export function S12({ f }: { f: number }) {
  const zoom = eIn(pr(f, 104, 22));
  const prog = clamp((f - 10) / 86);
  const h = hand(f, 0.6);
  return (
    <Frame bg={<InkBg f={f} />}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: "960px 905px", transform: `scale(${1 + zoom * 40}) translate(${h.x}px,${h.y}px)` }}>
        <div style={{ position: "absolute", left: 140, top: 130, ...H, fontSize: 104, color: "#fff" }}><W f={f} at={0}>We</W> <W f={f} at={4} style={{ color: K.blue2 }}>fix</W> <W f={f} at={8}>it.</W></div>
        <div style={{ position: "absolute", left: 140, top: 300, width: 1640 }}>
          {LOG.map(([s, t, tag], i) => {
            const at = 10 + i * 14;
            const on = f >= at;
            return (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 26, height: 82, borderBottom: "1px solid #1F2129", fontFamily: MONO, fontSize: 32, color: on ? (s === "✓" ? "#E8ECF7" : "#9DB6F5") : "#2A2D36", transform: `translateX(${(1 - eOut(pr(f, at, 8))) * -40}px)` }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, background: on ? (s === "✓" ? K.blue : "#1E5AE833") : "#15171D", display: "grid", placeItems: "center", color: "#fff", fontSize: 22 }}>{on ? s : ""}</span>
                <span style={{ flex: 1 }}>{on ? typed(t, f, at, 4) : t}</span>
                <span style={{ fontSize: 18, letterSpacing: "0.12em", color: on ? K.blue2 : "#2A2D36" }}>{tag}</span>
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 140, top: 900, width: 1640, height: 10, background: "#1A1C23", borderRadius: 5 }}>
          <div style={{ width: `${prog * 100}%`, height: "100%", background: K.blue, borderRadius: 5, boxShadow: `0 0 20px ${K.blue}` }} />
        </div>
        <div style={{ position: "absolute", left: 140, top: 930, fontFamily: MONO, fontSize: 18, color: "#5A6070", letterSpacing: "0.12em" }}>FIX PLAN · {Math.round(prog * 100)}%</div>
      </div>
      {zoom > 0.6 && <div style={{ position: "absolute", inset: 0, background: K.blue, opacity: clamp((zoom - 0.6) * 4) }} />}
    </Frame>
  );
}

export const ACT_B: [number, number, (p: { f: number }) => ReactNode][] = [
  [400, 480, S6], [480, 550, S7], [550, 655, S8], [655, 720, S9], [720, 780, S10], [780, 885, S11], [885, 1015, S12],
];
