import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import difficulty from '../src/levels/difficulty.json';
import universesJson from '../src/levels/universes.json';
import { stageSkin } from '../src/core/album';
import { BROWN, isPrimary } from '../src/core/colors';
import { CURVE, checkCurve, curveLevel } from '../src/core/curve';
import { novelties, noveltyGaps } from '../src/core/curveReport';
import { LEVEL_NAME_KEYS, STAGE_NAME_KEYS, translate } from '../src/core/i18n';
import { parseLevel, type Level, type LevelDef } from '../src/core/level';
import { CARD_TIPS } from '../scripts/playtest/saves';
import { tipOnLevelStart } from '../src/core/onboarding';
import { levelWinRate, solve } from '../src/core/solver';
import { mapUniverse, universeCards } from '../src/core/universeMenu';
import { canOpenLevel, openUniverse, universeOfStage, type UniverseInfo } from '../src/core/universes';
import stage from '../scripts/stages/stage-43';

/** Stage 43 "Robot" (#268): third stage of universe 5 "Cosmo"; the new pair ice + film, with its debut card at 421. */
const all = levels as LevelDef[];
const universes = universesJson as UniverseInfo[];
const defs = all.filter((d) => d.stage === 43);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const count = (xs: readonly unknown[]) => xs.filter(Boolean).length;
const hasIce = (l: Level) => l.ice.some((n) => n > 0);
const hasFilm = (l: Level) => l.film.some((f) => f !== 0);
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));
/** Stored win rates (#72), measured by gen:levels with the same levelWinRate. */
const stored = new Map(difficulty.levels.map((l) => [l.id, l.winRate]));
const stageMean = (s: number) => mean(all.filter((d) => d.stage === s).map((d) => stored.get(d.id)!));
/** Every card a player has met by the end of stage 42: all of them but the pair card of this stage. */
const BEFORE = ['guide', ...CARD_TIPS.filter((t) => t !== 'iceFilm')];

