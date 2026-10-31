/* ACT C · 1015–1800: re-check chart → source globe → proof worlds → stats → logo from shards */
import type { ReactNode } from "react";
import { At, BlueBg, Cam, Chip, Frame, H, Icon, InkBg, K, Mark, Meta, MONO, PaperBg, Stamp, W, bOut, c3, card, clamp, eIn, eIO, eOut, hand, kf, mix, pr, shakeAt } from "./kit";

/* S13 · 1015–1135 · blue collapses into a line; the re-check line climbs with pins; "Named by AI" slams */
const PTS: [number, number][] = [[0, 1], [1, 1], [2, 2], [3, 3], [4, 5], [5, 6], [6, 7]];
export function S13({ f }: { f: number }) {
  const collapse = eIO(pr(f, 0, 12));
  const draw = c3(pr(f, 10, 80));
  const X = (w: number) => 260 + w * 260, Y = (v: number) => 900 - v * 95;
  const u = draw * 6, i = Math.min(5, Math.floor(u)), q = u - i;
  const hx = mix(X(PTS[i][0]), X(PTS[i + 1][0]), q), hy = mix(Y(PTS[i][1]), Y(PTS[i + 1][1]), q);
  const pins: [number, string, number][] = [[2, "Page live", 30], [4, "Cited by Gemini", 52], [6, "Named in the answer", 76]];
  const slam = 86;
  const shrink = eIO(pr(f, 108, 12));
  const sh = shakeAt(f, slam, 1);
  return (
    <Frame bg={K.ink}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${mix(1, 0.62, shrink)})`, borderRadius: shrink * 40, overflow: "hidden" }}>
        <PaperBg f={f} />
        <Meta text="Re-check · same 10 questions · illustrative" />
        <div style={{ position: "absolute", left: 90, top: 110, ...H, fontSize: 100, color: K.text, zIndex: 2 }}><W f={f} at={8}>Re-</W><W f={f} at={12} style={{ color: K.blue }}>checked.</W></div>
        <Cam rx={18} ry={-10} z={kf(f, [[0, 120], [100, 260]])} x={hx - 1100 + sh.x} y={hy - 640 + sh.y}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((v) => <At key={v} x={200} y={Y(v)} w={1720} h={2} style={{ background: K.line }} />)}
          {PTS.map(([w]) => <At key={w} x={X(w) - 60} y={930} style={{ fontFamily: MONO, fontSize: 20, color: K.mute }}>{`WEEK ${w}`}</At>)}
          <At x={0} y={0} w={1920} h={1080}>
            <svg width={1920} height={1080} style={{ overflow: "visible" }}>
              <defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={K.blue} stopOpacity=".25" /><stop offset="1" stopColor={K.blue} stopOpacity="0" /></linearGradient></defs>
              <polygon points={[...PTS.slice(0, i + 1).map(([w, v]) => `${X(w)},${Y(v)}`), `${hx},${hy}`, `${hx},${Y(0)}`, `${X(0)},${Y(0)}`].join(" ")} fill="url(#ar)" />
              <polyline points={[...PTS.slice(0, i + 1).map(([w, v]) => `${X(w)},${Y(v)}`), `${hx},${hy}`].join(" ")} fill="none" stroke={K.blue} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </At>
          <At x={hx - 20} y={hy - 20} w={40} h={40} style={{ borderRadius: "50%", background: "#fff", boxShadow: `0 0 0 9px ${K.blue}, 0 0 40px ${K.blue}` }} />
          {pins.map(([w, t, at]) => f >= at && (
            <At key={t} x={X(w) - 20} y={Y(PTS[w][1]) - 110} z={40} s={bOut(pr(f, at, 10))} origin="0 100%" style={{ ...card, borderRadius: 14, padding: "12px 20px", display: "flex", gap: 10, alignItems: "center", fontWeight: 700, fontSize: 26, whiteSpace: "nowrap" }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: K.blue, display: "grid", placeItems: "center" }}><Icon name="check" size={18} color="#fff" sw={3.6} /></span>{t}
            </At>
          ))}
        </Cam>
        {f >= slam && (
          <div style={{ position: "absolute", left: 560, top: 470, zIndex: 3, transform: `rotate(-8deg) scale(${mix(2.3, 1, eOut(pr(f, slam, 7)))})`, opacity: clamp((f - slam) / 2), background: K.ink, color: "#fff", borderRadius: 999, padding: "26px 48px 26px 26px", display: "flex", alignItems: "center", gap: 24, boxShadow: "0 50px 90px -30px #000a" }}>
            <span style={{ width: 96, height: 96, borderRadius: "50%", background: K.blue, display: "grid", placeItems: "center" }}><Mark size={60} ring="#fff" /></span>
            <span>
              <div style={{ ...H, fontSize: 80, letterSpacing: "-0.04em" }}>Named by AI</div>
              <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.14em", color: "#ffffff88", marginTop: 6 }}>Q01 · GEMINI · RE-CHECKED</div>
            </span>
          </div>
        )}
      </div>
      {collapse < 1 && <div style={{ position: "absolute", left: 0, right: 0, top: mix(0, 540, collapse), height: mix(1080, 10, collapse), background: K.blue }} />}
    </Frame>
  );
}

/* S14 · 1135–1310 · dotted globe; arcs from your site to the sources AI trusts, one word per arc */
const SOURCES: [string, number, number][] = [["G2.", -45, 30], ["Reddit.", -60, 62], ["YouTube.", -150, 18], ["Capterra.", -30, -8], ["every answer.", -110, -15]];
const HOME: [number, number] = [-95, 38];
function project(lon: number, lat: number, rot: number, R: number, cx: number, cy: number) {
  const la = (lat * Math.PI) / 180, lo = ((lon + rot) * Math.PI) / 180, tilt = (-18 * Math.PI) / 180;
  let x = Math.cos(la) * Math.sin(lo), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo);
  const y2 = y * Math.cos(tilt) - z * Math.sin(tilt), z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
  return { x: cx + x * R, y: cy - y2 * R, z: z2 };
}
const DOTS = (() => {
  const out: [number, number][] = [];
  const n = 1500;
  for (let i = 0; i < n; i++) {
    const lat = (Math.asin(-1 + (2 * i + 1) / n) * 180) / Math.PI, lon = (i * 137.508) % 360 - 180;
    // fake continents: keep dots where a few smooth blobs say "land"
    const land = Math.sin((lon + 30) / 28) * Math.cos(lat / 22) + Math.sin(lon / 47 + lat / 31) * 0.8;
    if (land > 0.15) out.push([lon, lat]);
  }
  return out;
})();
export function S14({ f }: { f: number }) {
  const per = 32, start = 18;
  const k = Math.max(0, Math.min(SOURCES.length - 1, Math.floor((f - start) / per)));
  const local = f - start - k * per;
  const target = SOURCES[k];
  const rot = kf(f, [[0, 60], [start, 70], ...SOURCES.map((s, i) => [start + i * per + 18, -s[1] + 20] as [number, number])], eIO);
  const R = kf(f, [[0, 300], [20, 520], [170, 560]], c3);
  const cx = 1180, cy = 600;
  const reveal = eOut(pr(f, 0, 22));
  const home = project(HOME[0], HOME[1], rot, R, cx, cy);
  const arc = (s: [string, number, number], amt: number) => {
    const pts: string[] = [];
    for (let j = 0; j <= 40 * amt; j++) {
      const t = j / 40;
      const lon = mix(HOME[0], s[1], t), lat = mix(HOME[1], s[2], t);
      const p = project(lon, lat, rot, R * (1 + Math.sin(t * Math.PI) * 0.22), cx, cy);
      if (p.z > -0.15) pts.push(`${p.x},${p.y}`);
    }
    return pts.join(" ");
  };
  const final = f >= start + 4 * per;
  return (
    <Frame bg={<InkBg f={f} />}>
      <Meta text="Sources AI trusts" dark />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: reveal }}>
        <circle cx={cx} cy={cy} r={R} fill="#0E1426" />
        {DOTS.map(([lo, la], i) => {
          const p = project(lo, la, rot, R, cx, cy);
          if (p.z < 0) return null;
          return <circle key={i} cx={p.x} cy={p.y} r={2.2 + p.z * 2.4} fill={`rgba(120,160,255,${0.15 + p.z * 0.55})`} />;
        })}
        {SOURCES.slice(0, k + 1).map((s, i) => (
          <polyline key={s[0]} points={arc(s, i < k ? 1 : eOut(clamp(local / 16)))} fill="none" stroke={i === k ? "#7FA6FF" : "#2E5BD6"} strokeWidth={i === k ? 5 : 3} strokeLinecap="round" style={{ filter: i === k ? `drop-shadow(0 0 10px ${K.blue})` : undefined }} />
        ))}
        {home.z > 0 && <circle cx={home.x} cy={home.y} r={14} fill="#fff" style={{ filter: `drop-shadow(0 0 16px ${K.blue})` }} />}
      </svg>
      {SOURCES.slice(0, k + 1).map((s, i) => {
        const p = project(s[1], s[2], rot, R, cx, cy);
        if (p.z < 0.05 || (i === k && local < 12)) return null;
        return (
          <div key={s[0]} style={{ position: "absolute", left: p.x, top: p.y, transform: `translate(-50%,-140%) scale(${i === k ? bOut(pr(local, 12, 10)) : 0.8})`, opacity: i === k ? 1 : 0.6, background: i === k ? K.blue : "#1A2340", color: "#fff", borderRadius: 999, padding: "8px 18px", fontWeight: 700, fontSize: 22, whiteSpace: "nowrap" }}>
            {s[0].replace(".", "")}{s[0] === "every answer." ? "" : ".com"}
          </div>
        );
      })}
      {home.z > 0 && <div style={{ position: "absolute", left: home.x, top: home.y + 24, transform: "translateX(-50%)", fontFamily: MONO, fontSize: 18, color: "#C9D6F5", letterSpacing: "0.1em" }}>YOURCOMPANY.COM</div>}
      <div style={{ position: "absolute", left: 100, top: 690, color: "#fff", zIndex: 2 }}>
        <div style={{ fontWeight: 600, fontSize: 44, letterSpacing: "-0.02em", opacity: clamp((f - 10) / 6) }}>From <b style={{ color: "#8FB3FF" }}>your site</b> — to</div>
        <div key={k} style={{ ...H, fontSize: final ? 128 : 150, marginTop: 10 }}><W f={local} at={0} d={6} blur={26}>{target[0]}</W></div>
      </div>
      {f >= 168 && <div style={{ position: "absolute", inset: 0, background: K.blue, opacity: eIn(pr(f, 168, 7)) }} />}
    </Frame>
  );
}

/* S15 · 1310–1480 · four proof worlds with HUD reticles, then a 2×2 collapse */
function Reticle({ f, label, x = 1420, y = 330 }: { f: number; label: string; x?: number; y?: number }) {
  const s = bOut(pr(f, 2, 12));
  return (
    <div style={{ position: "absolute", left: x - 150, top: y - 150, width: 300, height: 300, transform: `scale(${s}) rotate(${f * 1.2}deg)` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid #ffffffcc", boxShadow: "0 0 0 1px #ffffff33 inset" }} />
      {[0, 90, 180, 270].map((a) => <div key={a} style={{ position: "absolute", left: 148, top: -14, width: 4, height: 30, background: "#fff", transformOrigin: "2px 164px", transform: `rotate(${a}deg)` }} />)}
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", transform: `rotate(${-f * 1.2}deg)`, fontFamily: MONO, fontSize: 30, color: "#fff", letterSpacing: "0.06em" }}>{label}</div>
    </div>
  );
}
function ProofWorld({ kind, f }: { kind: number; f: number }) {
  const h = hand(f, 1.4);
  if (kind === 0) // wall of evidence quotes
    return (
      <Cam ry={-34} rx={6} z={kf(f, [[0, 0], [40, 260]])} x={kf(f, [[0, -200], [40, 120]]) + h.x} y={h.y}>
        {Array.from({ length: 12 }, (_, i) => (
          <At key={i} x={200 + (i % 4) * 520} y={120 + Math.floor(i / 4) * 300} w={480} h={260} style={{ ...card, padding: 24, background: i === 5 ? "#fff" : "#F2F4FA" }}>
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center", background: "#E9EFFD", color: K.blue, borderRadius: 999, padding: "4px 12px", fontFamily: MONO, fontSize: 15 }}><Icon name="spark" size={12} color={K.blue} />Gemini</span>
            <div style={{ fontSize: 22, marginTop: 12, lineHeight: 1.35 }}>“{["Northstar CRM is the strongest pick", "Atlas is a solid budget option", "Pipewell suits teams in Gmail", "Most reviewers recommend Northstar"][i % 4]}…”</div>
            <div style={{ marginTop: 14, background: K.redBg, color: K.red, borderRadius: 8, padding: "8px 12px", fontWeight: 700, fontSize: 17 }}>Your Brand — not mentioned</div>
          </At>
        ))}
      </Cam>
    );
  if (kind === 1) // source cards linked
    return (
      <Cam rx={40} rz={-6} z={kf(f, [[0, -100], [40, 160]])} x={h.x} y={h.y - 60}>
        <At x={0} y={0} w={1920} h={1080}><svg width={1920} height={1080}>{[[960, 540, 420, 260], [960, 540, 1500, 250], [960, 540, 380, 820], [960, 540, 1520, 820], [960, 540, 960, 140]].map(([a, b, c, d], i) => <line key={i} x1={a} y1={b} x2={c} y2={d} stroke="#9DB6F5" strokeWidth={4} strokeDasharray="8 10" />)}</svg></At>
        {[["g2.com", 420, 260], ["reddit.com", 1500, 250], ["capterra.com", 380, 820], ["youtube.com", 1520, 820], ["techradar.com", 960, 140]].map(([n, x, y]) => (
          <At key={n as string} x={(x as number) - 170} y={(y as number) - 50} w={340} h={100} z={60} style={{ ...card, display: "flex", alignItems: "center", gap: 14, padding: "0 22px", fontWeight: 800, fontSize: 30 }}><Icon name="link" size={30} color={K.blue} />{n}</At>
        ))}
        <At x={860} y={440} w={200} h={200} z={90} style={{ borderRadius: 40, background: K.blue, display: "grid", placeItems: "center", boxShadow: `0 0 80px ${K.blue}` }}><Icon name="spark" size={90} color="#fff" /></At>
      </Cam>
    );
  if (kind === 2) // side by side towers
    return (
      <Cam rx={14} ry={kf(f, [[0, 26], [40, -12]])} z={kf(f, [[0, -80], [40, 120]])} x={h.x} y={h.y}>
        {[["Northstar CRM", 8, "#fff"], ["Your Brand", 1, K.red]].map(([n, v, c], i) => (
          <At key={n as string} x={560 + i * 520} y={900 - (v as number) * 66} w={300} h={(v as number) * 66} style={{ background: c as string, borderRadius: "14px 14px 0 0", boxShadow: `0 0 0 1px #ffffff22` }}>
            <div style={{ position: "absolute", top: -120, left: 0, width: 400, color: "#fff" }}><div style={{ ...H, fontSize: 80 }}>{v}/10</div><div style={{ fontWeight: 700, fontSize: 24, opacity: 0.8 }}>{n}</div></div>
          </At>
        ))}
        <At x={300} y={900} w={1320} h={4} style={{ background: "#ffffff44" }} />
      </Cam>
    );
  return ( // fixes re-checked
    <Cam rx={30} rz={-4} z={kf(f, [[0, 0], [40, 200]])} x={h.x} y={h.y - 40}>
      {Array.from({ length: 10 }, (_, i) => {
        const q = clamp((f - 4 - i * 2.6) / 5);
        return (
          <At key={i} x={250 + (i % 5) * 300} y={300 + Math.floor(i / 5) * 300} w={270} h={250} ry={q * 180} style={{ transformStyle: "preserve-3d" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 22, background: "#1A1C23", backfaceVisibility: "hidden", display: "grid", placeItems: "center", fontFamily: MONO, fontSize: 30, color: "#4A4F5C" }}>Q{String(i + 1).padStart(2, "0")}</div>
            <div style={{ position: "absolute", inset: 0, borderRadius: 22, background: i % 3 === 1 ? "#2A2D36" : K.blue, transform: "rotateY(180deg)", backfaceVisibility: "hidden", display: "grid", placeItems: "center" }}><Icon name={i % 3 === 1 ? "refresh" : "check"} size={90} color="#fff" sw={3} /></div>
          </At>
        );
      })}
    </Cam>
  );
}
const PROOF: [string, string, string][] = [["Answers,", "REAL", "Q01 · LIVE"], ["Sources,", "CITED", "6 LINKED"], ["Rivals,", "SIDE BY SIDE", "8 VS 1"], ["Fixes,", "RE-CHECKED", "10 / 10"]];
function ProofShot({ k, f }: { k: number; f: number }) {
  const bgs = [<PaperBg key="a" f={f} />, <InkBg key="b" f={f} />, <BlueBg key="c" f={f} />, <InkBg key="d" f={f} glow="#3E78F5" />];
  const dark = k !== 0;
  return (
    <Frame bg={bgs[k]}>
      <ProofWorld kind={k} f={f} />
      <div style={{ position: "absolute", inset: 0, background: dark ? "linear-gradient(0deg,#09090Bcc 0%,#09090B00 45%)" : "linear-gradient(0deg,#F5F4F0ee 0%,#F5F4F000 45%)", zIndex: 1 }} />
      <Reticle f={f} label={PROOF[k][2]} x={[1500, 1500, 1520, 1480][k]} y={[260, 300, 260, 250][k]} />
      <div style={{ position: "absolute", left: 90, bottom: 80, zIndex: 2, color: dark ? "#fff" : K.text }}>
        <div style={{ fontWeight: 600, fontSize: 40, opacity: clamp(f / 4) }}>{PROOF[k][0]}</div>
        <div style={{ ...H, fontSize: 170, letterSpacing: "-0.05em" }}><W f={f} at={3} d={6} blur={28}>{PROOF[k][1]}</W><W f={f} at={7} style={{ color: k === 2 ? "#fff" : K.blue }}>.</W></div>
      </div>
    </Frame>
  );
}
export function S15({ f }: { f: number }) {
  const per = 38;
  if (f < per * 4) {
    const k = Math.floor(f / per), l = f - k * per;
    const iris = k < 3 && l >= per - 8 ? eIn(pr(l, per - 8, 8)) : 0;
    return (
      <Frame bg={K.ink}>
        <ProofShot k={k} f={l} />
        {iris > 0 && (
          <div style={{ position: "absolute", inset: 0, clipPath: `circle(${iris * 1300}px at ${[1500, 1500, 1520][k]}px ${[260, 300, 260][k]}px)` }}>
            <ProofShot k={k + 1} f={l - per} />
          </div>
        )}
      </Frame>
    );
  }
  // 2×2 grid, then it collapses into a single tile that flies out
  const g = f - per * 4;
  const grid = eOut(pr(g, 0, 8));
  const collapse = eIn(pr(g, 10, 8));
  return (
    <Frame bg={K.blue}>
      {[0, 1, 2, 3].map((k) => {
        const cx = (k % 2) * 960, cy = Math.floor(k / 2) * 540;
        const s = mix(1, 0.48, grid);
        return (
          <div key={k} style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: `translate(${mix(k === 3 ? 0 : cx, cx + 10, grid) + mix(0, 960 - cx - 240, collapse)}px, ${mix(0, cy + 10, grid) + mix(0, 540 - cy - 135, collapse)}px) scale(${s * mix(1, 0.5, collapse)})`, borderRadius: 30, overflow: "hidden", opacity: k === 3 || grid > 0 ? 1 : 0, boxShadow: "0 30px 60px -20px #0008" }}>
            <ProofShot k={k} f={per - 1} />
          </div>
        );
      })}
    </Frame>
  );
}

