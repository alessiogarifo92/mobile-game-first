import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import { BROWN, isPrimary } from '../src/core/colors';
import { CURVE, checkCurve, curveLevel } from '../src/core/curve';
import { LEVEL_NAME_KEYS, STAGE_NAME_KEYS, translate } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { levelWinRate } from '../src/core/solver';
import { universeOfStage } from '../src/core/universes';
import stage from '../scripts/stages/stage-24';

/** Stage 24 "Festa" (#202): locks and keys meet ice and hidden pixels in universe 3 "Viaggio"; no debut, so nothing is very easy. */
const all = levels as LevelDef[];
const defs = all.filter((d) => d.stage === 24);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));

describe('stage 24 "Festa"', () => {
  it('is complete, in universe 3, with IT/EN names for the stage and every level', () => {
    expect(universeOfStage(24)).toBe(3);
    expect(stage.complete).toBe(true);
    expect(stage.levels).toHaveLength(10);
    expect(STAGE_NAME_KEYS.has(stage.key)).toBe(true);
    for (const lang of ['en', 'it'] as const) {
      expect(translate(lang, `stage.${stage.key}`)).not.toBe(`stage.${stage.key}`);
      for (const l of stage.levels) {
        expect(LEVEL_NAME_KEYS.has(l.name)).toBe(true);
        expect(translate(lang, `level.${l.name}`)).not.toBe(`level.${l.name}`);
      }
    }
    expect(translate('it', 'stage.party')).toBe('Festa');
    expect(translate('en', 'stage.party')).toBe('Party');
  });

  it('ships as levels 231–240, the boss last and the largest picture, never over 14×14', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 231 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(14);
    const pixels = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(pixels[9]).toBe(Math.max(...pixels));
  });

  it('puts keys, locks, ice and hidden pixels in every level, and no stones', () => {
    for (const l of parsed) {
      expect(l.keys.some(Boolean)).toBe(true);
      expect(l.locked.some(Boolean)).toBe(true);
      expect(l.ice.some((n) => n > 0)).toBe(true);
      expect(l.hidden.some(Boolean)).toBe(true);
      expect(l.stone.some(Boolean)).toBe(false);
    }
  });

  it('keeps ≥ 30% of the pixels secondary or brown after the rest level', () => {
    for (const l of parsed.slice(1)) {
      const pixels = l.targets.filter((t) => t !== 0);
      expect(pixels.filter((t) => !isPrimary(t) || t === BROWN).length / pixels.length).toBeGreaterThanOrEqual(CURVE.minSecondaryShare);
    }
  });

  it('never gives back a bigger belt or more slots than the end of universe 2', () => {
    const end = inStage(20);
    for (const l of parsed) {
      expect(l.beltCapacity).toBeLessThanOrEqual(Math.max(...end.map((e) => e.beltCapacity)));
      expect(l.slots).toBeLessThanOrEqual(Math.max(...end.map((e) => e.slots)));
    }
  });

  it('follows the saw-tooth (#88): no level is very easy, 239 is hard, the boss is the hardest and above the floor', () => {
    const r = winRates();
    expect(r.every((w) => w < CURVE.veryEasy)).toBe(true);
    expect(checkCurve(parsed.map((l, i) => curveLevel(l, r[i]!))).filter((v) => v.severity === 'error' && v.rule !== 1)).toEqual([]);
    expect(r[9]).toBe(Math.min(...r));
    expect(r[9]).toBeGreaterThanOrEqual(CURVE.universes[2]!.hardestBoss);
  }, 60_000);

  it('averages about 66% random wins: under stage 23 and stage 22, the descent toward the end-of-universe target', () => {
    const m = mean(winRates());
    expect(Math.abs(m - 0.66)).toBeLessThanOrEqual(0.03);
    expect(m).toBeLessThan(mean(inStage(23).map(levelWinRate)));
    expect(m).toBeLessThan(mean(inStage(22).map(levelWinRate)));
    expect(m).toBeGreaterThan(CURVE.universes[2]!.endMean);
    expect(winRates()[9]).toBeLessThan(levelWinRate(inStage(23)[9]!));
  }, 60_000);
});
