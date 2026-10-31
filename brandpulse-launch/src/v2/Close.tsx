import {
  Backdrop,
  Meta,
  Words,
  Mark,
  Arrow,
  Window,
  QueryBar,
  Pill,
  C,
  p,
  mix,
  at,
  smooth,
} from "./kit";
export function Close({ t }: { t: number }) {
  const resolve = smooth((t - 0.35) / 0.9),
    exitTitle = 1 - p(t, 0.35, 0.4);
  return (
    <div className="scene v2-stage" style={{ color: "#102E58" }}>
      <Backdrop t={t + 48} />
      <div
        style={at(0, 0, {
          width: 1920,
          height: 1080,
          perspective: 1700,
          transformStyle: "preserve-3d",
          opacity: 1 - resolve,
        })}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={at(i % 2 === 0 ? -170 : 1390, i < 2 ? 80 : 680, {
              width: 650,
              transform: `rotateY(${i % 2 === 0 ? 20 : -20}deg) rotateZ(${i % 2 === 0 ? -9 : 9}deg) translateX(${(i % 2 === 0 ? -650 : 650) * resolve}px)`,
              opacity: 0.6,
              scale: ".8",
            })}
          >
            <Window
              title={
                [
                  "Buyer questions",
                  "Answer evidence",
                  "Prioritized action",
                  "Comparable recheck",
                ][i]
              }
            >
              <div style={{ padding: 26 }}>
                <QueryBar
                  text={
                    [
                      "What are buyers asking?",
                      "Why were they named?",
                      "What should I change?",
                      "Did it work?",
                    ][i]
                  }
                  style={{ fontSize: 22 }}
                />
                <div style={{ display: "flex", gap: 13, marginTop: 20 }}>
                  <Pill>Evidence</Pill>
                  <Pill green>Connected</Pill>
                </div>
              </div>
            </Window>
          </div>
        ))}
      </div>
      <div
        style={at(0, 380, {
          width: 1920,
          textAlign: "center",
          opacity: exitTitle,
          transform: `scale(${1 + 0.3 * resolve})`,
        })}
      >
        <Words text="More than an audit." t={t} start={0.12} size={115} />
        <div
          style={{
            fontSize: 30,
            color: "#6F89AC",
            marginTop: 30,
            opacity: p(t, 0.6, 0.6),
          }}
        >
          A way to understand, improve, and keep moving.
        </div>
      </div>
      <div
        style={at(835, 160, {
          width: 250,
          height: 250,
          opacity: resolve,
          transformStyle: "preserve-3d",
          transform: `perspective(1200px) rotateX(${mix(25, 0, resolve)}deg) rotateY(${mix(-45, 0, resolve)}deg) rotateZ(${mix(-18, 0, resolve)}deg)`,
        })}
      >
        <div
          style={{
            position: "absolute",
            left: 14,
            top: 180,
            width: 240,
            height: 55,
            background: "#163D7E33",
            borderRadius: "50%",
            filter: "blur(30px)",
          }}
        />
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              transform: `translateZ(${-i * 2}px)`,
              filter: i ? "brightness(.75)" : "none",
            }}
          >
            <Mark size={250} progress={resolve} />
          </div>
        ))}
      </div>
      <div
        style={at(0, 445, {
          width: 1920,
          textAlign: "center",
          opacity: resolve,
          transform: `translateY(${60 * (1 - resolve)}px)`,
        })}
      >
        <div
          style={{
            fontSize: 151,
            fontWeight: 650,
            letterSpacing: "-.07em",
            lineHeight: 1.1,
          }}
        >
          brandpulse
          <span
            style={{
              color: C.blue,
              fontSize: 51,
              verticalAlign: "top",
              display: "inline-block",
              paddingTop: 20,
              marginLeft: 16,
            }}
          >
            ↗
          </span>
        </div>
        <Words
          text="Understand. Improve. Get found."
          t={t}
          start={2.45}
          size={57}
          color={C.blue}
          style={{ marginTop: 17 }}
        />
        <div
          style={{
            fontSize: 28,
            color: "#657D9F",
            marginTop: 30,
            opacity: p(t, 3.1, 0.6),
          }}
        >
          www.zerociate.com
        </div>
      </div>
      <div
        style={at(0, 825, {
          width: 1920,
          display: "flex",
          justifyContent: "center",
          opacity: p(t, 3.6, 0.7),
          transform: `translateY(${30 * (1 - p(t, 3.6, 0.7))}px)`,
        })}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 36,
            padding: "23px 31px",
            borderRadius: 16,
            background: "linear-gradient(135deg,#3278FB,#144BCB)",
            color: "white",
            fontSize: 25,
            fontWeight: 550,
            border: "1px solid #A5C8FF",
            boxShadow: "0 1px 0 #B9D7FF66 inset,0 12px 25px #1E5AE833",
          }}
        >
          Start with your free audit
          <Arrow size={29} />
        </div>
      </div>
      <Meta label="YOUR NEXT MOVE" />
    </div>
  );
}
