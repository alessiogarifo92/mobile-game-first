import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import difficulty from '../src/levels/difficulty.json';
import universesJson from '../src/levels/universes.json';
import { stageSkin, universeSkin } from '../src/core/album';
import { BROWN, isPrimary } from '../src/core/colors';
import { CURVE, checkCurve, curveLevel } from '../src/core/curve';
import { LEVEL_NAME_KEYS, STAGE_NAME_KEYS, UNIVERSE_NAME_KEYS, translate } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { paintedTiles } from '../src/core/mural';
import { tipOnLevelStart } from '../src/core/onboarding';
import { levelWinRate } from '../src/core/solver';
import { mapUniverse, newlyCompletedUniverse, universeCards } from '../src/core/universeMenu';
import { MAX_CANVAS, canOpenLevel, isUniverseUnlocked, lastLevelOf, openUniverse, universeOfStage, type UniverseInfo } from '../src/core/universes';
import stage from '../scripts/stages/stage-41';

/** Stage 41 "Pianeti" (#265): first stage of universe 5 "Cosmo"; every padlock and key sits on a brown pixel. */
const all = levels as LevelDef[];
const universes = universesJson as UniverseInfo[];
const defs = all.filter((d) => d.stage === 41);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const count = (xs: readonly unknown[]) => xs.filter(Boolean).length;
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));
/** Stored win rates (#72), measured by gen:levels with the same levelWinRate. */
const stored = new Map(difficulty.levels.map((l) => [l.id, l.winRate]));
const stageMean = (s: number) => mean(all.filter((d) => d.stage === s).map((d) => stored.get(d.id)!));
const ALL_TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover', 'film', 'tunnel'] as const;

describe('universe 5 "Cosmo" and stage 41 "Pianeti"', () => {
  it('adds universe 5 with IT/EN names and the 16×16 canvas limit of #103', () => {
    const u = universes.find((x) => x.id === 5)!;
    expect(u).toMatchObject({ key: 'cosmos', maxCanvas: MAX_CANVAS });
    expect(universes).toHaveLength(5);
    expect(UNIVERSE_NAME_KEYS.has('cosmos')).toBe(true);
    expect(translate('it', 'universe.cosmos')).toBe('Cosmo');
    expect(translate('en', 'universe.cosmos')).toBe('Cosmos');
    expect(universeOfStage(41)).toBe(5);
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
    expect(translate('it', 'stage.planets')).toBe('Pianeti');
    expect(translate('en', 'stage.planets')).toBe('Planets');
    expect(translate('it', 'level.solarsystem')).toBe('Il sistema solare');
  });

  it('ships as levels 401–410, the boss last and the largest picture, never over 14×14 (16×16 waits for stages 45–46)', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 401 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(14);
    expect(Math.max(parsed[9]!.width, parsed[9]!.height)).toBe(14);
    const pixels = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(pixels[9]).toBe(Math.max(...pixels));
  });

  it('pairs brown and padlocks on every level: every key and every padlock is a brown pixel, and nothing else is on the board', () => {
    for (const l of parsed) {
      expect(count(l.keys)).toBeGreaterThan(0);
      expect(count(l.locked)).toBeGreaterThanOrEqual(2);
      l.targets.forEach((t, i) => {
        if (l.keys[i] || l.locked[i]) expect(t).toBe(BROWN);
      });
      expect(l.ice.some((n) => n > 0) || l.hidden.some(Boolean) || l.stone.some(Boolean) || l.film.some((f) => f !== 0)).toBe(false);
      expect(l.tunnels).toEqual([]);
      expect(l.columns.some((c) => c.some((b) => b.covered))).toBe(false);
    }
    // The boss has the most padlocks of the stage.
    expect(count(parsed[9]!.locked)).toBe(Math.max(...parsed.map((l) => count(l.locked))));
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

  it('follows the saw-tooth (#88): no level is very easy, 409 is hard, the boss is the hardest and above the floor', () => {
    const r = winRates();
    expect(r.every((w) => w < CURVE.veryEasy)).toBe(true);
    expect(checkCurve(parsed.map((l, i) => curveLevel(l, r[i]!))).filter((v) => v.severity === 'error')).toEqual([]);
    expect(r[9]).toBe(Math.min(...r));
    expect(r[9]).toBeGreaterThanOrEqual(CURVE.universes[4]!.hardestBoss);
  }, 60_000);

  it('averages about 62% random wins: easier than the end of universe 4, harder than its start (rule 4)', () => {
    const m = mean(winRates());
    expect(Math.abs(m - 0.62)).toBeLessThanOrEqual(0.03);
    expect(m).toBeGreaterThan(stageMean(40));
    expect(m).toBeLessThan(stageMean(31));
  }, 60_000);
});

describe('universe 5 unlock (#90)', () => {
  const completedTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  it('stays closed until level 400, the last of universe 4, is completed, then opens on level 401', () => {
    expect(lastLevelOf(all, 4)).toBe(400);
    expect(all.find((d) => d.id === 401)).toMatchObject({ stage: 41 });
    expect(isUniverseUnlocked(all, completedTo(399), 5)).toBe(false);
    expect(openUniverse(all, completedTo(399))).toBe(4);
    expect(canOpenLevel(all, { unlocked: 401, completed: completedTo(399) }, 401)).toBe(false);
    expect(isUniverseUnlocked(all, completedTo(400), 5)).toBe(true);
    expect(openUniverse(all, completedTo(400))).toBe(5);
    expect(canOpenLevel(all, { unlocked: 401, completed: completedTo(400) }, 401)).toBe(true);
    expect(mapUniverse(all, { unlocked: 401, completed: completedTo(400) })).toBe(5);
  });

  it('winning level 400 finishes universe 4 (the party leads on to universe 5)', () => {
    expect(newlyCompletedUniverse(all, completedTo(399), 400)).toBe(4);
    expect(newlyCompletedUniverse(all, completedTo(400), 401)).toBeNull();
  });

  it('the selector, the mural and the album handle five universes', () => {
    const before = universeCards(universes, all, completedTo(399));
    expect(before.map((c) => [c.id, c.open, c.unlockLevel ?? null])).toEqual([[1, true, null], [2, true, null], [3, true, null], [4, true, null], [5, false, 400]]);
    const after = universeCards(universes, all, completedTo(400));
    expect(after[4]).toMatchObject({ id: 5, key: 'cosmos', open: true, done: 0, total: 10, complete: false, firstLevel: 401 });
    // The mural of universe 5 gets its gift tile when it opens, and a tile per level won.
    expect(paintedTiles(all, completedTo(399), 5).some(Boolean)).toBe(false);
    expect(paintedTiles(all, completedTo(400), 5).filter(Boolean)).toHaveLength(1);
    expect(paintedTiles(all, completedTo(402), 5).filter(Boolean)).toHaveLength(2);
    // Finishing stage 41 gives the first colour of the universe 5 bucket style.
    expect(universeSkin(5)).toBe('orbits');
    expect(stageSkin(41)).toBe('orbits-1');
  });
});
