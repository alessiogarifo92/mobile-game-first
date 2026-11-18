import { describe, expect, it } from 'vitest';
import { CURVE } from '../src/core/curve';
import {
  DIFFICULTY,
  bandChanges,
  bandOf,
  buildDifficultyFile,
  checkDifficulty,
  crossedThresholds,
  levelDifficulty,
  nearThreshold,
  stageDifficulty,
  storedProblems,
  type DifficultyInput,
  type DifficultyFile,
} from '../src/core/difficulty';
import { parseLevel, type LevelDef } from '../src/core/level';
import { createRng } from '../src/core/rng';
import { levelWinRate, randomWinRate } from '../src/core/solver';
import { LEVELS_PER_STAGE } from '../src/core/stages';
import levelsJson from '../src/levels/levels.json';
import storedJson from '../src/levels/difficulty.json';

/** Tests that play hundreds of random games. */
const SLOW = 120_000;
const defs = levelsJson as LevelDef[];
const stored = storedJson as DifficultyFile;

describe('difficulty table', () => {
  it('has one table with a version, the 85 / 65 thresholds of #71 and an open lower band', () => {
    expect(DIFFICULTY.version).toBe(1);
    expect(DIFFICULTY.bands.map((b) => [b.name, b.min])).toEqual([['easy', 0.85], ['normal', 0.65], ['hard', 0]]);
  });

  it('keeps bands sorted from the highest threshold to the lowest, ending at zero', () => {
    const mins = DIFFICULTY.bands.map((b) => b.min);
    expect([...mins].sort((a, b) => b - a)).toEqual(mins);
    expect(mins.at(-1)).toBe(0);
  });
});

describe('bandOf / levelDifficulty: exact boundaries', () => {
  it('0.85 is easy (inclusive), just below is normal', () => {
    expect(bandOf(0.85)).toBe('easy');
    expect(bandOf(0.8499999)).toBe('normal');
  });

  it('0.65 is normal (inclusive), just below is hard', () => {
    expect(bandOf(0.65)).toBe('normal');
    expect(bandOf(0.6499999)).toBe('hard');
  });

  it('covers the extremes', () => {
    expect(bandOf(1)).toBe('easy');
    expect(bandOf(0)).toBe('hard');
  });

  it('the band depends only on the win rate, the boss is a flag and not a band', () => {
    expect(levelDifficulty(0.9, { boss: true })).toEqual({ band: 'easy', boss: true, veryEasy: false });
    expect(levelDifficulty(0.5, { boss: false })).toEqual({ band: 'hard', boss: false, veryEasy: false });
    expect(levelDifficulty(0.7, {}).boss).toBe(false);
  });

  it('veryEasy is the internal sub-band at CURVE.veryEasy (inclusive) and implies easy', () => {
    expect(levelDifficulty(CURVE.veryEasy, {})).toMatchObject({ band: 'easy', veryEasy: true });
    expect(levelDifficulty(CURVE.veryEasy - 0.001, {})).toMatchObject({ band: 'easy', veryEasy: false });
  });

  it('is deterministic: the same input gives the same label', () => {
    expect(levelDifficulty(0.7, { boss: true })).toEqual(levelDifficulty(0.7, { boss: true }));
    expect(bandOf(0.7)).toBe(bandOf(0.7));
  });

  it('is monotonic: a higher win rate is never a harder band', () => {
    const rank = { hard: 0, normal: 1, easy: 2 } as const;
    let previous = -1;
    for (let w = 0; w <= 1.0001; w += 0.005) {
      const r = rank[bandOf(Math.min(1, w))];
      expect(r).toBeGreaterThanOrEqual(previous);
      previous = r;
    }
  });
});

describe('stageDifficulty', () => {
  const full = (rate: number) => Array.from({ length: LEVELS_PER_STAGE }, () => ({ winRate: rate }));

  it('is the mean win rate of the ten levels, labelled with the same bands', () => {
    const levels = [0.9, 0.8, 0.8, 0.7, 0.7, 0.7, 0.6, 0.6, 0.5, 0.4].map((winRate) => ({ winRate }));
    const s = stageDifficulty(levels)!;
    expect(s.winRate).toBeCloseTo(0.67, 10);
    expect(s.band).toBe('normal');
  });

  it('uses the same exact boundaries on the mean', () => {
    expect(stageDifficulty(full(0.85))!.band).toBe('easy');
    expect(stageDifficulty(full(0.65))!.band).toBe('normal');
    expect(stageDifficulty(full(0.64))!.band).toBe('hard');
  });

  it('is undefined for an incomplete or empty stage', () => {
    expect(stageDifficulty([])).toBeUndefined();
    expect(stageDifficulty(full(0.7).slice(0, LEVELS_PER_STAGE - 1))).toBeUndefined();
    expect(stageDifficulty([...full(0.7), { winRate: 0.7 }])).toBeUndefined();
  });

  it('the boss counts in the mean like any other level', () => {
    const levels = full(0.9);
    levels[9] = { winRate: 0 };
    expect(stageDifficulty(levels)!.winRate).toBeCloseTo(0.81, 10);
  });
});

