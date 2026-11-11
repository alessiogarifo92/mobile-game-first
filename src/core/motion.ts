/**
 * Whether the player asked the system for less motion (`prefers-reduced-motion: reduce`). The scene passes
 * `window.matchMedia?.(...)`; a missing API (old browser, tests) reads as "no preference".
 */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(query?: { matches: boolean } | null): boolean {
  return query?.matches === true;
}
