import { describe, expect, it } from 'vitest';
import { brownWedges } from '../src/core/brownPixel';
import { PRIMARIES } from '../src/core/colors';
import { RED, YELLOW, BLUE } from './helpers';

/** Shoelace area of a polygon. */
const area = (pts: readonly (readonly [number, number])[]) =>
  Math.abs(pts.reduce((s, [x1, y1], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length]!;
    return s + x1 * y2 - x2 * y1;
  }, 0)) / 2;

describe('brownWedges', () => {
  const wedges = brownWedges(10, 20, 30, 30);

  it('splits the pixel into three wedges that cover it exactly', () => {
    const total = PRIMARIES.reduce((s, p) => s + area(wedges[p]), 0);
    expect(total).toBeCloseTo(30 * 30, 6);
  });

  it('gives every primary a fixed place: red upper-left, yellow upper-right, blue at the bottom', () => {
    const centroid = (p: typeof RED | typeof YELLOW | typeof BLUE) => {
      const pts = wedges[p];
      return [pts.reduce((s, [x]) => s + x, 0) / pts.length, pts.reduce((s, [, y]) => s + y, 0) / pts.length] as const;
    };
    const [rx, ry] = centroid(RED);
    const [yx, yy] = centroid(YELLOW);
    const [, by] = centroid(BLUE);
    expect(rx).toBeLessThan(25);
    expect(yx).toBeGreaterThan(25);
    expect(by).toBeGreaterThan(Math.max(ry, yy));
  });

  it('every wedge starts at the centre and stays inside the pixel', () => {
    for (const p of PRIMARIES) {
      expect(wedges[p][0]).toEqual([25, 35]);
      for (const [x, y] of wedges[p]) {
        expect(x).toBeGreaterThanOrEqual(10);
        expect(x).toBeLessThanOrEqual(40);
        expect(y).toBeGreaterThanOrEqual(20);
        expect(y).toBeLessThanOrEqual(50);
      }
    }
  });

  it('wedges are of similar size, so no colour looks more important', () => {
    const areas = PRIMARIES.map((p) => area(wedges[p]));
    expect(Math.max(...areas) / Math.min(...areas)).toBeLessThan(1.6);
  });
});
