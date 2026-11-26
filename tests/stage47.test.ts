import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import difficulty from '../src/levels/difficulty.json';
import universesJson from '../src/levels/universes.json';
import { stageSkin } from '../src/core/album';
import { BROWN, isPrimary } from '../src/core/colors';
import { CURVE, checkCurve, curveLevel } from '../src/core/curve';
import { noveltyGaps, novelties } from '../src/core/curveReport';
import { LEVEL_NAME_KEYS, STAGE_NAME_KEYS, translate } from '../src/core/i18n';
import { parseLevel, type Level, type LevelDef } from '../src/core/level';
import { CARD_TIPS } from '../scripts/playtest/saves';
import { PAIR_TIPS, tipOnLevelStart, tipsPresent } from '../src/core/onboarding';
import { levelWinRate, solve } from '../src/core/solver';
import { mapUniverse, universeCards } from '../src/core/universeMenu';
import { MAX_CANVAS, canOpenLevel, openUniverse, universeOfStage, type UniverseInfo } from '../src/core/universes';
import stage from '../scripts/stages/stage-47';

/**
 * Stage 47 "Mito" (#272): seventh stage of universe 5 "Cosmo"; the new pair hidden pixels + film, with its debut card
 * at 461 (a very easy level), hidden pixels and films on every level, brown with padlocks on half of them.
 */
const all = levels as LevelDef[];
const universes = universesJson as UniverseInfo[];
const defs = all.filter((d) => d.stage === 47);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const count = (xs: readonly unknown[]) => xs.filter(Boolean).length;
const hasHidden = (l: Level) => l.hidden.some(Boolean);
const hasFilm = (l: Level) => l.film.some((f) => f !== 0);
const hasLock = (l: Level) => l.locked.some(Boolean);
const ids = (ls: readonly Level[]) => ls.map((l) => l.id);
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));
/** Stored win rates (#72), measured by gen:levels with the same levelWinRate. */
const stored = new Map(difficulty.levels.map((l) => [l.id, l.winRate]));
const stageMean = (s: number) => mean(all.filter((d) => d.stage === s).map((d) => stored.get(d.id)!));
/** Every card a player has met by the end of stage 46: all of them but the pair card of this stage. */
const BEFORE = ['guide', ...CARD_TIPS.filter((t) => t !== 'hiddenFilm')];

