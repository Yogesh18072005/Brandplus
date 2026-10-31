import {
  Backdrop,
  Meta,
  Words,
  Mark,
  Tick,
  C,
  p,
  mix,
  k,
  at,
  smooth,
} from "./kit";
const modules = [
  {
    label: "Business context",
    x: 290,
    y: 130,
    n: "01",
    rows: ["Your offer", "Your market", "Your buyers"],
  },
  {
    label: "Buyer questions",
    x: 1180,
    y: 130,
    n: "02",
    rows: ["Discovery", "Comparison", "Decision"],
  },
  {
    label: "Answer evidence",
    x: 1180,
    y: 650,
    n: "03",
    rows: ["Recorded answers", "Cited sources", "Evidence gaps"],
  },
  {
    label: "Action & recheck",
    x: 290,
    y: 650,
    n: "04",
    rows: ["Prioritize", "Implement", "Compare"],
  },
];
export function Engine({ t }: { t: number }) {
  const orbit = p(t, 0.3, 1.5),
    exit = smooth((t - 5.2) / 0.8);
  return (
    <div
      className="scene v2-stage"
      style={{ background: C.blue, color: "white" }}
    >
      <Backdrop t={t + 42} blue />
      <div
        style={{
          position: "absolute",
          inset: 0,
          perspective: 1800,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformStyle: "preserve-3d",
            transform: `rotateX(${mix(25, 11, orbit)}deg) rotateY(${k(t, [
              [0, -15],
              [1.4, -4],
              [4.6, 5],
              [6, 12],
            ])}deg) rotateZ(${mix(-5, -1, orbit)}deg) scale(${mix(0.65, 0.88, orbit) - 0.25 * exit}) translateY(${50 * (1 - orbit)}px)`,
            opacity: 1 - exit,
          }}
        >
          <svg
            width="1920"
            height="1080"
            style={{ position: "absolute", inset: 0, overflow: "visible" }}
          >
            {[
              "M960 540H770Q720 540 720 490V330Q720 290 680 290H550",
              "M960 540H1140Q1190 540 1190 490V330Q1190 290 1230 290H1400",
              "M960 540H1140Q1190 540 1190 590V770Q1190 810 1230 810H1400",
              "M960 540H770Q720 540 720 590V770Q720 810 680 810H550",
            ].map((d, i) => (
              <g key={d}>
                <path d={d} fill="none" stroke="#AFD3FF45" strokeWidth="2" />
                <path
                  d={d}
                  fill="none"
                  stroke={C.mint}
                  strokeWidth="3"
                  pathLength="1"
                  strokeDasharray=".08 .92"
                  strokeDashoffset={-(t * 0.36 + i * 0.25) % 1}
                />
              </g>
            ))}
            <circle
              cx="960"
              cy="540"
              r="260"
              stroke="#A6CEFF26"
              fill="none"
              strokeWidth="1"
            />
            <circle
              cx="960"
              cy="540"
              r="205"
              stroke="#A6CEFF40"
              strokeDasharray="2 12"
              fill="none"
              strokeWidth="2"
            />
          </svg>
          <div
            style={at(830, 410, {
              width: 260,
              height: 260,
              transformStyle: "preserve-3d",
              transform: "translateZ(100px)",
            })}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 52,
                  transform: `translateZ(${-i * 6}px)`,
                  background:
                    i === 0
                      ? "linear-gradient(145deg,#6BA7FF,#1F61EA 55%,#1046BD)"
                      : "#1A4CAC",
                  border: "1px solid #96C5FF60",
                  boxShadow:
                    i === 0
                      ? "0 0 80px #78B1FF66 inset,0 1px 0 #FFFFFF66 inset"
                      : "none",
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
              }}
            >
              <Mark size={169} light />
            </div>
          </div>
          {modules.map((m, i) => (
            <div
              key={m.n}
              style={at(m.x, m.y, {
                width: 450,
                height: 290,
                transformStyle: "preserve-3d",
                transform: `translateZ(${60 + 15 * Math.sin(t * 0.8 + i)}px) translateY(${70 * (1 - p(t, 0.3 + i * 0.18, 0.7))}px) rotateY(${i === 0 || i === 3 ? 14 : -14}deg)`,
                opacity: p(t, 0.3 + i * 0.18, 0.7),
              })}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "14px -13px -14px 13px",
                  transform: "translateZ(-10px)",
                  background: "#0C3896",
                  borderRadius: 20,
                  border: "1px solid #7AA9EF55",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  transform: "translateZ(2px)",
                  padding: 27,
                  borderRadius: 20,
                  background: "linear-gradient(145deg,#EAF4FFFF,#C2DFFFEB)",
                  color: "#214878",
                  border: "1px solid #FFFFFF",
                  boxShadow: "0 20px 40px #052D8D44",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span className="v2-mini-label" style={{ color: "#3D5B83" }}>
                    MODULE / {m.n}
                  </span>
                  <span style={{ color: "#205F48" }}>●</span>
                </div>
                <div
                  style={{
                    fontSize: 29,
                    fontWeight: 600,
                    letterSpacing: "-.04em",
                    margin: "19px 0 15px",
                  }}
                >
                  {m.label}
                </div>
                {m.rows.map((r, j) => (
                  <div
                    key={r}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 15,
                      color: "#3D5B83",
                      padding: "9px 0",
                      borderTop: "1px solid #AFC8E755",
                    }}
                  >
                    <span>{r}</span>
                    {i === 3 ? (
                      <Tick size={15} />
                    ) : (
                      <div
                        style={{
                          height: 4,
                          width: 70 + j * 12,
                          background: j === 1 ? "#81CDAA" : "#96B5E1",
                          borderRadius: 3,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        style={at(0, 470, {
          width: 1920,
          textAlign: "center",
          fontSize: 104,
          fontWeight: 600,
          letterSpacing: "-.055em",
          pointerEvents: "none",
          opacity: 1 - p(t, 1.3, 0.4),
        })}
      >
        <Words text="Not just an audit." t={t} start={0.1} size={110} />
      </div>
      <div
        style={at(0, 904, {
          width: 1920,
          textAlign: "center",
          fontSize: 38,
          letterSpacing: "-.035em",
          opacity: p(t, 2, 0.7) * (1 - exit),
        })}
      >
        <span style={{ opacity: p(t, 2, 0.6) }}>Understand.</span>
        <span
          style={{
            margin: "0 35px",
            color: "#B8D6FF",
            opacity: p(t, 2.6, 0.6),
          }}
        >
          Improve.
        </span>
        <span style={{ color: C.mint, opacity: p(t, 3.2, 0.6) }}>Repeat.</span>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#EDF4FD",
          clipPath: `circle(${2300 * exit}px at 50% 50%)`,
          zIndex: 40,
        }}
      />
      <Meta label="THE IMPROVEMENT ENGINE" light />
    </div>
  );
}
