import { describe, expect, it } from 'vitest';
import { VIEW, beltPoint, cellRect, computeLayout, contains } from '../src/core/layout';

describe('layout', () => {
  const l = computeLayout(8, 6, 3, 2);

  it('fits the canvas inside the belt and the view', () => {
    expect(l.canvas.w).toBe(8 * l.cell);
    expect(l.canvas.h).toBe(6 * l.cell);
    expect(l.belt.x).toBeGreaterThanOrEqual(0);
    expect(l.belt.x + l.belt.w).toBeLessThanOrEqual(VIEW.width);
    expect(l.columns.at(-1)!.y + l.columns.at(-1)!.h).toBeLessThanOrEqual(VIEW.height);
  });

  it('places one lane per belt position, matching buildLanes order', () => {
    expect(l.lanes).toHaveLength(2 * 8 + 2 * 6);
    // first lane: bottom side under column 0; first right-side lane: beside the bottom row.
    expect(l.lanes[0]!.y).toBeGreaterThan(l.canvas.y + l.canvas.h);
    expect(l.lanes[8]!.x).toBeGreaterThan(l.canvas.x + l.canvas.w);
    expect(l.lanes[8]!.y).toBeCloseTo(l.canvas.y + 5.5 * l.cell);
  });

  it('interpolates and wraps belt positions', () => {
    const a = l.lanes[0]!, b = l.lanes[1]!;
    expect(beltPoint(l, 0.5)).toEqual({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    expect(beltPoint(l, l.lanes.length)).toEqual(a);
    expect(beltPoint(l, -1)).toEqual(l.lanes.at(-1));
  });

  it('centres slots and columns without overlap', () => {
    expect(l.slots).toHaveLength(3);
    expect(l.slots[1]!.x).toBeGreaterThan(l.slots[0]!.x + l.slots[0]!.w);
    const mid = (l.slots[0]!.x + l.slots[2]!.x + l.slots[2]!.w) / 2;
    expect(mid).toBeCloseTo(VIEW.width / 2);
    expect(l.columns[1]!.x).toBeGreaterThan(l.columns[0]!.x + l.columns[0]!.w);
  });

  it('maps cells to rects and hit-tests rects', () => {
    const r = cellRect(l, 8, 9); // x=1, y=1
    expect(r).toEqual({ x: l.canvas.x + l.cell, y: l.canvas.y + l.cell, w: l.cell, h: l.cell });
    expect(contains(r, { x: r.x + 1, y: r.y + 1 })).toBe(true);
    expect(contains(r, { x: r.x - 1, y: r.y })).toBe(false);
  });

  it('keeps big levels within the board', () => {
    const big = computeLayout(12, 12, 4, 4);
    expect(big.cell * 12).toBeLessThanOrEqual(600 - 2 * big.beltThickness);
    expect(big.columns[0]!.x).toBeGreaterThanOrEqual(0);
  });
});
