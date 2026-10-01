import { describe, expect, it } from 'vitest';
import { defaultProgress, type Progress } from '../src/core/progress';
import { exportSaveCode, importSaveCode, progressScore } from '../src/core/saveCode';

const levels = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, stage: Math.floor(i / 10) + 1 }));
const saved: Progress = {
  ...defaultProgress(), unlocked: 12, completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], language: 'it', sound: false,
  seenTips: ['guide', 'mixing'], skin: 'dots',
};

describe('save code', () => {
  it('round-trips the progress', () => {
    expect(importSaveCode(exportSaveCode(saved), levels)).toEqual(saved);
  });

  it('is plain text safe to paste anywhere', () => {
    expect(exportSaveCode(saved)).toMatch(/^MS1\.[A-Za-z0-9_-]+\.[a-z0-9]+$/);
  });

  it('accepts spaces and line breaks added when copying', () => {
    const code = exportSaveCode(saved);
    expect(importSaveCode(`  ${code.slice(0, 20)}\n${code.slice(20)} \n`, levels)).toEqual(saved);
  });

  it.each([
    ['empty', ''],
    ['not a code', 'hello world'],
    ['wrong prefix', 'MS2.e30.abc'],
    ['missing checksum', 'MS1.e30'],
    ['extra part', 'MS1.e30.abc.def'],
  ])('rejects %s', (_name, code) => {
    expect(importSaveCode(code, levels)).toBeNull();
  });

  it('rejects a code that was cut or changed by one character', () => {
    const code = exportSaveCode(saved);
    expect(importSaveCode(code.slice(0, -4), levels)).toBeNull();
    const [p, body, sum] = code.split('.');
    const flipped = (body![5] === 'A' ? 'B' : 'A');
    expect(importSaveCode(`${p}.${body!.slice(0, 5)}${flipped}${body!.slice(6)}.${sum}`, levels)).toBeNull();
  });

  it('rejects a body that is not JSON or not an object, even with a valid checksum', () => {
    const make = (json: string) => {
      const exported = exportSaveCode(saved).split('.');
      // Reuse the module's own encoding through a throwaway code with the same prefix.
      const body = btoa(json).replace(/=+$/, '');
      let h = 0x811c9dc5;
      for (let i = 0; i < body.length; i++) h = Math.imul(h ^ body.charCodeAt(i), 0x01000193);
      return `${exported[0]}.${body}.${(h >>> 0).toString(36)}`;
    };
    expect(importSaveCode(make('not json'), levels)).toBeNull();
    expect(importSaveCode(make('42'), levels)).toBeNull();
    expect(importSaveCode(make('null'), levels)).toBeNull();
  });

  it('checks the content like a loaded save: out-of-range ids and an unearned skin are dropped', () => {
    const forged = exportSaveCode({ ...defaultProgress(), unlocked: 999, completed: [1, 99], skin: 'gold' });
    expect(importSaveCode(forged, levels)).toMatchObject({ unlocked: 30, completed: [1], skin: 'classic' });
  });

  it('scores a more advanced save higher', () => {
    expect(progressScore(saved)).toBeGreaterThan(progressScore(defaultProgress()));
    expect(progressScore({ ...saved, completed: [1] })).toBeLessThan(progressScore(saved));
  });
});
