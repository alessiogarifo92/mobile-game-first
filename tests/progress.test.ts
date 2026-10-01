import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, completeLevel, defaultProgress, loadProgress, saveProgress, type KeyValueStorage } from '../src/core/progress';

function memory(initial?: string): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORAGE_KEY, initial);
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

const throwing: KeyValueStorage = {
  getItem: () => { throw new Error('SecurityError'); },
  setItem: () => { throw new Error('QuotaExceeded'); },
};

describe('progress', () => {
  it('starts fresh when nothing is stored or storage is missing', () => {
    expect(loadProgress(memory())).toEqual(defaultProgress());
    expect(loadProgress(undefined)).toEqual(defaultProgress());
  });

  it('round-trips through storage', () => {
    const s = memory();
    const p = { unlocked: 3, completed: [1, 2], sound: false };
    expect(saveProgress(s, p)).toBe(true);
    expect(loadProgress(s)).toEqual(p);
  });

  it.each(['not json', 'null', '42', '{"unlocked":-1,"completed":"x","sound":"yes"}'])('falls back on corrupt data %s', (raw) => {
    expect(loadProgress(memory(raw))).toEqual(defaultProgress());
  });

  it('drops invalid and duplicate completed entries', () => {
    expect(loadProgress(memory('{"unlocked":2,"completed":[2,1,1,0,"a",1.5],"sound":true}')).completed).toEqual([1, 2]);
  });

  it('never throws when storage is inaccessible', () => {
    expect(loadProgress(throwing)).toEqual(defaultProgress());
    expect(saveProgress(throwing, defaultProgress())).toBe(false);
    expect(saveProgress(undefined, defaultProgress())).toBe(false);
  });

  it('completing a level unlocks the next one, capped at the last level', () => {
    let p = completeLevel(defaultProgress(), 1, 3);
    expect(p).toMatchObject({ unlocked: 2, completed: [1] });
    p = completeLevel(p, 1, 3); // replay does not duplicate
    expect(p.completed).toEqual([1]);
    p = completeLevel(completeLevel(p, 2, 3), 3, 3);
    expect(p).toMatchObject({ unlocked: 3, completed: [1, 2, 3] });
  });

  it('replaying an old level never re-locks progress', () => {
    expect(completeLevel({ unlocked: 5, completed: [1, 2, 3, 4], sound: true }, 2, 10).unlocked).toBe(5);
  });
});