describe('thresholds and noise', () => {
  it('nearThreshold reports the threshold within CURVE.tolerance (3 points), both sides, inclusive', () => {
    expect(DIFFICULTY.nearThreshold).toBe(CURVE.tolerance);
    expect(nearThreshold(0.85)).toBe(0.85);
    expect(nearThreshold(0.87)).toBe(0.85);
    expect(nearThreshold(0.82)).toBe(0.85);
    expect(nearThreshold(0.68)).toBe(0.65);
    expect(nearThreshold(0.62)).toBe(0.65);
    expect(nearThreshold(0.75)).toBeUndefined();
    expect(nearThreshold(0.5)).toBeUndefined();
    expect(nearThreshold(1)).toBeUndefined();
  });

  it('crossedThresholds lists the thresholds strictly inside a spec band', () => {
    expect(crossedThresholds([0.7, 0.8])).toEqual([]);
    expect(crossedThresholds([0.8, 0.9])).toEqual([0.85]);
    expect(crossedThresholds([0.6, 0.9])).toEqual([0.85, 0.65]);
    // a band that starts exactly on a threshold stays in one band; one that ends on it reaches the upper one
    expect(crossedThresholds([0.65, 0.84])).toEqual([]);
    expect(crossedThresholds([0.6, 0.65])).toEqual([0.65]);
    expect(crossedThresholds([0.85, 1])).toEqual([]);
  });
});

describe('adding levels never relabels the existing ones', () => {
  it('labels depend only on each level: appending a harder (or easier) level leaves the old labels untouched', () => {
    const base = [0.97, 0.9, 0.8, 0.7, 0.66, 0.6, 0.5];
    const label = (rates: number[]) => rates.map((w) => levelDifficulty(w, {}));
    const before = label(base);
    expect(label([...base, 0.1]).slice(0, base.length)).toEqual(before);
    expect(label([...base, 0.99]).slice(0, base.length)).toEqual(before);
    expect(label([0.01, ...base]).slice(1)).toEqual(before);
  });

  it('the stored file of a new level is added without touching the others', () => {
    const old = buildDifficultyFile([{ id: 1, specHash: 'a', winRate: 0.9 }, { id: 2, specHash: 'b', winRate: 0.7 }]);
    const grown = buildDifficultyFile([...old.levels, { id: 3, specHash: 'c', winRate: 0.2 }]);
    expect(grown.levels.slice(0, 2)).toEqual(old.levels);
    expect(grown.levels[2]).toEqual({ id: 3, specHash: 'c', winRate: 0.2, band: 'hard' });
  });

  it('a stage turning complete gets a value, its levels keep their labels', () => {
    const rates = Array.from({ length: LEVELS_PER_STAGE }, (_, i) => ({ winRate: 0.9 - i * 0.03 }));
    const partial = rates.slice(0, 9);
    expect(stageDifficulty(partial)).toBeUndefined();
    expect(stageDifficulty(rates)).toBeDefined();
    expect(partial.map((l) => bandOf(l.winRate))).toEqual(rates.slice(0, 9).map((l) => bandOf(l.winRate)));
  });
});

