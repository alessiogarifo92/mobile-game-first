import { describe, expect, it } from 'vitest';
import { ORANGE, RED } from '../src/core/colors';
import {
  LEVELS_PER_STAGE, StageError, assignIds, moreLevelsComing, specHash, stableStringify, stageInfo, stageInfos, validateStages, type StageContent,
} from '../src/core/stages';

const names = new Set(Array.from({ length: 200 }, (_, i) => `n${i}`));
const keys = new Set(Array.from({ length: 20 }, (_, i) => `k${i + 1}`));
const lv = (from: number, count: number) => Array.from({ length: count }, (_, i) => ({ name: `n${from + i}` }));
/** `sizes[i]` levels in stage i + 1; every stage but the last is complete unless `lastComplete` covers it. */
const game = (sizes: number[], lastComplete = sizes.at(-1) === LEVELS_PER_STAGE): StageContent<{ name: string }>[] => {
  let from = 0;
  return sizes.map((n, i) => {
    const s = { stage: i + 1, key: `k${i + 1}`, color: 'R', complete: i < sizes.length - 1 || lastComplete, levels: lv(from, n) };
    from += n;
    return s;
  });
};
const stage = (over: Partial<StageContent<{ name: string }>>) => ({ stage: 1, key: 'k1', color: 'R', levels: lv(0, 1), ...over });

describe('stages', () => {
  it('accepts any number of complete stages and a partial last stage', () => {
    for (const sizes of [[10], [5], [10, 3], Array(10).fill(10), [...Array(10).fill(10), 10], [...Array(10).fill(10), 7]]) {
      expect(() => validateStages(game(sizes), names, keys)).not.toThrow();
    }
  });

  it.each([
    [[stage({ stage: 2 })], 'numbered 1..n'],
    [[stage({ key: 'nope' })], 'no translation key stage.nope'],
    [[stage({ complete: true, levels: lv(0, 10) }), stage({ stage: 2, levels: lv(10, 1) })], 'key "k1" is used twice'],
    [[stage({ color: 'X' })], 'colour "X"'],
    [[stage({ levels: lv(0, 11) })], `max ${LEVELS_PER_STAGE}`],
    [[stage({ complete: true, levels: lv(0, 9) })], 'marked complete'],
    [[stage({ levels: [] })], 'is empty'],
    [[stage({ levels: lv(0, 10) }), stage({ stage: 2, key: 'k2', levels: lv(10, 1) })], 'stage 1 is not complete'],
    [[stage({ levels: [{ name: 'unknown' }] })], 'no translation key level.unknown'],
    [[stage({ levels: [{ name: 'n1' }, { name: 'n1' }] })], 'used twice'],
  ])('rejects invalid stage files %#', (stages, message) => {
    expect(() => validateStages(stages, names, keys)).toThrow(StageError);
    expect(() => validateStages(stages, names, keys)).toThrow(message);
  });

  it('describes each stage for the game: key, paint colour and whether it is complete', () => {
    const infos = stageInfos([{ ...stage({ complete: true }) }, stage({ stage: 2, key: 'k2', color: 'O' })]);
    expect(infos).toEqual([{ id: 1, key: 'k1', color: RED, complete: true }, { id: 2, key: 'k2', color: ORANGE, complete: false }]);
    expect(stageInfo(infos, 2)?.key).toBe('k2');
    expect(stageInfo(infos, 3)).toBeUndefined();
  });

  it('says more levels are coming only while the last stage is incomplete', () => {
    expect(moreLevelsComing([])).toBe(false);
    expect(moreLevelsComing(stageInfos(game(Array(10).fill(10))))).toBe(false);
    expect(moreLevelsComing(stageInfos(game([...Array(10).fill(10), 10])))).toBe(false);
    expect(moreLevelsComing(stageInfos(game([10, 5])))).toBe(true);
    expect(moreLevelsComing(stageInfos(game([10, 10], false)))).toBe(true);
  });

  it('assigns sequential ids across stages and marks the last level of each full stage as boss', () => {
    const out = assignIds([{ stage: 1, levels: lv(0, LEVELS_PER_STAGE) }, { stage: 2, levels: lv(10, 2) }]);
    expect(out.map((l) => l.id)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(out.filter((l) => l.boss).map((l) => l.id)).toEqual([10]);
    expect(out[10]).toMatchObject({ stage: 2, name: 'n10', boss: false });
  });

  it('numbers 12 stages and a total that is not a multiple of ten', () => {
    const out = assignIds(game([...Array(10).fill(10), 10, 4]));
    expect(out).toHaveLength(114);
    expect(out.filter((l) => l.boss).map((l) => l.id)).toEqual(Array.from({ length: 11 }, (_, i) => (i + 1) * 10));
    expect(out.at(-1)).toMatchObject({ id: 114, stage: 12, boss: false });
  });

  it('hashes specs stably regardless of key order, and differently when they change', () => {
    expect(stableStringify({ b: 1, a: [1, { d: 2, c: 3 }], u: undefined })).toBe('{"a":[1,{"c":3,"d":2}],"b":1}');
    expect(specHash({ a: 1, b: 2 })).toBe(specHash({ b: 2, a: 1 }));
    expect(specHash({ a: 1 })).not.toBe(specHash({ a: 2 }));
    expect(specHash('x')).toMatch(/^[0-9a-f]{8}$/);
  });
});
