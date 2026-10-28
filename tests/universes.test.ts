import { describe, expect, it } from 'vitest';
import { UNIVERSE_NAME_KEYS, translate, universeName } from '../src/core/i18n';
import { LEVELS_PER_STAGE, type StageContent } from '../src/core/stages';
import {
  MAX_CANVAS, STAGES_PER_UNIVERSE, UniverseError, canOpenLevel, isUniverseComplete, isUniverseUnlocked, lastLevelOf,
  openUniverse, universeLevels, universeOf, universeOfStage, validateUniverses, type UniverseInfo,
} from '../src/core/universes';
import { STAGE_SPECS } from '../scripts/stages';
import { UNIVERSE_SPECS } from '../scripts/universes';
import universesJson from '../src/levels/universes.json';

/** A game with `n` levels in full stages of LEVELS_PER_STAGE (only the last one may be partial). */
const game = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, stage: Math.floor(i / LEVELS_PER_STAGE) + 1 }));
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

type Pic = { name: string; image: string[] };
const square = (side: number) => Array.from({ length: side }, () => 'R'.repeat(side));
/** Stage files for `stages` stages (all complete but the last when `lastPartial`), pictures of side `side`. */
const stageFiles = (stages: number, { lastPartial = false, side = 8 } = {}): StageContent<Pic>[] =>
  Array.from({ length: stages }, (_, i) => {
    const partial = lastPartial && i === stages - 1;
    const levels = Array.from({ length: partial ? 5 : LEVELS_PER_STAGE }, (_, k) => ({ name: `s${i + 1}l${k}`, image: square(side) }));
    return { stage: i + 1, key: `s${i + 1}`, color: 'R', ...(partial ? {} : { complete: true }), levels };
  });
const universes = (n: number, maxCanvas = 14): UniverseInfo[] => Array.from({ length: n }, (_, i) => ({ id: i + 1, key: `u${i + 1}`, color: 'B', maxCanvas }));
const keys = new Set(Array.from({ length: 10 }, (_, i) => `u${i + 1}`));

