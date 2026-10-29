import { describe, expect, it } from 'vitest';
import {
  SKINS, UNIVERSE_SKINS, isSkin, newlyCompletedStage, parseSkin, stageProgress, stageSkin, universeSkin, unlockedSkins,
} from '../src/core/album';

const levels = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, stage: Math.floor(i / 10) + 1 }));
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

describe('album', () => {
  it('has a skin per stage plus classic', () => {
    expect(SKINS).toHaveLength(11);
    expect(stageSkin(1)).toBe('dots');
    expect(stageSkin(10)).toBe('gold');
    expect(stageSkin(11)).toBe('petals-1');
    expect(isSkin('gold')).toBe(true);
    expect(isSkin('nope')).toBe(false);
  });

  it('counts progress per stage; a partial stage is never complete', () => {
    const p = stageProgress(levels, [...range(1, 10), 11, 12, 21, 22, 23, 24, 25]);
    expect(p).toEqual([
      { stage: 1, done: 10, total: 10, complete: true },
      { stage: 2, done: 2, total: 10, complete: false },
      { stage: 3, done: 5, total: 5, complete: false },
    ]);
  });

  it('unlocks the skin of each completed stage', () => {
    expect(unlockedSkins(levels, [])).toEqual(['classic']);
    expect(unlockedSkins(levels, range(1, 20))).toEqual(['classic', 'dots', 'stripes']);
  });

  it('reports the stage completed by a win, once', () => {
    expect(newlyCompletedStage(levels, range(1, 9), 10)).toBe(1);
    expect(newlyCompletedStage(levels, range(1, 10), 10)).toBeNull(); // replay
    expect(newlyCompletedStage(levels, range(1, 8), 10)).toBeNull(); // 9 still missing
    expect(newlyCompletedStage(levels, [], 99)).toBeNull();
  });

  it('celebrates the first stage of universe 2 with the first colour of its skin', () => {
    const eleven = Array.from({ length: 110 }, (_, i) => ({ id: i + 1, stage: Math.floor(i / 10) + 1 }));
    expect(newlyCompletedStage(eleven, range(1, 109), 110)).toBe(11);
    expect(stageProgress(eleven, range(1, 110)).every((p) => p.complete)).toBe(true);
    expect(unlockedSkins(eleven, range(1, 110))).toEqual([...SKINS, 'petals-1']);
  });
});

describe('universe skins (#92)', () => {
  const game = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, stage: Math.floor(i / 10) + 1 }));

  it('gives universes 2–5 a skin of their own, and none to universe 1 or past 5', () => {
    expect(UNIVERSE_SKINS).toHaveLength(4);
    expect([1, 2, 3, 4, 5, 6].map(universeSkin)).toEqual([null, 'petals', 'stamps', 'bubbles', 'orbits', null]);
  });

  it('gives each stage of universes 2–5 a colour variant of its universe skin', () => {
    expect(stageSkin(12)).toBe('petals-2');
    expect(stageSkin(20)).toBe('petals-10');
    expect(stageSkin(21)).toBe('stamps-1');
    expect(stageSkin(50)).toBe('orbits-10');
    expect(stageSkin(51)).toBeNull();
  });

  it('knows a skin from its name, variants 1–10 only', () => {
    for (const ok of ['petals', 'petals-1', 'stamps-10', 'orbits-7']) expect(isSkin(ok)).toBe(true);
    for (const bad of ['petals-0', 'petals-11', 'petals-', 'gold-1', 'Petals', 'xpetals', 3, null]) expect(isSkin(bad)).toBe(false);
    expect(parseSkin('gold')).toEqual({ pattern: 'gold', variant: null });
    expect(parseSkin('bubbles')).toEqual({ pattern: 'bubbles', variant: null });
    expect(parseSkin('bubbles-4')).toEqual({ pattern: 'bubbles', variant: 4 });
  });

  it('unlocks a variant per completed stage, and the universe skin only once the universe is finished', () => {
    const levels = game(300);
    expect(unlockedSkins(levels, range(1, 130))).toEqual([...SKINS, 'petals-1', 'petals-2', 'petals-3']);
    // Every stage of universe 2 but its last: ten variants minus one, no universe skin yet.
    expect(unlockedSkins(levels, range(1, 199))).not.toContain('petals');
    expect(unlockedSkins(levels, range(1, 199))).not.toContain('petals-10');
    const all = unlockedSkins(levels, range(1, 200));
    expect(all.slice(SKINS.length)).toEqual([...range(1, 10).map((k) => `petals-${k}`), 'petals']);
    // A stage of universe 3 done without universe 2 finished still earns its variant (stages are counted on their own).
    expect(unlockedSkins(levels, range(201, 210))).toEqual(['classic', 'stamps-1']);
  });

  it('gives no universe skin to a universe that is not complete yet', () => {
    // Universe 2 has only 5 full stages: every level painted, still no universe skin.
    const levels = game(150);
    expect(unlockedSkins(levels, range(1, 150))).not.toContain('petals');
    expect(unlockedSkins(levels, range(1, 150))).toContain('petals-5');
  });
});
