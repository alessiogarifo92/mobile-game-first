import { describe, expect, it } from 'vitest';
import { MIN_TOUCH_PX, SLOT_HIT_PAD, VIEW, computeLayout, inflate, slotAt, type Rect } from '../src/core/layout';
import { MAX_SCREEN_HEIGHT, screenHeight } from '../src/core/screen';

/** Window sizes (CSS px) of the device matrix in issue #62. */
const WINDOWS: [string, number, number][] = [
  ['320x568 small 16:9', 320, 568], ['360x640', 360, 640], ['390x844', 390, 844], ['393x852', 393, 852],
  ['412x915', 412, 915], ['412x1000', 412, 1000], ['360x800', 360, 800],
  ['280x653 folded', 280, 653], ['717x512 unfolded', 717, 512],
  ['768x1024 tablet', 768, 1024], ['820x1180', 820, 1180], ['1024x1366', 1024, 1366],
  ['844x390 landscape', 844, 390], ['1920x1080 desktop', 1920, 1080],
];

describe('screenHeight', () => {
  it('is never below the designed 1280 or above the maximum', () => {
    for (const [, w, h] of WINDOWS) {
      const sh = screenHeight(w, h);
      expect(sh).toBeGreaterThanOrEqual(VIEW.height);
      expect(sh).toBeLessThanOrEqual(MAX_SCREEN_HEIGHT);
    }
  });

  it('follows the aspect ratio of tall phones', () => {
    expect(screenHeight(360, 640)).toBe(1280);
    expect(screenHeight(412, 915)).toBe(Math.round((720 * 915) / 412));
    expect(screenHeight(280, 10_000)).toBe(MAX_SCREEN_HEIGHT);
  });

  it('keeps 1280 for wide windows (side bars instead of squeezing)', () => {
    expect(screenHeight(1920, 1080)).toBe(1280);
    expect(screenHeight(0, 0)).toBe(1280);
  });
});

const inside = (r: Rect, height: number) => r.x >= 0 && r.y >= 0 && r.x + r.w <= VIEW.width && r.y + r.h <= height;

describe('computeLayout across screens', () => {
  // Smallest and largest boards, 1 to 5 columns, with and without extra slots.
  const levels: [number, number, number, number][] = [[3, 3, 3, 1], [8, 6, 4, 2], [10, 10, 5, 4], [14, 14, 6, 5], [14, 14, 3, 5]];
  const heights = [...new Set(WINDOWS.map(([, w, h]) => screenHeight(w, h)))];

  it.each(heights)('everything fits and nothing overlaps at screen height %i', (screen) => {
    for (const [w, h, slots, cols] of levels) {
      const l = computeLayout(w, h, slots, cols, screen);
      expect(inside(l.belt, screen)).toBe(true);
      for (const r of [...l.slots, ...l.columns]) expect(inside(r, screen)).toBe(true);
      // Vertical order: header < belt < slots < columns, no overlap between belt and slots.
      expect(l.belt.y).toBeGreaterThanOrEqual(150 - 1);
      expect(l.belt.y + l.belt.h).toBeLessThanOrEqual(l.slots[0]!.y);
      expect(l.slots[0]!.y + l.slots[0]!.h).toBeLessThan(l.columns[0]!.y);
      // Columns reach the bottom edge zone (thumb) and keep a margin.
      expect(l.columns[0]!.y + l.columns[0]!.h).toBe(screen - 24);
      // Neighbouring columns / slots never overlap.
      for (let i = 1; i < l.columns.length; i++) expect(l.columns[i]!.x).toBeGreaterThanOrEqual(l.columns[i - 1]!.x + l.columns[i - 1]!.w);
      for (let i = 1; i < l.slots.length; i++) expect(l.slots[i]!.x).toBeGreaterThanOrEqual(l.slots[i - 1]!.x + l.slots[i - 1]!.w);
    }
  });

  it('is the original layout at 1280', () => {
    const a = computeLayout(8, 6, 3, 2);
    const b = computeLayout(8, 6, 3, 2, 1280);
    expect(b).toEqual(a);
    expect(a.slots[0]!.y).toBe(790);
    expect(a.columns[0]!.y).toBe(924);
  });

  it('on tall screens the controls move down with the bottom edge and the board grows', () => {
    const small = computeLayout(10, 10, 4, 3, 1280);
    const tall = computeLayout(10, 10, 4, 3, 1700);
    expect(tall.slots[0]!.y - small.slots[0]!.y).toBe(420);
    expect(tall.columns[0]!.y - small.columns[0]!.y).toBe(420);
    expect(tall.cell).toBeGreaterThanOrEqual(small.cell);
    expect(tall.belt.w).toBeGreaterThanOrEqual(small.belt.w);
  });

  it('screens shorter than the design are treated as 1280', () => {
    expect(computeLayout(8, 6, 3, 2, 900)).toEqual(computeLayout(8, 6, 3, 2, 1280));
  });

  it('touch areas: columns are wide enough and slots are inflated to ~100 units (50 px at 360 wide)', () => {
    const l = computeLayout(14, 14, 6, 5, 1280);
    for (const c of l.columns) expect(c.w * (360 / VIEW.width)).toBeGreaterThanOrEqual(44 - 1);
    for (const s of l.slots) expect(inflate(s, SLOT_HIT_PAD).w * (360 / VIEW.width)).toBeGreaterThanOrEqual(44);
    expect(inflate({ x: 10, y: 20, w: 30, h: 40 }, 5)).toEqual({ x: 5, y: 15, w: 40, h: 50 });
  });
});

describe('slotAt', () => {
  const slots: Rect[] = [{ x: 100, y: 800, w: 84, h: 84 }, { x: 200, y: 800, w: 84, h: 84 }, { x: 300, y: 800, w: 84, h: 84 }];
  const at = (x: number, y: number, minSize = 0) => slotAt(slots, { x, y }, minSize);

  it('hits a slot, and nothing outside its margin', () => {
    expect(at(142, 842)).toBe(0);
    expect(at(242, 842)).toBe(1);
    expect(at(142, 700)).toBe(-1);
    expect(at(10, 842)).toBe(-1);
  });

  it('a tap in the margin just above or below still counts (SLOT_HIT_PAD)', () => {
    expect(at(142, 800 - SLOT_HIT_PAD + 1)).toBe(0);
    expect(at(142, 800 - SLOT_HIT_PAD - 2)).toBe(-1);
  });

  it('in the gap between two slots the nearest one wins', () => {
    expect(at(188, 842)).toBe(0); // 4 from slot 0's edge, 12 from slot 1's
    expect(at(196, 842)).toBe(1);
  });

  it('the margin grows on small screens so the area is at least the minimum size', () => {
    const minSize = MIN_TOUCH_PX / 0.389; // a 280 px wide phone: 113 logical units
    expect(at(100 - 14, 842, minSize)).toBe(0);
    expect(at(100 - 16, 842, minSize)).toBe(-1);
    expect(at(100 - 14, 842, 0)).toBe(-1); // without the scale it keeps the default margin
  });

  it('caps the margin so a huge minimum cannot swallow the screen', () => {
    expect(at(100 - 41, 842, 10_000)).toBe(-1);
  });
});
