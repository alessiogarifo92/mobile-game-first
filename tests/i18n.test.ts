import { describe, expect, it } from 'vitest';
import { DEFAULT_LANGUAGE, DICTIONARIES, LANGUAGES, LANGUAGE_NAMES, LEVEL_NAME_KEYS, isLanguage, levelName, stageName, translate } from '../src/core/i18n';
import { STAGES } from '../src/core/stages';

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
    for (const s of STAGES) for (const lang of LANGUAGES) expect(stageName(lang, s.key)).not.toBe(`stage.${s.key}`);
  });
});
