/**
 * Small per-browser memory for the dashboard's getting-started walkthrough
 * (steps the server doesn't record, like "read the report" or "asked for the
 * walkthrough call"). Storage can be unavailable: then steps just show as open.
 */
const PREFIX = 'zc-journey:';

export function markJourney(step: 'read' | 'walkthrough', id: string) {
  try { localStorage.setItem(`${PREFIX}${step}:${id}`, new Date().toISOString()); } catch { /* storage unavailable */ }
}

export function hasJourney(step: 'read' | 'walkthrough', id: string): boolean {
  try { return Boolean(localStorage.getItem(`${PREFIX}${step}:${id}`)); } catch { return false; }
}
