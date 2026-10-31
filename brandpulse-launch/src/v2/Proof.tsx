import {
  Backdrop,
  Meta,
  Words,
  QueryBar,
  Pill,
  Paper,
  Pointer,
  Tick,
  C,
  p,
  mix,
  at,
  smooth,
} from "./kit";
export function Proof({ t }: { t: number }) {
  const open = smooth((t - 0.6) / 1),
    pull = smooth((t - 2.4) / 1),
    extract = smooth((t - 4.2) / 1),
    flip = smooth((t - 6.25) / 0.75);
  const sourceX = mix(1315, 535, extract),
    sourceY = mix(370, 200, extract);
  return (
    <div className="scene v2-stage" style={{ color: "#163153" }}>
      <Backdrop t={t + 21} />
      <div
        style={at(0, 125, {
          width: 1920,
          textAlign: "center",
          opacity: p(t, 0.3, 0.4) * (1 - p(t, 2, 0.5)),
        })}
      >
        <Words text="Record the answers." t={t} start={0.3} size={70} />
      </div>
      <div
        style={at(mix(360, 220, pull), mix(210, 265, open), {
          width: 1200,
          transformStyle: "preserve-3d",
          transform: `perspective(1700px) rotateY(${-11 * pull}deg) rotateX(${3 * pull}deg) scale(${mix(1, 0.82, pull)}) translateX(${-300 * extract}px)`,
          opacity: 1 - p(t, 5.6, 0.6),
          transformOrigin: "left top",
        })}
      >
        <div
          className="v2-glass-chip"
          style={{ padding: "17px 20px", borderRadius: 23 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "1px 6px 16px",
            }}
          >
            <span className="v2-mini-label">02 / COMPARISON</span>
            <Pill green>BUYER INTENT</Pill>
          </div>
          <QueryBar style={{ fontSize: 28 }} />
          <div
            style={{
              height: mix(0, 490, open),
              overflow: "hidden",
              opacity: open,
            }}
          >
            <div style={{ padding: "28px 22px 15px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Pill>RECORDED AI ANSWER</Pill>
                <span className="v2-mini-label">QUESTION 02 / COMPARISON</span>
                <span
                  style={{
                    color: C.green,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 16,
                  }}
                >
                  <Tick size={21} />
                  Evidence saved
                </span>
              </div>
              <div
                style={{
                  fontSize: 37,
                  lineHeight: 1.7,
                  letterSpacing: "-.035em",
                  marginTop: 30,
                  color: "#4C617F",
                }}
              >
                <div
                  style={{
                    opacity: p(t, 1.15, 0.5),
                    clipPath: `inset(0 ${100 * (1 - p(t, 1.1, 0.9))}% 0 0)`,
                  }}
                >
                  For this requirement,{" "}
                  <span
                    style={{
                      color: "#225A41",
                      background: `linear-gradient(90deg,#BFECD4 ${p(t, 1.9, 0.6) * 100}%,transparent 0)`,
                      padding: "0 5px",
                      borderRadius: 5,
                    }}
                  >
                    Northstar Studio
                  </span>
                </div>
                <div
                  style={{
                    opacity: p(t, 1.55, 0.5),
                    clipPath: `inset(0 ${100 * (1 - p(t, 1.4, 0.9))}% 0 0)`,
                  }}
                >
                  is a strong option, with{" "}
                  <span
                    style={{
                      background: `linear-gradient(90deg,#C8DCFF ${p(t, 2.7, 0.7) * 100}%,transparent 0)`,
                      color: "#265A9E",
                    }}
                  >
                    clear service details
                  </span>
                </div>
                <div
                  style={{
                    opacity: p(t, 1.9, 0.5),
                    clipPath: `inset(0 ${100 * (1 - p(t, 1.7, 0.9))}% 0 0)`,
                  }}
                >
                  and{" "}
                  <span
                    style={{
                      background: `linear-gradient(90deg,#C8DCFF ${p(t, 2.9, 0.7) * 100}%,transparent 0)`,
                      color: "#265A9E",
                    }}
                  >
                    relevant project evidence.
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 13,
                  marginTop: 30,
                  opacity: p(t, 2.1, 0.6),
                }}
              >
                <Pill>01 · Services ↗</Pill>
                <Pill>02 · Project portfolio ↗</Pill>
              </div>
              <div
                className="v2-missed"
                style={{ marginTop: 27, opacity: p(t, 2.6, 0.5) }}
              >
                <i />
                YOUR BUSINESS WAS NOT MENTIONED.
                <span style={{ marginLeft: "auto" }}>Inspect the gap ↗</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <svg
        width="1920"
        height="1080"
        style={{
          position: "absolute",
          inset: 0,
          opacity: pull * (1 - extract),
        }}
      >
        <path
          d="M1020 670C1170 670 1140 420 1315 420M1020 720C1200 720 1230 750 1430 750"
          stroke="#3D7CEB60"
          strokeWidth="2"
          fill="none"
          strokeDasharray="5 8"
        />
        <circle
          cx={mix(1050, 1315, p(t, 3, 0.9))}
          cy={mix(665, 420, p(t, 3, 0.9))}
          r="5"
          fill={C.blue}
        />
      </svg>
      <div
        data-layout-allow-overlap="true"
        style={at(1340, 265, {
          opacity: pull * (1 - extract),
          transform: `perspective(1400px) rotateY(-20deg) rotateZ(6deg) translateY(${30 * (1 - pull)}px)`,
          filter: "blur(1px)",
        })}
      >
        <Paper
          index={2}
          title="Project portfolio"
          style={{ background: "#DCEBFF", width: 360, minHeight: 470 }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#081222",
          clipPath: `polygon(0 0,${flip * 210}% 0,${flip * 210 - 100}% 100%,0 100%)`,
          zIndex: 4,
        }}
      />
      <div
        data-layout-allow-overlap="true"
        style={at(sourceX, sourceY, {
          width: mix(390, 850, extract),
          height: mix(475, 650, extract),
          transformStyle: "preserve-3d",
          transform: `perspective(1500px) rotateY(${mix(-20, 0, extract) + 90 * flip}deg) rotateZ(${mix(4, 0, extract)}deg) scale(${mix(0.85, 1, extract)})`,
          opacity: pull,
          zIndex: 5,
        })}
      >
        <div
          className="v2-paper"
          style={{
            width: "100%",
            height: "100%",
            padding: mix(28, 50, extract),
            background: "linear-gradient(145deg,#FFFFFF,#EDF5FF)",
            boxShadow: "0 2px 0 #FFFFFF inset,0 30px 80px #17447D3B",
          }}
        >
          <div className="v2-paper-fold" />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 33,
                height: 33,
                borderRadius: 10,
                background: "#DFEAFE",
                display: "grid",
                placeItems: "center",
                fontSize: 17,
                color: C.blue,
              }}
            >
              N
            </div>
            <span className="v2-mini-label">NORTHSTAR / SERVICES</span>
            <span style={{ marginLeft: "auto", color: "#83A2CC" }}>↗</span>
          </div>
          <div
            style={{
              fontSize: mix(32, 58, extract),
              lineHeight: 1.15,
              letterSpacing: "-.045em",
              fontWeight: 550,
              marginTop: mix(35, 48, extract),
            }}
          >
            Inspect the
            <br />
            source evidence.
          </div>
          <div
            style={{
              fontSize: mix(17, 26, extract),
              lineHeight: 1.7,
              color: "#6B7F9F",
              marginTop: 30,
            }}
          >
            A dedicated service page.
            <br />
            Relevant experience. Clear comparisons.
          </div>
          <div
            style={{
              background: "#DCF3E7",
              borderLeft: "3px solid #299764",
              padding: mix(17, 25, extract),
              marginTop: 35,
              fontSize: mix(16, 25, extract),
              color: "#286349",
              opacity: p(t, 3.7, 0.6),
            }}
          >
            Specific evidence AI can reference.
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 35,
              opacity: extract,
            }}
          >
            <Pill green>
              <Tick size={17} />
              GAP IDENTIFIED
            </Pill>
            <span className="v2-mini-label">TURN THIS INTO AN ACTION →</span>
          </div>
        </div>
      </div>
      <div
        style={at(180, 790, {
          opacity: pull * (1 - extract),
          transform: `translateY(${30 * (1 - pull)}px)`,
        })}
      >
        <Words text="Follow the sources." t={t} start={3.1} size={61} />
        <div style={{ fontSize: 25, color: "#6A7E9E", marginTop: 22 }}>
          Follow the evidence. Find what’s missing.
        </div>
      </div>
      <div style={{ opacity: pull * (1 - extract) }}>
        <Pointer
          x={mix(1780, 1060, p(t, 3, 0.7))}
          y={mix(900, 680, p(t, 3, 0.7))}
          click={smooth((t - 3.8) / 0.5)}
        />
      </div>
      <Meta label="02 / ANSWER EVIDENCE" example />
    </div>
  );
}
