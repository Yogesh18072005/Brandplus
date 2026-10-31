import {
  Backdrop,
  Meta,
  Words,
  Window,
  QueryBar,
  Pill,
  Corner,
  Tick,
  C,
  p,
  mix,
  k,
  at,
  smooth,
} from "./kit";
export function Opening({ t }: { t: number }) {
  const reveal = p(t, 0.05, 0.8),
    travel = k(t, [
      [0, 0],
      [1.9, 0],
      [2.85, 1],
      [4.45, 1],
      [5.65, 1.6],
      [6, 1.6],
    ]);
  const heroOut = 1 - p(t, 2.7, 0.4),
    focus = p(t, 4.25, 0.8);
  return (
    <div
      className="scene v2-stage"
      style={{ background: "#07101F", color: "white" }}
    >
      <Backdrop t={t} dark />
      <div
        style={{
          position: "absolute",
          inset: 0,
          perspective: 1600,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformStyle: "preserve-3d",
            transform: `translate3d(${k(t, [
              [0, -80],
              [2, 0],
              [3, 60],
              [4.5, 60],
              [5.7, -610],
            ])}px,${k(t, [
              [0, 80],
              [2, 0],
              [3, -20],
              [4.5, -20],
              [5.7, 80],
            ])}px,${mix(-300, 150, travel / 1.6)}px) rotateX(${mix(11, 0, travel / 1.6)}deg) rotateY(${mix(-13, 8, travel / 1.6)}deg)`,
          }}
        >
          {[
            "Who should I choose?",
            "Best options for a growing business",
            "Who do buyers trust?",
            "Compare the alternatives",
            "Which company is right for me?",
            "Who offers this near me?",
          ].map((q, i) => (
            <div
              key={q}
              aria-hidden="true"
              data-layout-allow-overlap="true"
              style={at(
                i % 2 === 0 ? -260 : 1370,
                -110 + Math.floor(i / 2) * 330,
                {
                  width: 630,
                  opacity: (0.23 + 0.12 * (i % 3)) * reveal,
                  transform: `translateZ(${-280 + (i % 3) * 70}px) rotateY(${i % 2 ? -24 : 24}deg) rotateZ(${i % 2 ? 5 : -5}deg) translateY(${Math.sin(t * 0.6 + i) * 12}px)`,
                  filter: `blur(${i === 2 ? 0 : 1.5}px)`,
                },
              )}
            >
              <QueryBar text={q} dark />
              <div
                style={{
                  marginTop: 20,
                  height: 90,
                  border: "1px solid #7AA8EF25",
                  borderRadius: 15,
                  background: "#12284788",
                  padding: "20px 24px",
                }}
              >
                <div
                  style={{
                    height: 5,
                    width: "85%",
                    background: "#A1C5F42A",
                    marginBottom: 13,
                  }}
                />
                <div
                  style={{ height: 5, width: "60%", background: "#A1C5F41A" }}
                />
              </div>
            </div>
          ))}
          <div
            style={at(565, 225, {
              width: 840,
              opacity: p(t, 2.6, 0.6),
              transform: `translateZ(${160 + 140 * focus}px) rotateY(${-8 * (1 - focus)}deg) scale(${mix(0.8, 1, focus)})`,
              filter: `blur(${2 * (1 - focus)}px)`,
            })}
          >
            <Window title="AI answer / buyer consideration" dark>
              <div style={{ padding: "28px 34px 32px" }}>
                <div
                  className="v2-mini-label"
                  style={{ color: "#9CB8E1", marginBottom: 22 }}
                >
                  RECOMMENDED FOR YOUR NEEDS
                </div>
                <QueryBar
                  text="Who are the best options for my business?"
                  dark
                  style={{ fontSize: 21, minHeight: 80 }}
                />
                {["Northstar Studio", "Atlas & Co.", "Goodwork"].map(
                  (name, i) => (
                    <div
                      key={name}
                      className="v2-answer-row"
                      style={{
                        borderColor: "#FFFFFF12",
                        color: "#DCEBFF",
                        padding: "20px 0",
                        fontSize: 24,
                        opacity: p(t, 2.65 + i * 0.16, 0.4),
                        transform: `translateY(${25 * (1 - p(t, 2.65 + i * 0.16, 0.5))}px)`,
                      }}
                    >
                      <span className="idx">0{i + 1}</span>
                      <span
                        className="initial"
                        style={{
                          background: "#314D73",
                          color: "#C4E4FA",
                          borderColor: "#FFFFFF15",
                        }}
                      >
                        {name[0]}
                      </span>
                      {name}
                      <span className="status" style={{ color: C.mint }}>
                        <Tick size={17} />
                        MENTIONED
                      </span>
                    </div>
                  ),
                )}
                <div
                  className="v2-missed"
                  style={{
                    marginTop: 24,
                    background: "#B7554D17",
                    borderColor: "#D4817A70",
                    color: "#FFB7AB",
                    opacity: p(t, 3.6, 0.4),
                    transform: `translateZ(50px) scale(${1 + focus * 0.04})`,
                  }}
                >
                  <i />
                  YOUR BUSINESS
                  <span style={{ marginLeft: "auto" }}>UNEXPLAINED GAP</span>
                </div>
              </div>
            </Window>
          </div>
        </div>
      </div>
      <div
        style={at(0, 285, {
          width: 1920,
          textAlign: "center",
          opacity: heroOut * reveal,
          transform: `translateY(${-100 * (1 - heroOut)}px) scale(${1 + 0.08 * (1 - heroOut)})`,
        })}
      >
        <Words text="Your next customer" t={t} start={0.1} size={123} />
        <Words
          text="just asked AI."
          t={t}
          start={0.38}
          size={143}
          color={C.mint}
        />
        <div
          style={{
            fontSize: 25,
            marginTop: 35,
            color: "#A5BCDD",
            opacity: p(t, 0.8, 0.5),
          }}
        ></div>
      </div>
      <div
        style={at(126, 650, {
          fontSize: 81,
          lineHeight: 1.04,
          letterSpacing: "-.065em",
          fontWeight: 600,
          opacity: fadeLocal(t, 2.8, 4.7),
          transform: `translateX(${-100 * p(t, 4.7, 0.45)}px)`,
        })}
      >
        Did it
        <br />
        <span style={{ color: C.mint }}>name you?</span>
      </div>
      <div
        style={at(1360, 720, {
          opacity: p(t, 4, 0.5) * (1 - p(t, 5, 0.4)),
          rotate: "-8deg",
          transform: `translateY(${25 * (1 - p(t, 4, 0.5))}px)`,
        })}
      >
        <Pill dark>THE MOMENT THAT MATTERS ↗</Pill>
      </div>
      <Meta label="THE SHORTLIST" light example={t > 2.5} />
      <Corner dark />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#08101D",
          clipPath: `inset(0 ${100 * (1 - smooth((t - 5.55) / 0.45))}% 0 0)`,
        }}
      />
    </div>
  );
}
function fadeLocal(t: number, a: number, b: number) {
  return p(t, a, 0.5) * (1 - p(t, b, 0.5));
}
