import { describe, expect, it } from 'vitest';
import { DEFAULT_LANGUAGE, DICTIONARIES, LANGUAGES, LANGUAGE_NAMES, LEVEL_NAME_KEYS, isLanguage, levelName, stageName, translate } from '../src/core/i18n';
import { STAGE_SPECS } from '../scripts/stages';

describe('i18n', () => {
  it('defaults to English', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
    expect(translate('en', 'win.next')).toBe('Next');
  });

  it('every language has exactly the English keys, none empty', () => {
    const keys = Object.keys(DICTIONARIES.en).sort();
    for (const lang of LANGUAGES) {
      const dict = DICTIONARIES[lang] as Record<string, string>;
      expect(Object.keys(dict).sort()).toEqual(keys);
      expect(Object.values(dict).every((v) => v.trim().length > 0)).toBe(true);
      expect(LANGUAGE_NAMES[lang]).toBeTruthy();
    }
  });

  it('translates to Italian', () => {
    expect(translate('it', 'win.next')).toBe('Avanti');
  });

  it('fills placeholders and leaves unknown ones visible', () => {
    expect(translate('en', 'win.summary', { name: 'Heart', moves: 4 })).toBe('"Heart" painted in 4 moves');
    expect(translate('en', 'level.title')).toBe('Level {n}');
  });

  it('falls back to English for unknown languages and to the key for unknown keys', () => {
    expect(translate('fr', 'win.next')).toBe('Next');
    expect(translate('it', 'no.such.key')).toBe('no.such.key');
  });

  it('uses the singular when the count is 1, in both languages (#229)', () => {
    expect(translate('en', 'change.belt.fact', { n: 1 })).toBe('Belt: max 1 bucket');
    expect(translate('it', 'change.belt.fact', { n: 1 })).toBe('Nastro: max 1 secchiello');
    expect(translate('en', 'tip.belt.body', { n: 1 })).toContain('only 1 bucket at a time');
    expect(translate('it', 'tip.belt.body', { n: 1 })).toContain('solo 1 secchiello alla volta');
    expect(translate('en', 'win.summary', { name: 'Heart', moves: 1 })).toBe('"Heart" painted in 1 move');
    expect(translate('it', 'win.summary', { name: 'Cuore', moves: 1 })).toBe('"Cuore" completato in 1 mossa');
  });

  it('keeps the plural for every other count, 0 and 2 included (#229)', () => {
    for (const n of [0, 2, 3, 12]) {
      expect(translate('en', 'change.belt.fact', { n })).toBe(`Belt: max ${n} buckets`);
      expect(translate('it', 'change.belt.fact', { n })).toBe(`Nastro: max ${n} secchielli`);
    }
    expect(translate('en', 'win.summary', { name: 'Heart', moves: 21 })).toBe('"Heart" painted in 21 moves');
    expect(translate('it', 'win.summary', { name: 'Cuore', moves: 21 })).toBe('"Cuore" completato in 21 mosse');
    // A count given as text is not the number 1: no singular guess.
    expect(translate('en', 'change.belt.fact', { n: '1' })).toBe('Belt: max 1 buckets');
  });

  it('keys with no singular variant ignore a count of 1 (#229)', () => {
    expect(translate('en', 'level.title', { n: 1 })).toBe('Level 1');
    expect(translate('it', 'change.slots.fact', { n: 1 })).toBe('Slot: 1');
  });

  it('every singular entry has a plural base and exists in every language (#229)', () => {
    for (const lang of LANGUAGES) {
      const dict = DICTIONARIES[lang] as Record<string, string>;
      for (const key of Object.keys(dict).filter((k) => k.endsWith('.one'))) {
        expect(dict[key.slice(0, -4)], `${lang} ${key}`).toBeDefined();
        expect(dict[key]).not.toMatch(/\{n\}|\{moves\}/);
      }
    }
  });

  it('validates languages', () => {
    expect(isLanguage('it')).toBe(true);
    expect(isLanguage('xx')).toBe(false);
    expect(isLanguage(3)).toBe(false);
  });

  it('names levels and stages by stable key', () => {
    expect(levelName('en', 'heart')).toBe('Heart');
    expect(levelName('it', 'heart')).toBe('Cuore');
    expect(levelName('en', 'nope')).toBe('level.nope');
    expect(stageName('it', 'fruit')).toBe('Frutta');
    expect(LEVEL_NAME_KEYS.has('parrot')).toBe(true);
    expect(LEVEL_NAME_KEYS.has('title')).toBe(false);
  });

  it('names every stage in every language', () => {
    for (const s of STAGE_SPECS) for (const lang of LANGUAGES) expect(stageName(lang, s.key)).not.toBe(`stage.${s.key}`);
  });
});

describe('stage vs universe wording (#154)', () => {
  it('calls the end of a stage "Stage", never "Mondo", in Italian', () => {
    expect(translate('it', 'win.stageComplete')).toBe('Stage completato! Nuovo stile dei secchielli');
    expect(translate('it', 'win.stageCompleteNoSkin')).toBe('Stage completato!');
    expect(translate('it', 'map.stage', { n: 3 })).toBe('Stage 3');
    expect(translate('en', 'win.stageCompleteNoSkin')).toBe('Stage complete!');
  });

  it('keeps "mondo" out of every Italian text', () => {
    const offenders = Object.entries(DICTIONARIES.it).filter(([, v]) => /\bmond[oi]\b/i.test(v));
    expect(offenders).toEqual([]);
  });
});
