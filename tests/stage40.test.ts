import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import difficulty from '../src/levels/difficulty.json';
import { universeSkin } from '../src/core/album';
import { BROWN, isPrimary } from '../src/core/colors';
import { CURVE, checkCurve, curveLevel } from '../src/core/curve';
import { LEVEL_NAME_KEYS, STAGE_NAME_KEYS, translate } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { tipOnLevelStart } from '../src/core/onboarding';
import { levelWinRate } from '../src/core/solver';
import { isUniverseComplete, isUniverseFinished, isUniverseUnlocked, lastLevelOf, openUniverse, universeOfStage } from '../src/core/universes';
import stage from '../scripts/stages/stage-40';

/** Stage 40 "Arcobaleno" (#245): last stage of universe 4 "Mare e cielo"; everything together, and the boss 400 closes the universe. */
const all = levels as LevelDef[];
const defs = all.filter((d) => d.stage === 40);
const parsed = defs.map((d) => parseLevel(d));
const inStage = (s: number) => all.filter((d) => d.stage === s).map((d) => parseLevel(d));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));
/** Stored win rates (#72), measured by gen:levels with the same levelWinRate. */
const stored = new Map(difficulty.levels.map((l) => [l.id, l.winRate]));
const storedOf = (ids: number[]) => ids.map((id) => stored.get(id)!);
const idsOfStages = (from: number, to: number) => all.filter((d) => d.stage >= from && d.stage <= to).map((d) => d.id);

describe('stage 40 "Arcobaleno"', () => {
  it('belongs to universe 4, is complete and closes it', () => {
    expect(universeOfStage(40)).toBe(4);
    expect(stage.complete).toBe(true);
    expect(stage.levels).toHaveLength(10);
    expect(isUniverseComplete(all, 4)).toBe(true);
    expect(lastLevelOf(all, 4)).toBe(400);
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
    expect(translate('it', 'stage.rainbow')).toBe('Arcobaleno');
    expect(translate('en', 'stage.rainbow')).toBe('Rainbow');
    expect(translate('it', 'level.greatrainbow')).toBe('Il grande arcobaleno');
  });

  it('ships as levels 391–400, the boss last and the largest picture, never over 14×14', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 391 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(14);
    expect(Math.max(parsed[9]!.width, parsed[9]!.height)).toBe(14);
    const pixels = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(pixels[9]).toBe(Math.max(...pixels));
  });

  it('keeps a tunnel, a key, locks and brown on every level, mixes in films, stones and covered buckets, shows no card, and has no ice or hidden pixels', () => {
    const seen = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover', 'film', 'tunnel'] as const;
    for (const l of parsed) {
      expect(l.tunnels.length).toBeGreaterThan(0);
      expect(l.keys.some(Boolean)).toBe(true);
      expect(l.locked.some(Boolean)).toBe(true);
      expect(l.targets).toContain(BROWN);
      expect(l.ice.some((n) => n > 0) || l.hidden.some(Boolean)).toBe(false);
      expect(tipOnLevelStart(l, [...seen])).toBeNull();
    }
    const film = (l: (typeof parsed)[number]) => l.film.some((f) => f !== 0);
    const stone = (l: (typeof parsed)[number]) => l.stone.some(Boolean);
    const covered = (l: (typeof parsed)[number]) => l.columns.some((c) => c.some((sh) => sh.covered));
    for (const l of parsed.slice(1)) expect([film(l), stone(l), covered(l)].filter(Boolean).length).toBeGreaterThanOrEqual(2);
    for (const has of [film, stone, covered]) expect(parsed.filter(has).length).toBeGreaterThanOrEqual(5);
    expect(film(parsed[9]!) && stone(parsed[9]!) && covered(parsed[9]!)).toBe(true);
    // The final boss has the most keys and locks of the stage.
    const count = (xs: readonly unknown[]) => xs.filter(Boolean).length;
    expect(count(parsed[9]!.keys)).toBe(Math.max(...parsed.map((l) => count(l.keys))));
    expect(count(parsed[9]!.locked)).toBe(Math.max(...parsed.map((l) => count(l.locked))));
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

  it('follows the saw-tooth (#88): no level is very easy, 399 is hard, the boss is the hardest and above the floor', () => {
    const r = winRates();
    expect(r.every((w) => w < CURVE.veryEasy)).toBe(true);
    expect(checkCurve(parsed.map((l, i) => curveLevel(l, r[i]!))).filter((v) => v.severity === 'error')).toEqual([]);
    expect(r[9]).toBe(Math.min(...r));
    expect(r[9]).toBeGreaterThanOrEqual(CURVE.universes[3]!.hardestBoss);
  }, 60_000);

  it('averages about 50% random wins, the end target of universe 4, harder than stage 39', () => {
    const m = mean(winRates());
    expect(Math.abs(m - CURVE.universes[3]!.endMean)).toBeLessThanOrEqual(0.02);
    expect(m).toBeLessThan(mean(storedOf(idsOfStages(39, 39))));
  }, 120_000);
});

describe('universe 4 "Mare e cielo" closes (#102)', () => {
  const bosses = all.filter((d) => d.boss && universeOfStage(d.stage) === 4).map((d) => d.id);

  it('meets the universe targets: first stage ~68%, last ~50%, the final boss 400 the hardest boss and at least 22%', () => {
    expect(Math.abs(mean(storedOf(idsOfStages(31, 31))) - 0.68)).toBeLessThanOrEqual(0.03);
    expect(Math.abs(mean(storedOf(idsOfStages(40, 40))) - CURVE.universes[3]!.endMean)).toBeLessThanOrEqual(CURVE.endMeanTolerance);
    const bossRates = storedOf(bosses);
    expect(bosses).toEqual([310, 320, 330, 340, 350, 360, 370, 380, 390, 400]);
    expect(bossRates[9]).toBe(Math.min(...bossRates));
    expect(bossRates.filter((r) => r === bossRates[9])).toHaveLength(1);
    expect(bossRates[9]).toBeGreaterThanOrEqual(CURVE.universes[3]!.hardestBoss);
    // Rule 3: stages 39–40 are clearly harder than stages 31–32.
    expect(mean(storedOf(idsOfStages(39, 40)))).toBeLessThan(mean(storedOf(idsOfStages(31, 32))) - CURVE.tolerance);
  });

  it('finishing level 400 finishes the universe, gives its bucket style and opens universe 5 (#265)', () => {
    const completed = Array.from({ length: 400 }, (_, i) => i + 1);
    expect(isUniverseFinished(all, completed.slice(0, -1), 4)).toBe(false);
    expect(isUniverseFinished(all, completed, 4)).toBe(true);
    expect(universeSkin(4)).toBe('bubbles');
    expect(isUniverseUnlocked(all, completed.slice(0, -1), 5)).toBe(false);
    expect(isUniverseUnlocked(all, completed, 5)).toBe(true);
    expect(openUniverse(all, completed)).toBe(5);
  });
});

describe('stage 40 unlock', () => {
  const completedTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  it('follows the stage 39 boss: level 391 is the first of stage 40 and the open universe stays 4', () => {
    expect(all.find((d) => d.id === 390)).toMatchObject({ stage: 39, boss: true });
    expect(all.find((d) => d.id === 391)).toMatchObject({ stage: 40 });
    expect(all.find((d) => d.id === 400)).toMatchObject({ stage: 40, boss: true });
    expect(openUniverse(all, completedTo(390))).toBe(4);
  });
});
