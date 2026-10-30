import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import { BROWN, isPrimary } from '../src/core/colors';
import { checkCurve, curveLevel, CURVE } from '../src/core/curve';
import { LEVEL_NAME_KEYS, STAGE_NAME_KEYS, translate } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { levelWinRate } from '../src/core/solver';
import stage from '../scripts/stages/stage-15';

/** Stage 15 "Giungla" (#125): stones debut at level 141, then stones alone, levels 141–150. */
const defs = (levels as LevelDef[]).filter((d) => d.stage === 15);
const parsed = defs.map((d) => parseLevel(d));
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));

describe('stage 15 — Jungle', () => {
  it('is complete, with IT/EN names for the stage and every level', () => {
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
  });

  it('ships as levels 141–150, the boss last and the largest canvas, never over 14×14', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 141 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(14);
    const area = parsed.map((l) => l.width * l.height);
    expect(area[9]).toBe(Math.max(...area));
  });

  it('plays stones on every level and no other mechanic (brown + stone is the new combination of stage 17)', () => {
    for (const l of parsed) {
      expect(l.stone.some(Boolean)).toBe(true);
      expect(l.targets).not.toContain(BROWN);
      expect(l.ice.some((n) => n > 0)).toBe(false);
      expect(l.hidden.some(Boolean)).toBe(false);
      expect(l.beltCapacity).toBe(2);
    }
    // After the debut, belt and slots are no bigger than the end of universe 1.
    for (const l of parsed.slice(1)) expect(l.slots).toBe(2);
  });

  it('draws figures with at least 30% secondary pixels after the debut', () => {
    for (const l of parsed.slice(1)) {
      const pixels = l.targets.filter((t) => t !== 0);
      expect(pixels.filter((t) => !isPrimary(t)).length / pixels.length).toBeGreaterThanOrEqual(CURVE.minSecondaryShare);
    }
  });

  it('follows the saw-tooth (#88): only the debut is very easy, the boss is the hardest', () => {
    const curve = parsed.map((l, i) => curveLevel(l, winRates()[i]!));
    expect(checkCurve(curve)).toEqual([]);
    expect(winRates()[0]).toBeGreaterThanOrEqual(CURVE.veryEasy);
    expect(winRates().slice(1).filter((r) => r >= CURVE.veryEasy)).toEqual([]);
    expect(Math.min(...winRates())).toBe(winRates()[9]);
    // Between stage 14 (~75%) and the end of universe 2 (~62%), the easy debut included.
    const mean = winRates().reduce((a, b) => a + b, 0) / 10;
    expect(mean).toBeGreaterThan(0.62);
    expect(mean).toBeLessThan(0.75);
  }, 60_000);
});
