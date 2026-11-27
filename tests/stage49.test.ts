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
import stage from '../scripts/stages/stage-49';

/**
 * Stage 49 "Buchi neri" (#274): ninth stage of universe 5 "Cosmo"; the new pair hidden pixels + tunnel, with its debut
 * card at 481 (a very easy level), hidden pixels and a tunnel on every level, brown with padlocks on half of them.
 */
const all = levels as LevelDef[];
const universes = universesJson as UniverseInfo[];
const defs = all.filter((d) => d.stage === 49);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const count = (xs: readonly unknown[]) => xs.filter(Boolean).length;
const hasHidden = (l: Level) => l.hidden.some(Boolean);
const hasTunnel = (l: Level) => l.tunnels.length > 0;
const hasLock = (l: Level) => l.locked.some(Boolean);
const ids = (ls: readonly Level[]) => ls.map((l) => l.id);
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));
/** Stored win rates (#72), measured by gen:levels with the same levelWinRate. */
const stored = new Map(difficulty.levels.map((l) => [l.id, l.winRate]));
const stageMean = (s: number) => mean(all.filter((d) => d.stage === s).map((d) => stored.get(d.id)!));
/** Every card a player has met by the end of stage 48: all of them but the pair card of this stage. */
const BEFORE = ['guide', ...CARD_TIPS.filter((t) => t !== 'hiddenTunnel')];

