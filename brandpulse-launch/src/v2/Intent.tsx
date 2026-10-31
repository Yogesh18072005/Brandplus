import {
  Backdrop,
  Meta,
  Words,
  Window,
  AppSidebar,
  QueryBar,
  Pill,
  Paper,
  p,
  mix,
  k,
  at,
  smooth,
  Mark,
} from "./kit";
const questions = [
  "Who offers this in my city?",
  "Which option is right for my business?",
  "Who has the experience I need?",
  "Why choose you over the alternatives?",
];
export function Intent({ t }: { t: number }) {
  const fan = smooth((t - 2.1) / 1.2),
    focus = smooth((t - 4.6) / 1.1),
    exit = smooth((t - 6.25) / 0.75);
  const appScale = k(t, [
    [0, 0.58],
    [1.2, 0.88],
    [2, 0.88],
    [3.2, 0.76],
    [4.5, 0.76],
    [5.8, 0.67],
    [7, 0.5],
  ]);
  return (
    <div className="scene v2-stage" style={{ color: "#10294F" }}>
      <Backdrop t={t + 14} />
      <div
        style={at(0, 140, {
          textAlign: "center",
          width: 1920,
          opacity: 1 - p(t, 1.7, 0.5),
        })}
      >
        <Words text="Start with your business." t={t} start={0.1} size={79} />
      </div>
      <div
        style={at(325, 260, {
          width: 1270,
          transformStyle: "preserve-3d",
          opacity: 1 - exit,
          transform: `perspective(1800px) translateY(${mix(230, 0, p(t, 0.1, 1.4))}px) rotateX(${mix(24, 8, p(t, 0.1, 1.3))}deg) rotateY(${mix(-16, -6, fan)}deg) rotateZ(${mix(-5, -2, fan)}deg) scale(${appScale})`,
          transformOrigin: "center top",
        })}
      >
        <Window>
          <div style={{ display: "flex", height: 690 }}>
            <AppSidebar />
            <div style={{ padding: 35, flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div className="v2-section-header">Buyer questions</div>
                <Pill green>BUSINESS CONTEXT READY</Pill>
              </div>
              <div style={{ color: "#526D93", fontSize: 15, marginTop: 11 }}>
                Questions that match how your customers decide.
              </div>
              <div style={{ padding: "25px 0 20px", display: "flex", gap: 12 }}>
                {["Your business", "Your market", "Your customer"].map(
                  (x, i) => (
                    <Pill key={x}>
                      {["◈", "◷", "◌"][i]} {x}
                    </Pill>
                  ),
                )}
              </div>
              <QueryBar
                t={t - 0.5}
                text="yourbusiness.com"
                style={{ minHeight: 75, fontSize: 22 }}
              />
              <div
                style={{
                  margin: "27px 0 17px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#526D93",
                }}
              >
                <span>BUYER QUESTION</span>
                <span>INTENT / STATUS</span>
              </div>
              {questions.map((q, i) => (
                <div
                  key={q}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 15,
                    padding: "21px 5px",
                    borderTop: "1px solid #E7ECF5",
                    fontSize: 18,
                    opacity: p(t, 1 + i * 0.15, 0.6),
                  }}
                >
                  <span className="v2-mini-label">0{i + 1}</span>
                  <span style={{ flex: 1 }}>{q}</span>
                  <Pill green>
                    {["Discovery", "Comparison", "Trust", "Decision"][i]}
                  </Pill>
                </div>
              ))}
            </div>
          </div>
        </Window>
      </div>
      <svg
        width="1920"
        height="1080"
        style={{ position: "absolute", inset: 0, opacity: fan * (1 - focus) }}
      >
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M960 625C${800 + i * 180} 570 ${500 + i * 470} 500 ${450 + i * 500} 430`}
            stroke="#4A88EF55"
            fill="none"
            strokeWidth="2"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - fan}
          />
        ))}
      </svg>
      <div
        data-layout-allow-overlap="true"
        style={at(mix(260, 360, focus), mix(410, 210, focus), {
          width: mix(1400, 1200, focus),
          height: 150,
          transformStyle: "preserve-3d",
          transform: `perspective(1500px) rotateX(${mix(8, 0, focus)}deg) rotateY(${mix(-8, 0, focus)}deg) scale(${mix(0.78, 1, focus)})`,
          opacity: p(t, 2.1, 0.5),
        })}
      >
        {questions.slice(0, 3).map((q, i) => (
          <div
            key={q}
            style={{
              position: "absolute",
              width: i === 1 ? "100%" : 600,
              left:
                i === 0
                  ? mix(-100, -850, focus)
                  : i === 2
                    ? mix(850, 1600, focus)
                    : 0,
              top: i === 1 ? mix(70, 0, focus) : -80,
              opacity: i === 1 ? 1 : 1 - focus,
              transform: `translate3d(${(i - 1) * 90 * (1 - fan)}px,${90 * (1 - popLocal(t, 2.2 + i * 0.13))}px,${i === 1 ? 150 : 0}px) rotateZ(${(i - 1) * 8 * (1 - focus)}deg)`,
              filter: `blur(${i === 1 ? 0 : focus * 4}px)`,
            }}
          >
            <div
              className="v2-glass-chip"
              style={{
                padding: "17px 20px",
                borderRadius: 23,
                boxShadow: "0 2px 0 #FFF inset,0 22px 60px #0E387B35",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "1px 6px 16px",
                }}
              >
                <span className="v2-mini-label">
                  0{i + 1} / {["DISCOVERY", "COMPARISON", "TRUST"][i]}
                </span>
                <Pill green>BUYER INTENT</Pill>
              </div>
              <QueryBar text={q} style={{ fontSize: i === 1 ? 28 : 21 }} />
            </div>
          </div>
        ))}
      </div>
      <div
        style={at(180, 760, {
          opacity: fan * (1 - focus),
          transform: `translateY(${25 * (1 - fan)}px)`,
          rotate: "-6deg",
        })}
      >
        <Paper
          index={1}
          title="Your market. Your buyers."
          style={{ width: 280, minHeight: 220, padding: 23, scale: ".85" }}
        />
      </div>
      <div
        style={at(1250, 830, {
          display: "flex",
          alignItems: "center",
          gap: 15,
          opacity: p(t, 3.6, 0.6) * (1 - focus),
        })}
      >
        <Mark size={37} />
        <div style={{ fontSize: 23 }}>Built around your business.</div>
      </div>
      <Meta label="01 / BUYER INTENT" example />
    </div>
  );
}
function popLocal(t: number, start: number) {
  const x = Math.max(0, t - start);
  return x > 1.2 ? 1 : 1 - Math.exp(-7 * x) * Math.cos(10 * x);
}
