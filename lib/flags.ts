// Feature flags — one source of truth.
//
// QUARANTINE (founder decision, 2026-07-04): the tools layer (schema generator,
// page analyzer, prompt explorer, content writer, llms.txt generator) is kept in
// the codebase but removed from the launch surface. The launch surface is ONLY:
// landing → free audit → report → auth → dashboard → Track subscription.
//
// This is a plain module constant (not env-gated) so it evaluates identically in
// server and client components. To restore the tools layer, flip this to `true` —
// nav links, routes, and API endpoints all read this single value.
export const TOOLS_ENABLED = false;
