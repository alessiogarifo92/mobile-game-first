/** Pages of "How to play": navigation by swipe, keys or dots. Pure so the rules are unit-tested. */
export const HOWTO_PAGES = 7;
/** Horizontal drag, in logical units, that counts as a swipe. */
export const SWIPE_DISTANCE = 70;

export function clampPage(page: number, count: number = HOWTO_PAGES): number {
  return Math.min(Math.max(Math.trunc(page) || 0, 0), count - 1);
}

/**
 * Page after a drag of (dx, dy): left goes forward, right goes back. A short or mostly vertical drag, and a swipe past
 * the first or last page, leave the page unchanged.
 */
export function pageAfterSwipe(page: number, dx: number, dy: number, count: number = HOWTO_PAGES): number {
  if (Math.abs(dx) <= SWIPE_DISTANCE || Math.abs(dx) <= 1.5 * Math.abs(dy)) return page;
  return clampPage(page + (dx < 0 ? 1 : -1), count);
}
