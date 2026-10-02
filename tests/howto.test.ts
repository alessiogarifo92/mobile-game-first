import { describe, expect, it } from 'vitest';
import { HOWTO_PAGES, SWIPE_DISTANCE, clampPage, pageAfterSwipe } from '../src/core/howto';

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
