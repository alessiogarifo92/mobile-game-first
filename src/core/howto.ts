import type { CardTip } from './onboarding';

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

/**
 * Base page that already explains a card tip, or null when no base page does (#183): those tips become extra
 * "unlocked rule" pages once the player has seen their card in a level.
 */
export const TIP_PAGE: Readonly<Record<CardTip, number | null>> = {
  mixing: 1,
  blocked: 2,
  slots: 2,
  brown: 3,
  stone: 4,
  lock: 5,
  covered: 6,
  ice: null,
  hidden: null,
  belt: null,
  queue: null,
  leftover: null,
};

/** Tips with no base page, in the order their extra pages follow the base ones (roughly the order they show up). */
export const EXTRA_TIPS: readonly CardTip[] = (Object.keys(TIP_PAGE) as CardTip[]).filter((id) => TIP_PAGE[id] === null);

export type HowtoPage = { kind: 'base'; index: number } | { kind: 'tip'; tip: CardTip };

/**
 * Pages of "How to play" for a player who has seen `seen` tips: the HOWTO_PAGES base pages, then one page per seen
 * tip that no base page covers, in EXTRA_TIPS order whatever the order they were seen in. Unknown ids, 'guide' and
 * duplicates add nothing.
 */
export function howtoPages(seen: readonly string[]): HowtoPage[] {
  const pages: HowtoPage[] = Array.from({ length: HOWTO_PAGES }, (_, index) => ({ kind: 'base' as const, index }));
  for (const tip of EXTRA_TIPS) if (seen.includes(tip)) pages.push({ kind: 'tip', tip });
  return pages;
}
