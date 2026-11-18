import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import { BROWN, isPrimary } from '../src/core/colors';
import { CURVE, checkCurve, curveLevel } from '../src/core/curve';
import { LEVEL_NAME_KEYS, STAGE_NAME_KEYS, translate } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { tipOnLevelStart } from '../src/core/onboarding';
import { levelWinRate } from '../src/core/solver';
import { universeOfStage } from '../src/core/universes';
import stage from '../scripts/stages/stage-25';

/** Stage 25 "Musica" (#203): covered buckets debut at 241 and meet locks and keys in universe 3 "Viaggio". */
const all = levels as LevelDef[];
const defs = all.filter((d) => d.stage === 25);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const covers = (l: { columns: { covered?: boolean }[][] }) => l.columns.flat().filter((s) => s.covered).length;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const SEEN = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone', 'queue', 'leftover', 'lock'];
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));

describe('stage 25 "Musica"', () => {
  it('is complete, in universe 3, with IT/EN names for the stage and every level', () => {
    expect(universeOfStage(25)).toBe(3);
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
    expect(translate('it', 'stage.music')).toBe('Musica');
    expect(translate('en', 'stage.music')).toBe('Music');
  });

  it('ships as levels 241–250, the boss last and the largest picture, never over 14×14', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 241 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(14);
    const pixels = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(pixels[9]).toBe(Math.max(...pixels));
  });

  it('debuts covered buckets at 241: none before, some in every level of the stage, the covered tip shows', () => {
    for (const l of all.filter((d) => d.id < 241).map((d) => parseLevel(d))) expect(covers(l)).toBe(0);
    for (const l of parsed) {
      expect(covers(l)).toBeGreaterThan(0);
      // The front bucket of a column is always in view.
      for (const column of l.columns) expect(column[0]!.covered).toBeFalsy();
    }
    expect(curveLevel(parsed[0]!, 1).features).toContain('covered');
    expect(tipOnLevelStart(parsed[0]!, SEEN)).toBe('covered');
  });

  it('puts keys and locks in every level after the debut, and no ice, hidden pixels or stones', () => {
    expect(parsed[0]!.locked.some(Boolean)).toBe(false);
    for (const l of parsed.slice(1)) {
      expect(l.keys.some(Boolean)).toBe(true);
      expect(l.locked.some(Boolean)).toBe(true);
    }
    for (const l of parsed) {
      expect(l.ice.some((n) => n > 0)).toBe(false);
      expect(l.hidden.some(Boolean)).toBe(false);
      expect(l.stone.some(Boolean)).toBe(false);
    }
  });

  it('keeps ≥ 30% of the pixels secondary or brown after the rest level', () => {
    for (const l of parsed.slice(1)) {
      const pixels = l.targets.filter((t) => t !== 0);
      expect(pixels.filter((t) => !isPrimary(t) || t === BROWN).length / pixels.length).toBeGreaterThanOrEqual(CURVE.minSecondaryShare);
    }
  });

  it('never gives back a bigger belt or more slots than the end of universe 2 (3 slots only at the debut)', () => {
    const end = inStage(20);
    for (const l of parsed) {
      expect(l.beltCapacity).toBeLessThanOrEqual(Math.max(...end.map((e) => e.beltCapacity)));
      expect(l.slots).toBeLessThanOrEqual(Math.max(...end.map((e) => e.slots)));
    }
    for (const l of parsed.slice(1)) expect(l.slots).toBeLessThanOrEqual(2);
  });

  it('follows the saw-tooth (#88): only the debut is very easy, 249 is hard, the boss is the hardest and above the floor', () => {
    const r = winRates();
    expect(r[0]).toBeGreaterThanOrEqual(CURVE.veryEasy);
    expect(r.slice(1).every((w) => w < CURVE.veryEasy)).toBe(true);
    expect(checkCurve(parsed.map((l, i) => curveLevel(l, r[i]!))).filter((v) => v.severity === 'error' && v.rule !== 1)).toEqual([]);
    expect(r[9]).toBe(Math.min(...r));
    expect(r[9]).toBeGreaterThanOrEqual(CURVE.universes[2]!.hardestBoss);
  }, 60_000);

  it('averages about 65% random wins: under stage 24 and stage 23, the descent toward the end-of-universe target', () => {
    const m = mean(winRates());
    expect(Math.abs(m - 0.65)).toBeLessThanOrEqual(0.03);
    expect(m).toBeLessThan(mean(inStage(24).map(levelWinRate)));
    expect(m).toBeLessThan(mean(inStage(23).map(levelWinRate)));
    expect(m).toBeGreaterThan(CURVE.universes[2]!.endMean);
    expect(winRates()[9]).toBeLessThan(levelWinRate(inStage(24)[9]!));
  }, 60_000);
});
