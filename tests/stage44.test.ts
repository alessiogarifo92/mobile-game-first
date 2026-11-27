import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import difficulty from '../src/levels/difficulty.json';
import universesJson from '../src/levels/universes.json';
import { stageSkin } from '../src/core/album';
import { BROWN, isPrimary } from '../src/core/colors';
import { CURVE, checkCurve, curveLevel } from '../src/core/curve';
import { comboOf, noveltyGaps, novelties } from '../src/core/curveReport';
import { LEVEL_NAME_KEYS, STAGE_NAME_KEYS, translate } from '../src/core/i18n';
import { parseLevel, type Level, type LevelDef } from '../src/core/level';
import { CARD_TIPS } from '../scripts/playtest/saves';
import { tipOnLevelStart } from '../src/core/onboarding';
import { levelWinRate, solve } from '../src/core/solver';
import { mapUniverse, universeCards } from '../src/core/universeMenu';
import { canOpenLevel, openUniverse, universeOfStage, type UniverseInfo } from '../src/core/universes';
import stage from '../scripts/stages/stage-44';

/**
 * Stage 44 "Laboratorio" (#269): fourth stage of universe 5 "Cosmo". No new pair and no card: every level reuses a
 * combination of mechanics already met before 431, and the difficulty climbs a little over stage 43.
 */
const all = levels as LevelDef[];
const universes = universesJson as UniverseInfo[];
const defs = all.filter((d) => d.stage === 44);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const count = (xs: readonly unknown[]) => xs.filter(Boolean).length;
const hasIce = (l: Level) => l.ice.some((n) => n > 0);
const hasFilm = (l: Level) => l.film.some((f) => f !== 0);
const hasStone = (l: Level) => l.stone.some(Boolean);
const hasLock = (l: Level) => l.locked.some(Boolean);
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));
/** Stored win rates (#72), measured by gen:levels with the same levelWinRate. */
const stored = new Map(difficulty.levels.map((l) => [l.id, l.winRate]));
const stageMean = (s: number) => mean(all.filter((d) => d.stage === s).map((d) => stored.get(d.id)!));
const curveOf = (ds: readonly LevelDef[]) => ds.map((d) => curveLevel(parseLevel(d), 0.5));
/** Every card a player has met by the end of stage 43. */
const SEEN = ['guide', ...CARD_TIPS];
const ids = (ls: readonly Level[]) => ls.map((l) => l.id);

