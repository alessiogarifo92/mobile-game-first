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
import { tipOnLevelStart, tipsPresent } from '../src/core/onboarding';
import { levelWinRate, solve } from '../src/core/solver';
import { mapUniverse, universeCards } from '../src/core/universeMenu';
import { MAX_CANVAS, canOpenLevel, openUniverse, universeOfStage, type UniverseInfo } from '../src/core/universes';
import stage from '../scripts/stages/stage-45';

/**
 * Stage 45 "Sogni" (#270): fifth stage of universe 5 "Cosmo"; the new pair ice + tunnel, with its debut card at 441,
 * and the first 16×16 pictures of the universe.
 */
const all = levels as LevelDef[];
const universes = universesJson as UniverseInfo[];
const defs = all.filter((d) => d.stage === 45);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const count = (xs: readonly unknown[]) => xs.filter(Boolean).length;
const hasIce = (l: Level) => l.ice.some((n) => n > 0);
const hasTunnel = (l: Level) => l.tunnels.length > 0;
const ids = (ls: readonly Level[]) => ls.map((l) => l.id);
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));
/** Stored win rates (#72), measured by gen:levels with the same levelWinRate. */
const stored = new Map(difficulty.levels.map((l) => [l.id, l.winRate]));
const stageMean = (s: number) => mean(all.filter((d) => d.stage === s).map((d) => stored.get(d.id)!));
/** Every card a player has met by the end of stage 44: all of them but the pair card of this stage. */
const BEFORE = ['guide', ...CARD_TIPS.filter((t) => t !== 'iceTunnel')];

