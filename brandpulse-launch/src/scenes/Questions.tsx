import { C, p, smooth, enter, mix } from "../motion";
import { Arrow, Eyebrow, Footer, Heading, Mark, Search } from "../primitives";
const queries = [
  ["DISCOVERY", "Who offers this in my city?"],
  ["COMPARISON", "Which option is right for my business?"],
  ["TRUST", "Who has the experience I need?"],
  ["DECISION", "Why choose you over the alternatives?"],
];
export function Questions({ t }: { t: number }) {
  const exit = smooth((t - 6.15) / 0.85);
  return (
    <div className="scene" style={{ background: C.paper }}>
      <div
        style={{ position: "absolute", left: 150, top: 145, ...enter(t, 0.1) }}
      >
        <Eyebrow>01 / UNDERSTAND THE BUYER</Eyebrow>
      </div>
      <div
        style={{ position: "absolute", left: 150, top: 230, opacity: 1 - exit }}
      >
        <Heading
          lines={["Start with the", "questions that matter."]}
          t={t}
          start={0.2}
          size={83}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 535,
          width: 530,
          ...enter(t, 0.8),
          opacity: p(t, 0.8) * (1 - exit),
        }}
      >
        <div className="business-card">
          <div className="business-glyph">
            <svg viewBox="0 0 64 64" width="44" height="44" fill="none">
              <path
                d="M9 55V23L32 10L55 23V55H9Z"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                d="M25 55V35H39V55M18 26H22M42 26H46"
                stroke="currentColor"
                strokeWidth="3"
              />
            </svg>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 16, color: C.muted }}>
              YOUR BUSINESS, IN CONTEXT
            </div>
            <div style={{ fontSize: 30, fontWeight: 600, marginTop: 12 }}>
              Business · Market · Buyer
            </div>
          </div>
        </div>
        <div className="context-tags">
          <span>What you do</span>
          <span>Where you compete</span>
          <span>Who buys</span>
        </div>
      </div>
      <svg
        width="1920"
        height="1080"
        style={{
          position: "absolute",
          inset: 0,
          opacity: p(t, 1, 0.7) * (1 - exit),
        }}
      >
        <path
          d="M680 615H760Q800 615 800 575V400Q800 360 840 360H900M800 575V780Q800 820 840 820H900M800 515H900M800 665H900"
          fill="none"
          stroke="#CAD8EF"
          strokeWidth="2"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={1 - p(t, 1, 1.3)}
        />
        <circle
          cx="800"
          cy={mix(360, 820, (t * 0.25) % 1)}
          r="6"
          fill={C.blue}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: mix(900, 360, exit),
          top: mix(270, 210, exit),
          width: mix(870, 1200, exit),
          transform: `scale(${mix(1, 1.03, exit)})`,
          transformOrigin: "top center",
        }}
      >
        {queries.map(([type, query], i) => (
          <div
            key={query}
            className="query-ticket"
            style={{
              ...enter(t, 1.15 + i * 0.45, 0.65, 55),
              opacity: p(t, 1.15 + i * 0.45, 0.65) * (i === 1 ? 1 : 1 - exit),
              transform: `translateY(${(1 - p(t, 1.15 + i * 0.45, 0.65)) * 55 - (i === 1 ? 154 * exit : 0)}px)`,
            }}
          >
            <div className="mono" style={{ fontSize: 15, color: C.muted }}>
              <span style={{ color: C.blue }}>0{i + 1}</span>
              <span style={{ paddingLeft: 18 }}>{type}</span>
              <span style={{ float: "right", color: C.green }}>
                BUYER INTENT
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: 20,
                alignItems: "center",
                marginTop: 21,
                fontSize: 27,
                letterSpacing: "-.02em",
              }}
            >
              <Search size={26} />
              <span style={{ flex: 1 }}>
                {query.slice(
                  0,
                  Math.ceil(query.length * p(t, 1.3 + i * 0.45, 0.9)),
                )}
              </span>
              <Arrow size={25} />
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 830,
          display: "flex",
          alignItems: "center",
          gap: 18,
          ...enter(t, 3.8),
          opacity: p(t, 3.8) * (1 - exit),
        }}
      >
        <Mark size={35} />
        <span style={{ fontSize: 24, color: C.muted }}>
          From your business to real buyer intent.
        </span>
      </div>
      <Footer chapter="BUYER QUESTIONS" example />
    </div>
  );
}
