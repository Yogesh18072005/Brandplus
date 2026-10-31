import type { EngineAdapter, EngineName } from '../types.js';
import { geminiAdapter } from './gemini';

/** The launch product has one audited provider path. Historical types retain
 * other engine names so stored reports remain readable, but they are not
 * represented as product capabilities. */
export function getAdapter(name: EngineName): EngineAdapter {
  if (name === 'gemini') return geminiAdapter;
  throw new Error(`Answer engine "${name}" is not available`);
}
