import { C, p, enter } from "../motion";
import { Arrow, Footer, Heading, Logo, Mark } from "../primitives";
export function Final({ t }: { t: number }) {
  return (
    <div className="scene" style={{ background: C.paper }}>
      <div
        style={{ position: "absolute", left: 150, top: 125, ...enter(t, 0.05) }}
      >
        <Logo size={42} />
      </div>
      <div style={{ position: "absolute", left: 150, top: 290 }}>
        <Heading
          lines={["Don’t just get scored.", "Get a way forward."]}
          t={t}
          start={0.3}
          size={114}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 625,
          fontSize: 34,
          color: C.muted,
          ...enter(t, 1.4),
        }}
      >
        Understand. Improve. Get found.
      </div>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 745,
          display: "flex",
          alignItems: "center",
          gap: 32,
          ...enter(t, 2.1),
        }}
      >
        <div className="final-cta">
          Start with your free audit
          <Arrow size={35} />
        </div>
        <span className="mono" style={{ fontSize: 20, color: C.muted }}>
          YOUR FIRST STEP INTO THE LOOP.
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 1380,
          top: 640,
          rotate: `${-35 * (1 - p(t, 0.8, 1.7))}deg`,
          scale: String(0.7 + 0.3 * p(t, 0.8, 1.7)),
          opacity: p(t, 0.8, 1.3),
        }}
      >
        <Mark size={330} progress={p(t, 0.8, 1.7)} />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 12,
          background: C.blue,
          transformOrigin: "left",
          scale: `${p(t, 0, 7)} 1`,
        }}
      />
      <Footer chapter="YOUR NEXT MOVE" />
    </div>
  );
}