describe('stage 44 "Laboratorio"', () => {
  it('belongs to universe 5 and is complete', () => {
    expect(universeOfStage(44)).toBe(5);
    expect(stage.complete).toBe(true);
    expect(stage.levels).toHaveLength(10);
  });

  it('has IT/EN names for the stage and every level, all short enough for the map label (#277)', () => {
    expect(STAGE_NAME_KEYS.has(stage.key)).toBe(true);
    for (const lang of ['en', 'it'] as const) {
      expect(translate(lang, `stage.${stage.key}`)).not.toBe(`stage.${stage.key}`);
      for (const l of stage.levels) {
        expect(LEVEL_NAME_KEYS.has(l.name)).toBe(true);
        const name = translate(lang, `level.${l.name}`);
        expect(name).not.toBe(`level.${l.name}`);
        expect(name.length, `${lang} ${name}`).toBeLessThanOrEqual(11);
      }
    }
    expect(translate('it', 'stage.lab')).toBe('Laboratorio');
    expect(translate('en', 'stage.lab')).toBe('Laboratory');
    expect(translate('it', 'level.experiment')).toBe('Esperimento');
    expect(translate('en', 'level.testtube')).toBe('Test tube');
  });

  it('ships as levels 431–440, the boss last and the largest picture, never over 14×14', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 431 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(14);
    expect([parsed[9]!.width, parsed[9]!.height]).toEqual([14, 14]);
    const pixels = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(pixels[9]).toBe(Math.max(...pixels));
  });

  it('mixes the mechanics of stages 41–43: padlocks on nine levels, ice on four, films on eight, stones on three', () => {
    expect(ids(parsed.filter(hasLock))).toEqual([431, 432, 434, 435, 436, 437, 438, 439, 440]);
    expect(ids(parsed.filter(hasIce))).toEqual([433, 435, 437, 440]);
    expect(ids(parsed.filter(hasFilm))).toEqual([432, 433, 435, 436, 437, 438, 439, 440]);
    expect(ids(parsed.filter(hasStone))).toEqual([434, 436, 439]);
    for (const l of parsed) {
      // Nothing from universes 2–4 but brown, padlocks, ice, films and stones.
      expect(l.hidden.some(Boolean) || l.tunnels.length > 0).toBe(false);
      expect(l.columns.some((c) => c.some((b) => b.covered))).toBe(false);
    }
  });

  it('keeps keys and padlocks on brown, ice on primaries, films off brown and off their own colour, stones on empty cells', () => {
    for (const l of parsed) {
      if (hasLock(l)) expect(count(l.keys), `level ${l.id}`).toBeGreaterThan(0);
      l.targets.forEach((t, i) => {
        if (l.keys[i] || l.locked[i]) expect(t).toBe(BROWN);
        if (l.ice[i]! > 0) expect(isPrimary(t)).toBe(true);
        if (l.film[i] !== 0) {
          expect(t).not.toBe(BROWN);
          expect(t & l.film[i]!).toBe(0);
        }
        if (l.stone[i]) expect(t).toBe(0);
      });
    }
    // The magnet (433) is the one level without brown: ice + film alone, as in stage 43.
    expect(parsed[2]!.targets.includes(BROWN)).toBe(false);
    // The boss has the most padlocks of the stage.
    expect(count(parsed[9]!.locked)).toBe(Math.max(...parsed.map((l) => count(l.locked))));
  });

  it('brings no new mechanic and no new combination: every level repeats a combination met before 431', () => {
    const before = new Set(curveOf(all.filter((d) => d.id < 431)).map(comboOf));
    for (const l of curveOf(defs)) expect(before.has(comboOf(l)), `level ${l.id}: ${comboOf(l)}`).toBe(true);
    const curve = curveOf(all);
    expect(novelties(curve).filter((n) => n.id >= 431 && n.id <= 440)).toEqual([]);
    // The 421–440 window keeps its novelty (#157) from stage 43: the ice + film pair at 421.
    expect(novelties(curve).filter((n) => n.id >= 421 && n.id <= 440)[0]).toEqual({ id: 421, kind: 'combo', name: 'ice+film' });
    expect(noveltyGaps(curve, 401, 440)).toEqual([]);
  });

  it('shows no card to a player who has met every card up to stage 43', () => {
    for (const l of parsed) expect(tipOnLevelStart(l, SEEN)).toBeNull();
  });

  it('proves every level solvable', () => {
    for (const l of parsed) expect(solve(l).solvable, `level ${l.id}`).toBe(true);
  }, 60_000);

  it('keeps at least 30% secondary or brown pixels on every level, the rest level included', () => {
    for (const l of parsed) {
      const pixels = l.targets.filter((t) => t !== 0);
      expect(pixels.filter((t) => !isPrimary(t) || t === BROWN).length / pixels.length, `level ${l.id}`).toBeGreaterThanOrEqual(CURVE.minSecondaryShare);
    }
  });

  it('never gives back a bigger belt or more slots than the end of universe 4', () => {
    const end = inStage(40);
    for (const l of parsed) {
      expect(l.beltCapacity).toBeLessThanOrEqual(Math.max(...end.map((e) => e.beltCapacity)));
      expect(l.slots).toBeLessThanOrEqual(Math.max(...end.map((e) => e.slots)));
    }
  });

  it('follows the saw-tooth (#88): no level is very easy, 431 is the rest, 439 is hard, the boss is the hardest and above the floor', () => {
    const r = winRates();
    expect(r.every((w) => w < CURVE.veryEasy)).toBe(true);
    expect(r[0]).toBe(Math.max(...r));
    expect(r[8]).toBe(Math.min(...r.slice(0, 9)));
    const prior = all.filter((d) => d.id < 431).map((d) => curveLevel(parseLevel(d), stored.get(d.id)!));
    const errors = checkCurve([...prior, ...parsed.map((l, i) => curveLevel(l, r[i]!))]).filter((v) => v.severity === 'error');
    expect(errors).toEqual([]);
    expect(r[9]).toBe(Math.min(...r));
    expect(r[9]).toBeGreaterThanOrEqual(CURVE.universes[4]!.hardestBoss);
  }, 60_000);

  it('averages about 56% random wins: harder than stage 43, still easier than the end of universe 4', () => {
    const m = mean(winRates());
    expect(Math.abs(m - 0.56)).toBeLessThanOrEqual(0.03);
    expect(m).toBeLessThan(stageMean(43));
    expect(m).toBeGreaterThan(stageMean(40));
    // The stored rates are the ones gen:levels measured with the same function.
    expect(stageMean(44)).toBeCloseTo(m, 2);
  }, 60_000);
});

describe('stage 44 unlock', () => {
  const completedTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  it('follows the stage 43 boss: level 431 opens after 430 and the open universe stays 5', () => {
    expect(all.find((d) => d.id === 430)).toMatchObject({ stage: 43, boss: true });
    expect(all.find((d) => d.id === 431)).toMatchObject({ stage: 44 });
    expect(canOpenLevel(all, { unlocked: 431, completed: completedTo(430) }, 431)).toBe(true);
    expect(canOpenLevel(all, { unlocked: 431, completed: completedTo(430) }, 432)).toBe(false);
    expect(openUniverse(all, completedTo(430))).toBe(5);
    expect(mapUniverse(all, { unlocked: 431, completed: completedTo(430) })).toBe(5);
  });

  it('counts the levels of universe 5 on the selector and gives the fourth colour of its bucket style', () => {
    const cards = universeCards(universes, all, completedTo(430));
    expect(cards[4]).toMatchObject({ id: 5, open: true, done: 30, total: all.filter((d) => universeOfStage(d.stage) === 5).length, complete: true, firstLevel: 401 }); // built to the end since stage 50 (#275)
    expect(stageSkin(44)).toBe('orbits-4');
  });
});
