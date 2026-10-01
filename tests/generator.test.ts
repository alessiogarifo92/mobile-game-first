import { describe, expect, it } from 'vitest';
import { generateLevel, splitAmmo } from '../src/core/generator';
import { parseLevel } from '../src/core/level';
import { createRng, shuffle } from '../src/core/rng';
import { solve } from '../src/core/solver';

describe('rng', () => {
  it('is reproducible and in [0,1)', () => {
    const a = createRng(42), b = createRng(42);
    const xs = Array.from({ length: 50 }, () => a());
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('shuffle keeps every item and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input, createRng(1));
    expect(out.slice().sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('splitAmmo', () => {
  it('splits needs into chunks and folds tiny remainders', () => {
    expect(splitAmmo({ 1: 25, 2: 13, 4: 0 }, 10)).toEqual([
      { color: 1, ammo: 10 }, { color: 1, ammo: 10 }, { color: 1, ammo: 5 },
      { color: 2, ammo: 13 },
    ]);
  });

  it('rejects an invalid chunk size', () => {
    expect(() => splitAmmo({ 1: 1, 2: 0, 4: 0 }, 0)).toThrow('ammoChunk');
  });
});

describe('generateLevel', () => {
  const opts = { id: 1, name: 'test', image: ['ROY', 'GBP', 'YOR'], columns: 2, ammoChunk: 2, slots: 3, beltCapacity: 3, seed: 7 };

  it('produces a valid, solvable level', () => {
    const { def } = generateLevel(opts);
    const level = parseLevel(def);
    expect(solve(level).solvable).toBe(true);
    expect(def.columns).toHaveLength(2);
  });

  it('is deterministic for the same seed', () => {
    expect(generateLevel(opts)).toEqual(generateLevel(opts));
  });

  it('throws when no deal is solvable', () => {
    expect(() => generateLevel({ ...opts, attempts: 0 })).toThrow('no solvable deal');
  });

  it('honours the difficulty band and rejects deals outside it', () => {
    const { winRate } = generateLevel({ ...opts, winRate: [0, 1] });
    expect(winRate).toBeGreaterThanOrEqual(0);
    expect(() => generateLevel({ ...opts, attempts: 5, winRate: [1.1, 2] })).toThrow('no solvable deal');
  });
});
