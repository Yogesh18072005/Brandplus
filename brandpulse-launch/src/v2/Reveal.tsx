import { Backdrop, Meta, Mark, C, p, mix, at, smooth } from "./kit";
export function Reveal({ t }: { t: number }) {
  const mint = 1 - smooth(t / 0.45),
    spread = 1 - p(t, 0.4, 1.1),
    exit = smooth((t - 3.15) / 0.85);
  return (
    <div
      className="scene v2-stage"
      style={{ background: C.blue, color: "white" }}
    >
      <Backdrop t={t + 10} blue />
      <div
        style={at(500, 625, {
          width: 920,
          height: 100,
          borderRadius: "50%",
          background: "#062F8D",
          filter: "blur(50px)",
          opacity: 0.3,
          transform: `scale(${1 - 0.5 * spread},${1 - 0.3 * spread})`,
        })}
      />
      <div
        style={at(845, 190, {
          width: 230,
          height: 230,
          transformStyle: "preserve-3d",
          transform: `perspective(1100px) rotateX(${mix(38, 0, p(t, 0.2, 1.1))}deg) rotateY(${mix(-35, 0, p(t, 0.2, 1.1))}deg) rotateZ(${mix(-20, 0, p(t, 0.2, 1.1))}deg) translateY(${-150 * exit}px) scale(${mix(0.7, 1, p(t, 0.2, 1.2))})`,
          opacity: 1 - exit,
        })}
      >
        {Array.from({ length: 14 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              transform: `translateZ(${-i * 2}px)`,
              filter: i ? "brightness(.8)" : "none",
            }}
          >
            <Mark size={230} light progress={p(t, 0.08, 0.9)} />
          </div>
        ))}
      </div>
      <div
        style={at(0, 473, {
          width: 1920,
          textAlign: "center",
          opacity: 1 - exit,
          transform: `translateY(${-80 * exit}px) scale(${1 - 0.15 * exit})`,
        })}
      >
        <div
          style={{
            fontSize: 24,
            color: "#D4E5FF",
            marginBottom: 20,
            opacity: p(t, 0.3, 0.6),
          }}
        >
          Meet your AI visibility engine.
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            fontSize: 173,
            fontWeight: 650,
            letterSpacing: "-.075em",
            lineHeight: 1.08,
          }}
        >
          {"brandpulse".split("").map((x, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                transform: `translateY(${70 * (1 - p(t, 0.35 + i * 0.035, 0.75))}px) translateX(${(i - 4) * 15 * spread}px) rotateY(${(i - 4) * 15 * spread}deg)`,
                opacity: p(t, 0.3 + i * 0.035, 0.4),
              }}
            >
              {x}
            </span>
          ))}
        </div>
        <div
          style={{
            fontSize: 29,
            color: "#C0D7FF",
            marginTop: 25,
            opacity: p(t, 1.4, 0.6),
          }}
        >
          Understand. Improve. Get found.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: C.mint,
          clipPath: `circle(${mint * 2300}px at 50% 50%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -80,
          right: -80,
          top: mix(1300, -100, exit),
          height: 1300,
          background: "linear-gradient(140deg,#FFFFFF,#E6F0FF 70%,#B8D5FF)",
          transform: `rotate(${-12 * (1 - exit)}deg)`,
          transformOrigin: "right top",
          boxShadow: "0 -30px 70px #06266B55",
          zIndex: 20,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 790,
          display: "flex",
          justifyContent: "center",
          opacity: p(t, 1.15, 0.6) * (1 - exit),
        }}
      >
        <div
          style={{
            padding: "13px 22px",
            border: "1px solid #A9FFDF66",
            borderRadius: 11,
            background: "#A9FFDF18",
            color: C.mint,
            fontFamily: "Plex",
            fontSize: 17,
            letterSpacing: ".08em",
          }}
        >
          ✓ EVIDENCE CONNECTED
        </div>
      </div>
      <Meta label="MEET BRANDPULSE" light />
    </div>
  );
}
