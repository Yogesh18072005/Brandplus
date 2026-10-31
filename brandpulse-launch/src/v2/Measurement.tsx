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
function Digit({ value }: { value: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        height: 156,
        width: 95,
        overflow: "hidden",
        position: "relative",
        maskImage: "linear-gradient(transparent,#000 12%,#000 88%,transparent)",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 0,
          top: -156 * value,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {Array.from({ length: 20 }, (_, i) => (
          <span
            key={i}
            style={{ height: 156, display: "block", lineHeight: "156px" }}
          >
            {i % 10}
          </span>
        ))}
      </span>
    </span>
  );
}
export function Measurement({ t }: { t: number }) {
  const settle = p(t, 0.1, 1.2),
    scan = smooth((t - 2.2) / 2),
    count = mix(8, 18, scan),
    focus = smooth((t - 3.2) / 1.2),
    exit = smooth((t - 6.2) / 0.8);
  const points =
    "M0 223C70 223 70 200 130 200S200 210 260 178S320 178 390 148S460 155 520 104S600 114 660 63S730 68 820 15";
  return (
    <div className="scene v2-stage" style={{ color: "#15345D" }}>
      <Backdrop t={t + 35} />
      <div
        style={at(0, 135, {
          width: 1920,
          textAlign: "center",
          opacity: 1 - p(t, 1.8, 0.5),
        })}
      >
        <Words text="Did it work?" t={t} start={0.15} size={112} />
      </div>
      <div
        style={at(230, 240, {
          width: 1460,
          transformStyle: "preserve-3d",
          transformOrigin: "center",
          transform: `perspective(2000px) rotateX(${mix(24, 4, settle) - 3 * focus}deg) rotateY(${mix(-15, -3, settle) + 3 * focus}deg) rotateZ(${mix(-5, 0, settle)}deg) translateY(${130 * (1 - settle)}px) scale(${mix(0.78, 0.94, settle) + 0.03 * focus})`,
          opacity: 1 - exit,
        })}
      >
        <Window title="brandpulse / comparable recheck">
          <div style={{ padding: "35px 42px 30px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div className="v2-mini-label">
                  SAME QUESTIONS. SAME MARKET.
                </div>
                <div
                  style={{
                    fontSize: 31,
                    fontWeight: 600,
                    letterSpacing: "-.04em",
                    marginTop: 10,
                  }}
                >
                  Your visibility, compared.
                </div>
              </div>
              <Pill green>
                <Tick size={16} />
                ACTION IMPLEMENTED
              </Pill>
              <Pill>Benchmark / 40 buyer questions</Pill>
            </div>
            <div style={{ display: "flex", gap: 45, marginTop: 30 }}>
              <div
                style={{
                  width: 350,
                  borderRight: "1px solid #E2E9F4",
                  paddingRight: 35,
                }}
              >
                <div className="v2-mini-label">
                  MENTIONS / BASELINE → RECHECK
                </div>
                <div
                  style={{
                    fontSize: 137,
                    lineHeight: 1,
                    letterSpacing: "-.08em",
                    fontWeight: 550,
                    display: "flex",
                    alignItems: "center",
                    margin: "17px 0 11px",
                    color: focus ? "#1F8A5B" : "#173D73",
                  }}
                >
                  <Digit value={Math.floor(count / 10)} />
                  <Digit value={count % 10} />
                  <span
                    style={{ fontSize: 48, color: "#99ABC3", marginLeft: 4 }}
                  >
                    /40
                  </span>
                </div>
                <div style={{ fontSize: 19, color: "#597297" }}>
                  Answers naming your business
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 13,
                    alignItems: "center",
                    marginTop: 30,
                  }}
                >
                  <Pill>08 / BASELINE</Pill>
                  <Arrow size={26} />
                  <Pill green>
                    {String(Math.floor(count)).padStart(2, "0")} / RECHECK
                  </Pill>
                </div>
                <div
                  style={{
                    borderTop: "1px solid #E1E9F5",
                    marginTop: 30,
                    paddingTop: 25,
                    fontSize: 18,
                    color: "#526D93",
                    lineHeight: 1.6,
                  }}
                >
                  A like-for-like observation.
                  <br />A clearer view of what changed.
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span className="v2-mini-label">OBSERVED VISIBILITY</span>
                  <div
                    style={{
                      display: "flex",
                      gap: 18,
                      fontSize: 12,
                      color: "#718BAE",
                    }}
                  >
                    <span>● Baseline</span>
                    <span style={{ color: C.green }}>● Recheck</span>
                  </div>
                </div>
                <div
                  style={{ position: "relative", height: 270, marginTop: 25 }}
                >
                  <svg
                    width="100%"
                    height="270"
                    viewBox="-35 -10 900 280"
                    style={{ overflow: "visible" }}
                  >
                    <defs>
                      <linearGradient
                        id="chart-under"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop stopColor="#89D8AD" stopOpacity=".32" />
                        <stop offset="1" stopColor="#89D8AD" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0, 1, 2, 3].map((i) => (
                      <g key={i}>
                        <path
                          d={`M0 ${i * 75}H820`}
                          stroke="#D6E2F3"
                          strokeDasharray="3 5"
                        />
                        <text
                          x="-32"
                          y={i * 75 + 4}
                          fontFamily="Plex"
                          fontSize="10"
                          fill="#91A4C0"
                        >
                          {[40, 30, 20, 10][i]}
                        </text>
                      </g>
                    ))}
                    <path
                      d={`${points}L820 250H0Z`}
                      fill="url(#chart-under)"
                      opacity={scan}
                    />
                    <path
                      d="M0 223H820"
                      stroke="#91A8C9"
                      strokeDasharray="5 5"
                      strokeWidth="2"
                    />
                    <path
                      d={points}
                      stroke="#27885A"
                      strokeWidth="4"
                      fill="none"
                      pathLength="1"
                      strokeDasharray="1"
                      strokeDashoffset={1 - scan}
                    />
                    <circle
                      cx={mix(0, 820, scan)}
                      cy={mix(223, 15, scan)}
                      r="7"
                      fill="#1F8A5B"
                      stroke="white"
                      strokeWidth="3"
                      opacity={scan}
                    />
                  </svg>
                  <div
                    style={at(590, 15, {
                      opacity: p(t, 4.1, 0.4),
                      background: "#1E5AE8",
                      color: "white",
                      padding: "11px 16px",
                      borderRadius: 11,
                      fontSize: 14,
                      boxShadow: "0 8px 20px #1E5AE830",
                    })}
                  >
                    Same benchmark. Rechecked.
                  </div>
                </div>
                <div
                  style={{
                    position: "relative",
                    border: "1px solid #DCE6F3",
                    borderRadius: 13,
                    padding: "21px 20px",
                    marginTop: 16,
                    background: "#F6F9FE",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 19,
                    }}
                  >
                    <span className="v2-mini-label">
                      QUESTION-BY-QUESTION CHANGE
                    </span>
                    <span style={{ color: C.green, fontSize: 12 }}>
                      40 comparable questions
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(20,1fr)",
                      gap: 8,
                    }}
                  >
                    {Array.from({ length: 40 }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          height: 18,
                          borderRadius: 4,
                          background:
                            i < 8
                              ? "#418B6A"
                              : i < Math.floor(count)
                                ? "#80C9A4"
                                : "#D9E3F0",
                          boxShadow:
                            i >= 8 && i < Math.floor(count)
                              ? "0 2px 7px #63B28E50"
                              : "none",
                          transform: `scale(${i >= 8 && i < Math.floor(count) ? 1.05 : 1})`,
                        }}
                      />
                    ))}
                  </div>
                  <div
                    className="v2-scan"
                    style={{
                      left: `${scan * 110}%`,
                      opacity: scan > 0 && scan < 1 ? 1 : 0,
                      background: C.blue,
                      boxShadow: "0 0 20px #1E5AE8",
                    }}
                  />
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid #E2E9F4",
                paddingTop: 25,
                marginTop: 30,
                fontSize: 13,
                color: "#546E94",
              }}
            >
              <span>Illustrative data. Actual outcomes vary.</span>
              <span>
                Business context ✓ &nbsp; Question set ✓ &nbsp; Market ✓
              </span>
            </div>
          </div>
        </Window>
      </div>
      <div
        style={at(120, 810, {
          transform: `perspective(1200px) rotateY(12deg) rotateZ(-7deg) scale(${0.75 + 0.25 * p(t, 4.3, 0.7)})`,
          opacity: p(t, 4.3, 0.7) * (1 - exit),
          background: "linear-gradient(135deg,#1E5AE8,#0B3B9D)",
          border: "1px solid #74A5F4",
          borderRadius: 20,
          padding: "22px 28px",
          color: "white",
          boxShadow: "0 20px 35px #1C4D9730",
          display: "flex",
          gap: 17,
          alignItems: "center",
        })}
      >
        <Mark size={43} light />
        <div>
          <div style={{ fontSize: 23, fontWeight: 550 }}>
            Measure the change.
          </div>
          <div style={{ fontSize: 14, color: "#BCD8FF", marginTop: 6 }}>
            Keep the evidence. Keep improving.
          </div>
        </div>
      </div>
      <div
        style={at(mix(1730, 900, exit), mix(110, 480, exit), {
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: C.blue,
          scale: String(20 * exit),
          boxShadow: "0 0 80px #1E5AE880",
          zIndex: 40,
        })}
      />
      <Meta label="04 / COMPARABLE RECHECK" example />
    </div>
  );
}
