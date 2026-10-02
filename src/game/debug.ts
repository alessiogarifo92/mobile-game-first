/**
 * Read-only snapshot of what is on screen, in logical coordinates, published on `window.__mix`.
 * Used by the Playwright e2e test to tap real positions; it exposes no way to change game state.
 */
export type DebugInfo = Record<string, unknown> & { scene: string };

/** Bounds (world coordinates) of something drawn or tappable on the active scene. */
export interface DrawnBounds {
  scene: string;
  type: string;
  depth: number;
  text: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
}

declare global {
  interface Window {
    __mix?: DebugInfo;
    /** Everything visible (texts, shapes, images, tap zones) on the active scenes, to check nothing is off screen. */
    __mixBounds?: () => DrawnBounds[];
  }
}

export function publishDebug(info: DebugInfo): void {
  window.__mix = info;
}
