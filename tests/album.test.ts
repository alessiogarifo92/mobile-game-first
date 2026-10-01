import { describe, expect, it } from 'vitest';
import { SKINS, isSkin, newlyCompletedStage, stageProgress, stageSkin, unlockedSkins } from '../src/core/album';

const levels = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, stage: Math.floor(i / 10) + 1 }));
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

describe('album', () => {
  it('has a skin per stage plus classic', () => {
    expect(SKINS).toHaveLength(11);
    expect(stageSkin(1)).toBe('dots');
    expect(stageSkin(10)).toBe('gold');
    expect(stageSkin(11)).toBeNull();
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
});
