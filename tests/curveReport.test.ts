import { describe, expect, it } from 'vitest';
import type { CurveLevel } from '../src/core/curve';
import { comboOf, formatSpan, novelties, noveltyGaps, summarizeStages } from '../src/core/curveReport';

const lvl = (id: number, patch: Partial<CurveLevel> = {}): CurveLevel => ({
  id, stage: Math.ceil(id / 10), boss: id % 10 === 0, winRate: 0.8,
  shooters: 10, secondaryShare: 0.5, beltCapacity: 2, slots: 3, features: ['mix'], ...patch,
});

describe('curve report summaries (#100)', () => {
  it('summarizes a stage: mean, very easy, hardest, boss, belt and slot spans, mechanics, secondaries', () => {
    const levels = [
      lvl(1, { winRate: 1, secondaryShare: 0.1 }), // rest level: low secondaries do not count
      lvl(2, { winRate: 0.95, features: ['mix', 'ice'] }),
      lvl(3, { winRate: 0.5, slots: 2, features: ['mix', 'ice', 'brown'], secondaryShare: 0.2 }),
      lvl(10, { winRate: 0.6, beltCapacity: 3 }),
    ];
    const [s] = summarizeStages(levels);
    expect(s).toMatchObject({
      stage: 1, levels: 4, veryEasy: 2,
      hardest: { id: 3, winRate: 0.5 }, boss: { id: 10, winRate: 0.6 },
      belt: [2, 3], slots: [2, 3], lowSecondary: 1,
      mechanics: [{ name: 'ice', levels: 2 }, { name: 'brown', levels: 1 }],
    });
    expect(s!.mean).toBeCloseTo(0.7625);
    expect(s!.meanSecondary).toBeCloseTo(0.325);
  });

  it('sorts stages and leaves out the boss of an incomplete stage', () => {
    const out = summarizeStages([lvl(21), lvl(11), lvl(12, { winRate: 0.4 })]);
    expect(out.map((s) => s.stage)).toEqual([2, 3]);
    expect(out[0]!.boss).toBeUndefined();
    expect(out[0]!.hardest.id).toBe(12);
    expect(out[0]!.mechanics).toEqual([]);
  });

  it('formats spans', () => {
    expect(formatSpan([2, 2])).toBe('2');
    expect(formatSpan([2, 3])).toBe('2–3');
  });

  it('keys combinations in a fixed order and ignores mixing', () => {
    expect(comboOf(lvl(1, { features: ['stone', 'mix', 'brown'] }))).toBe('brown+stone');
    expect(comboOf(lvl(1))).toBe('');
  });

  it('lists the first level of each mechanic and of each combination, in id order', () => {
    const levels = [
      lvl(30, { features: ['mix', 'brown', 'stone'] }),
      lvl(5, { features: ['ice'] }),
      lvl(12, { features: ['ice', 'brown'] }),
      lvl(13, { features: ['ice', 'brown'] }),
      lvl(31, { features: ['brown', 'stone'] }),
    ];
    expect(novelties(levels)).toEqual([
      { id: 5, kind: 'mechanic', name: 'ice' },
      { id: 12, kind: 'mechanic', name: 'brown' },
      { id: 12, kind: 'combo', name: 'ice+brown' },
      { id: 30, kind: 'mechanic', name: 'stone' },
      { id: 30, kind: 'combo', name: 'brown+stone' },
    ]);
  });

  it('finds the 20-level windows with nothing new, skipping a partial last window', () => {
    const levels = [lvl(5, { features: ['ice'] }), lvl(45, { features: ['brown'] }), lvl(46, { features: ['ice', 'brown'] })];
    expect(noveltyGaps(levels, 1, 70)).toEqual([[21, 40]]);
    expect(noveltyGaps(levels, 1, 40, 40)).toEqual([]);
    expect(noveltyGaps([], 101, 119)).toEqual([]);
  });
});
