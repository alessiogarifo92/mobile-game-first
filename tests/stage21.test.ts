import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import universesJson from '../src/levels/universes.json';
import { BROWN, isPrimary } from '../src/core/colors';
import { CURVE, checkCurve, curveLevel } from '../src/core/curve';
import { LEVEL_NAME_KEYS, STAGE_NAME_KEYS, UNIVERSE_NAME_KEYS, translate } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { tipOnLevelStart } from '../src/core/onboarding';
import { levelWinRate } from '../src/core/solver';
import { isUniverseUnlocked, openUniverse, universeOfStage } from '../src/core/universes';
import stage from '../scripts/stages/stage-21';

/** Stage 21 "Stazione" (#199): first stage of universe 3 "Viaggio", where locks and keys debut (#96). */
const all = levels as LevelDef[];
const defs = all.filter((d) => d.stage === 21);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));

describe('universe 3 "Viaggio" and stage 21 "Stazione"', () => {
  it('adds universe 3 with IT/EN names and a 14×14 canvas limit', () => {
    const u = universesJson.find((x) => x.id === 3)!;
    expect(u).toMatchObject({ key: 'journey', maxCanvas: 14 });
    expect(UNIVERSE_NAME_KEYS.has('journey')).toBe(true);
    expect(translate('it', 'universe.journey')).toBe('Viaggio');
    expect(translate('en', 'universe.journey')).toBe('Journey');
    expect(universeOfStage(21)).toBe(3);
  });

  it('is complete, with IT/EN names for the stage and every level', () => {
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
    expect(translate('it', 'stage.station')).toBe('Stazione');
  });

  it('ships as levels 201–210, the boss last and the largest picture, never over 14×14', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 201 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(14);
    const pixels = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(pixels[9]).toBe(Math.max(...pixels));
  });

  it('puts keys and locks in every level, and no other new mechanic', () => {
    for (const l of parsed) {
      expect(l.keys.some(Boolean)).toBe(true);
      expect(l.locked.some(Boolean)).toBe(true);
      expect(l.ice.some((n) => n > 0) || l.hidden.some(Boolean) || l.stone.some(Boolean)).toBe(false);
    }
  });

  it('debuts the lock at level 201: one key, two padlocks, the lock tip shows, and no earlier level has them', () => {
    const debut = parsed[0]!;
    expect(debut.keys.filter(Boolean)).toHaveLength(1);
    expect(debut.locked.filter(Boolean)).toHaveLength(2);
    expect(tipOnLevelStart(debut, ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone', 'queue', 'leftover'])).toBe('lock');
    for (const d of all.filter((x) => x.id < 201)) {
      const l = parseLevel(d);
      expect(l.keys.some(Boolean) || l.locked.some(Boolean)).toBe(false);
    }
  });

  it('draws brown in the pictures and keeps at least 30% secondary or brown pixels after the rest level', () => {
    for (const d of defs.slice(1)) expect(d.image.some((row) => row.includes('K'))).toBe(true);
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

  it('follows the saw-tooth (#88): only the debut is very easy, 209 is hard, the boss is the hardest and above the floor', () => {
    const r = winRates();
    expect(r[0]).toBeGreaterThanOrEqual(CURVE.veryEasy);
    expect(r.slice(1).every((w) => w < CURVE.veryEasy)).toBe(true);
    expect(checkCurve(parsed.map((l, i) => curveLevel(l, r[i]!))).filter((v) => v.severity === 'error' && v.rule !== 1)).toEqual([]);
    expect(r[9]).toBe(Math.min(...r));
    expect(r[9]).toBeGreaterThanOrEqual(CURVE.universes[2]!.hardestBoss);
  }, 60_000);

  it('averages about 74% random wins, easier than the end of universe 2', () => {
    const m = mean(winRates());
    expect(Math.abs(m - 0.74)).toBeLessThanOrEqual(0.04);
    expect(m).toBeGreaterThan(mean(inStage(20).map(levelWinRate)));
  }, 60_000);
});

describe('universe 3 unlock', () => {
  const completedTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  it('stays closed until the last level of universe 2 (200) is completed, then opens on level 201', () => {
    expect(isUniverseUnlocked(all, completedTo(199), 3)).toBe(false);
    expect(openUniverse(all, completedTo(199))).toBe(2);
    expect(isUniverseUnlocked(all, completedTo(200), 3)).toBe(true);
    expect(openUniverse(all, completedTo(200))).toBe(3);
  });
});
