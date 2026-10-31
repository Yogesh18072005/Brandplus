import {
  Backdrop,
  Meta,
  Words,
  Window,
  Pill,
  Tick,
  Arrow,
  Mark,
  C,
  p,
  mix,
  at,
  smooth,
} from "./kit";
const questions = [
  "Discovery / market",
  "Comparison / alternatives",
  "Trust / experience",
  "Decision / suitability",
];
export function Recheck({ t }: { t: number }) {
  const exit = smooth((t - 6.3) / 0.7);
  return (
    <div className="scene v2-stage" style={{ color: "#19395F" }}>
      <Backdrop t={t + 35} />
      <div style={at(145, 143, { opacity: 1 - p(t, 1.6, 0.5) })}>
        <Words text="The same questions." t={t} start={0.1} size={88} />
      </div>
      <div
        style={at(230, 260, {
          width: 1460,
          transform: `perspective(1800px) rotateX(${mix(19, 4, p(t, 0.1, 1.2))}deg) rotateY(${mix(-12, 0, p(t, 0.1, 1.5))}deg) rotateZ(${mix(-4, 0, p(t, 0.2, 1.2))}deg) scale(${mix(0.79, 0.95, p(t, 0.1, 1.3))})`,
          opacity: 1 - exit,
        })}
      >
        <Window title="brandpulse / frozen benchmark">
          <div style={{ padding: 38 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div className="v2-mini-label">COMPARABLE RECHECK</div>
                <div style={{ fontSize: 32, fontWeight: 600, marginTop: 12 }}>
                  Keep the measurement consistent.
                </div>
              </div>
              <Pill green>
                <Tick size={17} />
                QUESTION SET LOCKED
              </Pill>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 100px 1fr",
                gap: 25,
                padding: "35px 15px 20px",
                color: "#6F86A7",
                font: "13px Plex",
              }}
            >
              <span>BUYER INTENT</span>
              <span>BASELINE / SAVED</span>
              <span />
              <span>RECHECK / RECORDED</span>
            </div>
            {questions.map((q, i) => (
              <div
                key={q}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 100px 1fr",
                  gap: 25,
                  alignItems: "center",
                  padding: "23px 15px",
                  borderTop: "1px solid #E0E9F5",
                  opacity: p(t, 0.8 + i * 0.18, 0.5),
                }}
              >
                <span style={{ fontSize: 22 }}>{q}</span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    color: "#607A9F",
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      border: "1px solid #BDD0E8",
                      borderRadius: 8,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Tick size={17} />
                  </div>
                  <span style={{ fontSize: 17 }}>Answer preserved</span>
                </div>
                <div
                  style={{
                    position: "relative",
                    height: 3,
                    background: "#DAE6F5",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: C.blue,
                      transformOrigin: "left",
                      scale: `${p(t, 1.7 + i * 0.5, 0.7)} 1`,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: `${p(t, 1.7 + i * 0.5, 0.7) * 100}%`,
                      top: -4,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: C.blue,
                      opacity: p(t, 1.7 + i * 0.5, 0.5),
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    color: C.green,
                    opacity: p(t, 2.1 + i * 0.5, 0.5),
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      border: "1px solid #91C8AA",
                      borderRadius: 8,
                      background: "#E1F4E9",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Tick size={17} />
                  </div>
                  <span style={{ fontSize: 17 }}>Evidence compared</span>
                </div>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 30,
                padding: 24,
                border: "1px solid #CFE3D7",
                background: "#EDF7F1",
                borderRadius: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <Mark size={40} />
                <div style={{ fontSize: 23, fontWeight: 550 }}>
                  See what changed.
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <Pill green>
                  <Tick size={17} />
                  Same business
                </Pill>
                <Pill green>
                  <Tick size={17} />
                  Same market
                </Pill>
                <Pill green>
                  <Tick size={17} />
                  Same questions
                </Pill>
              </div>
            </div>
          </div>
        </Window>
      </div>
      <div
        style={at(130, 820, {
          opacity: p(t, 4.1, 0.6) * (1 - exit),
          rotate: "-5deg",
          padding: "23px 30px",
          borderRadius: 19,
          background: "linear-gradient(135deg,#1E5AE8,#0E3E9F)",
          color: "white",
          border: "1px solid #76A7FA",
          boxShadow: "0 20px 40px #1C4F9B33",
          display: "flex",
          alignItems: "center",
          gap: 15,
        })}
      >
        <Tick size={32} />
        <div>
          <div style={{ fontSize: 25 }}>Rechecked.</div>
          <div style={{ fontSize: 15, color: "#B6D1FE", marginTop: 7 }}>
            Measured evidence. Clear next step.
          </div>
        </div>
        <Arrow size={28} />
      </div>
      <div
        style={at(mix(1730, 900, exit), mix(100, 480, exit), {
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: C.blue,
          scale: String(20 * exit),
          zIndex: 40,
        })}
      />
      <Meta label="04 / COMPARABLE RECHECK" example />
    </div>
  );
}