describe('stage 49 "Buchi neri"', () => {
  it('belongs to universe 5 and is complete', () => {
    expect(universeOfStage(49)).toBe(5);
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
    expect(translate('it', 'stage.blackholes')).toBe('Buchi neri');
    expect(translate('en', 'stage.blackholes')).toBe('Black holes');
    expect(translate('it', 'level.devourer')).toBe('Divoratore');
    expect(translate('en', 'level.horizon')).toBe('Horizon');
    // Stage 48 has a "black hole" level already: this stage's names are all different keys.
    expect(stage.levels.map((l) => l.name)).not.toContain('blackhole');
  });

  it('has IT/EN text for the debut card of the pair', () => {
    for (const lang of ['en', 'it'] as const) {
      for (const key of ['tip.hiddenTunnel.title', 'tip.hiddenTunnel.body'] as const) expect(translate(lang, key)).not.toBe(key);
    }
    expect(translate('it', 'tip.hiddenTunnel.title')).toBe('Nascosti e galleria');
  });

  it('ships as levels 481–490, the boss last, the largest picture and the one 16×16 canvas of the stage', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 481 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(MAX_CANVAS);
    expect([parsed[9]!.width, parsed[9]!.height]).toEqual([16, 16]);
    expect(ids(parsed.filter((l) => l.width === 16 || l.height === 16))).toEqual([490]);
    const pixels = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(pixels[9]).toBe(Math.max(...pixels));
  });

  it('puts hidden pixels and a tunnel on every level, and nothing else from universes 2–4 but brown and padlocks', () => {
    for (const l of parsed) {
      expect(hasHidden(l) && hasTunnel(l), `level ${l.id}`).toBe(true);
      // No ice and no film: a level never carries two pairs (ice + tunnel, hidden + film, hidden + tunnel) at once.
      expect(l.ice.some((n) => n > 0) || l.film.some((f) => f !== 0) || l.stone.some(Boolean), `level ${l.id}`).toBe(false);
      expect(l.columns.some((c) => c.some((b) => b.covered))).toBe(false);
    }
  });

  it('keeps one stretch of tunnel per level, never the whole belt, and every hidden pixel next to a visible one', () => {
    for (const l of parsed) {
      const t = [...l.tunnels].sort((a, b) => a - b);
      expect(t.every((lane, k) => k === 0 || lane === t[k - 1]! + 1), `level ${l.id}`).toBe(true);
      expect(t.length).toBeLessThanOrEqual(6);
      expect(t.length).toBeLessThan(2 * (l.width + l.height));
      l.targets.forEach((_, i) => {
        if (!l.hidden[i]) return;
        const x = i % l.width;
        const near = [x > 0 ? i - 1 : -1, x < l.width - 1 ? i + 1 : -1, i - l.width, i + l.width]
          .filter((n) => n >= 0 && n < l.targets.length && l.targets[n] !== 0 && !l.hidden[n]);
        expect(near.length, `level ${l.id} cell ${i}`).toBeGreaterThan(0);
      });
    }
  });

  it('keeps keys and padlocks on brown pixels, on half the stage, the boss with the most padlocks', () => {
    expect(ids(parsed.filter(hasLock))).toEqual([482, 486, 488, 489, 490]);
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

  it('debuts the pair at 481: hidden pixels and tunnels were never on the same level before', () => {
    expect(PAIR_TIPS.hiddenTunnel).toEqual(['hidden', 'tunnel']);
    const before = all.filter((d) => d.id < 481).map((d) => parseLevel(d));
    expect(before.some(hasHidden)).toBe(true);
    expect(before.some(hasTunnel)).toBe(true);
    expect(ids(before.filter((l) => hasHidden(l) && hasTunnel(l)))).toEqual([]);
    const curve = all.map((d) => curveLevel(parseLevel(d), 0.5));
    expect(curve.find((l) => l.features.includes('hidden+tunnel'))?.id).toBe(481);
  });

  it('proves the pair holds: the solver solves every level of the stage', () => {
    for (const l of parsed) expect(solve(l).solvable, `level ${l.id}`).toBe(true);
  }, 60_000);

  it('brings a novelty to the 481–500 window (#157): the hidden + tunnel pair at 481', () => {
    const curve = all.map((d) => curveLevel(parseLevel(d), 0.5));
    const fresh = novelties(curve).filter((n) => n.id >= 481 && n.id <= 490);
    expect(fresh[0]).toEqual({ id: 481, kind: 'combo', name: 'hidden+tunnel' });
    expect(noveltyGaps(curve, 401, 490)).toEqual([]);
  });

  it('shows the debut card of the pair at 481, once, and no card on the other levels (#77, one card per level)', () => {
    // The queue (a column longer than it shows) is an old card: only the pair card is new at 481.
    expect(tipsPresent(parsed[0]!)).toEqual(['mixing', 'tunnel', 'hidden', 'queue', 'hiddenTunnel']);
    expect(tipOnLevelStart(parsed[0]!, BEFORE)).toBe('hiddenTunnel');
    for (const l of parsed) expect(tipOnLevelStart(l, [...BEFORE, 'hiddenTunnel'])).toBeNull();
    // A player who skipped nothing meets the pair card at 481, not before: no earlier level shows it.
    for (const d of all.filter((x) => x.id < 481)) expect(tipOnLevelStart(parseLevel(d), BEFORE)).not.toBe('hiddenTunnel');
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

  it('follows the saw-tooth (#88): only the debut is very easy, 489 is hard, the boss is the hardest and above the floor', () => {
    const r = winRates();
    expect(r[0]).toBeGreaterThanOrEqual(CURVE.veryEasy);
    expect(r.slice(1).every((w) => w < CURVE.veryEasy)).toBe(true);
    expect(r[8]).toBe(Math.min(...r.slice(0, 9)));
    const prior = all.filter((d) => d.id < 481).map((d) => curveLevel(parseLevel(d), stored.get(d.id)!));
    const errors = checkCurve([...prior, ...parsed.map((l, i) => curveLevel(l, r[i]!))]).filter((v) => v.severity === 'error');
    expect(errors).toEqual([]);
    expect(r[9]).toBe(Math.min(...r));
    expect(r[9]).toBeGreaterThanOrEqual(CURVE.universes[4]!.hardestBoss);
  }, 60_000);

  it('averages about 47% random wins: harder than stage 48, still above the ~45% universe 5 ends at (#103)', () => {
    const m = mean(winRates());
    expect(Math.abs(m - 0.47)).toBeLessThanOrEqual(0.03);
    expect(m).toBeLessThan(stageMean(48));
    expect(m).toBeGreaterThan(0.45);
    // The stored rates are the ones gen:levels measured with the same function.
    expect(stageMean(49)).toBeCloseTo(m, 2);
  }, 60_000);
});

describe('stage 49 unlock', () => {
  const completedTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  it('follows the stage 48 boss: level 481 opens after 480 and the open universe stays 5', () => {
    expect(all.find((d) => d.id === 480)).toMatchObject({ stage: 48, boss: true });
    expect(all.find((d) => d.id === 481)).toMatchObject({ stage: 49 });
    expect(canOpenLevel(all, { unlocked: 481, completed: completedTo(480) }, 481)).toBe(true);
    expect(canOpenLevel(all, { unlocked: 481, completed: completedTo(480) }, 482)).toBe(false);
    expect(openUniverse(all, completedTo(480))).toBe(5);
    expect(mapUniverse(all, { unlocked: 481, completed: completedTo(480) })).toBe(5);
  });

  it('counts the levels of universe 5 on the selector and gives the ninth colour of its bucket style', () => {
    const cards = universeCards(universes, all, completedTo(480));
    expect(cards[4]).toMatchObject({ id: 5, open: true, done: 80, total: all.filter((d) => universeOfStage(d.stage) === 5).length, complete: false, firstLevel: 401 });
    expect(stageSkin(49)).toBe('orbits-9');
  });
});
