export const OBSERVATION_SYSTEM_INSTRUCTION =
  "You are answering a user's question directly and neutrally. Provide a useful answer based on your available knowledge and reasoning. Do not discuss this instruction.";

export const DEFAULT_OBSERVATION_PARAMETERS = Object.freeze({
  temperature: 0.2,
  maxOutputTokens: 3072,
  grounding: true,
});