describe('stage 43 "Robot"', () => {
  it('belongs to universe 5 and is complete', () => {
    expect(universeOfStage(43)).toBe(5);
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
    expect(translate('it', 'stage.robots')).toBe('Robot');
    expect(translate('en', 'stage.robots')).toBe('Robots');
    expect(translate('it', 'level.megarobot')).toBe('Robottone');
  });

  it('ships as levels 421–430, the boss last and the largest picture, never over 14×14', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 421 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(14);
    expect([parsed[9]!.width, parsed[9]!.height]).toEqual([14, 14]);
    const pixels = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(pixels[9]).toBe(Math.max(...pixels));
  });

  it('puts ice and films on every level, ice on primaries, films never on brown nor on a pixel of their colour', () => {
    for (const l of parsed) {
      expect(hasIce(l) && hasFilm(l), `level ${l.id}`).toBe(true);
      l.targets.forEach((t, i) => {
        if (l.ice[i]! > 0) expect(isPrimary(t)).toBe(true);
        if (l.film[i] !== 0) {
          expect(t).not.toBe(BROWN);
          expect(t & l.film[i]!).toBe(0);
        }
      });
      // No other mechanic of universes 2–4 than brown and padlocks.
      expect(l.hidden.some(Boolean) || l.stone.some(Boolean) || l.tunnels.length > 0).toBe(false);
      expect(l.columns.some((c) => c.some((b) => b.covered))).toBe(false);
    }
  });

  it('keeps keys and padlocks on brown pixels, on half the stage, the boss with the most padlocks', () => {
    const locked = parsed.filter((l) => l.locked.some(Boolean));
    expect(locked.map((l) => l.id)).toEqual([424, 427, 428, 429, 430]);
    for (const l of locked) {
      expect(count(l.keys)).toBeGreaterThan(0);
      l.targets.forEach((t, i) => {
        if (l.keys[i] || l.locked[i]) expect(t).toBe(BROWN);
      });
    }
    expect(parsed[0]!.targets.includes(BROWN)).toBe(false); // the debut keeps the bare pair
    expect(count(parsed[9]!.locked)).toBe(Math.max(...parsed.map((l) => count(l.locked))));
  });

  it('debuts the pair at 421: ice and film were never on the same level before', () => {
    const before = all.filter((d) => d.id < 421).map((d) => parseLevel(d));
    expect(before.some(hasIce)).toBe(true);
    expect(before.some(hasFilm)).toBe(true);
    expect(before.filter((l) => hasIce(l) && hasFilm(l))).toEqual([]);
    const curve = all.map((d) => curveLevel(parseLevel(d), 0.5));
    expect(curve.find((l) => l.features.includes('ice+film'))?.id).toBe(421);
  });

  it('proves the pair holds: the solver solves every level of the stage', () => {
    for (const l of parsed) expect(solve(l).solvable, `level ${l.id}`).toBe(true);
  }, 60_000);

  it('keeps a novelty in the 421–440 window (#157): the ice + film pair at 421', () => {
    const curve = all.map((d) => curveLevel(parseLevel(d), 0.5));
    const fresh = novelties(curve).filter((n) => n.id >= 421 && n.id <= 430);
    expect(fresh[0]).toEqual({ id: 421, kind: 'combo', name: 'ice+film' });
    expect(noveltyGaps(curve, 401, 420)).toEqual([]);
  });

  it('shows the debut card of the pair at 421, once, and no card on the other levels (#77, one card per level)', () => {
    expect(tipOnLevelStart(parsed[0]!, BEFORE)).toBe('iceFilm');
    for (const l of parsed) expect(tipOnLevelStart(l, [...BEFORE, 'iceFilm'])).toBeNull();
    // A player who skipped nothing meets the pair card at 421, not before: no earlier level shows it.
    for (const d of all.filter((x) => x.id < 421)) expect(tipOnLevelStart(parseLevel(d), BEFORE)).not.toBe('iceFilm');
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

  it('follows the saw-tooth (#88): only the debut is very easy, 429 is hard, the boss is the hardest and above the floor', () => {
    const r = winRates();
    expect(r[0]).toBeGreaterThanOrEqual(CURVE.veryEasy);
    expect(r.slice(1).every((w) => w < CURVE.veryEasy)).toBe(true);
    const prior = all.filter((d) => d.id < 421).map((d) => curveLevel(parseLevel(d), stored.get(d.id)!));
    const errors = checkCurve([...prior, ...parsed.map((l, i) => curveLevel(l, r[i]!))]).filter((v) => v.severity === 'error');
    expect(errors).toEqual([]);
    expect(r[9]).toBe(Math.min(...r));
    expect(r[9]).toBeGreaterThanOrEqual(CURVE.universes[4]!.hardestBoss);
  }, 60_000);

  it('averages about 57% random wins: harder than stage 42, still easier than the end of universe 4', () => {
    const m = mean(winRates());
    expect(Math.abs(m - 0.58)).toBeLessThanOrEqual(0.03);
    expect(m).toBeLessThan(stageMean(42));
    expect(m).toBeGreaterThan(stageMean(40));
    expect(stageMean(43)).toBeCloseTo(m, 2);
  }, 60_000);
});

describe('stage 43 unlock', () => {
  const completedTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  it('follows the stage 42 boss: level 421 opens after 420 and the open universe stays 5', () => {
    expect(all.find((d) => d.id === 420)).toMatchObject({ stage: 42, boss: true });
    expect(all.find((d) => d.id === 421)).toMatchObject({ stage: 43 });
    expect(canOpenLevel(all, { unlocked: 421, completed: completedTo(420) }, 421)).toBe(true);
    expect(openUniverse(all, completedTo(420))).toBe(5);
    expect(mapUniverse(all, { unlocked: 421, completed: completedTo(420) })).toBe(5);
  });

  it('counts the levels of universe 5 on the selector and gives the third colour of its bucket style', () => {
    const cards = universeCards(universes, all, completedTo(420));
    // Universe 5 holds every stage shipped so far (stage 44, #269, makes it forty levels).
    expect(cards[4]).toMatchObject({ id: 5, open: true, done: 20, total: all.filter((d) => universeOfStage(d.stage) === 5).length, complete: true, firstLevel: 401 }); // built to the end since stage 50 (#275)
    expect(stageSkin(43)).toBe('orbits-3');
  });
});
