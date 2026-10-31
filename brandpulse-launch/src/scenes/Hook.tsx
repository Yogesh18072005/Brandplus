import { C, enter, p, mix, smooth } from "../motion";
import {
  Arrow,
  Eyebrow,
  Footer,
  Heading,
  Logo,
  Search,
  Tick,
} from "../primitives";
export function Hook({ t }: { t: number }) {
  const pull = smooth((t - 2.5) / 1.05),
    exit = smooth((t - 5.6) / 0.4),
    query = "Who are the best options for my business?";
  return (
    <div className="scene" style={{ background: C.paper }}>
      <div className="top-brand">
        <Logo size={32} />
        <span className="mono">THE WAY BUYERS DISCOVER YOU HAS CHANGED.</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 245,
          opacity: 1 - p(t, 2.5, 0.5),
          transform: `translateY(${-90 * pull}px) scale(${1 - 0.05 * pull})`,
        }}
      >
        <Eyebrow>YOUR NEXT CUSTOMER</Eyebrow>
        <div style={{ marginTop: 30 }}>
          <Heading
            lines={["Your next customer", "is asking AI."]}
            t={t}
            start={0.15}
            size={130}
          />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: mix(150, 360, pull),
          top: mix(640, 225, pull),
          width: mix(1320, 1200, pull),
          height: 116,
          background: "white",
          borderRadius: 24,
          boxShadow: "0 20px 70px #14213d12",
          border: "1px solid #DDE3E9",
          display: "flex",
          alignItems: "center",
          gap: 25,
          padding: "0 34px",
          ...enter(t, 0.9, 0.75, 60),
        }}
      >
        <Search size={32} />
        <span style={{ fontSize: 30, letterSpacing: "-.025em", flex: 1 }}>
          {query.slice(0, Math.round(query.length * p(t, 1.1, 1.25)))}
          <span className="caret" style={{ opacity: t < 2.7 ? 1 : 0 }} />
        </span>
        <span className="send">
          <Arrow size={33} direction="up" />
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          top: 390,
          left: 400,
          width: 1120,
          opacity: p(t, 3.25, 0.5),
        }}
      >
        <div
          className="mono"
          style={{ fontSize: 18, color: C.muted, marginBottom: 22 }}
        >
          A SHORTLIST. THREE NAMES.
        </div>
        {["Northstar Studio", "Atlas & Co.", "Goodwork"].map((name, i) => (
          <div
            key={name}
            className="shortlist-row"
            style={enter(t, 3.5 + i * 0.2, 0.6, 45)}
          >
            <span className="row-index">0{i + 1}</span>
            <span
              className="company-symbol"
              style={{
                background: i === 1 ? "#E5EBF5" : "#EAF3EE",
                color: i === 1 ? C.blue : C.green,
              }}
            >
              {name[0]}
            </span>
            <span>{name}</span>
            <span className="mentioned">
              <Tick size={18} />
              Mentioned
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 1260,
          top: 760,
          opacity: p(t, 4.6, 0.5),
          rotate: "-6deg",
        }}
      >
        <div className="missing-stamp">Your business?</div>
      </div>
      <Footer chapter="THE SHORTLIST" example={t > 3} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: C.ink,
          transform: `translateX(${1920 * (1 - exit)}px)`,
        }}
      />
    </div>
  );
}
