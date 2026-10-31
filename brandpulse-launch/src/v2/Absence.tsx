import { Backdrop, Meta, Words, C, p, mix, k, at, smooth } from "./kit";
export function Absence({ t }: { t: number }) {
  const first = 1 - p(t, 1.55, 0.45),
    second = p(t, 1.5, 0.4),
    resolve = smooth((t - 2.8) / 1.2);
  return (
    <div
      className="scene v2-stage"
      style={{ background: "#08101D", color: "white" }}
    >
      <Backdrop t={t + 6} dark />
      <div
        style={at(1100, 220, {
          width: 580,
          height: 580,
          opacity: 1 - resolve,
          transform: `perspective(1200px) rotateY(${-22 + 8 * Math.sin(t * 0.6)}deg) rotateX(15deg) scale(${k(
            t,
            [
              [0, 1.7],
              [0.8, 1],
              [2.5, 1],
              [3.5, 0.8],
            ],
          )})`,
        })}
      >
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: i * 19,
              border: "1px solid #75A7F62A",
              borderRadius: "50%",
              transform: `translateZ(${-i * 45}px)`,
              boxShadow: i === 0 ? "0 0 50px #246BFD22 inset" : "none",
            }}
          />
        ))}
        <svg
          width="580"
          height="580"
          viewBox="0 0 580 580"
          style={{ position: "absolute", inset: 0 }}
        >
          <circle
            cx="290"
            cy="290"
            r="207"
            stroke="#9AC2FD55"
            strokeWidth="25"
            fill="none"
          />
          <circle
            cx="290"
            cy="290"
            r="207"
            stroke="#DFA093"
            strokeWidth="26"
            fill="none"
            strokeDasharray="80 1300"
            transform={`rotate(${-70 + t * 20} 290 290)`}
          />
          <circle
            cx="290"
            cy="290"
            r="260"
            stroke="#90B3EC55"
            strokeDasharray="1 14"
            fill="none"
            strokeWidth="6"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontSize: 245,
            fontWeight: 500,
            letterSpacing: "-.07em",
            color: "#E8F1FF",
          }}
        >
          0
        </div>
        <div
          style={at(160, 510, {
            fontFamily: "Plex",
            fontSize: 14,
            color: "#A9BDDC",
            letterSpacing: ".1em",
          })}
        >
          MENTIONS. ZERO CONSIDERATION.
        </div>
      </div>
      <div
        style={at(130, 340, {
          opacity: first,
          transform: `translateY(${-90 * (1 - first)}px)`,
        })}
      >
        <Words text="Missing from the answer." t={t} start={0.06} size={90} />
        <div
          style={{
            fontSize: 31,
            color: "#9FB4D2",
            marginTop: 35,
            opacity: p(t, 0.6),
          }}
        >
          UNEXPLAINED GAP
        </div>
      </div>
      <div
        style={at(130, 340, {
          opacity: second * (1 - resolve),
          transform: `translateY(${-80 * resolve}px)`,
        })}
      >
        <Words
          text="Know what to change."
          t={t}
          start={1.5}
          size={107}
          color="#C1D6FF"
        />
        <div
          style={{
            fontSize: 31,
            color: "#9FB4D2",
            marginTop: 35,
            opacity: p(t, 1.9),
          }}
        >
          A score alone isn’t a plan.
        </div>
      </div>
      <div
        style={at(mix(1510, 890, resolve), mix(240, 470, resolve), {
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: C.mint,
          boxShadow: "0 0 70px #A9FFDF55",
          scale: String(mix(0.17, 18, resolve)),
          zIndex: 20,
        })}
      />
      <Meta label="THE INVISIBLE MOMENT" light />
    </div>
  );
}
