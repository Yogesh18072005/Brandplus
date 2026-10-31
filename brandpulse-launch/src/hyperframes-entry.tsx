import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Film } from "./Film";
declare global {
  interface Window {
    renderBrandPulse: (frame: number) => void;
  }
}
const root = createRoot(document.getElementById("film")!);
window.renderBrandPulse = (frame: number) =>
  flushSync(() =>
    root.render(<Film frame={Math.min(1799, Math.max(0, frame))} />),
  );
window.renderBrandPulse(0);
