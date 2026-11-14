import { describe, expect, it } from 'vitest';
import { iceBadge, iceGlints, iceHits } from '../src/core/ice';

const inside = (px: number, py: number, x: number, y: number, w: number, h: number) =>
  px >= x && px <= x + w && py >= y && py <= y + h;

describe('iceHits', () => {
  it('counts one hit per ice layer', () => {
    expect(iceHits(1)).toBe(1);
    expect(iceHits(3)).toBe(3);
  });

  it('never goes negative and ignores fractions', () => {
    expect(iceHits(0)).toBe(0);
    expect(iceHits(-2)).toBe(0);
    expect(iceHits(1.7)).toBe(1);
  });
});

describe('iceGlints', () => {
  const [x, y, w, h] = [10, 20, 40, 40];
  const glints = iceGlints(x, y, w, h);

  it('draws two quadrilaterals, the long one first', () => {
    expect(glints).toHaveLength(2);
    for (const g of glints) expect(g).toHaveLength(4);
    const span = (g: (typeof glints)[number]) => g[1]![0] - g[0]![0];
    expect(span(glints[0]!)).toBeGreaterThan(span(glints[1]!));
  });

  it('keeps every point inside the pixel, in its upper-left half (the counter holds the lower-right corner)', () => {
    for (const g of glints) for (const [px, py] of g) {
      expect(inside(px, py, x, y, w, h)).toBe(true);
      expect(px - x + (py - y)).toBeLessThanOrEqual(w);
    }
  });

  it('runs parallel to the diagonal: each band has its two edges at the same slope', () => {
    for (const [a, b, c, d] of glints) {
      expect(a![0] - x + (a![1] - y)).toBeCloseTo(d![0] - x + (d![1] - y), 6);
      expect(b![0] - x + (b![1] - y)).toBeCloseTo(c![0] - x + (c![1] - y), 6);
    }
  });
});

describe('iceBadge', () => {
  it('is null when the pixel is not frozen', () => {
    expect(iceBadge(0, 0, 0, 40, 40)).toBeNull();
    expect(iceBadge(-1, 0, 0, 40, 40)).toBeNull();
  });

  it('shows the hits that still break the ice', () => {
    expect(iceBadge(1, 0, 0, 40, 40)?.text).toBe('1');
    expect(iceBadge(2, 0, 0, 40, 40)?.text).toBe('2');
  });

  it('sits in the lower-right corner, the whole disc inside the pixel (its rim included)', () => {
    const [x, y, w, h] = [100, 50, 48, 48];
    const b = iceBadge(1, x, y, w, h)!;
    expect(b.x).toBeGreaterThan(x + w / 2);
    expect(b.y).toBeGreaterThan(y + h / 2);
    expect(b.x + b.r * 1.09).toBeLessThanOrEqual(x + w + 1e-9);
    expect(b.y + b.r * 1.09).toBeLessThanOrEqual(y + h + 1e-9);
  });

  it('scales with the pixel and never drops under a radius of 7 on small boards', () => {
    expect(iceBadge(1, 0, 0, 50, 50)!.r).toBeCloseTo(12, 6);
    expect(iceBadge(1, 0, 0, 20, 20)!.r).toBe(7);
    expect(iceBadge(1, 0, 0, 60, 30)!.r).toBeCloseTo(7.2, 6);
  });
});
