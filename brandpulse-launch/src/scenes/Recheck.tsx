import { C, p, enter, smooth, mix } from "../motion";
import { Arrow, Eyebrow, Footer, Heading, Tick } from "../primitives";
export function Recheck({ t }: { t: number }) {
  const progress = p(t, 2.3, 2.3),
    count = 8 + Math.floor(progress * 10),
    exit = smooth((t - 6.1) / 0.9);
  return (
    <div className="scene" style={{ background: C.paper }}>
      <div
        style={{ position: "absolute", left: 150, top: 125, ...enter(t, 0.1) }}
      >
        <Eyebrow>04 / RECHECK. COMPARE. LEARN.</Eyebrow>
      </div>
      <div
        style={{ position: "absolute", left: 150, top: 210, opacity: 1 - exit }}
      >
        <Heading
          lines={["Make a change.", "Measure the difference."]}
          t={t}
          start={0.2}
          size={94}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 510,
          display: "flex",
          gap: 45,
          ...enter(t, 0.8, 0.8, 70),
          opacity: p(t, 0.8) * (1 - exit),
        }}
      >
        <div className="benchmark-card">
          <div className="mono" style={{ fontSize: 18, color: C.muted }}>
            BASELINE
          </div>
          <div className="stat-value">
            08<span>/40</span>
          </div>
          <DotGrid count={8} t={t} />
          <div className="benchmark-caption">
            Answers mentioning your business
          </div>
        </div>
        <div
          style={{
            width: 85,
            display: "grid",
            placeItems: "center",
            color: C.blue,
          }}
        >
          <Arrow size={66} />
        </div>
        <div
          className="benchmark-card"
          style={{ borderColor: "#A7D6BF", background: "#ECF7F0" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="mono" style={{ fontSize: 18, color: C.green }}>
              AFTER YOUR CHANGES
            </span>
            <span
              style={{
                color: C.green,
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                gap: 7,
                opacity: p(t, 4.6),
              }}
            >
              <Tick />
              Compared
            </span>
          </div>
          <div className="stat-value" style={{ color: C.green }}>
            {String(count).padStart(2, "0")}
            <span>/40</span>
          </div>
          <DotGrid count={count} t={t} />
          <div className="benchmark-caption">
            Same questions. Same market. A new observation.
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 933,
          fontSize: 20,
          color: C.muted,
          ...enter(t, 3.8),
          opacity: p(t, 3.8) * (1 - exit),
        }}
      >
        Example data shown to demonstrate the workflow. Actual outcomes vary.
      </div>
      <div
        style={{
          position: "absolute",
          width: 130,
          height: 130,
          borderRadius: "50%",
          background: C.blue,
          left: mix(1740, 895, exit),
          top: mix(60, 475, exit),
          transform: `scale(${mix(0, 18, exit)})`,
        }}
      />
      <Footer chapter="COMPARABLE RECHECK" example />
    </div>
  );
}
function DotGrid({ count, t }: { count: number; t: number }) {
  return (
    <div className="dot-grid">
      {Array.from({ length: 40 }, (_, i) => (
        <div
          key={i}
          style={{
            width: 25,
            height: 25,
            borderRadius: 8,
            background: i < count ? C.green : "#D8E0DF",
            scale: String(mix(0.4, 1, p(t, 0.9 + i * 0.015, 0.5))),
          }}
        />
      ))}
    </div>
  );
}
