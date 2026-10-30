import { describe, expect, it } from 'vitest';
import levels from '../src/levels/levels.json';
import { BROWN, isPrimary } from '../src/core/colors';
import { checkCurve, curveLevel, CURVE } from '../src/core/curve';
import { LEVEL_NAME_KEYS, STAGE_NAME_KEYS, translate } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { levelWinRate } from '../src/core/solver';
import stage from '../scripts/stages/stage-14';

/** Stage 14 "Deserto" (#124): brown, ice and hidden together, levels 131–140. */
const defs = (levels as LevelDef[]).filter((d) => d.stage === 14);
const parsed = defs.map((d) => parseLevel(d));
let rates: number[] | undefined;
const winRates = () => (rates ??= parsed.map(levelWinRate));

describe('stage 14 — Desert', () => {
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

  it('ships as levels 131–140, the boss last and the largest canvas, never over 14×14', () => {
    expect(defs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 131 + i));
    expect(defs.map((d) => !!d.boss)).toEqual([...Array(9).fill(false), true]);
    for (const l of parsed) expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(14);
    const area = parsed.map((l) => l.width * l.height);
    expect(area[9]).toBe(Math.max(...area));
  });

  it('plays brown, ice and hidden on every level, with belt and slots no bigger than the end of universe 1', () => {
    for (const l of parsed) {
      expect(l.targets).toContain(BROWN);
      expect(l.ice.some((n) => n > 0)).toBe(true);
      expect(l.hidden.some(Boolean)).toBe(true);
      expect(l.beltCapacity).toBe(2);
      expect(l.slots).toBe(2);
    }
  });

  it('draws figures with at least 30% secondary or brown pixels after the rest level', () => {
    for (const l of parsed.slice(1)) {
      const pixels = l.targets.filter((t) => t !== 0);
      expect(pixels.filter((t) => !isPrimary(t)).length / pixels.length).toBeGreaterThanOrEqual(CURVE.minSecondaryShare);
    }
  });

  it('follows the saw-tooth (#88) and is never very easy: no new mechanic debuts here', () => {
    const curve = parsed.map((l, i) => curveLevel(l, winRates()[i]!));
    expect(checkCurve(curve).filter((v) => v.rule !== 1)).toEqual([]);
    expect(winRates().filter((r) => r >= CURVE.veryEasy)).toEqual([]);
    // The boss is the hardest level; the stage sits between the start (~80%) and the end (~62%) of universe 2.
    expect(Math.min(...winRates())).toBe(winRates()[9]);
    const mean = winRates().reduce((a, b) => a + b, 0) / 10;
    expect(mean).toBeGreaterThan(0.62);
    expect(mean).toBeLessThan(0.8);
  }, 60_000);
});
