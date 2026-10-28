import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import stages from '../src/levels/stages.json';
import { LEVEL_NAME_KEYS } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { createGame, launchFromColumn, launchFromSlot, step } from '../src/core/sim';
import { levelWinRate, solve } from '../src/core/solver';
import { LEVELS_PER_STAGE, assignIds, stageInfos } from '../src/core/stages';
import { CURVE, checkCurve, curveLevel, universeOf } from '../src/core/curve';
import { STAGE_SPECS } from '../scripts/stages';
import { KNOWN_CURVE_ERRORS } from '../scripts/stages/curve-known';

const defs = levels as LevelDef[];

describe('shipped levels', () => {
  it('has sequential ids, a stage on every level and a boss closing each full stage', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: defs.length }, (_, i) => i + 1));
    expect(stages).toEqual(stageInfos(STAGE_SPECS));
    expect(new Set(defs.map((d) => d.stage)).size).toBe(stages.length);
    for (const d of defs) {
      // Only the last stage may be partial, so ids follow from the stage size.
      expect(d.stage).toBe(Math.ceil(d.id / LEVELS_PER_STAGE));
      expect(!!d.boss).toBe(d.id % LEVELS_PER_STAGE === 0);
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

  // Heavy (random playouts over every level, computed once): explicit timeouts so a slower CI runner does not fail.
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

  it('gets harder in universe 1: the introduction is easiest, then stages 3–5, 6–8 and 9–10 get harder in turn', () => {
    const avg = (from: number, to: number) => {
      const r = winRates().filter((_, i) => defs[i]!.stage >= from && defs[i]!.stage <= to);
      return r.reduce((a, b) => a + b, 0) / r.length;
    };
    expect(avg(3, 10)).toBeLessThan(avg(1, 2) - 0.1);
    expect(avg(6, 8)).toBeLessThan(avg(3, 5) - 0.05);
    expect(avg(9, 10)).toBeLessThan(avg(6, 8) - 0.05);
  }, 60_000);

  it('follows the curve rules (#88): errors are exactly the known ones that #89 still has to fix', () => {
    const curve = checkCurve(defs.map((d, i) => curveLevel(parseLevel(d), winRates()[i]!, !!specs[i]!.curve?.easyBoss)));
    const errors = curve.filter((v) => v.severity === 'error').map((v) => v.key);
    expect(errors.filter((k) => !KNOWN_CURVE_ERRORS.includes(k))).toEqual([]);
    expect(KNOWN_CURVE_ERRORS.filter((k) => !errors.includes(k))).toEqual([]);
    // Known errors are only rules 1–2 inside universe 1: the universe targets (rules 3–5) and the extremes (rule 8) already hold.
    expect(errors.filter((k) => !/^r[12] /.test(k))).toEqual([]);
  }, 60_000);

  it('universe 1 is very easy only in the intro and on the first level of each stage (#89)', () => {
    const veryEasy = defs.filter((_, i) => winRates()[i]! >= CURVE.veryEasy).map((d) => d.id);
    const allowed = (id: number) => id <= CURVE.introLevels || id % 10 === 1;
    expect(veryEasy.filter((id) => !allowed(id))).toEqual([]);
    expect(veryEasy.filter((id) => universeOf(Math.ceil(id / 10)) === 1).length).toBeLessThanOrEqual(17);
  }, 60_000);

  it('keeps every band past the intro below "very easy", so a regeneration cannot bring one back (#89)', () => {
    const open = specs.filter((s) => s.id > CURVE.introLevels && s.id % 10 !== 1 && (!s.winRate || s.winRate[1] >= CURVE.veryEasy));
    expect(open.map((s) => `#${s.id} ${s.name}`)).toEqual([]);
  });

  it('never gives a bigger belt back: the largest belt of a stage never grows from one stage to the next', () => {
    const maxBelt = stages.map((s) => Math.max(...defs.filter((d) => d.stage === s.id).map((d) => d.beltCapacity)));
    for (let s = 1; s < maxBelt.length; s++) expect(maxBelt[s]!).toBeLessThanOrEqual(maxBelt[s - 1]!);
    expect(maxBelt.slice(7, 10)).toEqual([2, 2, 2]);
  });
});
