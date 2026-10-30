import { describe, expect, it } from 'vitest';
import { isPrimary } from '../src/core/colors';
import { CURVE } from '../src/core/curve';
import { DICTIONARIES, type MessageKey } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { levelWinRate } from '../src/core/solver';
import levels from '../src/levels/levels.json' with { type: 'json' };
import stages from '../src/levels/stages.json' with { type: 'json' };
import stage11 from '../scripts/stages/stage-11';

/** Stage 11 "Bosco" (#121): the first stage of universe 2, where brown debuts (#94). */
const defs = levels as LevelDef[];
const inStage = (s: number) => defs.filter((d) => d.stage === s);
const forest = inStage(11);
const parsed = forest.map(parseLevel);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

// Random playouts over 30 levels, computed once.
let rates: Map<number, number[]> | undefined;
const winRates = (s: number) => (rates ??= new Map([1, 10, 11].map((n) => [n, inStage(n).map((d) => levelWinRate(parseLevel(d)))]))).get(s)!;

describe('stage 11 "Bosco"', () => {
  it('is complete: levels 101–110, the oak boss last', () => {
    expect(stage11.complete).toBe(true);
    expect(stages.find((s) => s.id === 11)).toMatchObject({ key: 'forest', complete: true });
    expect(forest.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => 101 + i));
    expect(forest.filter((d) => d.boss).map((d) => d.name)).toEqual(['oak']);
  });

  it('names every level in English and Italian', () => {
    for (const d of forest) {
      const key = `level.${d.name}` as MessageKey;
      expect(DICTIONARIES.en[key]).toBeTruthy();
      expect(DICTIONARIES.it[key]).toBeTruthy();
    }
    expect(DICTIONARIES.it['level.oak']).toBe('Quercia');
  });

  it('uses only brown as a mechanic, on canvases up to 14×14, with the boss the largest picture', () => {
    for (const l of parsed) {
      expect(l.ice.every((n) => n === 0) && !l.hidden.some(Boolean) && !l.stone.some(Boolean) && !l.locked.some(Boolean)).toBe(true);
      expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(14);
    }
    const area = parsed.map((l) => l.targets.filter((t) => t !== 0).length);
    expect(Math.max(...area)).toBe(area[9]);
  });

  it('draws brown in every picture and keeps at least 30% of pixels to mix after the debut', () => {
    for (const d of forest) expect(d.image.some((row) => row.includes('K'))).toBe(true);
    for (const l of parsed.slice(1)) {
      const pixels = l.targets.filter((t) => t !== 0);
      const mixed = pixels.filter((t) => !isPrimary(t)).length;
      expect(mixed / pixels.length).toBeGreaterThanOrEqual(CURVE.minSecondaryShare);
    }
  });

  it('never gives back a bigger belt or more slots than the end of universe 1', () => {
    const maxBelt = Math.max(...inStage(10).map((d) => d.beltCapacity));
    const maxSlots = Math.max(...inStage(10).map((d) => d.slots));
    for (const d of forest) {
      expect(d.beltCapacity).toBeLessThanOrEqual(maxBelt);
      expect(d.slots).toBeLessThanOrEqual(maxSlots);
    }
  });

  it('follows the saw-tooth: only the debut is very easy, 109 is hard and the boss is the hardest', () => {
    const r = winRates(11);
    expect(r[0]).toBeGreaterThanOrEqual(CURVE.veryEasy);
    expect(r.slice(1).every((w) => w < CURVE.veryEasy)).toBe(true);
    const base = [2, 3, 5, 6, 8].map((p) => r[p - 1]!).sort((a, b) => a - b)[2]!;
    expect(r[3]).toBeLessThanOrEqual(base + CURVE.tolerance);
    expect(r[6]).toBeLessThanOrEqual(base + CURVE.tolerance);
    expect(r[8]).toBeLessThanOrEqual(base - CURVE.hardGap);
    expect(r[9]).toBe(Math.min(...r));
  }, 60_000);

  it('averages about 80% random wins: easier than the end of universe 1, harder than its start', () => {
    const m = mean(winRates(11));
    expect(m).toBeGreaterThan(0.75);
    expect(m).toBeLessThan(0.85);
    expect(m).toBeGreaterThan(mean(winRates(10)));
    expect(m).toBeLessThan(mean(winRates(1)));
  }, 60_000);
});
