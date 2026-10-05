import { describe, expect, it } from 'vitest';
import {
  HEADER_TOUCH_HALF_HEIGHT, MAP, NODE_TOUCH_RADIUS, clampScroll, computeMapLayout, currentLevel, inertia, keyScrollDelta, mapTapTarget, maxScroll, scrollToLevel,
} from '../src/core/mapLayout';

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

  it('lays out any number of stages, a short last stage and a total that is not a multiple of ten', () => {
    const more = Array.from({ length: 115 }, (_, i) => ({ id: i + 1, stage: Math.floor(i / 10) + 1, boss: (i + 1) % 10 === 0 }));
    const big = computeMapLayout(more, 720, VIEW_H);
    expect(big.headers.map((h) => h.count)).toEqual([...Array(11).fill(10), 5]);
    expect(big.nodes.at(-1)!.y).toBeGreaterThanOrEqual(MAP.barHeight);
    expect(big.height).toBeGreaterThan(layout.height);
    const one = computeMapLayout(levels.slice(0, 5), 720, VIEW_H);
    expect(one.headers).toEqual([{ stage: 1, y: expect.any(Number), count: 5 }]);
    expect(currentLevel(101, levels.map((l) => l.id), 115)).toBe(101);
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

describe('map taps and keys', () => {
  const layout = computeMapLayout(levels, 720, VIEW_H);
  const node = (id: number) => layout.nodes.find((n) => n.id === id)!;

  it('a tap on an unlocked node opens its level', () => {
    expect(mapTapTarget(layout, 5, node(3).x, node(3).y)).toEqual({ kind: 'level', id: 3 });
    expect(mapTapTarget(layout, 5, node(5).x + 10, node(5).y - 10)).toEqual({ kind: 'level', id: 5 });
  });

  it('a locked node is not tappable', () => {
    expect(mapTapTarget(layout, 5, node(6).x, node(6).y)).toBeNull();
  });

  it('the touch radius is at least NODE_TOUCH_RADIUS, even for the small nodes', () => {
    const n = node(2);
    expect(n.r * 1.2).toBeLessThan(NODE_TOUCH_RADIUS);
    expect(mapTapTarget(layout, 100, n.x + NODE_TOUCH_RADIUS - 1, n.y)).toEqual({ kind: 'level', id: 2 });
    expect(mapTapTarget(layout, 100, n.x + NODE_TOUCH_RADIUS + 20, n.y)).toBeNull();
  });

  it('a boss node is tapped within the same minimum radius', () => {
    const boss = node(10);
    expect(boss.r).toBeGreaterThan(node(2).r);
    expect(mapTapTarget(layout, 100, boss.x, boss.y + NODE_TOUCH_RADIUS - 1)).toEqual({ kind: 'level', id: 10 });
  });

  it('a tap on a stage band opens that stage, only inside the band', () => {
    const h = layout.headers[1]!;
    expect(mapTapTarget(layout, 1, 360, h.y)).toEqual({ kind: 'stage', stage: h.stage });
    expect(mapTapTarget(layout, 1, 360, h.y + HEADER_TOUCH_HALF_HEIGHT - 1)).toEqual({ kind: 'stage', stage: h.stage });
    expect(mapTapTarget(layout, 1, 360, h.y + HEADER_TOUCH_HALF_HEIGHT + 30)).toBeNull();
    expect(mapTapTarget(layout, 1, 40, h.y)).toBeNull(); // left of the band
    expect(mapTapTarget(layout, 1, 700, h.y)).toBeNull(); // right of the band
  });

  it('empty space is not a target', () => {
    expect(mapTapTarget(layout, 100, 5, 5)).toBeNull();
  });

  it('keys scroll by lines, pages and to the ends', () => {
    expect(keyScrollDelta('UP', 1500)).toBe(-120);
    expect(keyScrollDelta('DOWN', 1500)).toBe(120);
    expect(keyScrollDelta('PAGE_UP', 1500)).toBe(-(1500 - MAP.barHeight));
    expect(keyScrollDelta('PAGE_DOWN', 1500)).toBe(1500 - MAP.barHeight);
    expect(keyScrollDelta('HOME', 1500)).toBe(-Infinity);
    expect(keyScrollDelta('END', 1500)).toBe(Infinity);
    expect(keyScrollDelta('A', 1500)).toBeNull();
  });
});