/* S16 · 1480–1620 · stats: "10" from tiles / "0 accounts" slot / "Free." */
function TileDigits({ f, text, size = 34 }: { f: number; text: string; size?: number }) {
  const font: Record<string, string[]> = {
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  };
  const cols = text.split("");
  return (
    <div style={{ display: "flex", gap: size }}>
      {cols.map((ch, ci) => (
        <div key={ci} style={{ display: "grid", gridTemplateColumns: `repeat(5, ${size}px)`, gap: 6 }}>
          {font[ch].flatMap((row, ri) => row.split("").map((b, k) => {
            const seed = (ri * 7 + k * 13 + ci * 29) % 23;
            const q = eOut(pr(f, 2 + seed * 0.7, 10));
            return <div key={`${ri}-${k}`} style={{ width: size, height: size, borderRadius: 6, background: b === "1" ? "#fff" : "#ffffff14", opacity: b === "1" ? q : 0.5, transform: `translate(${(1 - q) * ((seed % 5) - 2) * 80}px, ${(1 - q) * ((seed % 7) - 3) * 60}px) scale(${b === "1" ? mix(0.2, 1, q) : 1})` }} />;
          }))}
        </div>
      ))}
    </div>
  );
}
export function S16({ f }: { f: number }) {
  if (f < 50) {
    const h = hand(f);
    return (
      <Frame bg={<BlueBg f={f} />}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#ffffff0d 2px, transparent 2px), linear-gradient(90deg, #ffffff0d 2px, transparent 2px)", backgroundSize: "40px 40px" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 230, display: "flex", flexDirection: "column", alignItems: "center", transform: `translate(${h.x}px,${h.y}px) scale(${1 + f * 0.002})` }}>
          <TileDigits f={f} text="10" size={52} />
          <div style={{ fontWeight: 700, fontSize: 54, color: "#fff", marginTop: 36, letterSpacing: "-0.02em", opacity: clamp((f - 18) / 6) }}>buyer questions, checked</div>
        </div>
      </Frame>
    );
  }
  if (f < 95) {
    const g = f - 50;
    const roll = eOut(pr(g, 0, 18));
    const digits = ["9", "7", "5", "3", "1", "0"];
    return (
      <Frame bg={<InkBg f={f} />}>
        <div style={{ position: "absolute", left: 220, top: 300, display: "flex", alignItems: "center", gap: 60 }}>
          <div style={{ ...H, fontSize: 420, color: "#fff", height: 420 * 1.0, overflow: "hidden" }}>
            <div style={{ transform: `translateY(${-roll * (digits.length - 1) * 420}px)`, filter: roll < 1 ? `blur(${Math.sin(roll * Math.PI) * 8}px)` : undefined }}>{digits.map((d) => <div key={d} style={{ height: 420, lineHeight: "420px" }}>{d}</div>)}</div>
          </div>
          <div style={{ color: "#fff" }}>
            <div style={{ ...H, fontSize: 96 }}><W f={g} at={14}>accounts.</W></div>
            <div style={{ ...H, fontSize: 96, color: K.blue2 }}><W f={g} at={22}>cards.</W></div>
            <div style={{ fontFamily: MONO, fontSize: 22, color: "#9DB6F5", letterSpacing: "0.12em", marginTop: 20, opacity: clamp((g - 26) / 6) }}>NEEDED TO START</div>
          </div>
        </div>
        {Array.from({ length: 7 }, (_, i) => {
          const q = eOut(pr(g, 4 + i * 2, 20));
          return <div key={i} style={{ position: "absolute", left: 1380 + i * 30, top: 330 + (i % 3) * 50, width: 280, height: 360, ...card, borderRadius: 14, transform: `translate(${q * (i - 3) * 90}px, ${q * ((i * 37) % 5 - 2) * 60}px) rotate(${q * (i - 3) * 14}deg)`, opacity: 0.95, padding: 26 }}>
            <div style={{ height: 14, width: "60%", background: "#E4E4E0", borderRadius: 7 }} />{[0.9, 0.7, 0.8, 0.5].map((w, j) => <div key={j} style={{ height: 10, width: `${w * 100}%`, background: "#EFEFEC", borderRadius: 5, marginTop: 18 }} />)}
          </div>;
        })}
      </Frame>
    );
  }
  const g = f - 95;
  const wipe = eIO(pr(g, 0, 10));
  return (
    <Frame bg={K.ink}>
      <div style={{ position: "absolute", inset: 0, clipPath: `polygon(${mix(120, 0, wipe)}% 0, 100% 0, 100% 100%, ${mix(140, -20, wipe)}% 100%)` }}>
        <BlueBg f={f} />
        <div style={{ position: "absolute", left: 160, top: 300, color: "#fff" }}>
          <div style={{ fontWeight: 600, fontSize: 48, opacity: clamp((g - 6) / 5) }}>Your first audit is</div>
          <div style={{ ...H, fontSize: 330 }}><W f={g} at={8} d={6} blur={30}>Free</W><W f={g} at={12} style={{ color: K.ink }}>.</W></div>
        </div>
        <div style={{ position: "absolute", left: 160, right: 160, top: 860, height: 4, background: "#ffffff33" }}><div style={{ width: `${eOut(pr(g, 10, 30)) * 100}%`, height: "100%", background: "#fff" }} /></div>
        <div style={{ position: "absolute", left: 160, top: 890, fontFamily: MONO, fontSize: 22, color: "#ffffffaa", letterSpacing: "0.1em" }}>ASK · CAPTURE · COMPARE · FIX · RE-CHECK</div>
      </div>
    </Frame>
  );
}

