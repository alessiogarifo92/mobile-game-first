import { describe, expect, it } from 'vitest';
import { DICTIONARIES } from '../src/core/i18n';
import { bandOf, type DifficultyFile } from '../src/core/difficulty';
import { bandsById, comfortOffered, levelMark } from '../src/core/difficultyMark';
import { HINT_AFTER_DEFEATS, defaultProgress, hintOffered, recordDefeat, sanitize } from '../src/core/progress';
import { LEVELS_PER_STAGE } from '../src/core/stages';
import storedJson from '../src/levels/difficulty.json';

const stored = storedJson as DifficultyFile;

describe('level mark (#73, direction A)', () => {
  it('marks only a boss and a hard level, and never an easy or normal one', () => {
    expect(levelMark('hard', false)).toBe('hard');
    expect(levelMark('normal', false)).toBeNull();
    expect(levelMark('easy', false)).toBeNull();
    // A level that was never measured shows nothing.
    expect(levelMark(undefined, false)).toBeNull();
  });

  it('gives a boss one mark whatever its band, so a hard boss is not marked twice', () => {
    for (const band of ['easy', 'normal', 'hard', undefined] as const) expect(levelMark(band, true)).toBe('boss');
  });

  it('reads the stored band of every level and agrees with the one table of #72', () => {
    const bands = bandsById(stored.levels);
    expect(bands.size).toBe(stored.levels.length);
    for (const l of stored.levels) expect(bands.get(l.id)).toBe(bandOf(l.winRate));
    expect(bands.get(0)).toBeUndefined();
  });

  it('marks hard levels on the real data without a fixed count of stages', () => {
    const bands = bandsById(stored.levels);
    const marked = stored.levels.filter((l) => levelMark(bands.get(l.id), l.id % LEVELS_PER_STAGE === 0) === 'hard');
    expect(marked.length).toBeGreaterThan(0);
    // The diamond is the exception: most levels carry nothing.
    expect(marked.length).toBeLessThan(stored.levels.length / 2);
    for (const l of marked) expect(l.band).toBe('hard');
  });
});

describe('comfort on the jam panel', () => {
  it('shows only on a hard level and only once the hint is offered', () => {
    expect(comfortOffered('hard', true)).toBe(true);
    expect(comfortOffered('hard', false)).toBe(false);
    expect(comfortOffered('normal', true)).toBe(false);
    expect(comfortOffered('easy', true)).toBe(false);
    expect(comfortOffered(undefined, true)).toBe(false);
  });

  it('rests on the defeat counter the save already has: three defeats in a row, an old save works unchanged', () => {
    let p = sanitize({ unlocked: 5, completed: [1, 2, 3, 4], sound: true, language: 'en', seenTips: [] });
    expect(p.defeats).toEqual({});
    for (let i = 1; i < HINT_AFTER_DEFEATS; i++) {
      p = recordDefeat(p, 5);
      expect(comfortOffered('hard', hintOffered(p, 5))).toBe(false);
    }
    p = recordDefeat(p, 5);
    expect(comfortOffered('hard', hintOffered(p, 5))).toBe(true);
    // A new profile has no defeats at all: nothing to migrate.
    expect(comfortOffered('hard', hintOffered(defaultProgress(), 5))).toBe(false);
  });
});

describe('texts', () => {
  it('has the difficulty texts in both languages', () => {
    for (const key of ['diff.hard', 'diff.boss', 'diff.winHard', 'diff.winBoss', 'diff.jamHard'] as const) {
      expect(DICTIONARIES.en[key].length).toBeGreaterThan(0);
      expect(DICTIONARIES.it[key].length).toBeGreaterThan(0);
    }
  });

  it('keeps the tone gentle: no text calls a level easy or the player wrong', () => {
    const all = Object.entries(DICTIONARIES).flatMap(([, d]) => ['diff.hard', 'diff.boss', 'diff.winHard', 'diff.winBoss', 'diff.jamHard'].map((k) => (d as Record<string, string>)[k]!));
    for (const text of all) expect(text).not.toMatch(/\b(easy|facile|failed|fallito|sbagliat|wrong)\b/i);
  });
});
