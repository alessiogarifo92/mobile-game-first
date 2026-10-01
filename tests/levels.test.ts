import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import { parseLevel, type LevelDef } from '../src/core/level';
import { createRng } from '../src/core/rng';
import { randomWinRate, solve } from '../src/core/solver';

const defs = levels as LevelDef[];

describe('shipped levels', () => {
  it('has 15 levels with sequential ids', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
  });

  it.each(defs.map((d) => [d.id, d.name, d] as const))('level %i (%s) is valid and solvable', (_id, _name, def) => {
    const result = solve(parseLevel(def));
    expect(result).toMatchObject({ solvable: true, exhaustive: true });
  });

  it('gets harder: the last third is harder for a random tapper than the first third', () => {
    const rate = (d: LevelDef) => randomWinRate(parseLevel(d), 200, createRng(d.id));
    const avg = (ds: LevelDef[]) => ds.reduce((s, d) => s + rate(d), 0) / ds.length;
    expect(avg(defs.slice(10))).toBeLessThan(avg(defs.slice(0, 5)) - 0.2);
  });
});