/* S17 · 1620–1800 · logo assembles from shards, ring burst, wordmark wipe, tagline + CTA, hold */
export function S17({ f }: { f: number }) {
  const N = 12;
  const settle = (i: number) => eOut(pr(f, 2 + i * 1.4, 22));
  const burst = pr(f, 30, 18);
  const lock = eIO(pr(f, 52, 18));
  const h = hand(f, 0.5);
  const R = 210;
  return (
    <Frame bg={<PaperBg f={f} />}>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${h.x}px,${h.y}px) scale(${1 + f * 0.0004})` }}>
        <div style={{ position: "absolute", left: mix(960, 520, lock), top: mix(470, 360, lock), width: 0, height: 0, transform: `scale(${mix(1, 0.56, lock)})` }}>
          {/* burst rays + ring pulse */}
          {burst > 0 && burst < 1 && (
            <>
              <div style={{ position: "absolute", left: -R * 1.6 * (0.8 + burst), top: -R * 1.6 * (0.8 + burst), width: R * 3.2 * (0.8 + burst), height: R * 3.2 * (0.8 + burst), borderRadius: "50%", border: `${6 * (1 - burst)}px solid ${K.blue}`, opacity: 1 - burst }} />
              {Array.from({ length: 12 }, (_, i) => <div key={i} style={{ position: "absolute", left: -3, top: -R * 1.5 - burst * 160, width: 6, height: 60, background: K.blue, borderRadius: 3, transformOrigin: `3px ${R * 1.5 + burst * 160}px`, transform: `rotate(${i * 30}deg)`, opacity: 1 - burst }} />)}
            </>
          )}
          {/* ring shards */}
          {Array.from({ length: N }, (_, i) => {
            const q = settle(i);
            const a0 = (i / N) * 300, a1 = ((i + 1) / N) * 300 + 1;
            const seed = (i * 73) % 11;
            const rad = (d: number) => ((d - 90 + 66) * Math.PI) / 180;
            const path = `M ${Math.cos(rad(a0)) * R} ${Math.sin(rad(a0)) * R} A ${R} ${R} 0 0 1 ${Math.cos(rad(a1)) * R} ${Math.sin(rad(a1)) * R}`;
            return (
              <svg key={i} width={1} height={1} style={{ position: "absolute", overflow: "visible", transform: `translate(${(1 - q) * (seed - 5) * 160}px, ${(1 - q) * ((seed * 7) % 9 - 4) * 140}px) rotate(${(1 - q) * (seed - 5) * 50}deg)`, opacity: clamp(q * 3) }}>
                <path d={path} fill="none" stroke={K.blue} strokeWidth={66} strokeLinecap={i === 0 || i === N - 1 ? "round" : "butt"} />
              </svg>
            );
          })}
          <div style={{ position: "absolute", left: R * 0.69 - 40, top: -R * 0.83 - 40, width: 80, height: 80, borderRadius: "50%", background: K.green, transform: `scale(${bOut(pr(f, 26, 12))})` }} />
        </div>
        {/* wordmark wipes in with a blue slash */}
        <div style={{ position: "absolute", left: 770, top: 270, ...H, fontSize: 190, color: K.text, clipPath: `inset(0 ${(1 - eIO(pr(f, 56, 16))) * 100}% 0 0)` }}>BrandPulse</div>
        {f >= 54 && f < 80 && <div style={{ position: "absolute", left: mix(760, 1760, eIO(pr(f, 56, 16))), top: 250, width: 28, height: 230, background: K.blue, transform: "skewX(-18deg)", opacity: 1 - pr(f, 72, 8) }} />}
        <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", ...H, fontSize: 104, color: K.text }}>
          <W f={f} at={86}>Get</W> <W f={f} at={92} style={{ color: K.blue }}>named</W> <W f={f} at={98}>by AI.</W>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 740, display: "flex", justifyContent: "center", gap: 26, alignItems: "center", opacity: clamp((f - 110) / 6), transform: `translateY(${(1 - eOut(pr(f, 110, 14))) * 30}px)` }}>
          <span style={{ background: K.blue, color: "#fff", borderRadius: 999, padding: "22px 40px", fontWeight: 800, fontSize: 34, display: "inline-flex", gap: 14, alignItems: "center" }}>Get your free AI visibility audit <Icon name="arrow" size={32} color="#fff" sw={3} /></span>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 860, textAlign: "center", fontFamily: MONO, fontSize: 28, color: "#6B7280", letterSpacing: "0.08em", opacity: clamp((f - 118) / 6) }}>zerociate.com</div>
      </div>
    </Frame>
  );
}

export const ACT_C: [number, number, (p: { f: number }) => ReactNode][] = [
  [1015, 1135, S13], [1135, 1310, S14], [1310, 1480, S15], [1480, 1620, S16], [1620, 1800, S17],
];
export { Chip, Stamp };
