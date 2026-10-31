import { C, p, smooth, enter, mix } from "../motion";
import { Arrow, Eyebrow, Footer, Mark } from "../primitives";
export function Loop({ t }: { t: number }) {
  const turn = p(t, 0.3, 4.7),
    exit = smooth((t - 5.1) / 0.9);
  return (
    <div className="scene" style={{ background: C.blue, color: "white" }}>
      <div
        style={{ position: "absolute", left: 150, top: 150, ...enter(t, 0.2) }}
      >
        <Eyebrow light>BUILT TO KEEP YOU MOVING</Eyebrow>
      </div>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 300,
          fontSize: 115,
          lineHeight: 1.12,
          letterSpacing: "-.055em",
          fontWeight: 550,
          opacity: 1 - exit,
        }}
      >
        {["Understand.", "Improve.", "Repeat."].map((word, i) => (
          <div
            key={word}
            style={{
              ...enter(t, 0.35 + i * 0.5, 0.75, 85),
              color: i === 2 ? C.mint : "white",
            }}
          >
            {word}
          </div>
        ))}
        <div
          style={{
            fontSize: 29,
            lineHeight: 1.6,
            color: "#C8DAFF",
            marginTop: 40,
            letterSpacing: "-.02em",
            ...enter(t, 2.1),
          }}
        >
          One connected loop.
          <br />A clearer next step, every time.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          width: 820,
          height: 820,
          left: 1000,
          top: 130,
          scale: String(mix(1, 0.15, exit)),
          opacity: 1 - exit,
          rotate: `${-12 * (1 - p(t, 0.1, 1))}deg`,
        }}
      >
        <svg
          width="820"
          height="820"
          viewBox="0 0 820 820"
          style={{ position: "absolute" }}
        >
          <circle
            cx="410"
            cy="410"
            r="260"
            fill="none"
            stroke="#FFFFFF24"
            strokeWidth="3"
          />
          <circle
            cx="410"
            cy="410"
            r="260"
            fill="none"
            stroke={C.mint}
            strokeWidth="4"
            strokeDasharray="1634"
            strokeDashoffset={1634 * (1 - turn)}
            transform="rotate(-90 410 410)"
          />
          <circle
            cx="410"
            cy="410"
            r="190"
            fill="none"
            stroke="#FFFFFF12"
            strokeWidth="1"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            ...enter(t, 0.6),
          }}
        >
          <div className="loop-core">
            <Mark size={120} light />
          </div>
        </div>
        {[
          ["Understand", 345, 65],
          ["Observe", 615, 342],
          ["Improve", 345, 615],
          ["Recheck", 65, 342],
        ].map(([label, x, y], i) => (
          <div
            key={label}
            style={{
              position: "absolute",
              left: Number(x),
              top: Number(y),
              width: 140,
              height: 140,
              borderRadius: 28,
              background: i === 2 ? C.mint : "#174CC7",
              border: "1px solid #FFFFFF30",
              color: i === 2 ? C.ink : "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: "0 15px 35px #092D841A",
              ...enter(t, 0.7 + i * 0.3, 0.6, 25),
            }}
          >
            <span className="mono" style={{ fontSize: 17, opacity: 0.65 }}>
              0{i + 1}
            </span>
            <span style={{ fontSize: 22, fontWeight: 500 }}>{label}</span>
            <Arrow size={24} />
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: C.paper,
          clipPath: `circle(${150 * exit}% at 50% 50%)`,
        }}
      />
      <Footer chapter="THE IMPROVEMENT LOOP" light />
    </div>
  );
}
