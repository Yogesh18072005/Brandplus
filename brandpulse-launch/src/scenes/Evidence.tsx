import { C, p, enter, smooth, mix } from "../motion";
import { Arrow, Eyebrow, Footer, Heading, Search, Tick } from "../primitives";
export function Evidence({ t }: { t: number }) {
  const widen = smooth((t - 1.1) / 1.1),
    exit = smooth((t - 6.2) / 0.8);
  return (
    <div className="scene" style={{ background: C.paper }}>
      <div
        style={{ position: "absolute", left: 150, top: 125, ...enter(t, 0.3) }}
      >
        <Eyebrow>02 / OBSERVE & DIAGNOSE</Eyebrow>
      </div>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 210,
          opacity: p(t, 0.3) * (1 - exit),
        }}
      >
        <Heading
          lines={["See the answer.", "Understand the gap."]}
          t={t}
          start={0.35}
          size={88}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: mix(360, 150, widen),
          top: mix(210, 475, widen),
          width: mix(1200, 1020, widen),
          transform: `translateX(${-1350 * exit}px)`,
          transformOrigin: "center",
          zIndex: 2,
        }}
      >
        <div className="answer-paper">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              paddingBottom: 28,
              borderBottom: `1px solid ${C.rule}`,
              fontSize: 28,
            }}
          >
            <Search size={27} />
            <span>Which option is right for my business?</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              margin: "28px 0 23px",
            }}
          >
            <span className="engine-chip">AI ANSWER</span>
            <span className="mono" style={{ fontSize: 15, color: C.muted }}>
              RECORDED · QUESTION 02
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 17,
                color: C.green,
                display: "flex",
                gap: 6,
              }}
            >
              <Tick size={20} />
              Evidence saved
            </span>
          </div>
          <div
            style={{
              fontSize: 31,
              lineHeight: 1.8,
              letterSpacing: "-.025em",
              color: "#455166",
              opacity: p(t, 1.4, 0.6),
            }}
          >
            Based on the available information,{" "}
            <span
              className="text-highlight"
              style={{
                background: `linear-gradient(90deg, #C8F3DF ${p(t, 2.1, 0.65) * 100}%, transparent 0%)`,
              }}
            >
              Northstar Studio
            </span>{" "}
            is worth considering for its{" "}
            <span
              style={{
                background: `linear-gradient(90deg, #DFE9FF ${p(t, 2.9, 0.7) * 100}%, transparent 0%)`,
              }}
            >
              clear service details and relevant project evidence.
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 24,
              ...enter(t, 2.6, 0.5, 15),
            }}
          >
            <span className="citation">1 · Services page ↗</span>
            <span className="citation">2 · Project portfolio ↗</span>
          </div>
          <div className="absence" style={enter(t, 3.25, 0.6, 20)}>
            <span className="signal-dot" style={{ background: C.red }} />
            Your business was not mentioned.
            <span style={{ marginLeft: "auto" }}>→</span>
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 1240,
          top: 510,
          width: 530,
          opacity: p(t, 3.3, 0.75) * (1 - exit),
          transform: `translateX(${60 * (1 - p(t, 3.3, 0.75))}px)`,
        }}
      >
        <div
          className="mono"
          style={{
            color: C.blue,
            fontSize: 17,
            letterSpacing: ".08em",
            marginBottom: 22,
          }}
        >
          FOLLOW THE EVIDENCE
        </div>
        <div className="source-evidence">
          <div className="document-corner" />
          <div className="mono" style={{ fontSize: 16, color: C.muted }}>
            SOURCE / 01
          </div>
          <h3>
            Specific proof.
            <br />A clearer answer.
          </h3>
          <div className="proof-line" />
          <div className="proof-line" style={{ width: "85%" }} />
          <div className="proof-line" style={{ width: "60%" }} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 21,
              color: C.blue,
              marginTop: 35,
            }}
          >
            See why they were named
            <Arrow size={27} />
          </div>
        </div>
      </div>
      <Footer chapter="ANSWER EVIDENCE" example />
    </div>
  );
}
