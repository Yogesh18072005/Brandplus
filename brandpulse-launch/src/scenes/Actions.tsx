import { C, p, enter, smooth, mix } from "../motion";
import { Arrow, Eyebrow, Footer, Heading, Tick, Cursor } from "../primitives";
export function Actions({ t }: { t: number }) {
  const zoom = smooth((t - 1.2) / 1.1),
    done = p(t, 4.65, 0.35),
    exit = smooth((t - 6.15) / 0.85);
  return (
    <div className="scene" style={{ background: C.ink, color: "white" }}>
      <div
        style={{ position: "absolute", left: 150, top: 135, ...enter(t, 0.1) }}
      >
        <Eyebrow light>03 / IMPROVE WHAT AI CAN FIND</Eyebrow>
      </div>
      <div
        style={{ position: "absolute", left: 150, top: 250, opacity: 1 - exit }}
      >
        <Heading
          lines={["Evidence.", "Into action."]}
          t={t}
          start={0.2}
          size={108}
          color="white"
          accent={C.mint}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: mix(900, 835, zoom),
          top: mix(280, 160, zoom),
          width: mix(830, 935, zoom),
          transform: `translateY(${950 * exit}px) rotate(${mix(-5, 0, zoom)}deg)`,
          transformOrigin: "center",
        }}
      >
        <div
          className="action-ghost"
          style={{ top: 60, left: 80, rotate: "5deg", opacity: p(t, 0.3) }}
        />
        <div
          className="action-ghost"
          style={{ top: 25, left: 35, rotate: "2deg", opacity: p(t, 0.2) }}
        />
        <div className="action-main" style={enter(t, 0.25, 0.8, 180)}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="priority-chip">FIRST PRIORITY</span>
            <span className="mono" style={{ fontSize: 17, color: "#8F9CB1" }}>
              ACTION / 01
            </span>
          </div>
          <h3
            style={{
              fontSize: 52,
              margin: "36px 0 20px",
              lineHeight: 1.16,
              letterSpacing: "-.045em",
              maxWidth: 660,
            }}
          >
            Give buyers a clear
            <br />
            comparison page.
          </h3>
          <p
            style={{
              fontSize: 25,
              lineHeight: 1.65,
              color: "#ACB7C9",
              maxWidth: 650,
              margin: 0,
            }}
          >
            Explain who you help, how you differ,
            <br />
            and the proof behind your offer.
          </p>
          <div
            style={{
              marginTop: 35,
              padding: "24px 0",
              borderTop: "1px solid #FFFFFF18",
              borderBottom: "1px solid #FFFFFF18",
              ...enter(t, 2.2, 0.65, 20),
            }}
          >
            <div
              className="mono"
              style={{ fontSize: 15, color: C.mint, marginBottom: 10 }}
            >
              WHY THIS MATTERS
            </div>
            <span style={{ fontSize: 22, color: "#D0D8E7" }}>
              Linked to the comparison question you missed.
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 30,
            }}
          >
            <div style={{ fontSize: 21, color: "#C3CDDD" }}>
              Evidence attached <span style={{ color: C.mint }}>↗</span>
            </div>
            <div
              style={{
                background: done ? C.mint : "white",
                color: C.ink,
                borderRadius: 14,
                padding: "20px 25px",
                fontSize: 23,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 17,
              }}
            >
              {done > 0.7 ? (
                <>
                  <Tick size={27} />
                  Implemented
                </>
              ) : (
                <>
                  Mark as implemented
                  <Arrow size={25} />
                </>
              )}
            </div>
          </div>
        </div>
        <Cursor
          t={t - 4.55}
          x={mix(1050, 660, p(t, 3.8, 0.7))}
          y={mix(750, 555, p(t, 3.8, 0.7))}
          click={t > 4.55 && t < 4.9}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 565,
          width: 570,
          opacity: p(t, 1.3, 0.7) * (1 - exit),
        }}
      >
        {[
          "Clarify your offer",
          "Strengthen your evidence",
          "Track what you implement",
        ].map((text, i) => (
          <div
            key={text}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "21px 0",
              borderBottom: "1px solid #FFFFFF15",
              fontSize: 29,
              ...enter(t, 1.55 + i * 0.35, 0.6, 25),
            }}
          >
            <span style={{ color: C.mint, fontSize: 20 }}>0{i + 1}</span>
            {text}
          </div>
        ))}
        <div
          style={{
            fontSize: 24,
            color: "#94A4BC",
            marginTop: 35,
            ...enter(t, 3.2),
          }}
        >
          A short, prioritized plan.
          <br />
          Every action tied to the evidence.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1080 * (1 - exit),
          height: 1080,
          background: C.paper,
          borderRadius: "70px 70px 0 0",
        }}
      />
      <Footer chapter="THE FIX PLAN" light example />
    </div>
  );
}
