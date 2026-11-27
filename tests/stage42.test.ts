import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import difficulty from '../src/levels/difficulty.json';
import universesJson from '../src/levels/universes.json';
import { stageSkin } from '../src/core/album';
import { BROWN, isPrimary } from '../src/core/colors';
import { CURVE, checkCurve, curveLevel } from '../src/core/curve';
import { MECHANICS, comboOf, noveltyGaps, novelties } from '../src/core/curveReport';
import { LEVEL_NAME_KEYS, STAGE_NAME_KEYS, translate } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { tipOnLevelStart } from '../src/core/onboarding';
import { levelWinRate } from '../src/core/solver';
import { mapUniverse, universeCards } from '../src/core/universeMenu';
import { canOpenLevel, openUniverse, universeOfStage, type UniverseInfo } from '../src/core/universes';
import stage from '../scripts/stages/stage-42';

/** Stage 42 "Stelle" (#267): second stage of universe 5 "Cosmo"; brown and padlocks again, with films and stones, no new pair. */
const all = levels as LevelDef[];
const universes = universesJson as UniverseInfo[];
const defs = all.filter((d) => d.stage === 42);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const count = (xs: readonly unknown[]) => xs.filter(Boolean).length;
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));
/** Stored win rates (#72), measured by gen:levels with the same levelWinRate. */
const stored = new Map(difficulty.levels.map((l) => [l.id, l.winRate]));
const stageMean = (s: number) => mean(all.filter((d) => d.stage === s).map((d) => stored.get(d.id)!));
const curveOf = (ds: readonly LevelDef[]) => ds.map((d) => curveLevel(parseLevel(d), 0.5));
/** Pairs of mechanics a level uses together, e.g. `brown+lock`. */
const pairsOf = (features: readonly string[]) => {
  const ms = MECHANICS.filter((m) => features.includes(m));
  return ms.flatMap((a, i) => ms.slice(i + 1).map((b) => `${a}+${b}`));
};
const ALL_TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover', 'film', 'tunnel'] as const;

