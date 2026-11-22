import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import { BROWN, isPrimary } from '../src/core/colors';
import { CURVE, checkCurve, curveLevel } from '../src/core/curve';
import { noveltyGaps, novelties } from '../src/core/curveReport';
import { LEVEL_NAME_KEYS, STAGE_NAME_KEYS, translate } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { levelWinRate } from '../src/core/solver';
import { isUniverseUnlocked, openUniverse, universeOfStage } from '../src/core/universes';
import stage from '../scripts/stages/stage-32';

/** Stage 32 "Barriera corallina" (#237): second stage of universe 4 "Mare e cielo", films and brown, no new mechanic. */
const all = levels as LevelDef[];
const defs = all.filter((d) => d.stage === 32);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const films = (l: ReturnType<typeof parseLevel>) => l.film.filter((f) => f !== 0).length;
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));

describe('stage 32 "Barriera corallina"', () => {
  it('belongs to universe 4 and is complete', () => {
    expect(universeOfStage(32)).toBe(4);
    expect(stage.complete).toBe(true);
    expect(stage.levels).toHaveLength(10);
  });

  it('has IT/EN names for the stage and every level', () => {
    expect(STAGE_NAME_KEYS.has(stage.key)).toBe(true);
    for (const lang of ['en', 'it'] as const) {
      expect(translate(lang, `stage.${stage.key}`)).not.toBe(`stage.${stage.key}`);
      for (const l of stage.levels) {
        expect(LEVEL_NAME_KEYS.has(l.name)).toBe(true);
        expect(translate(lang, `level.${l.name}`)).not.toBe(`level.${l.name}`);
      }
    }
    expect(translate('it', 'stage.reef')).toBe('Barriera corallina');
    expect(translate('en', 'stage.reef')).toBe('Coral reef');
  });

  it('ships as levels 311–320, the boss last and the largest picture, never over 14×14', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 311 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(14);
    const pixels = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(pixels[9]).toBe(Math.max(...pixels));
  });

  it('puts films in every level, draws brown, and adds no other mechanic', () => {
    for (const l of parsed) {
      expect(films(l)).toBeGreaterThan(0);
      expect(l.keys.some(Boolean) || l.locked.some(Boolean) || l.ice.some((n) => n > 0) || l.hidden.some(Boolean) || l.stone.some(Boolean)).toBe(false);
    }
    expect(parsed.filter((l) => l.targets.includes(BROWN)).length).toBeGreaterThanOrEqual(5);
  });

  it('keeps at least 30% secondary or brown pixels after the rest level', () => {
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

  it('follows the saw-tooth (#88): no very easy level, 319 is hard, the boss is the hardest and above the floor', () => {
    const r = winRates();
    expect(r.every((w) => w < CURVE.veryEasy)).toBe(true);
    expect(checkCurve(parsed.map((l, i) => curveLevel(l, r[i]!))).filter((v) => v.severity === 'error')).toEqual([]);
    expect(r[9]).toBe(Math.min(...r));
    expect(r[9]).toBeGreaterThanOrEqual(CURVE.universes[3]!.hardestBoss);
  }, 60_000);

  it('averages about 66% random wins, a little harder than stage 31 and easier than the end of universe 3', () => {
    const m = mean(winRates());
    expect(Math.abs(m - 0.66)).toBeLessThanOrEqual(0.04);
    expect(m).toBeLessThan(mean(inStage(31).map(levelWinRate)));
    expect(m).toBeGreaterThan(mean(inStage(30).map(levelWinRate)));
  }, 60_000);
});

describe('novelty windows (#157, epic #87)', () => {
  it('counts the film debut at 301, so the 301–320 window is not a gap', () => {
    const curve = all.map((d) => curveLevel(parseLevel(d), 0.5));
    expect(novelties(curve).find((n) => n.name === 'film')).toMatchObject({ id: 301, kind: 'mechanic' });
    expect(noveltyGaps(curve, 301, 320)).toEqual([]);
  });
});

describe('stage 32 unlock', () => {
  const completedTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  it('follows the stage 31 boss: level 311 is the first of stage 32 and the open universe stays 4', () => {
    expect(all.find((d) => d.id === 310)).toMatchObject({ stage: 31, boss: true });
    expect(all.find((d) => d.id === 311)).toMatchObject({ stage: 32 });
    expect(isUniverseUnlocked(all, completedTo(300), 4)).toBe(true);
    expect(openUniverse(all, completedTo(310))).toBe(4);
  });
});
