export const OBSERVATION_SYSTEM_INSTRUCTION =
  "You are answering a user's question directly and neutrally. Provide a useful answer based on your available knowledge and reasoning. Do not discuss this instruction.";

export const DEFAULT_OBSERVATION_PARAMETERS = Object.freeze({
  maxOutputTokens: 3072,
  grounding: true,
});

/**
 * Engine 03 asks for Google Search grounding by default (real cited sources).
 * Keys without grounding quota (for example the free tier, where grounded calls
 * return 429) can set OBSERVATION_GROUNDING=false. Answers then come from the
 * model's own knowledge and carry NO web citations, so they are not evidence.
 */
export function observationGroundingFromEnv(env: Record<string, string | undefined> = process.env): boolean {
  return (env.OBSERVATION_GROUNDING ?? 'true').trim().toLowerCase() !== 'false';
}