describe('stage 42 "Stelle"', () => {
  it('belongs to universe 5 and is complete', () => {
    expect(universeOfStage(42)).toBe(5);
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
    expect(translate('it', 'stage.stars')).toBe('Stelle');
    expect(translate('en', 'stage.stars')).toBe('Stars');
    expect(translate('it', 'level.starrysky')).toBe('Il cielo stellato');
  });

  it('ships as levels 411–420, the boss last and the largest picture, never over 14×14 (16×16 waits for stages 45–46)', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 411 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(14);
    expect(Math.max(parsed[9]!.width, parsed[9]!.height)).toBe(14);
    const pixels = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(pixels[9]).toBe(Math.max(...pixels));
  });

  it('pairs brown and padlocks on every level, keys and padlocks on brown pixels; films and stones only besides', () => {
    for (const l of parsed) {
      expect(count(l.keys)).toBeGreaterThan(0);
      expect(count(l.locked)).toBeGreaterThanOrEqual(2);
      l.targets.forEach((t, i) => {
        if (l.keys[i] || l.locked[i]) expect(t).toBe(BROWN);
      });
      expect(l.ice.some((n) => n > 0) || l.hidden.some(Boolean)).toBe(false);
      expect(l.tunnels).toEqual([]);
      expect(l.columns.some((c) => c.some((b) => b.covered))).toBe(false);
    }
    // The rest level keeps the bare pair; films and stones come back from universe 4 on the other levels.
    expect(parsed[0]!.film.some((f) => f !== 0) || parsed[0]!.stone.some(Boolean)).toBe(false);
    expect(parsed.filter((l) => l.film.some((f) => f !== 0)).length).toBeGreaterThanOrEqual(5);
    expect(parsed.filter((l) => l.stone.some(Boolean)).length).toBeGreaterThanOrEqual(4);
    // The boss has the most padlocks of the stage.
    expect(count(parsed[9]!.locked)).toBe(Math.max(...parsed.map((l) => count(l.locked))));
  });

  it('brings no new mechanic and no new pair: every pair of mechanics was already seen together before level 401', () => {
    const before = curveOf(all.filter((d) => d.id < 401));
    const seenMechanics = new Set(before.flatMap((l) => l.features));
    const seenPairs = new Set(before.flatMap((l) => pairsOf(l.features)));
    for (const l of curveOf(defs)) {
      for (const f of l.features) expect(seenMechanics.has(f)).toBe(true);
      for (const p of pairsOf(l.features)) expect(seenPairs.has(p), `level ${l.id}: ${p}`).toBe(true);
    }
  });

  it('keeps a novelty in the 401–420 window (#157): brown, stones, padlocks and films together, never before in one level', () => {
    const curve = curveOf(all);
    const fresh = novelties(curve).filter((n) => n.id >= 401 && n.id <= 420);
    expect(fresh).toEqual([{ id: 416, kind: 'combo', name: 'brown+stone+lock+film' }]);
    expect(comboOf(curve.find((l) => l.id === 416)!)).toBe('brown+stone+lock+film');
    expect(noveltyGaps(curve, 401, 420)).toEqual([]);
  });

  it('shows no card to a player who has seen the cards of universes 1–4', () => {
    for (const l of parsed) expect(tipOnLevelStart(l, [...ALL_TIPS])).toBeNull();
  });

  it('keeps at least 30% secondary or brown pixels after the rest level', () => {
    for (const l of parsed.slice(1)) {
      const pixels = l.targets.filter((t) => t !== 0);
      expect(pixels.filter((t) => !isPrimary(t) || t === BROWN).length / pixels.length).toBeGreaterThanOrEqual(CURVE.minSecondaryShare);
    }
  });

  it('never gives back a bigger belt or more slots than the end of universe 4', () => {
    const end = inStage(40);
    for (const l of parsed) {
      expect(l.beltCapacity).toBeLessThanOrEqual(Math.max(...end.map((e) => e.beltCapacity)));
      expect(l.slots).toBeLessThanOrEqual(Math.max(...end.map((e) => e.slots)));
    }
  });

  it('follows the saw-tooth (#88): no level is very easy, 419 is hard, the boss is the hardest and above the floor', () => {
    const r = winRates();
    expect(r.every((w) => w < CURVE.veryEasy)).toBe(true);
    expect(checkCurve(parsed.map((l, i) => curveLevel(l, r[i]!))).filter((v) => v.severity === 'error')).toEqual([]);
    expect(r[9]).toBe(Math.min(...r));
    expect(r[9]).toBeGreaterThanOrEqual(CURVE.universes[4]!.hardestBoss);
  }, 60_000);

  it('averages about 60% random wins: harder than stage 41, still easier than the end of universe 4', () => {
    const m = mean(winRates());
    expect(Math.abs(m - 0.6)).toBeLessThanOrEqual(0.03);
    expect(m).toBeLessThan(stageMean(41));
    expect(m).toBeGreaterThan(stageMean(40));
    // The stored rates are the ones gen:levels measured with the same function.
    expect(stageMean(42)).toBeCloseTo(m, 2);
  }, 60_000);
});

describe('stage 42 unlock', () => {
  const completedTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  it('follows the stage 41 boss: level 411 opens after 410 and the open universe stays 5', () => {
    expect(all.find((d) => d.id === 410)).toMatchObject({ stage: 41, boss: true });
    expect(all.find((d) => d.id === 411)).toMatchObject({ stage: 42 });
    expect(canOpenLevel(all, { unlocked: 411, completed: completedTo(410) }, 411)).toBe(true);
    expect(openUniverse(all, completedTo(410))).toBe(5);
    expect(mapUniverse(all, { unlocked: 411, completed: completedTo(410) })).toBe(5);
  });

  it('counts the levels of universe 5 on the selector and gives the second colour of its bucket style', () => {
    const cards = universeCards(universes, all, completedTo(410));
    // Universe 5 holds every stage shipped so far (stage 43, #268, makes it thirty levels).
    expect(cards[4]).toMatchObject({ id: 5, open: true, done: 10, total: all.filter((d) => universeOfStage(d.stage) === 5).length, complete: true, firstLevel: 401 }); // built to the end since stage 50 (#275)
    expect(stageSkin(42)).toBe('orbits-2');
  });
});
