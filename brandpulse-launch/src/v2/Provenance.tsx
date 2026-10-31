import {
  Backdrop,
  Meta,
  Words,
  Window,
  Pill,
  Tick,
  C,
  p,
  mix,
  at,
  smooth,
} from "./kit";
const rows = [
  ["question_set", "FROZEN"],
  ["engine_identity", "RECORDED"],
  ["answer_text", "PRESERVED"],
  ["citation_urls", "ATTACHED"],
  ["observation_time", "RECORDED"],
  ["evidence_links", "CONNECTED"],
];
export function Provenance({ t }: { t: number }) {
  const split = smooth((t - 0.5) / 1.2),
    detail = smooth((t - 3.2) / 1.1);
  return (
    <div
      className="scene v2-stage"
      style={{ background: "#081222", color: "white" }}
    >
      <Backdrop t={t + 44} dark />
      <div style={at(140, 150, { opacity: 1 - detail })}>
        <Words text="Every answer preserved." t={t} start={0.08} size={80} />
      </div>
      <div
        style={at(160, 345, {
          width: 790,
          transform: `perspective(1500px) rotateY(${mix(13, 4, split)}deg) rotateX(4deg) rotateZ(-2deg) translateX(${-300 * detail}px) scale(${1 - 0.15 * detail})`,
          opacity: 1 - detail * 0.7,
        })}
      >
        <Window title="Answer record / provenance">
          <div style={{ padding: 35 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Pill>QUESTION / COMPARISON</Pill>
              <Pill green>Preserved</Pill>
            </div>
            <div
              style={{
                fontSize: 35,
                letterSpacing: "-.04em",
                lineHeight: 1.3,
                marginTop: 30,
              }}
            >
              A question. An observed answer.
              <br />A traceable record.
            </div>
            <div
              style={{
                marginTop: 30,
                padding: 25,
                background: "#EFF4FC",
                border: "1px solid #DBE6F5",
                borderRadius: 13,
              }}
            >
              {[
                "Recorded answer",
                "Associated citations",
                "Observed entities",
              ].map((x, i) => (
                <div
                  key={x}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    fontSize: 19,
                    color: "#6B83A7",
                    padding: "14px 0",
                    borderBottom: i < 2 ? "1px solid #D5E2F3" : "none",
                  }}
                >
                  <Tick size={19} />
                  {x}
                  <span style={{ marginLeft: "auto", color: C.green }}>
                    saved
                  </span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 14, color: "#89A0BD", marginTop: 24 }}>
              Observation, inference and unknowns stay distinct.
            </div>
          </div>
        </Window>
      </div>
      <svg
        width="1920"
        height="1080"
        style={{
          position: "absolute",
          inset: 0,
          opacity: split * (1 - detail),
        }}
      >
        <path
          d="M950 600C1040 600 990 470 1090 470"
          stroke="#6DA8FF"
          strokeWidth="2"
          fill="none"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={1 - p(t, 1.2, 1.2)}
        />
        <circle
          cx={mix(950, 1090, p(t, 1.2, 1.2))}
          cy={mix(600, 470, p(t, 1.2, 1.2))}
          r="5"
          fill={C.mint}
        />
      </svg>
      <div
        style={at(mix(1090, 590, detail), mix(300, 220, detail), {
          width: mix(650, 1020, detail),
          transform: `perspective(1500px) rotateY(${mix(-16, 0, detail)}deg) rotateX(${mix(5, 0, detail)}deg)`,
          opacity: split,
        })}
      >
        <Window title="execution / evidence contract" dark>
          <div style={{ padding: 32, fontFamily: "Plex", fontSize: 17 }}>
            <div
              style={{
                color: "#7EACF5",
                paddingBottom: 22,
                borderBottom: "1px solid #A0C4FF22",
              }}
            >
              evidence_record <span style={{ color: C.mint }}>✓</span>
            </div>
            {rows.map(([field, status], i) => (
              <div
                key={field}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "19px 0",
                  borderBottom: "1px solid #AAC9F010",
                  opacity: p(t, 0.8 + i * 0.26, 0.4),
                }}
              >
                <span style={{ color: "#A5B8D2" }}>{field}</span>
                <span style={{ color: C.mint, fontSize: 13 }}>{status}</span>
              </div>
            ))}
            <div
              style={{
                marginTop: 27,
                padding: "20px 22px",
                background: "#A9FFDF10",
                border: "1px solid #A9FFDF2A",
                borderRadius: 11,
                color: C.mint,
                opacity: p(t, 3.2, 0.6),
              }}
            >
              source cited ≠ cause proven
            </div>
          </div>
        </Window>
      </div>
      <div
        data-layout-allow-overlap="true"
        style={at(130, 820, { opacity: detail })}
      >
        <Words text="Clear about the limits." t={t} start={3.8} size={55} />
        <div style={{ fontSize: 21, color: "#9FB6D6", marginTop: 18 }}>
          Models and answers change. Evidence stays auditable.
        </div>
      </div>
      <Meta label="PROOF / TRACEABLE EVIDENCE" light />
    </div>
  );
}
