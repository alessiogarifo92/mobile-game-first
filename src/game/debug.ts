/**
 * Read-only snapshot of what is on screen, in logical coordinates, published on `window.__mix`.
 * Used by the Playwright e2e test to tap real positions; it exposes no way to change game state.
 */
export type DebugInfo = Record<string, unknown> & { scene: string };

declare global {
  interface Window {
    __mix?: DebugInfo;
  }
}

export function publishDebug(info: DebugInfo): void {
  window.__mix = info;
}
