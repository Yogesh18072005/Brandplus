import { createContext, useContext } from "react";
import words from "../voiceover-words.json";
export const VoiceContext = createContext({
  time: 0,
  sourceTime: 0,
  chapterStart: 0,
  chapterEnd: 60,
  ratio: 1,
});
export function useWordStarts(
  text: string,
  fallbackStart: number,
  stagger: number,
) {
  const clock = useContext(VoiceContext);
  const spoken = words.filter(
    (w) => w.start >= clock.chapterStart && w.start < clock.chapterEnd,
  );
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  let cursor = 0,
    matched = 0;
  const result = text.split(" ").map((word, i) => {
    const found = spoken.findIndex(
      (w, j) => j >= cursor && clean(w.word) === clean(word),
    );
    if (found < 0) return fallbackStart + i * stagger;
    cursor = found + 1;
    matched++;
    return (spoken[found].start - clock.chapterStart) * clock.ratio;
  });
  return {
    time: clock.sourceTime,
    starts:
      matched / text.split(" ").length >= 0.7
        ? result
        : text.split(" ").map((_, i) => fallbackStart + i * stagger),
    active: clock.chapterEnd !== 60 || clock.chapterStart !== 0,
  };
}
