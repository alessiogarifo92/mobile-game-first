import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import { BROWN, isPrimary } from '../src/core/colors';
import { CURVE, checkCurve, curveLevel } from '../src/core/curve';
import { comboOf, novelties, noveltyGaps } from '../src/core/curveReport';
import { LEVEL_NAME_KEYS, STAGE_NAME_KEYS, translate } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { levelWinRate } from '../src/core/solver';
import { universeOfStage } from '../src/core/universes';
import stage from '../scripts/stages/stage-30';

/** Stage 30 "Luna park" (#208): every mechanic together, the last stage of universe 3 "Viaggio"; the boss closes the universe. */
const all = levels as LevelDef[];
const defs = all.filter((d) => d.stage === 30);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));

describe('stage 30 "Luna park"', () => {
  it('is complete, in universe 3, with IT/EN names for the stage and every level', () => {
    expect(universeOfStage(30)).toBe(3);
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
    expect(translate('it', 'stage.lunapark')).toBe('Luna park');
    expect(translate('en', 'stage.lunapark')).toBe('Funfair');
    expect(translate('it', 'level.ferriswheel')).toBe('La ruota panoramica');
  });

  it('ships as levels 291–300, the boss last and the largest picture, never over 14×14', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 291 + i));
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

  it('uses every mechanic together from level 292: the combination first seen at 282 fills the 281–300 novelty window (#157)', () => {
    const ALL = 'ice+hidden+brown+stone+lock+covered';
    const curve = all.map((d) => curveLevel(parseLevel(d), 0.5));
    // The rest level (291) keeps to a known combination; the full one debuted at 282 (stage 29) and never before.
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

  it('draws brown in every picture', () => {
    for (const l of parsed) expect(l.targets.includes(BROWN)).toBe(true);
  });

  it('keeps ≥ 30% of the pixels secondary or brown after the rest level', () => {
    for (const l of parsed.slice(1)) {
      const pixels = l.targets.filter((t) => t !== 0);
      expect(pixels.filter((t) => !isPrimary(t) || t === BROWN).length / pixels.length).toBeGreaterThanOrEqual(CURVE.minSecondaryShare);
    }
  });

  it('gives only the boss a low belt: belt 1 and never slot 1; nothing beats the end of universe 2', () => {
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

  it('averages about 56% random wins: the end-of-universe target, under stage 29', () => {
    const m = mean(winRates());
    expect(Math.abs(m - CURVE.universes[2]!.endMean)).toBeLessThanOrEqual(0.03);
    expect(m).toBeLessThan(mean(inStage(29).map(levelWinRate)));
    expect(m).toBeGreaterThan(CURVE.universes[2]!.endMean - CURVE.endMeanTolerance);
  }, 60_000);
});
