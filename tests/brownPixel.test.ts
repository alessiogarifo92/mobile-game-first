import { describe, expect, it } from 'vitest';
import { brownWedges, missingDots } from '../src/core/brownPixel';
import { BROWN, GREEN, ORANGE, PRIMARIES, PURPLE } from '../src/core/colors';
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

describe('missingDots (#149)', () => {
  it('a mixed pixel puts its missing primary in the lower-right half', () => {
    const [d, ...rest] = missingDots(ORANGE, RED, 0, 0, 60, 60);
    expect(rest).toEqual([]);
    expect(d).toMatchObject({ color: YELLOW });
    expect(d!.x).toBeGreaterThan(30);
    expect(d!.y).toBeGreaterThan(30);
    expect(d!.x + d!.y).toBeGreaterThan(60); // below the diagonal the received colour fills
  });

  it('a brown pixel puts each dot inside the empty wedge of its colour', () => {
    const dots = missingDots(BROWN, RED, 10, 20, 60, 60);
    expect(dots.map((d) => d.color)).toEqual([YELLOW, BLUE]);
    const wedges = brownWedges(10, 20, 60, 60);
    for (const d of dots) expect(inside([d.x, d.y], wedges[d.color])).toBe(true);
  });

  it('stays visible on a small pixel and scales with a big one', () => {
    expect(missingDots(GREEN, BLUE, 0, 0, 14, 14)[0]!.r).toBe(4);
    expect(missingDots(GREEN, BLUE, 0, 0, 100, 100)[0]!.r).toBeCloseTo(13);
  });

  it('no dots on a complete or untouched pixel', () => {
    expect(missingDots(BROWN, BROWN, 0, 0, 60, 60)).toEqual([]);
    expect(missingDots(PURPLE, 0, 0, 0, 60, 60)).toEqual([]);
  });
});

/** Ray casting: whether a point lies inside a polygon. */
function inside([px, py]: readonly [number, number], poly: readonly (readonly [number, number])[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
