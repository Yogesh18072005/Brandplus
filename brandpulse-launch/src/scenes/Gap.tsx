import { C, enter, p, smooth, mix } from "../motion";
import { Eyebrow, Footer, Heading } from "../primitives";
export function Gap({ t }: { t: number }) {
  const exit = smooth((t - 3.35) / 0.65);
  return (
    <div className="scene" style={{ background: C.ink, color: "white" }}>
      <div
        style={{ position: "absolute", left: 150, top: 180, ...enter(t, 0.08) }}
      >
        <Eyebrow light>GREAT BUSINESS. INVISIBLE MOMENT.</Eyebrow>
      </div>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 315,
          transform: `scale(${1 + 0.07 * exit})`,
          transformOrigin: "left center",
        }}
      >
        <Heading
          lines={["If AI skips you,", "you miss the shortlist."]}
          t={t}
          start={0.2}
          size={112}
          color="white"
          accent="#AFC8FF"
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 700,
          width: 1620,
          height: 2,
          background: "#FFFFFF20",
          transformOrigin: "left",
          scale: `${p(t, 0.9, 1.1)} 1`,
        }}
      />
      <div
        style={{ position: "absolute", left: 150, top: 755, ...enter(t, 1.3) }}
      >
        <span style={{ fontSize: 32, color: "#9AA8BD" }}>
          The answer is already shaping the decision.
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          width: 140,
          height: 140,
          left: mix(1590, 890, exit),
          top: mix(735, 470, exit),
          borderRadius: "50%",
          background: C.mint,
          transform: `scale(${mix(1, 18, exit)})`,
          zIndex: 5,
        }}
      />
      <Footer chapter="THE GAP" light />
    </div>
  );
}
