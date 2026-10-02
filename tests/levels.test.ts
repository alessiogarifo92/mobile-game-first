import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import { LEVEL_NAME_KEYS } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { createGame, launchFromColumn, launchFromSlot, step } from '../src/core/sim';
import { levelWinRate, solve } from '../src/core/solver';
import { assignIds } from '../src/core/stages';
import { STAGE_SPECS } from '../scripts/stages';

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

  it.each(defs.map((d) => [d.id, d.name, d] as const))('level %i (%s) is solvable and its solution wins in the game', (_id, _name, def) => {
    const level = parseLevel(def);
    const result = solve(level);
    expect(result).toMatchObject({ solvable: true, exhaustive: true });
    // Replay the solution in the real simulation, one shooter at a time.
    const g = createGame(level);
    for (const m of result.moves) {
      expect(m.from === 'column' ? launchFromColumn(g, m.index) : launchFromSlot(g, m.index)).toBe(true);
      do step(g); while ((g.belt.length || g.pending.length) && g.status === 'playing');
    }
    expect(g.status).toBe('won');
  });

  // Heavy (random playouts over 100 levels, computed once): explicit timeouts so a slower CI runner does not fail.
  const specs = assignIds(STAGE_SPECS);
  let rates: number[] | undefined;
  const winRates = () => (rates ??= defs.map((d) => levelWinRate(parseLevel(d))));

  it('every level sits in the difficulty band of its spec, measured with belt and slots', () => {
    const out = defs.filter((_, i) => {
      const band = specs[i]!.winRate;
      return band && (winRates()[i]! < band[0] || winRates()[i]! > band[1]);
    });
    expect(out.map((d) => `#${d.id} ${d.name}`)).toEqual([]);
  }, 60_000);

  it('gets harder: the introduction is easiest, then stages 3–5, 6–8 and 9–10 get harder in turn', () => {
    const avg = (from: number, to: number) => {
      const r = winRates().filter((_, i) => defs[i]!.stage >= from && defs[i]!.stage <= to);
      return r.reduce((a, b) => a + b, 0) / r.length;
    };
    expect(avg(3, 10)).toBeLessThan(avg(1, 2) - 0.1);
    expect(avg(6, 8)).toBeLessThan(avg(3, 5) - 0.05);
    expect(avg(9, 10)).toBeLessThan(avg(6, 8) - 0.05);
  }, 60_000);

  it('never gives a bigger belt back: the largest belt of a stage never grows from one stage to the next', () => {
    const maxBelt = Array.from({ length: 10 }, (_, s) => Math.max(...defs.filter((d) => d.stage === s + 1).map((d) => d.beltCapacity)));
    for (let s = 1; s < maxBelt.length; s++) expect(maxBelt[s]!).toBeLessThanOrEqual(maxBelt[s - 1]!);
    expect(maxBelt.slice(7)).toEqual([2, 2, 2]);
  });
});
