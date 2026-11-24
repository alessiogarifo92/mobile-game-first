import { describe, expect, it } from 'vitest';
import realLevels from '../src/levels/levels.json' with { type: 'json' };
import { defaultProgress, type LevelRef, type Progress } from '../src/core/progress';
import { exportSaveCode, formatRanges, importSaveCode, parseRanges, progressScore } from '../src/core/saveCode';

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
    expect(exportSaveCode(saved)).toMatch(/^MS2\.[A-Za-z0-9_-]+\.[a-z0-9]+$/);
  });

  it('accepts spaces and line breaks added when copying', () => {
    const code = exportSaveCode(saved);
    expect(importSaveCode(`  ${code.slice(0, 20)}\n${code.slice(20)} \n`, levels)).toEqual(saved);
  });

  it.each([
    ['empty', ''],
    ['not a code', 'hello world'],
    ['wrong prefix', 'MS9.e30.abc'],
    ['wrong checksum', 'MS2.e30.abc'],
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

/** Builds a code by hand, with a valid checksum, from any body: the encoder of the given format version. */
function forge(prefix: string, body: unknown): string {
  const text = btoa(JSON.stringify(body)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return `${prefix}.${text}.${(h >>> 0).toString(36)}`;
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const ALL_TIPS = ['guide', 'map', 'mixing', 'blocked', 'slots', 'ice', 'film', 'tunnel', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover'];
/** Five full universes of ten stages: a save with every level done opens all of them and earns every skin. */
const levels500: LevelRef[] = range(1, 500).map((id) => ({ id, stage: Math.ceil(id / 10) }));

describe('save code, compact format (#259)', () => {
  it('writes the completed levels as ranges', () => {
    expect(formatRanges([])).toBe('');
    expect(formatRanges([7])).toBe('7');
    expect(formatRanges(range(1, 166))).toBe('1-166');
    expect(formatRanges([1, 2, 3, 5, 7, 8, 9, 20])).toBe('1-3,5,7-9,20');
    expect(formatRanges([1, 2, 4, 5])).toBe('1-2,4-5');
  });

  it('reads the ranges back, and refuses anything else', () => {
    expect(parseRanges('')).toEqual([]);
    expect(parseRanges('1-3,5,7-9,20')).toEqual([1, 2, 3, 5, 7, 8, 9, 20]);
    for (const bad of ['1-', '-3', '1,,2', '1-3-5', 'a', '1 2', '5-3', '0', '1,0-2', ',1', '1,', '01']) {
      expect(parseRanges(bad), bad).toBeNull();
    }
  });

  it('never expands a forged range beyond the cap a save may hold', () => {
    expect(parseRanges('1-999999999')).toHaveLength(10_000);
    expect(parseRanges('1-9999,20000-30000,40000')).toHaveLength(10_000);
  });

  it('round-trips a save with holes between the ranges', () => {
    // Stage 1 stays fully done, so the save keeps the skin it earned.
    const holes: Progress = { ...saved, unlocked: 21, completed: [...range(1, 10), 12, 14, 15, 16, 20], defeats: { '11': 2, '13': 3 } };
    expect(importSaveCode(exportSaveCode(holes), levels)).toEqual(holes);
  });

  it('round-trips a save with nothing completed', () => {
    expect(importSaveCode(exportSaveCode(defaultProgress()), levels)).toEqual(defaultProgress());
  });

  it('stays short with 500 levels completed and every tip seen', () => {
    const big: Progress = {
      ...defaultProgress(), unlocked: 500, completed: range(1, 500), language: 'it', seenTips: ALL_TIPS, skin: 'orbits-10',
    };
    const code = exportSaveCode(big);
    expect(code.length).toBeLessThan(300);
    expect(importSaveCode(code, levels500)).toEqual(big);
    // With a hole every other level the ranges cannot help, and the code still comes back whole (the last level of
    // each universe is done, or the next universe would stay closed).
    const sparse = { ...big, completed: [...range(1, 250).map((n) => n * 2 - 1), 100, 200, 300, 400].sort((a, b) => a - b) };
    expect(importSaveCode(exportSaveCode(sparse), levels500)?.completed).toEqual(sparse.completed);
  });

  it('accepts spaces and line breaks inside a compact code', () => {
    const code = exportSaveCode(saved);
    const messy = code.match(/.{1,12}/g)!.join(' \n ');
    expect(importSaveCode(`\n${messy}\t`, levels)).toEqual(saved);
  });

  it('rejects a compact code that was cut, at any length', () => {
    const code = exportSaveCode(saved);
    for (let n = 0; n < code.length; n++) expect(importSaveCode(code.slice(0, n), levels), `cut at ${n}`).toBeNull();
  });

  it('rejects a compact body with a valid checksum but a broken shape', () => {
    const ok = { u: 2, c: '1', s: true, l: 'en', t: '', k: 'classic', d: {} };
    expect(importSaveCode(forge('MS2', ok), levels)).toMatchObject({ unlocked: 2, completed: [1] });
    expect(importSaveCode(forge('MS2', { ...ok, c: [1] }), levels)).toBeNull();
    expect(importSaveCode(forge('MS2', { ...ok, c: '3-1' }), levels)).toBeNull();
    expect(importSaveCode(forge('MS2', { ...ok, t: ['guide'] }), levels)).toBeNull();
    expect(importSaveCode(forge('MS2', [1, 2]), levels)).toBeNull();
    expect(importSaveCode(forge('MS2', 'text'), levels)).toBeNull();
    // An old body under the new prefix is not a valid compact code.
    expect(importSaveCode(forge('MS2', saved), levels)).toBeNull();
  });

  it('checks the content of a compact code like a loaded save', () => {
    const forged = forge('MS2', { u: 999, c: '1,99-120', s: false, l: 'xx', t: 'guide,,map', k: 'gold', d: { '1': 3, '2': 2 } });
    expect(importSaveCode(forged, levels)).toEqual({
      ...defaultProgress(), unlocked: 30, completed: [1], sound: false, seenTips: ['guide', 'map'], defeats: { '2': 2 },
    });
  });
});

describe('save code, old format MS1 (backward compatibility)', () => {
  // A real code exported by the game before #259: 166 levels completed, English, classic skin.
  const REAL_MS1 =
    'MS1.eyJ1bmxvY2tlZCI6MTY3LCJjb21wbGV0ZWQiOlsxLDIsMyw0LDUsNiw3LDgsOSwxMCwxMSwxMiwxMywxNCwxNSwxNiwxNywxOCwxOSwyMCwyMSwyMiwyMywyNCwyNSwyNiwyNywyOCwyOSwzMCwzMSwzMiwzMywzNCwzNSwzNiwzNywzOCwzOSw0MCw0MSw0Miw0Myw0NCw0NSw0Niw0Nyw0OCw0OSw1MCw1MSw1Miw1Myw1NCw1NSw1Niw1Nyw1OCw1OSw2MCw2MSw2Miw2Myw2NCw2NSw2Niw2Nyw2OCw2OSw3MCw3MSw3Miw3Myw3NCw3NSw3Niw3Nyw3OCw3OSw4MCw4MSw4Miw4Myw4NCw4NSw4Niw4Nyw4OCw4OSw5MCw5MSw5Miw5Myw5NCw5NSw5Niw5Nyw5OCw5OSwxMDAsMTAxLDEwMiwxMDMsMTA0LDEwNSwxMDYsMTA3LDEwOCwxMDksMTEwLDExMSwxMTIsMTEzLDExNCwxMTUsMTE2LDExNywxMTgsMTE5LDEyMCwxMjEsMTIyLDEyMywxMjQsMTI1LDEyNiwxMjcsMTI4LDEyOSwxMzAsMTMxLDEzMiwxMzMsMTM0LDEzNSwxMzYsMTM3LDEzOCwxMzksMTQwLDE0MSwxNDIsMTQzLDE0NCwxNDUsMTQ2LDE0NywxNDgsMTQ5LDE1MCwxNTEsMTUyLDE1MywxNTQsMTU1LDE1NiwxNTcsMTU4LDE1OSwxNjAsMTYxLDE2MiwxNjMsMTY0LDE2NSwxNjZdLCJzb3VuZCI6dHJ1ZSwibGFuZ3VhZ2UiOiJlbiIsInNlZW5UaXBzIjpbImd1aWRlIiwibWl4aW5nIiwic2xvdHMiLCJsZWZ0b3ZlciIsImJlbHQiLCJicm93biIsInF1ZXVlIiwiaWNlIiwiaGlkZGVuIiwic3RvbmUiLCJibG9ja2VkIl0sInNraW4iOiJjbGFzc2ljIn0.1wy6zfc';
  const shipped = realLevels as LevelRef[];

  it('still imports a real MS1 code against the shipped levels', () => {
    expect(importSaveCode(REAL_MS1, shipped)).toEqual({
      ...defaultProgress(), unlocked: 167, completed: range(1, 166), sound: true, language: 'en', skin: 'classic',
      seenTips: ['guide', 'mixing', 'slots', 'leftover', 'belt', 'brown', 'queue', 'ice', 'hidden', 'stone', 'blocked'],
    });
  });

  it('still accepts the MS1 code split over lines, and rejects it cut', () => {
    expect(importSaveCode(REAL_MS1.match(/.{1,60}/g)!.join('\n'), shipped)?.completed).toHaveLength(166);
    expect(importSaveCode(REAL_MS1.slice(0, -1), shipped)).toBeNull();
    expect(importSaveCode(REAL_MS1.slice(0, 500), shipped)).toBeNull();
  });

  it('re-exports an MS1 save as a much shorter MS2 code with the same content', () => {
    const progress = importSaveCode(REAL_MS1, shipped)!;
    const code = exportSaveCode(progress);
    expect(code.startsWith('MS2.')).toBe(true);
    expect(code.length).toBeLessThan(REAL_MS1.length / 4);
    expect(importSaveCode(code, shipped)).toEqual(progress);
  });

  it('keeps reading an MS1 body built the old way', () => {
    expect(importSaveCode(forge('MS1', saved), levels)).toEqual(saved);
  });
});
