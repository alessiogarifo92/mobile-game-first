import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import { BROWN, isPrimary } from '../src/core/colors';
import { CURVE, checkCurve, curveLevel } from '../src/core/curve';
import { LEVEL_NAME_KEYS, STAGE_NAME_KEYS, translate } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { tipOnLevelStart } from '../src/core/onboarding';
import { levelWinRate } from '../src/core/solver';
import { isUniverseUnlocked, openUniverse, universeOfStage } from '../src/core/universes';
import stage from '../scripts/stages/stage-37';

/** Stage 36 "Nuvole" (#241): sixth stage of universe 4 "Mare e cielo"; the tunnel (#99, debut at 341) comes back with the known mechanics. */
const all = levels as LevelDef[];
const defs = all.filter((d) => d.stage === 37);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const films = (l: ReturnType<typeof parseLevel>) => l.film.filter((f) => f !== 0).length;
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));

describe('stage 37 "Uccelli"', () => {
  it('belongs to universe 4 and is complete', () => {
    expect(universeOfStage(37)).toBe(4);
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
    expect(translate('it', 'stage.birds')).toBe('Uccelli');
    expect(translate('en', 'stage.birds')).toBe('Birds');
  });

  it('ships as levels 361–370, the boss last and the largest picture, never over 14×14', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 361 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(14);
    const pixels = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(pixels[9]).toBe(Math.max(...pixels));
  });

  it('keeps a tunnel and films on every level (with stones or covered buckets on most), shows no card, and has no ice or hidden pixels', () => {
    const seen = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover', 'film', 'tunnel'] as const;
    for (const l of parsed) {
      expect(l.tunnels.length).toBeGreaterThan(0);
      expect(films(l)).toBeGreaterThan(0);
      expect(l.ice.some((n) => n > 0) || l.hidden.some(Boolean)).toBe(false);
      expect(tipOnLevelStart(l, [...seen])).toBeNull();
    }
    expect(parsed.filter((l) => l.targets.includes(BROWN)).length).toBeGreaterThanOrEqual(5);
    expect(parsed.filter((l) => l.stone.some(Boolean) || l.columns.some((c) => c.some((sh) => sh.covered))).length).toBeGreaterThanOrEqual(6);
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

  it('follows the saw-tooth (#88): no level is very easy, 369 is hard, the boss is the hardest and above the floor', () => {
    const r = winRates();
    expect(r.every((w) => w < CURVE.veryEasy)).toBe(true);
    expect(checkCurve(parsed.map((l, i) => curveLevel(l, r[i]!))).filter((v) => v.severity === 'error')).toEqual([]);
    expect(r[9]).toBe(Math.min(...r));
    expect(r[9]).toBeGreaterThanOrEqual(CURVE.universes[3]!.hardestBoss);
  }, 60_000);

  it('averages about 58% random wins, a little harder than stage 36 and easier than the end of universe 3', () => {
    const m = mean(winRates());
    expect(Math.abs(m - 0.58)).toBeLessThanOrEqual(0.04);
    expect(m).toBeLessThan(mean(inStage(36).map(levelWinRate)));
    expect(m).toBeGreaterThan(mean(inStage(30).map(levelWinRate)));
  }, 120_000);
});

describe('stage 37 unlock', () => {
  const completedTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  it('follows the stage 36 boss: level 361 is the first of stage 37 and the open universe stays 4', () => {
    expect(all.find((d) => d.id === 360)).toMatchObject({ stage: 36, boss: true });
    expect(all.find((d) => d.id === 361)).toMatchObject({ stage: 37 });
    expect(isUniverseUnlocked(all, completedTo(300), 4)).toBe(true);
    expect(openUniverse(all, completedTo(360))).toBe(4);
  });
});
