import {
  Backdrop,
  Meta,
  Words,
  Pill,
  Pointer,
  Paper,
  Tick,
  Arrow,
  C,
  p,
  mix,
  k,
  at,
  smooth,
} from "./kit";
const plan = [
  {
    title: "Build a clear comparison page.",
    type: "COMPARISON",
    body: "Who you help. How you differ. Why it matters.",
    proof: "Linked to question 02",
    n: "01",
  },
  {
    title: "Make your service details specific.",
    type: "SERVICE CLARITY",
    body: "Turn broad claims into clear, useful information.",
    proof: "Linked to question 01",
    n: "02",
  },
  {
    title: "Put your experience on the record.",
    type: "TRUST EVIDENCE",
    body: "Connect your claims to relevant project proof.",
    proof: "Linked to question 03",
    n: "03",
  },
];
export function Intervention({ t }: { t: number }) {
  const flip = smooth(t / 0.75),
    fan = smooth((t - 1.3) / 1),
    focus = smooth((t - 2.8) / 0.9),
    done = smooth((t - 4.5) / 0.45),
    exit = smooth((t - 6.2) / 0.8);
  return (
    <div
      className="scene v2-stage"
      style={{ background: "#081222", color: "white" }}
    >
      <Backdrop t={t + 28} dark />
      <div
        style={at(0, 123, {
          width: 1920,
          textAlign: "center",
          opacity: p(t, 0.6, 0.5) * (1 - p(t, 2.6, 0.5)),
          transform: `translateY(${-60 * p(t, 2.6, 0.5)}px)`,
        })}
      >
        <Words text="A prioritized plan." t={t} start={0.7} size={67} />
      </div>
      <div
        style={at(0, 0, {
          width: 1920,
          height: 1080,
          transformStyle: "preserve-3d",
          transform: `perspective(1900px) rotateX(${9 * fan * (1 - focus) + 40 * exit}deg) rotateY(${-7 * fan * (1 - focus)}deg) translateY(${650 * exit}px) scale(${mix(1, 0.7, exit)})`,
        })}
      >
        {plan.map((item, i) => {
          const first = i === 0;
          const x = first
            ? k(t, [
                [0, 535],
                [1.2, 535],
                [2.4, 190],
                [3.6, 490],
              ])
            : mix(535, i === 1 ? 755 : 1310, fan);
          const y = first
            ? mix(200, 260, focus)
            : mix(200, i === 1 ? 340 : 390, fan);
          const scale = first
            ? mix(1, 0.95, focus)
            : mix(0.9, 0.76, fan) * (1 - 0.18 * focus);
          return (
            <div
              key={item.n}
              data-layout-allow-overlap="true"
              style={at(x, y, {
                width: first ? 850 : 650,
                height: 650,
                zIndex: first ? 10 : 5 - i,
                opacity: first ? 1 : fan * (1 - focus * 0.75),
                transformStyle: "preserve-3d",
                transform: `perspective(1500px) rotateY(${first ? mix(-90, 0, flip) : mix(0, i === 1 ? 10 : 20, fan)}deg) rotateZ(${first ? mix(0, -3, fan) * (1 - focus) : (i === 1 ? 3 : 9) * fan}deg) scale(${scale}) translateZ(${first ? 90 : 0}px)`,
              })}
            >
              <div
                className="v2-action-chip"
                style={{
                  height: "100%",
                  padding: first ? 50 : 35,
                  background: first
                    ? "linear-gradient(145deg,#213F6C,#0F223E)"
                    : "linear-gradient(145deg,#213957,#0A1A2E)",
                  borderColor: done && first ? "#A9FFDF66" : "#8AB2F84D",
                  boxShadow: first
                    ? "0 1px 0 #D5E6FF40 inset,0 20px 75px #0009,0 0 70px #246BFD20"
                    : "0 20px 60px #0004",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Pill dark green>
                    {first ? "FIRST PRIORITY" : item.type}
                  </Pill>
                  <span className="v2-mini-label" style={{ color: "#D0DFF4" }}>
                    ACTION / {item.n}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: first ? 62 : 45,
                    fontWeight: 550,
                    lineHeight: 1.08,
                    letterSpacing: "-.05em",
                    maxWidth: 660,
                    marginTop: 45,
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: first ? 27 : 22,
                    lineHeight: 1.65,
                    color: "#A6BBD7",
                    maxWidth: 640,
                    marginTop: 27,
                  }}
                >
                  {item.body}
                </div>
                <div
                  style={{
                    marginTop: 35,
                    padding: "24px 0",
                    borderTop: "1px solid #8EB5EF26",
                    borderBottom: "1px solid #8EB5EF26",
                  }}
                >
                  <div
                    className="v2-mini-label"
                    style={{ color: C.mint, marginBottom: 12 }}
                  >
                    WHY THIS ACTION
                  </div>
                  <div style={{ fontSize: first ? 23 : 19, color: "#CFDDF0" }}>
                    {item.proof} <span style={{ color: C.mint }}>↗</span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 34,
                  }}
                >
                  <span style={{ fontSize: 19, color: "#ABC4E7" }}>
                    Evidence attached <span style={{ color: C.mint }}>◈</span>
                  </span>
                  <div
                    style={{
                      borderRadius: 12,
                      background: first && done ? "#A9FFDF" : "#E7F0FF",
                      color: "#153357",
                      fontSize: 23,
                      fontWeight: 600,
                      padding: "19px 25px",
                      display: "flex",
                      alignItems: "center",
                      gap: 17,
                    }}
                  >
                    {first && done > 0.7 ? (
                      <>
                        <Tick size={25} />
                        Implemented
                      </>
                    ) : (
                      <>
                        Take action
                        <Arrow size={24} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={at(130, 650, {
          opacity: p(t, 2.2, 0.6) * (1 - focus),
          rotate: "-7deg",
          transform: `translateY(${30 * (1 - p(t, 2.2, 0.6))}px)`,
        })}
      >
        <Paper
          title="From the evidence"
          dark
          style={{ width: 270, minHeight: 240, scale: ".72" }}
        />
      </div>
      <div
        data-layout-allow-overlap="true"
        style={at(1330, 690, { opacity: focus * (1 - exit), width: 440 })}
      >
        <div
          style={{
            width: 70,
            height: 2,
            background: C.mint,
            marginBottom: 28,
            transformOrigin: "left",
            scale: `${p(t, 3.9, 0.6)} 1`,
          }}
        />
        <Words
          text="A plan. Not a pile of scores."
          t={t}
          start={3.65}
          size={49}
        />
        <div
          style={{
            fontSize: 22,
            lineHeight: 1.6,
            color: "#9FB6D6",
            marginTop: 23,
            opacity: p(t, 4, 0.7),
          }}
        >
          Prioritized. Evidence-linked.
          <br />
          Built for your next step.
        </div>
      </div>
      <div style={{ opacity: focus * (1 - exit) }}>
        <Pointer
          x={mix(1750, 1137, p(t, 3.8, 0.65))}
          y={mix(940, 806, p(t, 3.8, 0.65))}
          click={smooth((t - 4.45) / 0.65)}
        />
      </div>
      <div
        style={at(0, mix(1550, -80, exit), {
          width: 2100,
          height: 1400,
          background: "linear-gradient(145deg,#F9FCFF,#DAE8FF)",
          transform: `rotate(${-9 * (1 - exit)}deg)`,
          transformOrigin: "left top",
          zIndex: 25,
          boxShadow: "0 -25px 60px #0004",
        })}
      />
      <Meta label="03 / PRIORITIZED ACTION" light example />
    </div>
  );
}
