import {
  Backdrop,
  Meta,
  Words,
  Window,
  QueryBar,
  Pill,
  Tick,
  Mark,
  Arrow,
  C,
  p,
  mix,
  at,
  smooth,
} from "./kit";
export function Entry({ t }: { t: number }) {
  const focus = smooth((t - 2) / 1),
    entry = smooth((t - 3.2) / 1),
    resolve = smooth((t - 5.3) / 0.7);
  return (
    <div className="scene v2-stage" style={{ color: "#15345D" }}>
      <Backdrop t={t + 50} />
      <div style={at(130, 170, { opacity: 1 - focus })}>
        <Words text="Ten buyer questions." t={t} start={0.08} size={92} />
      </div>
      <div
        style={at(mix(240, 180, focus), mix(360, 290, focus), {
          width: 1460,
          transform: `perspective(1800px) rotateX(${mix(25, 5, focus)}deg) rotateY(${mix(-12, 2, focus)}deg) rotateZ(${mix(-4, 1, focus)}deg) scale(${mix(0.89, 0.95, focus)})`,
          opacity: 1 - resolve,
        })}
      >
        <Window title="brandpulse / start with your business">
          <div style={{ display: "flex", height: 540 }}>
            <div
              style={{
                width: 420,
                padding: 35,
                background: "linear-gradient(155deg,#246BFD,#0B3286)",
                color: "white",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: -80,
                  bottom: -70,
                  opacity: 0.14,
                  rotate: "-20deg",
                }}
              >
                <Mark size={430} light />
              </div>
              <Mark size={50} light />
              <div
                style={{
                  fontSize: 130,
                  fontWeight: 600,
                  letterSpacing: "-.08em",
                  lineHeight: 1.1,
                  marginTop: 35,
                  display: "flex",
                }}
              >
                1
                <div style={{ overflow: "hidden", height: 143, width: 90 }}>
                  <div
                    style={{
                      transform: `translateY(${-143 * (1 - p(t, 0.15, 1.4))}px)`,
                    }}
                  >
                    <div>0</div>
                    <div>0</div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 30, letterSpacing: "-.04em" }}>
                buyer questions.
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 35 }}>
                <Pill dark green>
                  FREE ENTRY AUDIT
                </Pill>
              </div>
            </div>
            <div style={{ padding: "40px 43px", flex: 1 }}>
              <div style={{ fontSize: 30, fontWeight: 600 }}>
                Where should we start?
              </div>
              <div style={{ fontSize: 17, color: "#526D93", marginTop: 12 }}>
                Your website and market context.
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontFamily: "Plex",
                  color: "#526D93",
                  margin: "30px 0 11px",
                }}
              >
                BUSINESS WEBSITE
              </div>
              <QueryBar
                t={t - 1.7}
                text="yourbusiness.com"
                style={{ minHeight: 75, fontSize: 24 }}
              />
              <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
                <div style={{ flex: 1 }}>
                  <div className="v2-mini-label" style={{ marginBottom: 10 }}>
                    MARKET / LOCATION
                  </div>
                  <div
                    style={{
                      border: "1px solid #D6E2F4",
                      borderRadius: 12,
                      padding: "19px 22px",
                      fontSize: 20,
                      color: "#59789F",
                    }}
                  >
                    Your market <span style={{ float: "right" }}>⌄</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="v2-mini-label" style={{ marginBottom: 10 }}>
                    BUSINESS CONTEXT
                  </div>
                  <div
                    style={{
                      border: "1px solid #D6E2F4",
                      borderRadius: 12,
                      padding: "19px 22px",
                      fontSize: 20,
                      color: "#59789F",
                    }}
                  >
                    Who you help
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 35,
                }}
              >
                <div style={{ display: "flex", gap: 12 }}>
                  <Pill green>
                    <Tick size={17} />
                    No account
                  </Pill>
                  <Pill green>
                    <Tick size={17} />
                    No card
                  </Pill>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 20,
                    alignItems: "center",
                    background: C.blue,
                    color: "white",
                    borderRadius: 12,
                    padding: "18px 23px",
                    fontSize: 20,
                    scale: String(1 + 0.035 * Math.sin(entry * Math.PI)),
                  }}
                >
                  Find your first step
                  <Arrow size={25} />
                </div>
              </div>
            </div>
          </div>
        </Window>
      </div>
      <div
        style={at(1350, 165, {
          opacity: focus * (1 - resolve),
          rotate: "5deg",
          padding: "20px 25px",
          background: "#E2F4E9",
          color: C.green,
          border: "1px solid #ABD5BD",
          borderRadius: 15,
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 15px 30px #114C2720",
        })}
      >
        <Tick size={25} />
        <span style={{ fontSize: 24 }}>No account. No card.</span>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#EDF4FD",
          clipPath: `circle(${2300 * resolve}px at 50% 50%)`,
          zIndex: 40,
        }}
      />
      <Meta label="START / FREE AUDIT" />
    </div>
  );
}
