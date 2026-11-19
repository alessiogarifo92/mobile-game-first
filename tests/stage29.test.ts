import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import { BROWN, isPrimary } from '../src/core/colors';
import { CURVE, checkCurve, curveLevel } from '../src/core/curve';
import { comboOf, novelties, noveltyGaps } from '../src/core/curveReport';
import { LEVEL_NAME_KEYS, STAGE_NAME_KEYS, translate } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { levelWinRate } from '../src/core/solver';
import { universeOfStage } from '../src/core/universes';
import stage from '../scripts/stages/stage-29';

/** Stage 29 "Aeroporto" (#207): every mechanic together, in universe 3 "Viaggio"; the boss is the first with belt 1. */
const all = levels as LevelDef[];
const defs = all.filter((d) => d.stage === 29);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));

describe('stage 29 "Aeroporto"', () => {
  it('is complete, in universe 3, with IT/EN names for the stage and every level', () => {
    expect(universeOfStage(29)).toBe(3);
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
    expect(translate('it', 'stage.airport')).toBe('Aeroporto');
    expect(translate('en', 'stage.airport')).toBe('Airport');
    expect(translate('it', 'level.terminal')).toBe('Il terminal');
  });

  it('ships as levels 281–290, the boss last and the largest picture, never over 14×14', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 281 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(14);
    const pixels = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(pixels[9]).toBe(Math.max(...pixels));
  });

  it('puts keys, locks, stones and covered buckets in every level', () => {
    for (const l of parsed) {
      expect(l.keys.some(Boolean)).toBe(true);
      expect(l.locked.some(Boolean)).toBe(true);
      expect(l.stone.some(Boolean)).toBe(true);
      expect(l.columns.flat().some((s) => s.covered)).toBe(true);
    }
  });

  it('uses every mechanic together from level 282: the new combination of the 281–300 novelty window (#157)', () => {
    const ALL = 'ice+hidden+brown+stone+lock+covered';
    const curve = all.map((d) => curveLevel(parseLevel(d), 0.5));
    // The rest level (281) keeps to a known combination; no earlier level combines all six mechanics.
    expect(comboOf(curveLevel(parsed[0]!, 0.5))).toBe('brown+stone+lock+covered');
    expect(curve.filter((l) => comboOf(l) === ALL && l.id < 281)).toEqual([]);
    expect(novelties(curve).find((n) => n.name === ALL)?.id).toBe(282);
    for (const l of parsed.slice(1)) {
      expect(l.ice.some((n) => n > 0)).toBe(true);
      expect(l.hidden.some(Boolean)).toBe(true);
      expect(curveLevel(l, 0.5).features).toEqual(expect.arrayContaining(['ice', 'hidden', 'stone', 'lock', 'covered']));
    }
    expect(noveltyGaps(curve, 261, 280)).toEqual([]);
    expect(noveltyGaps(curve, 281, 300)).toEqual([]);
  });

  it('draws brown in every picture but the propeller plane (287)', () => {
    for (const l of parsed) expect(l.targets.includes(BROWN)).toBe(l.id !== 287);
  });

  it('keeps ≥ 30% of the pixels secondary or brown after the rest level', () => {
    for (const l of parsed.slice(1)) {
      const pixels = l.targets.filter((t) => t !== 0);
      expect(pixels.filter((t) => !isPrimary(t) || t === BROWN).length / pixels.length).toBeGreaterThanOrEqual(CURVE.minSecondaryShare);
    }
  });

  it('gives only the boss a low belt: belt 1 and never slot 1; the rest never beat the end of universe 2', () => {
    const end = inStage(20);
    expect(parsed.map((l) => l.beltCapacity)).toEqual([...Array(9).fill(2), 1]);
    for (const l of parsed) {
      expect(l.slots).toBeGreaterThanOrEqual(CURVE.minSlots);
      expect(l.beltCapacity).toBeLessThanOrEqual(Math.max(...end.map((e) => e.beltCapacity)));
      expect(l.slots).toBeLessThanOrEqual(Math.max(...end.map((e) => e.slots)));
    }
    expect(parsed[9]!.slots).toBeLessThanOrEqual(3);
  });

  it('follows the saw-tooth (#88): no level is very easy, the boss is the hardest and above the floor', () => {
    const r = winRates();
    expect(r.every((w) => w < CURVE.veryEasy)).toBe(true);
    expect(checkCurve(parsed.map((l, i) => curveLevel(l, r[i]!))).filter((v) => v.severity === 'error')).toEqual([]);
    expect(r[9]).toBe(Math.min(...r));
    expect(r[9]).toBeGreaterThanOrEqual(CURVE.universes[2]!.hardestBoss);
  }, 60_000);

  it('averages about 58–59% random wins: under stage 28, still above the end-of-universe target', () => {
    const m = mean(winRates());
    expect(Math.abs(m - 0.585)).toBeLessThanOrEqual(0.03);
    expect(m).toBeLessThan(mean(inStage(28).map(levelWinRate)));
    expect(m).toBeGreaterThan(CURVE.universes[2]!.endMean);
  }, 60_000);
});
