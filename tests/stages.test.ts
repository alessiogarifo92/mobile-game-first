import { describe, expect, it } from 'vitest';
import { LEVELS_PER_STAGE, STAGES, StageError, assignIds, specHash, stableStringify, stageInfo, validateStages } from '../src/core/stages';

const names = new Set(Array.from({ length: 30 }, (_, i) => `n${i}`));
const lv = (from: number, count: number) => Array.from({ length: count }, (_, i) => ({ name: `n${from + i}` }));

describe('stages', () => {
  it('defines ten stages with unique keys', () => {
    expect(STAGES).toHaveLength(10);
    expect(new Set(STAGES.map((s) => s.key)).size).toBe(10);
    expect(stageInfo(4)?.key).toBe('garden');
    expect(stageInfo(11)).toBeUndefined();
  });

  it('accepts complete stages and a partial last stage', () => {
    expect(() => validateStages([{ stage: 1, complete: true, levels: lv(0, 10) }, { stage: 2, levels: lv(10, 3) }], names)).not.toThrow();
  });

  it.each([
    [[{ stage: 2, levels: lv(0, 1) }], 'numbered 1..n'],
    [[{ stage: 1, levels: lv(0, 11) }], 'max 10'],
    [[{ stage: 1, complete: true, levels: lv(0, 9) }], 'marked complete'],
    [[{ stage: 1, levels: [] }, { stage: 2, levels: lv(0, 1) }], 'is empty'],
    [[{ stage: 1, levels: [{ name: 'unknown' }] }], 'no translation key'],
    [[{ stage: 1, levels: [{ name: 'n1' }, { name: 'n1' }] }], 'used twice'],
  ])('rejects invalid stage files %#', (stages, message) => {
    expect(() => validateStages(stages, names)).toThrow(StageError);
    expect(() => validateStages(stages, names)).toThrow(message);
  });

  it('rejects a stage number beyond the ten themes', () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ stage: i + 1, levels: lv(0, 0) }));
    expect(() => validateStages(many, names)).toThrow();
  });

  it('assigns sequential ids across stages and marks the 10th level as boss', () => {
    const out = assignIds([{ stage: 1, levels: lv(0, LEVELS_PER_STAGE) }, { stage: 2, levels: lv(10, 2) }]);
    expect(out.map((l) => l.id)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(out.filter((l) => l.boss).map((l) => l.id)).toEqual([10]);
    expect(out[10]).toMatchObject({ stage: 2, name: 'n10', boss: false });
  });

  it('hashes specs stably regardless of key order, and differently when they change', () => {
    expect(stableStringify({ b: 1, a: [1, { d: 2, c: 3 }], u: undefined })).toBe('{"a":[1,{"c":3,"d":2}],"b":1}');
    expect(specHash({ a: 1, b: 2 })).toBe(specHash({ b: 2, a: 1 }));
    expect(specHash({ a: 1 })).not.toBe(specHash({ a: 2 }));
    expect(specHash('x')).toMatch(/^[0-9a-f]{8}$/);
  });
});
