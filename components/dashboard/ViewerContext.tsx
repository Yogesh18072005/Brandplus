'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Whether the signed-in viewer is on the founder allowlist. Client pages use it
 * to keep internal detail (engine cost, model names, run controls) out of the
 * client's view. Display only: every API still enforces its own access.
 */
const ViewerContext = createContext<{ isOps: boolean }>({ isOps: false });

export function ViewerProvider({ isOps, children }: { isOps: boolean; children: ReactNode }) {
  return <ViewerContext.Provider value={{ isOps }}>{children}</ViewerContext.Provider>;
}

export function useIsOps(): boolean {
  return useContext(ViewerContext).isOps;
}