describe('stage 47 "Mito"', () => {
  it('belongs to universe 5 and is complete', () => {
    expect(universeOfStage(47)).toBe(5);
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
    expect(translate('it', 'stage.myth')).toBe('Mito');
    expect(translate('en', 'stage.myth')).toBe('Myth');
    expect(translate('it', 'level.hydra')).toBe('Idra');
    expect(translate('en', 'level.lyre')).toBe('Lyre');
  });

  it('has IT/EN text for the debut card of the pair', () => {
    for (const lang of ['en', 'it'] as const) {
      for (const key of ['tip.hiddenFilm.title', 'tip.hiddenFilm.body'] as const) expect(translate(lang, key)).not.toBe(key);
    }
    expect(translate('it', 'tip.hiddenFilm.title')).toBe('Nascosti e pellicola');
  });

  it('ships as levels 461–470, the boss last, the largest picture and the one 16×16 canvas of the stage', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 461 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(MAX_CANVAS);
    expect([parsed[9]!.width, parsed[9]!.height]).toEqual([16, 16]);
    expect(ids(parsed.filter((l) => l.width === 16 || l.height === 16))).toEqual([470]);
    const pixels = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(pixels[9]).toBe(Math.max(...pixels));
  });

  it('puts hidden pixels and films on every level, and nothing else from universes 2–4 but brown and padlocks', () => {
    for (const l of parsed) {
      expect(hasHidden(l) && hasFilm(l), `level ${l.id}`).toBe(true);
      // No ice and no tunnel: a level never carries two pairs (ice + film, ice + tunnel, hidden + film) at once.
      expect(l.ice.some((n) => n > 0) || l.tunnels.length > 0 || l.stone.some(Boolean), `level ${l.id}`).toBe(false);
      expect(l.columns.some((c) => c.some((b) => b.covered))).toBe(false);
    }
  });

  it('keeps films off brown and off their own colour, and every hidden pixel next to a visible one', () => {
    for (const l of parsed) {
      l.targets.forEach((t, i) => {
        if (l.film[i] !== 0) {
          expect(t).not.toBe(BROWN);
          expect(t & l.film[i]!).toBe(0);
        }
        if (!l.hidden[i]) return;
        const x = i % l.width;
        const near = [x > 0 ? i - 1 : -1, x < l.width - 1 ? i + 1 : -1, i - l.width, i + l.width]
          .filter((n) => n >= 0 && n < l.targets.length && l.targets[n] !== 0 && !l.hidden[n]);
        expect(near.length, `level ${l.id} cell ${i}`).toBeGreaterThan(0);
      });
    }
  });

  it('keeps keys and padlocks on brown pixels, on half the stage, the boss with the most padlocks', () => {
    expect(ids(parsed.filter(hasLock))).toEqual([462, 466, 468, 469, 470]);
    for (const l of parsed) {
      expect(hasLock(l), `level ${l.id}`).toBe(l.targets.includes(BROWN));
      if (hasLock(l)) expect(count(l.keys)).toBeGreaterThan(0);
      l.targets.forEach((t, i) => {
        if (l.keys[i] || l.locked[i]) expect(t).toBe(BROWN);
      });
    }
    expect(parsed[0]!.targets.includes(BROWN)).toBe(false); // the debut keeps the bare pair
    expect(count(parsed[9]!.locked)).toBe(Math.max(...parsed.map((l) => count(l.locked))));
    expect(count(parsed[9]!.locked)).toBeGreaterThan(count(parsed[8]!.locked));
  });

  it('debuts the pair at 461: hidden pixels and films were never on the same level before', () => {
    expect(PAIR_TIPS.hiddenFilm).toEqual(['hidden', 'film']);
    const before = all.filter((d) => d.id < 461).map((d) => parseLevel(d));
    expect(before.some(hasHidden)).toBe(true);
    expect(before.some(hasFilm)).toBe(true);
    expect(ids(before.filter((l) => hasHidden(l) && hasFilm(l)))).toEqual([]);
    const curve = all.map((d) => curveLevel(parseLevel(d), 0.5));
    expect(curve.find((l) => l.features.includes('hidden+film'))?.id).toBe(461);
  });

  it('proves the pair holds: the solver solves every level of the stage', () => {
    for (const l of parsed) expect(solve(l).solvable, `level ${l.id}`).toBe(true);
  }, 60_000);

  it('brings a novelty to the 461–480 window (#157): the hidden + film pair at 461', () => {
    const curve = all.map((d) => curveLevel(parseLevel(d), 0.5));
    const fresh = novelties(curve).filter((n) => n.id >= 461 && n.id <= 470);
    expect(fresh[0]).toEqual({ id: 461, kind: 'combo', name: 'hidden+film' });
    expect(noveltyGaps(curve, 401, 470)).toEqual([]);
  });

  it('shows the debut card of the pair at 461, once, and no card on the other levels (#77, one card per level)', () => {
    expect(tipsPresent(parsed[0]!)).toEqual(['mixing', 'film', 'hidden', 'hiddenFilm']);
    expect(tipOnLevelStart(parsed[0]!, BEFORE)).toBe('hiddenFilm');
    for (const l of parsed) expect(tipOnLevelStart(l, [...BEFORE, 'hiddenFilm'])).toBeNull();
    // A player who skipped nothing meets the pair card at 461, not before: no earlier level shows it.
    for (const d of all.filter((x) => x.id < 461)) expect(tipOnLevelStart(parseLevel(d), BEFORE)).not.toBe('hiddenFilm');
  });

  it('keeps at least 30% secondary or brown pixels on every level, the debut included', () => {
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

  it('follows the saw-tooth (#88): only the debut is very easy, 469 is hard, the boss is the hardest and above the floor', () => {
    const r = winRates();
    expect(r[0]).toBeGreaterThanOrEqual(CURVE.veryEasy);
    expect(r.slice(1).every((w) => w < CURVE.veryEasy)).toBe(true);
    expect(r[8]).toBe(Math.min(...r.slice(0, 9)));
    const prior = all.filter((d) => d.id < 461).map((d) => curveLevel(parseLevel(d), stored.get(d.id)!));
    const errors = checkCurve([...prior, ...parsed.map((l, i) => curveLevel(l, r[i]!))]).filter((v) => v.severity === 'error');
    expect(errors).toEqual([]);
    expect(r[9]).toBe(Math.min(...r));
    expect(r[9]).toBeGreaterThanOrEqual(CURVE.universes[4]!.hardestBoss);
  }, 60_000);

  it('averages about 51% random wins: harder than stage 46, still easier than the end of universe 4', () => {
    const m = mean(winRates());
    expect(Math.abs(m - 0.51)).toBeLessThanOrEqual(0.03);
    expect(m).toBeLessThan(stageMean(46));
    expect(m).toBeGreaterThan(stageMean(40));
    // The stored rates are the ones gen:levels measured with the same function.
    expect(stageMean(47)).toBeCloseTo(m, 2);
  }, 60_000);
});

describe('stage 47 unlock', () => {
  const completedTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  it('follows the stage 46 boss: level 461 opens after 460 and the open universe stays 5', () => {
    expect(all.find((d) => d.id === 460)).toMatchObject({ stage: 46, boss: true });
    expect(all.find((d) => d.id === 461)).toMatchObject({ stage: 47 });
    expect(canOpenLevel(all, { unlocked: 461, completed: completedTo(460) }, 461)).toBe(true);
    expect(canOpenLevel(all, { unlocked: 461, completed: completedTo(460) }, 462)).toBe(false);
    expect(openUniverse(all, completedTo(460))).toBe(5);
    expect(mapUniverse(all, { unlocked: 461, completed: completedTo(460) })).toBe(5);
  });

  it('counts the levels of universe 5 on the selector and gives the seventh colour of its bucket style', () => {
    const cards = universeCards(universes, all, completedTo(460));
    expect(cards[4]).toMatchObject({ id: 5, open: true, done: 60, total: all.filter((d) => universeOfStage(d.stage) === 5).length, complete: false, firstLevel: 401 });
    expect(stageSkin(47)).toBe('orbits-7');
  });
});
