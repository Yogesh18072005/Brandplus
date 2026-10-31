import { C, p, smooth, mix, enter } from "../motion";
import { Footer, Mark } from "../primitives";
export function Brand({ t }: { t: number }) {
  const reveal = smooth(t / 0.55),
    dock = smooth((t - 2.9) / 1.1);
  return (
    <div className="scene" style={{ background: C.blue, color: "white" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: C.mint,
          clipPath: `circle(${150 * (1 - reveal)}% at 50% 50%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 42,
          transform: `translateY(${-80 * dock}px) scale(${mix(1, 0.88, dock)})`,
        }}
      >
        <div
          style={{
            ...enter(t, 0.25, 0.6),
            fontSize: 30,
            letterSpacing: "-.02em",
            opacity: p(t, 0.3) * (1 - dock),
          }}
        >
          Meet your AI visibility engine.
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 36,
            opacity: p(t, 0.35, 0.45),
          }}
        >
          <div style={{ rotate: `${mix(-90, 0, p(t, 0.3, 1))}deg` }}>
            <Mark size={190} light progress={p(t, 0.3, 1.1)} />
          </div>
          <span
            style={{
              fontSize: 180,
              fontWeight: 600,
              letterSpacing: "-.065em",
              ...enter(t, 0.55, 0.9, 35),
            }}
          >
            brandpulse
          </span>
          <span
            style={{
              fontSize: 38,
              alignSelf: "flex-end",
              paddingBottom: 25,
              color: C.mint,
              ...enter(t, 0.95),
            }}
          >
            ↗
          </span>
        </div>
        <div style={{ fontSize: 35, color: "#DBE7FF", ...enter(t, 1.3, 0.7) }}>
          Understand. Improve. Get found.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -10,
          height: 1150,
          background: C.paper,
          transform: `translateY(${1150 * (1 - dock)}px)`,
          borderRadius: "72px 72px 0 0",
        }}
      />
      <Footer chapter="MEET BRANDPULSE" light />
    </div>
  );
}
