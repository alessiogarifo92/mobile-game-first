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
import stagesJson from '../src/levels/stages.json';
import { moreLevelsComing, type StageInfo } from '../src/core/stages';
import stage from '../scripts/stages/stage-50';

/**
 * Stage 50 "Finale" (#275): tenth and last stage of universe 5 "Cosmo" and of the game; all four pairs together (ice,
 * film, hidden pixels and a tunnel on every level), with the debut card of the combination at 491 (a very easy level),
 * brown with padlocks on half of them, and the final boss of the game at 500.
 */
const all = levels as LevelDef[];
const universes = universesJson as UniverseInfo[];
const defs = all.filter((d) => d.stage === 50);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const count = (xs: readonly unknown[]) => xs.filter(Boolean).length;
const hasHidden = (l: Level) => l.hidden.some(Boolean);
const hasTunnel = (l: Level) => l.tunnels.length > 0;
const hasIce = (l: Level) => l.ice.some((n) => n > 0);
const hasFilm = (l: Level) => l.film.some((f) => f !== 0);
const hasAll = (l: Level) => hasIce(l) && hasFilm(l) && hasHidden(l) && hasTunnel(l);
const hasLock = (l: Level) => l.locked.some(Boolean);
const ids = (ls: readonly Level[]) => ls.map((l) => l.id);
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));
/** Stored win rates (#72), measured by gen:levels with the same levelWinRate. */
const stored = new Map(difficulty.levels.map((l) => [l.id, l.winRate]));
const stageMean = (s: number) => mean(all.filter((d) => d.stage === s).map((d) => stored.get(d.id)!));
/** Every card a player has met by the end of stage 49: all of them but the card of this stage. */
const BEFORE = ['guide', ...CARD_TIPS.filter((t) => t !== 'allPairs')];
const COMBO = 'ice+film+hidden+tunnel';

