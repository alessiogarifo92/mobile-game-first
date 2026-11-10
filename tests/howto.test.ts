import { describe, expect, it } from 'vitest';
import { EXTRA_TIPS, HOWTO_PAGES, SWIPE_DISTANCE, TIP_PAGE, clampPage, howtoPages, pageAfterSwipe } from '../src/core/howto';
import type { CardTip } from '../src/core/onboarding';

describe('how to play pages', () => {
  it('clamps the page to the existing ones', () => {
    expect(clampPage(-3)).toBe(0);
    expect(clampPage(0)).toBe(0);
    expect(clampPage(2)).toBe(2);
    expect(clampPage(9)).toBe(HOWTO_PAGES - 1);
    expect(clampPage(Number.NaN)).toBe(0);
    expect(clampPage(1.9)).toBe(1);
  });

  it('a swipe left goes forward and a swipe right goes back', () => {
    expect(pageAfterSwipe(0, -200, 0)).toBe(1);
    expect(pageAfterSwipe(1, -200, 10)).toBe(2);
    expect(pageAfterSwipe(2, 200, 0)).toBe(1);
    expect(pageAfterSwipe(1, 200, -20)).toBe(0);
  });

  it('does nothing past the first or last page', () => {
    expect(pageAfterSwipe(0, 300, 0)).toBe(0);
    expect(pageAfterSwipe(HOWTO_PAGES - 1, -300, 0)).toBe(HOWTO_PAGES - 1);
  });

  it('ignores a drag that is too short or mostly vertical', () => {
    expect(pageAfterSwipe(1, -SWIPE_DISTANCE, 0)).toBe(1);
    expect(pageAfterSwipe(1, -SWIPE_DISTANCE - 1, 0)).toBe(2);
    expect(pageAfterSwipe(1, -200, 200)).toBe(1); // diagonal
    expect(pageAfterSwipe(1, -200, 140)).toBe(1); // still too steep (200 ≤ 1.5 × 140)
    expect(pageAfterSwipe(1, -200, 120)).toBe(2);
  });
});

describe('how to play: unlocked rules (#183)', () => {
  const ALL: CardTip[] = ['mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover'];

  it('with no tip seen it is the base pages only, unchanged', () => {
    const pages = howtoPages([]);
    expect(pages).toHaveLength(HOWTO_PAGES);
    expect(pages.every((p, i) => p.kind === 'base' && p.index === i)).toBe(true);
  });

  it('tips already explained by a base page add nothing', () => {
    expect(howtoPages(['mixing', 'blocked', 'slots', 'brown', 'stone', 'lock', 'covered', 'guide'])).toHaveLength(HOWTO_PAGES);
  });

  it('with every tip seen it adds the five uncovered ones after the base pages, in a fixed order', () => {
    const pages = howtoPages(ALL);
    expect(pages).toHaveLength(HOWTO_PAGES + 5);
    expect(pages.slice(HOWTO_PAGES)).toEqual(['ice', 'hidden', 'belt', 'queue', 'leftover'].map((tip) => ({ kind: 'tip', tip })));
  });

  it('the order the tips were seen in does not matter', () => {
    expect(howtoPages(['leftover', 'ice', 'queue'])).toEqual(howtoPages(['ice', 'queue', 'leftover']));
    expect(howtoPages(['leftover', 'ice']).slice(HOWTO_PAGES)).toEqual([{ kind: 'tip', tip: 'ice' }, { kind: 'tip', tip: 'leftover' }]);
  });

  it('ignores unknown ids and duplicates', () => {
    expect(howtoPages(['belt', 'belt', 'nope', '', 'ICE'])).toEqual([...howtoPages([]), { kind: 'tip', tip: 'belt' }]);
  });

  it('maps every card tip, to a real base page or to an extra page', () => {
    expect(Object.keys(TIP_PAGE).sort()).toEqual([...ALL].sort());
    for (const tip of ALL) {
      const page = TIP_PAGE[tip];
      if (page === null) expect(EXTRA_TIPS).toContain(tip);
      else {
        expect(Number.isInteger(page) && page >= 0 && page < HOWTO_PAGES).toBe(true);
        expect(EXTRA_TIPS).not.toContain(tip);
      }
    }
    expect(EXTRA_TIPS).toEqual(['ice', 'hidden', 'belt', 'queue', 'leftover']);
  });

  it('page moves follow the number of pages', () => {
    const count = howtoPages(ALL).length;
    expect(clampPage(99, count)).toBe(count - 1);
    expect(pageAfterSwipe(HOWTO_PAGES - 1, -200, 0, count)).toBe(HOWTO_PAGES);
    expect(pageAfterSwipe(count - 1, -200, 0, count)).toBe(count - 1);
    expect(pageAfterSwipe(HOWTO_PAGES - 1, -200, 0)).toBe(HOWTO_PAGES - 1);
  });
});