describe('universes', () => {
  it('puts STAGES_PER_UNIVERSE stages in each universe', () => {
    expect([1, 10, 11, 20, 21, 50].map(universeOfStage)).toEqual([1, 1, 2, 2, 3, 5]);
    expect(STAGES_PER_UNIVERSE * LEVELS_PER_STAGE).toBe(100);
  });

  it('finds the universe, levels and last level of 1, 2 and 5 universes', () => {
    for (const n of [1, 2, 5]) {
      const levels = game(n * 100);
      expect(universeOf(levels, n * 100)).toBe(n);
      expect(universeLevels(levels, n)).toEqual(range((n - 1) * 100 + 1, n * 100));
      expect(lastLevelOf(levels, n)).toBe(n * 100);
      expect(isUniverseComplete(levels, n)).toBe(true);
    }
    expect(universeOf(game(100), 101)).toBeUndefined();
    expect(universeLevels(game(100), 2)).toEqual([]);
    expect(lastLevelOf(game(100), 2)).toBeUndefined();
  });

  it('handles a universe still being built and ids that are not multiples of 100', () => {
    const levels = game(205);
    expect(universeOf(levels, 201)).toBe(3);
    expect(universeLevels(levels, 3)).toEqual(range(201, 205));
    expect(lastLevelOf(levels, 3)).toBe(205);
    expect(isUniverseComplete(levels, 2)).toBe(true);
    expect(isUniverseComplete(levels, 3)).toBe(false);
  });

  it('opens universe n+1 only with the last level of universe n', () => {
    const levels = game(300);
    expect(isUniverseUnlocked(levels, [], 1)).toBe(true);
    expect(isUniverseUnlocked(levels, range(1, 99), 2)).toBe(false);
    expect(isUniverseUnlocked(levels, range(1, 100), 2)).toBe(true);
    expect(isUniverseUnlocked(levels, range(1, 100), 3)).toBe(false);
    // Level 200 alone does not open universe 3: universe 2 must be open too.
    expect(isUniverseUnlocked(levels, [200], 3)).toBe(false);
    expect(isUniverseUnlocked(levels, range(1, 200), 3)).toBe(true);
    // A universe with no levels is never open, even with everything completed.
    expect(isUniverseUnlocked(levels, range(1, 300), 4)).toBe(false);
    expect(isUniverseUnlocked([], [], 1)).toBe(false);
    expect([openUniverse(levels, []), openUniverse(levels, range(1, 100)), openUniverse(levels, range(1, 300)), openUniverse([], [])]).toEqual([1, 2, 3, 0]);
  });

  it('lets the core refuse a level of a closed universe, whatever the save claims', () => {
    const levels = game(200);
    expect(canOpenLevel(levels, { unlocked: 50, completed: range(1, 49) }, 50)).toBe(true);
    expect(canOpenLevel(levels, { unlocked: 50, completed: range(1, 49) }, 51)).toBe(false);
    expect(canOpenLevel(levels, { unlocked: 150, completed: range(1, 99) }, 101)).toBe(false);
    expect(canOpenLevel(levels, { unlocked: 101, completed: range(1, 100) }, 101)).toBe(true);
    expect(canOpenLevel(levels, { unlocked: 300, completed: range(1, 200) }, 201)).toBe(false); // no such level
    expect(canOpenLevel(levels, { unlocked: 1, completed: [] }, 0)).toBe(false);
  });

  it('accepts 1, 2 and 5 universes and a last universe still in progress', () => {
    expect(() => validateUniverses(universes(1), stageFiles(10), keys)).not.toThrow();
    expect(() => validateUniverses(universes(2), stageFiles(20), keys)).not.toThrow();
    expect(() => validateUniverses(universes(5), stageFiles(50), keys)).not.toThrow();
    expect(() => validateUniverses(universes(2), stageFiles(13, { lastPartial: true }), keys)).not.toThrow();
    expect(() => validateUniverses(universes(1, 16), stageFiles(10, { side: 16 }), keys)).not.toThrow();
  });

  it.each([
    ['numbering', [{ ...universes(1)[0]!, id: 2 }], stageFiles(10), 'numbered 1..n'],
    ['unknown key', [{ ...universes(1)[0]!, key: 'nope' }], stageFiles(10), 'no translation key universe.nope'],
    ['duplicate key', [universes(1)[0]!, { ...universes(2)[1]!, key: 'u1' }], stageFiles(20), 'key "u1" is used twice'],
    ['colour', [{ ...universes(1)[0]!, color: 'X' }], stageFiles(10), 'colour "X"'],
    ['canvas above the maximum', universes(1, MAX_CANVAS + 1), stageFiles(10), `between 1 and ${MAX_CANVAS}`],
    ['canvas not an integer', universes(1, 12.5), stageFiles(10), 'between 1 and'],
    ['stage in no universe', universes(1), stageFiles(11), 'universe 2, which is not in the universe list'],
    ['universe without stages', universes(2), stageFiles(10), 'universe 2 has no stages'],
    ['17×17 picture', universes(1, MAX_CANVAS), stageFiles(10, { side: 17 }), 'is 17×17, universe 1 allows up to 16×16'],
    ['15×15 picture in a 14×14 universe', universes(1), stageFiles(10, { side: 15 }), 'allows up to 14×14'],
  ] as const)('rejects %s', (_name, list, stages, message) => {
    expect(() => validateUniverses(list, stages, keys)).toThrow(UniverseError);
    expect(() => validateUniverses(list, stages, keys)).toThrow(message);
  });

  it('rejects a universe that is not complete when another comes after it', () => {
    const files = stageFiles(20);
    files[9] = { ...files[9]!, complete: false };
    expect(() => validateUniverses(universes(2), files, keys)).toThrow('universe 1 is not complete');
  });

  it('describes the shipped universes: valid against the stage files and named in every language', () => {
    expect(() => validateUniverses(UNIVERSE_SPECS, STAGE_SPECS, UNIVERSE_NAME_KEYS)).not.toThrow();
    expect(universesJson).toEqual(UNIVERSE_SPECS);
    for (const u of UNIVERSE_SPECS) {
      expect(u.maxCanvas).toBeLessThanOrEqual(u.id <= 4 ? 14 : MAX_CANVAS);
      for (const lang of ['en', 'it']) expect(universeName(lang, u.key)).not.toBe(`universe.${u.key}`);
    }
    expect(translate('it', 'universe.locked', { n: 100 })).toBe('Completa il livello 100 per aprire');
    expect(translate('en', 'universe.locked', { n: 200 })).toBe('Complete level 200 to open');
  });
});