describe('stage 50 "Finale"', () => {
  it('belongs to universe 5, is its last stage and the last of the game, and is complete: no "more levels coming" any more', () => {
    expect(universeOfStage(50)).toBe(5);
    expect(stage.complete).toBe(true);
    expect(stage.levels).toHaveLength(10);
    expect(Math.max(...all.map((d) => d.stage))).toBe(50);
    expect(all).toHaveLength(500);
    // The finale is not a stage still being built: the map stops saying more levels are on the way.
    expect(moreLevelsComing(stagesJson as StageInfo[])).toBe(false);
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
    expect(translate('it', 'stage.finale')).toBe('Finale');
    expect(translate('en', 'stage.finale')).toBe('Finale');
    expect(translate('it', 'level.grandfinale')).toBe('Gran finale');
    expect(translate('en', 'level.curtain')).toBe('Curtain');
  });

  it('has IT/EN text for the debut card of the combination', () => {
    for (const lang of ['en', 'it'] as const) {
      for (const key of ['tip.allPairs.title', 'tip.allPairs.body'] as const) expect(translate(lang, key)).not.toBe(key);
    }
    expect(translate('it', 'tip.allPairs.title')).toBe('Tutto insieme');
  });

  it('ships as levels 491–500, the boss last, the largest picture and the one 16×16 canvas of the stage', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 491 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(MAX_CANVAS);
    expect([parsed[9]!.width, parsed[9]!.height]).toEqual([16, 16]);
    expect(ids(parsed.filter((l) => l.width === 16 || l.height === 16))).toEqual([500]);
    const pixels = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(pixels[9]).toBe(Math.max(...pixels));
  });

  it('puts ice, film, hidden pixels and a tunnel on every level (all four pairs), and nothing else but brown and padlocks', () => {
    for (const l of parsed) {
      expect(hasAll(l), `level ${l.id}`).toBe(true);
      expect(l.stone.some(Boolean), `level ${l.id}`).toBe(false);
      expect(l.columns.some((c) => c.some((b) => b.covered)), `level ${l.id}`).toBe(false);
      const features = curveLevel(l, 0.5).features;
      for (const pair of ['ice+film', 'ice+tunnel', 'hidden+film', 'hidden+tunnel', COMBO]) expect(features, `level ${l.id}`).toContain(pair);
    }
  });

  it('keeps the combination fair: one obstacle per pixel, ice on primaries, films on plain pixels, every "?" next to a visible pixel', () => {
    for (const l of parsed) {
      l.targets.forEach((t, i) => {
        const marks = [l.ice[i]! > 0, l.film[i] !== 0, l.hidden[i], l.keys[i], l.locked[i]].filter(Boolean).length;
        expect(marks, `level ${l.id} cell ${i}`).toBeLessThanOrEqual(1);
        if (l.ice[i]! > 0) expect(isPrimary(t)).toBe(true);
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

  it('keeps one stretch of tunnel per level, never the whole belt', () => {
    for (const l of parsed) {
      const t = [...l.tunnels].sort((a, b) => a - b);
      expect(t.every((lane, k) => k === 0 || lane === t[k - 1]! + 1), `level ${l.id}`).toBe(true);
      expect(t.length).toBeLessThanOrEqual(6);
      expect(t.length).toBeLessThan(2 * (l.width + l.height));
    }
  });

  it('keeps keys and padlocks on brown pixels, on half the stage, the boss with the most padlocks', () => {
    expect(ids(parsed.filter(hasLock))).toEqual([492, 496, 498, 499, 500]);
    for (const l of parsed) {
      expect(hasLock(l), `level ${l.id}`).toBe(l.targets.includes(BROWN));
      if (hasLock(l)) expect(count(l.keys)).toBeGreaterThan(0);
      l.targets.forEach((t, i) => {
        if (l.keys[i] || l.locked[i]) expect(t).toBe(BROWN);
      });
    }
    expect(parsed[0]!.targets.includes(BROWN)).toBe(false); // the debut keeps the bare combination
    expect(count(parsed[9]!.locked)).toBe(Math.max(...parsed.map((l) => count(l.locked))));
    expect(count(parsed[9]!.locked)).toBeGreaterThan(count(parsed[8]!.locked));
  });

  it('debuts the combination at 491: ice, film, hidden pixels and a tunnel were never on the same level before', () => {
    expect(PAIR_TIPS.allPairs).toEqual(['ice', 'film', 'hidden', 'tunnel']);
    const before = all.filter((d) => d.id < 491).map((d) => parseLevel(d));
    for (const has of [hasIce, hasFilm, hasHidden, hasTunnel]) expect(before.some(has)).toBe(true);
    expect(ids(before.filter(hasAll))).toEqual([]);
    const curve = all.map((d) => curveLevel(parseLevel(d), 0.5));
    expect(curve.find((l) => l.features.includes(COMBO))?.id).toBe(491);
  });

  it('proves the combination holds: the solver solves every level of the stage', () => {
    for (const l of parsed) expect(solve(l).solvable, `level ${l.id}`).toBe(true);
  }, 120_000);

  it('brings a novelty to the 481–500 window (#157): the four pairs together at 491', () => {
    const curve = all.map((d) => curveLevel(parseLevel(d), 0.5));
    const fresh = novelties(curve).filter((n) => n.id >= 491 && n.id <= 500);
    // The report names a combination by the curve's feature order, not by the card's.
    expect(fresh[0]).toEqual({ id: 491, kind: 'combo', name: 'ice+hidden+film+tunnel' });
    expect(noveltyGaps(curve, 401, 500)).toEqual([]);
  });

  it('shows the debut card of the combination at 491, once, and no card on the other levels (#77, one card per level)', () => {
    expect(tipsPresent(parsed[0]!)).toEqual(['mixing', 'ice', 'film', 'tunnel', 'hidden', 'iceFilm', 'iceTunnel', 'hiddenFilm', 'hiddenTunnel', 'allPairs']);
    expect(tipOnLevelStart(parsed[0]!, BEFORE)).toBe('allPairs');
    for (const l of parsed) expect(tipOnLevelStart(l, [...BEFORE, 'allPairs'])).toBeNull();
    // A player who skipped nothing meets the card at 491, not before: no earlier level shows it.
    for (const d of all.filter((x) => x.id < 491)) expect(tipOnLevelStart(parseLevel(d), BEFORE)).not.toBe('allPairs');
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

  it('follows the saw-tooth (#88): only the debut is very easy, 499 is hard, the final boss is the hardest and above the floor', () => {
    const r = winRates();
    expect(r[0]).toBeGreaterThanOrEqual(CURVE.veryEasy);
    expect(r.slice(1).every((w) => w < CURVE.veryEasy)).toBe(true);
    expect(r[8]).toBe(Math.min(...r.slice(0, 9)));
    const prior = all.filter((d) => d.id < 491).map((d) => curveLevel(parseLevel(d), stored.get(d.id)!));
    // With stage 50 the universe is complete, so its end-of-universe rules (3 and 5) run here too.
    const errors = checkCurve([...prior, ...parsed.map((l, i) => curveLevel(l, r[i]!))]).filter((v) => v.severity === 'error');
    expect(errors).toEqual([]);
    expect(r[9]).toBe(Math.min(...r));
    expect(r[9]).toBeGreaterThanOrEqual(CURVE.universes[4]!.hardestBoss);
  }, 120_000);

  it('averages about 45% random wins, the end target of universe 5: harder than stage 49 (#103)', () => {
    const m = mean(winRates());
    expect(Math.abs(m - CURVE.universes[4]!.endMean)).toBeLessThanOrEqual(0.02);
    expect(m).toBeLessThan(stageMean(49));
    // The stored rates are the ones gen:levels measured with the same function.
    expect(stageMean(50)).toBeCloseTo(m, 2);
  }, 120_000);
});

describe('stage 50 unlock', () => {
  const completedTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  it('follows the stage 49 boss: level 491 opens after 490 and the open universe stays 5', () => {
    expect(all.find((d) => d.id === 490)).toMatchObject({ stage: 49, boss: true });
    expect(all.find((d) => d.id === 491)).toMatchObject({ stage: 50 });
    expect(canOpenLevel(all, { unlocked: 491, completed: completedTo(490) }, 491)).toBe(true);
    expect(canOpenLevel(all, { unlocked: 491, completed: completedTo(490) }, 492)).toBe(false);
    expect(openUniverse(all, completedTo(490))).toBe(5);
    expect(mapUniverse(all, { unlocked: 491, completed: completedTo(490) })).toBe(5);
  });

  it('counts all 100 levels of universe 5 on the selector, now complete, and gives the tenth colour of its bucket style', () => {
    const cards = universeCards(universes, all, completedTo(490));
    expect(cards[4]).toMatchObject({ id: 5, open: true, done: 90, total: 100, complete: true, firstLevel: 401 });
    expect(stageSkin(50)).toBe('orbits-10');
  });
});