describe('the stored file', () => {
  it('buildDifficultyFile records the table version and the band computed from each win rate', () => {
    const file = buildDifficultyFile([{ id: 1, specHash: 'a', winRate: 0.85 }, { id: 2, specHash: 'b', winRate: 0.65 }, { id: 3, specHash: 'c', winRate: 0.64 }]);
    expect(file.version).toBe(DIFFICULTY.version);
    expect(file.levels.map((l) => l.band)).toEqual(['easy', 'normal', 'hard']);
  });

  const levels = [{ id: 1, specHash: 'a' }, { id: 2, specHash: 'b' }];
  const good = buildDifficultyFile([{ id: 1, specHash: 'a', winRate: 0.9 }, { id: 2, specHash: 'b', winRate: 0.7 }]);

  it('storedProblems is empty for a file that matches the levels', () => {
    expect(storedProblems(good, levels)).toEqual([]);
  });

  it('reports a missing file', () => {
    expect(storedProblems(undefined, levels)[0]).toMatch(/missing/);
  });

  it('reports a table version that differs from the stored one', () => {
    const problems = storedProblems({ ...good, version: DIFFICULTY.version + 1 }, levels);
    expect(problems.join('\n')).toMatch(/version/);
  });

  it('reports a stored band that differs from the recomputed one', () => {
    const lying: DifficultyFile = { ...good, levels: [{ ...good.levels[0]!, band: 'hard' }, good.levels[1]!] };
    expect(storedProblems(lying, levels).join('\n')).toMatch(/#1.*hard.*easy/);
  });

  it('reports levels that are missing, extra or regenerated (spec hash changed)', () => {
    expect(storedProblems(good, [...levels, { id: 3, specHash: 'c' }]).join('\n')).toMatch(/#3.*not in/);
    expect(storedProblems(good, levels.slice(0, 1)).join('\n')).toMatch(/#2.*no longer/);
    expect(storedProblems(good, [levels[0]!, { id: 2, specHash: 'zzz' }]).join('\n')).toMatch(/#2.*changed/);
  });

  it('bandChanges lists the levels that move band when the table changes, with from and to', () => {
    const old: DifficultyFile = { version: 0, levels: [{ id: 1, specHash: 'a', winRate: 0.8, band: 'easy' }, { id: 2, specHash: 'b', winRate: 0.7, band: 'normal' }] };
    expect(bandChanges(old)).toEqual([{ id: 1, winRate: 0.8, from: 'easy', to: 'normal' }]);
    expect(bandChanges(good)).toEqual([]);
  });
});

describe('checkDifficulty (CI)', () => {
  const lvl = (id: number, patch: Partial<DifficultyInput> = {}): DifficultyInput => ({
    id, stage: Math.ceil(id / LEVELS_PER_STAGE), boss: id % LEVELS_PER_STAGE === 0, winRate: 0.75, beltCapacity: 3, slots: 3, ...patch,
  });
  const stage = (patch: (i: number) => Partial<DifficultyInput> = () => ({})) =>
    Array.from({ length: LEVELS_PER_STAGE }, (_, i) => lvl(i + 1, patch(i)));
  const kinds = (levels: DifficultyInput[], severity?: string) =>
    checkDifficulty(levels).filter((n) => !severity || n.severity === severity).map((n) => `${n.kind} ${n.key}`);

  it('is silent for a clean stage', () => {
    expect(checkDifficulty(stage())).toEqual([]);
  });

  it('errors when the computed label contradicts the declared override', () => {
    const notes = checkDifficulty([lvl(1, { winRate: 0.75, declared: { band: 'hard', why: 'long to read' } })]);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ severity: 'error', kind: 'override', key: '#1' });
    expect(notes[0]!.message).toMatch(/hard.*normal/);
  });

  it('accepts an override equal to the computed label (the declaration documents it)', () => {
    expect(checkDifficulty([lvl(1, { winRate: 0.75, declared: { band: 'normal', why: 'x' } })])).toEqual([]);
  });

  it('errors on an override without a reason', () => {
    expect(kinds([lvl(1, { declared: { band: 'normal', why: '  ' } })], 'error')).toEqual(['override #1']);
  });

  it('informs about levels within 3 points of a threshold, on both sides, never as an error', () => {
    const notes = checkDifficulty([lvl(1, { winRate: 0.86 }), lvl(2, { winRate: 0.64 }), lvl(3, { winRate: 0.75 })]);
    expect(notes.map((n) => [n.kind, n.key, n.severity])).toEqual([['near', '#1', 'info'], ['near', '#2', 'info']]);
  });

  it('informs about a spec band that crosses a threshold, unless the level declares its label', () => {
    const crossing = lvl(1, { specBand: [0.8, 0.9] });
    expect(checkDifficulty([crossing])).toEqual([expect.objectContaining({ kind: 'spec-crossing', key: '#1', severity: 'info' })]);
    expect(checkDifficulty([{ ...crossing, declared: { band: 'normal', why: 'x' } }])).toEqual([]);
    expect(checkDifficulty([lvl(1, { specBand: [0.7, 0.8] })])).toEqual([]);
  });

  it('informs when the boss of a complete stage has more belt or more slots than the stage before it (rest level aside)', () => {
    const generous = stage((i) => (i === 9 ? { beltCapacity: 5 } : i === 0 ? { beltCapacity: 9 } : {}));
    expect(kinds(generous)).toEqual(['generous s1']);
    const moreSlots = stage((i) => (i === 9 ? { slots: 4 } : {}));
    expect(kinds(moreSlots)).toEqual(['generous s1']);
    expect(kinds(stage((i) => (i === 9 ? { beltCapacity: 2, slots: 2 } : {})))).toEqual([]);
  });

  it('does not judge an incomplete stage for generosity', () => {
    const partial = stage((i) => (i === 9 ? { beltCapacity: 5 } : {})).slice(0, 9);
    expect(kinds(partial)).toEqual([]);
  });

  it('reports level and stage notes in a stable order', () => {
    const levels = stage((i) => (i === 9 ? { beltCapacity: 5, winRate: 0.86 } : {}));
    expect(checkDifficulty(levels).map((n) => n.key)).toEqual(['#10', 's1']);
  });
});

describe('the shipped difficulty file (src/levels/difficulty.json)', () => {
  it('carries the version of the table and one entry per level, in order', () => {
    expect(stored.version).toBe(DIFFICULTY.version);
    expect(stored.levels.map((l) => l.id)).toEqual(defs.map((d) => d.id));
  });

  it('matches levels.json by spec hash and is internally consistent', () => {
    const current = defs.map((d) => ({ id: d.id, specHash: d.specHash! }));
    expect(storedProblems(stored, current)).toEqual([]);
  });

  it('stores exactly the win rate every tool reports (levelWinRate), so labels never silently move', () => {
    const wrong = defs.filter((d, i) => stored.levels[i]!.winRate !== Number(levelWinRate(parseLevel(d)).toFixed(3)));
    expect(wrong.map((d) => d.id)).toEqual([]);
  }, SLOW);

  it('has no band change pending against the current table', () => {
    expect(bandChanges(stored)).toEqual([]);
  });
});

describe('belt and slots weigh in on the measured win rate (#75, report §8)', () => {
  // A spread of real levels; 600 playouts with the level id as seed keep the run deterministic and the noise under the tolerance.
  const sample = [10, 35, 60, 100, 130, 170, 200, 235].map((id) => parseLevel(defs.find((d) => d.id === id)!));
  const PLAYOUTS = 600;
  const win = (l: (typeof sample)[number]) => randomWinRate(l, PLAYOUTS, createRng(l.id));
  const tol = CURVE.tolerance;

  it('a lower belt or fewer slots never make a level easier, more of either never make it harder', () => {
    for (const l of sample) {
      const base = win(l);
      if (l.beltCapacity > 1) expect(win({ ...l, beltCapacity: l.beltCapacity - 1 }), `belt -1 on #${l.id}`).toBeLessThanOrEqual(base + tol);
      if (l.slots > 1) expect(win({ ...l, slots: l.slots - 1 }), `slots -1 on #${l.id}`).toBeLessThanOrEqual(base + tol);
      expect(win({ ...l, beltCapacity: l.beltCapacity + 1 }), `belt +1 on #${l.id}`).toBeGreaterThanOrEqual(base - tol);
      expect(win({ ...l, slots: l.slots + 1 }), `slots +1 on #${l.id}`).toBeGreaterThanOrEqual(base - tol);
    }
  }, SLOW);

  it('changing only the belt, or only the slots, can change the assigned band', () => {
    const bandAfter = (patch: (l: (typeof sample)[number]) => Partial<(typeof sample)[number]>) =>
      sample.map((l) => bandOf(win({ ...l, ...patch(l) })));
    const base = sample.map((l) => bandOf(win(l)));
    expect(bandAfter((l) => ({ beltCapacity: 1 + 0 * l.id }))).not.toEqual(base);
    expect(bandAfter((l) => ({ slots: 1 + 0 * l.id }))).not.toEqual(base);
  }, SLOW);

  it('both reduced together are never easier than either alone', () => {
    for (const l of sample) {
      if (l.beltCapacity < 2 || l.slots < 2) continue;
      const both = win({ ...l, beltCapacity: l.beltCapacity - 1, slots: l.slots - 1 });
      expect(both, `#${l.id}`).toBeLessThanOrEqual(win({ ...l, beltCapacity: l.beltCapacity - 1 }) + tol);
      expect(both, `#${l.id}`).toBeLessThanOrEqual(win({ ...l, slots: l.slots - 1 }) + tol);
    }
  }, SLOW);

  it('is deterministic: the same level measured twice gives the same win rate and label', () => {
    const l = sample[0]!;
    expect(win(l)).toBe(win(l));
    expect(levelWinRate(l)).toBe(levelWinRate(l));
  });
});
