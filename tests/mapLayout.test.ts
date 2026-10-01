import { describe, expect, it } from 'vitest';
import { MAP, clampScroll, computeMapLayout, currentLevel, inertia, maxScroll, scrollToLevel } from '../src/core/mapLayout';

const levels = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, stage: Math.floor(i / 10) + 1, boss: (i + 1) % 10 === 0 }));
const VIEW_H = 1500;

describe('map layout', () => {
  const layout = computeMapLayout(levels, 720, VIEW_H);

  it('climbs from level 1 at the bottom to the last level at the top', () => {
    const first = layout.nodes[0]!, last = layout.nodes.at(-1)!;
    expect(first.y).toBe(layout.height - MAP.bottomPad - MAP.headerGap);
    expect(last.y).toBeGreaterThanOrEqual(MAP.barHeight);
    for (let i = 1; i < layout.nodes.length; i++) expect(layout.nodes[i]!.y).toBeLessThan(layout.nodes[i - 1]!.y);
    expect(layout.nodes.every((n) => n.x - n.r >= 0 && n.x + n.r <= 720)).toBe(true);
  });

  it('puts one header per stage, below its first level, with the level count', () => {
    expect(layout.headers).toHaveLength(10);
    expect(layout.headers.every((h) => h.count === 10)).toBe(true);
    layout.headers.forEach((h) => {
      const first = layout.nodes.find((n) => n.stage === h.stage)!;
      expect(h.y).toBeGreaterThan(first.y);
    });
  });

  it('keeps every header band clear of the boss star below and the first node above', () => {
    layout.headers.forEach((h) => {
      const above = layout.nodes.find((n) => n.stage === h.stage)!;
      const below = layout.nodes.filter((n) => n.stage === h.stage - 1).at(-1);
      expect(h.y - 34 - (above.y + above.r)).toBeGreaterThan(10);
      if (below) expect(below.y - below.r - 32 - (h.y + 34)).toBeGreaterThan(5); // star drawn ~32px above the node
    });
  });

  it('draws bosses bigger', () => {
    expect(layout.nodes[9]!.r).toBe(MAP.bossRadius);
    expect(layout.nodes[8]!.r).toBe(MAP.radius);
  });

  it('keeps a short map at least one screen tall', () => {
    const short = computeMapLayout(levels.slice(0, 3), 720, VIEW_H);
    expect(short.height).toBe(VIEW_H);
    expect(maxScroll(short, VIEW_H)).toBe(0);
  });

  it('clamps scrolling to the map', () => {
    expect(clampScroll(-50, layout, VIEW_H)).toBe(0);
    expect(clampScroll(1e9, layout, VIEW_H)).toBe(layout.height - VIEW_H);
  });

  it('opens on the current level, inside the visible area below the bar', () => {
    for (const id of [1, 37, 100]) {
      const s = scrollToLevel(layout, id, VIEW_H);
      const y = layout.nodes[id - 1]!.y - s;
      expect(y).toBeGreaterThan(MAP.barHeight);
      expect(y).toBeLessThan(VIEW_H);
    }
    expect(scrollToLevel(layout, 1, VIEW_H)).toBe(maxScroll(layout, VIEW_H)); // bottom of the map
    expect(scrollToLevel(layout, 999, VIEW_H)).toBe(scrollToLevel(layout, 1, VIEW_H)); // unknown id → level 1
    expect(scrollToLevel(computeMapLayout([], 720, VIEW_H), 1, VIEW_H)).toBe(0);
  });

  it('picks the first unlocked level not completed', () => {
    expect(currentLevel(1, [], 100)).toBe(1);
    expect(currentLevel(5, [1, 2, 4], 100)).toBe(3);
    expect(currentLevel(3, [1, 2, 3], 3)).toBe(3); // everything done
    expect(currentLevel(50, [], 15)).toBe(1);
  });

  it('decays a flick and stops at the edges', () => {
    let s = { scroll: 500, velocity: 2 };
    s = inertia(s.scroll, s.velocity, 16, layout, VIEW_H);
    expect(s.scroll).toBe(532);
    expect(s.velocity).toBeLessThan(2);
    expect(inertia(10, -5, 16, layout, VIEW_H)).toEqual({ scroll: 0, velocity: 0 });
    expect(inertia(500, 0.01, 16, layout, VIEW_H).velocity).toBe(0);
  });
});
