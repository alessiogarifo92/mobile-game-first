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
import stage from '../scripts/stages/stage-31';

/** Stage 31 "Spiaggia" (#236): first stage of universe 4 "Mare e cielo", where the coloured film debuts (#98). */
const all = levels as LevelDef[];
const defs = all.filter((d) => d.stage === 31);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const films = (l: ReturnType<typeof parseLevel>) => l.film.filter((f) => f !== 0).length;
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));

describe('universe 4 "Mare e cielo" and stage 31 "Spiaggia"', () => {
  it('adds universe 4 with IT/EN names and a 14×14 canvas limit', () => {
    const u = universesJson.find((x) => x.id === 4)!;
    expect(u).toMatchObject({ key: 'seasky', maxCanvas: 14 });
    expect(UNIVERSE_NAME_KEYS.has('seasky')).toBe(true);
    expect(translate('it', 'universe.seasky')).toBe('Mare e cielo');
    expect(translate('en', 'universe.seasky')).toBe('Sea and sky');
    expect(universeOfStage(31)).toBe(4);
  });

  it('has IT/EN names for the stage and every level', () => {
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
    expect(translate('it', 'stage.beach')).toBe('Spiaggia');
    expect(translate('en', 'stage.beach')).toBe('Beach');
  });

  it('ships as levels 301–310, the boss last and the largest picture, never over 14×14', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 301 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(14);
    const pixels = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(pixels[9]).toBe(Math.max(...pixels));
  });

  it('puts films in every level, and no other new mechanic', () => {
    for (const l of parsed) {
      expect(films(l)).toBeGreaterThan(0);
      expect(l.keys.some(Boolean) || l.locked.some(Boolean) || l.ice.some((n) => n > 0) || l.hidden.some(Boolean) || l.stone.some(Boolean)).toBe(false);
    }
  });

  it('debuts the film at level 301: two films, the film tip shows, and no earlier level has one', () => {
    const debut = parsed[0]!;
    expect(films(debut)).toBe(2);
    const others = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover'] as const;
    expect(tipOnLevelStart(debut, [...others])).toBe('film');
    expect(tipOnLevelStart(debut, [...others, 'film'])).toBeNull();
    for (const d of all.filter((x) => x.id < 301)) expect(films(parseLevel(d))).toBe(0);
  });

  it('draws brown in the pictures and keeps at least 30% secondary or brown pixels after the rest level', () => {
    for (const l of parsed.slice(1)) {
      const pixels = l.targets.filter((t) => t !== 0);
      expect(pixels.filter((t) => !isPrimary(t) || t === BROWN).length / pixels.length).toBeGreaterThanOrEqual(CURVE.minSecondaryShare);
    }
  });

  it('never gives back a bigger belt or more slots than the end of universe 3', () => {
    const end = inStage(30);
    for (const l of parsed) {
      expect(l.beltCapacity).toBeLessThanOrEqual(Math.max(...end.map((e) => e.beltCapacity)));
      expect(l.slots).toBeLessThanOrEqual(Math.max(...end.map((e) => e.slots)));
    }
  });

  it('follows the saw-tooth (#88): only the debut is very easy, 309 is hard, the boss is the hardest and above the floor', () => {
    const r = winRates();
    expect(r[0]).toBeGreaterThanOrEqual(CURVE.veryEasy);
    expect(r.slice(1).every((w) => w < CURVE.veryEasy)).toBe(true);
    expect(checkCurve(parsed.map((l, i) => curveLevel(l, r[i]!))).filter((v) => v.severity === 'error' && v.rule !== 1)).toEqual([]);
    expect(r[9]).toBe(Math.min(...r));
    expect(r[9]).toBeGreaterThanOrEqual(CURVE.universes[3]!.hardestBoss);
  }, 60_000);

  it('averages about 68% random wins, easier than the end of universe 3', () => {
    const m = mean(winRates());
    expect(Math.abs(m - 0.68)).toBeLessThanOrEqual(0.04);
    expect(m).toBeGreaterThan(mean(inStage(30).map(levelWinRate)));
  }, 60_000);
});

describe('universe 4 unlock', () => {
  const completedTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  it('stays closed until the last level of universe 3 (300) is completed, then opens on level 301', () => {
    expect(isUniverseUnlocked(all, completedTo(299), 4)).toBe(false);
    expect(openUniverse(all, completedTo(299))).toBe(3);
    expect(isUniverseUnlocked(all, completedTo(300), 4)).toBe(true);
    expect(openUniverse(all, completedTo(300))).toBe(4);
  });
});
