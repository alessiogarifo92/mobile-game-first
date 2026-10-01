import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import { LEVEL_NAME_KEYS } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { createRng } from '../src/core/rng';
import { randomWinRate, solve } from '../src/core/solver';

const defs = levels as LevelDef[];

describe('shipped levels', () => {
  it('has sequential ids, a stage on every level and a boss at the 10th of each stage', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: defs.length }, (_, i) => i + 1));
    for (const d of defs) {
      expect(d.stage).toBe(Math.ceil(d.id / 10));
      expect(!!d.boss).toBe(d.id % 10 === 0);
      expect(LEVEL_NAME_KEYS.has(d.name)).toBe(true);
      expect(d.specHash).toMatch(/^[0-9a-f]{8}$/);
    }
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
