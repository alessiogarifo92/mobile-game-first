import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import { CURVE, checkCurve, curveLevel } from '../src/core/curve';
import { translate } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { levelWinRate } from '../src/core/solver';

/** Stage 12 "Montagna" (#122): brown + ice, no new mechanic, the saw-tooth of #88 and the limits of the ticket. */
const defs = levels as LevelDef[];
const stage = defs.filter((d) => d.stage === 12);
const parsed = stage.map(parseLevel);
const curve = parsed.map((l) => curveLevel(l, levelWinRate(l)));

describe('stage 12 — Montagna', () => {
  it('has levels 111–120, the summit as its boss', () => {
    expect(stage.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 111 + i));
    expect(stage.filter((d) => d.boss).map((d) => d.name)).toEqual(['summit']);
  });

  it('names the stage and every level in Italian and English', () => {
    expect(translate('it', 'stage.mountain')).toBe('Montagna');
    expect(translate('en', 'stage.mountain')).toBe('Mountain');
    for (const d of stage) {
      for (const lang of ['it', 'en']) expect(translate(lang, `level.${d.name}`)).not.toBe(`level.${d.name}`);
    }
  });

  it('plays brown and ice on every level, no other mechanic', () => {
    for (const c of curve) expect([...c.features].sort()).toEqual(['brown', 'ice', 'mix']);
  });

  it('keeps canvas, belt and slots inside the ticket: at most 14×14, the boss biggest, never above the end of universe 1', () => {
    const endOfU1 = defs.filter((d) => d.stage === 10);
    const maxBelt = Math.max(...endOfU1.map((d) => d.beltCapacity));
    const maxSlots = Math.max(...endOfU1.map((d) => d.slots));
    const area = (i: number) => parsed[i]!.width * parsed[i]!.height;
    for (const [i, l] of parsed.entries()) {
      expect(l.width).toBeLessThanOrEqual(14);
      expect(l.height).toBeLessThanOrEqual(14);
      expect(l.beltCapacity).toBeLessThanOrEqual(maxBelt);
      expect(l.slots).toBeLessThanOrEqual(maxSlots);
      if (i < 9) expect(area(i)).toBeLessThan(area(9));
    }
  });

  it('is never very easy, has ≥ 30% mixed pixels after the rest level, and passes the stage rules of the curve', () => {
    expect(curve.filter((c) => c.winRate >= CURVE.veryEasy).map((c) => c.id)).toEqual([]);
    expect(curve.slice(1).filter((c) => c.secondaryShare < CURVE.minSecondaryShare).map((c) => c.id)).toEqual([]);
    // Rule 1 needs the levels before; rules 2, 6, 7 and 8 are judged on the stage alone.
    expect(checkCurve(curve).filter((v) => v.rule !== 1)).toEqual([]);
  }, 30_000);
});