describe('stage 45 "Sogni"', () => {
  it('belongs to universe 5 and is complete', () => {
    expect(universeOfStage(45)).toBe(5);
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
    expect(translate('it', 'stage.dreams')).toBe('Sogni');
    expect(translate('en', 'stage.dreams')).toBe('Dreams');
    expect(translate('it', 'level.dreamer')).toBe('Sognatore');
    expect(translate('en', 'level.pillow')).toBe('Pillow');
  });

  it('ships as levels 441–450, the boss last, the largest picture and the first 16×16 canvas of the universe', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 441 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(MAX_CANVAS);
    expect(MAX_CANVAS).toBe(16);
    expect([parsed[9]!.width, parsed[9]!.height]).toEqual([16, 16]);
    const pixels = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(pixels[9]).toBe(Math.max(...pixels));
    // No level before this stage was wider or taller than 14: these are the first 16-wide pictures.
    expect(all.filter((d) => d.id < 441).every((d) => d.image.length <= 14 && d.image.every((r) => r.length <= 14))).toBe(true);
    expect(ids(parsed.filter((l) => l.width === 16))).toEqual([449, 450]);
  });

  it('puts ice and a tunnel on every level, ice only on primaries, and nothing else from universes 2–4 but brown and padlocks', () => {
    for (const l of parsed) {
      expect(hasIce(l) && hasTunnel(l), `level ${l.id}`).toBe(true);
      l.targets.forEach((t, i) => {
        if (l.ice[i]! > 0) expect(isPrimary(t)).toBe(true);
      });
      // No films: a level never carries two pairs (ice + film and ice + tunnel) at once.
      expect(l.film.some((f) => f !== 0) || l.hidden.some(Boolean) || l.stone.some(Boolean)).toBe(false);
      expect(l.columns.some((c) => c.some((b) => b.covered))).toBe(false);
    }
  });

  it('keeps keys and padlocks on brown pixels, on half the stage, the boss with the most padlocks', () => {
    const locked = parsed.filter((l) => l.locked.some(Boolean));
    expect(ids(locked)).toEqual([442, 444, 445, 449, 450]);
    for (const l of locked) {
      expect(count(l.keys)).toBeGreaterThan(0);
      l.targets.forEach((t, i) => {
        if (l.keys[i] || l.locked[i]) expect(t).toBe(BROWN);
      });
    }
    expect(parsed[0]!.targets.includes(BROWN)).toBe(false); // the debut keeps the bare pair
    expect(count(parsed[9]!.locked)).toBe(Math.max(...parsed.map((l) => count(l.locked))));
  });

  it('debuts the pair at 441: ice and tunnels were never on the same level before', () => {
    const before = all.filter((d) => d.id < 441).map((d) => parseLevel(d));
    expect(before.some(hasIce)).toBe(true);
    expect(before.some(hasTunnel)).toBe(true);
    expect(before.filter((l) => hasIce(l) && hasTunnel(l))).toEqual([]);
    const curve = all.map((d) => curveLevel(parseLevel(d), 0.5));
    expect(curve.find((l) => l.features.includes('ice+tunnel'))?.id).toBe(441);
  });

  it('proves the pair holds: the solver solves every level of the stage', () => {
    for (const l of parsed) expect(solve(l).solvable, `level ${l.id}`).toBe(true);
  }, 60_000);

  it('brings a novelty to the 441–460 window (#157): the ice + tunnel pair at 441', () => {
    const curve = all.map((d) => curveLevel(parseLevel(d), 0.5));
    const fresh = novelties(curve).filter((n) => n.id >= 441 && n.id <= 450);
    expect(fresh[0]).toEqual({ id: 441, kind: 'combo', name: 'ice+tunnel' });
    expect(noveltyGaps(curve, 401, 450)).toEqual([]);
  });

  it('shows the debut card of the pair at 441, once, and no card on the other levels (#77, one card per level)', () => {
    expect(tipsPresent(parsed[0]!)).toEqual(['ice', 'tunnel', 'iceTunnel']);
    expect(tipOnLevelStart(parsed[0]!, BEFORE)).toBe('iceTunnel');
    for (const l of parsed) expect(tipOnLevelStart(l, [...BEFORE, 'iceTunnel'])).toBeNull();
    // A player who skipped nothing meets the pair card at 441, not before: no earlier level shows it.
    for (const d of all.filter((x) => x.id < 441)) expect(tipOnLevelStart(parseLevel(d), BEFORE)).not.toBe('iceTunnel');
  });

  it('keeps at least 30% secondary or brown pixels after the debut', () => {
    for (const l of parsed.slice(1)) {
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

  it('follows the saw-tooth (#88): only the debut is very easy, 449 is hard, the boss is the hardest and above the floor', () => {
    const r = winRates();
    expect(r[0]).toBeGreaterThanOrEqual(CURVE.veryEasy);
    expect(r.slice(1).every((w) => w < CURVE.veryEasy)).toBe(true);
    expect(r[8]).toBe(Math.min(...r.slice(0, 9)));
    const prior = all.filter((d) => d.id < 441).map((d) => curveLevel(parseLevel(d), stored.get(d.id)!));
    const errors = checkCurve([...prior, ...parsed.map((l, i) => curveLevel(l, r[i]!))]).filter((v) => v.severity === 'error');
    expect(errors).toEqual([]);
    expect(r[9]).toBe(Math.min(...r));
    expect(r[9]).toBeGreaterThanOrEqual(CURVE.universes[4]!.hardestBoss);
  }, 60_000);

  it('averages about 54% random wins: harder than stage 44, still easier than the end of universe 4', () => {
    const m = mean(winRates());
    expect(Math.abs(m - 0.54)).toBeLessThanOrEqual(0.03);
    expect(m).toBeLessThan(stageMean(44));
    expect(m).toBeGreaterThan(stageMean(40));
    // The stored rates are the ones gen:levels measured with the same function.
    expect(stageMean(45)).toBeCloseTo(m, 2);
  }, 60_000);
});

describe('stage 45 unlock', () => {
  const completedTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  it('follows the stage 44 boss: level 441 opens after 440 and the open universe stays 5', () => {
    expect(all.find((d) => d.id === 440)).toMatchObject({ stage: 44, boss: true });
    expect(all.find((d) => d.id === 441)).toMatchObject({ stage: 45 });
    expect(canOpenLevel(all, { unlocked: 441, completed: completedTo(440) }, 441)).toBe(true);
    expect(canOpenLevel(all, { unlocked: 441, completed: completedTo(440) }, 442)).toBe(false);
    expect(openUniverse(all, completedTo(440))).toBe(5);
    expect(mapUniverse(all, { unlocked: 441, completed: completedTo(440) })).toBe(5);
  });

  it('counts the levels of universe 5 on the selector and gives the fifth colour of its bucket style', () => {
    const cards = universeCards(universes, all, completedTo(440));
    expect(cards[4]).toMatchObject({ id: 5, open: true, done: 40, total: all.filter((d) => universeOfStage(d.stage) === 5).length, complete: true, firstLevel: 401 }); // built to the end since stage 50 (#275)
    expect(stageSkin(45)).toBe('orbits-5');
  });
});
