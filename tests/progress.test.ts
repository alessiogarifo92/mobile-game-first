import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, completeLevel, defaultProgress, loadProgress, markTipSeen, resetProgress, saveProgress, type KeyValueStorage } from '../src/core/progress';

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
    const p = { unlocked: 3, completed: [1, 2], sound: false, language: 'it' as const, seenTips: ['guide'], skin: 'classic' as const };
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
    expect(completeLevel({ ...defaultProgress(), unlocked: 5, completed: [1, 2, 3, 4] }, 2, 10).unlocked).toBe(5);
  });

  it('defaults to English with no tips seen, also for saves from before v0.2', () => {
    expect(defaultProgress()).toMatchObject({ language: 'en', seenTips: [] });
    const old = loadProgress(memory('{"unlocked":4,"completed":[1,2,3],"sound":false}'));
    expect(old).toMatchObject({ unlocked: 4, language: 'en', seenTips: [] });
  });

  it('falls back to the classic skin for unknown values', () => {
    expect(loadProgress(memory('{"skin":"plaid"}')).skin).toBe('classic');
  });

  it('rejects an unknown language and invalid tips', () => {
    expect(loadProgress(memory('{"language":"xx","seenTips":["a",1,"a",null]}'))).toMatchObject({ language: 'en', seenTips: ['a'] });
  });

  it('records a seen tip once', () => {
    const p = markTipSeen(markTipSeen(defaultProgress(), 'guide'), 'guide');
    expect(p.seenTips).toEqual(['guide']);
  });

  describe('against the real level list', () => {
    // 3 stages of 10 levels: stage 1 completes with levels 1-10 and unlocks the 'dots' skin.
    const levels = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, stage: Math.floor(i / 10) + 1 }));
    const load = (o: object) => loadProgress(memory(JSON.stringify(o)), levels);

    it('raises unlocked above the highest completed level', () => {
      expect(load({ unlocked: 1, completed: [1, 2, 3, 4, 5] }).unlocked).toBe(6);
    });

    it('caps unlocked and drops ids outside 1..levels', () => {
      expect(load({ unlocked: 1e308, completed: [2, 31, 999] })).toMatchObject({ unlocked: 30, completed: [2] });
      expect(load({ unlocked: 99, completed: [] }).unlocked).toBe(30);
      expect(load({ unlocked: 30, completed: [30] }).unlocked).toBe(30);
    });

    it('truncates an oversized completed array', () => {
      const big = Array.from({ length: 50_000 }, (_, i) => i + 1);
      expect(load({ completed: big }).completed.length).toBe(30);
    });

    it('ignores a skin the player has not unlocked', () => {
      expect(load({ skin: 'gold', completed: [] }).skin).toBe('classic');
      expect(load({ skin: 'dots', completed: levels.slice(0, 10).map((l) => l.id) }).skin).toBe('dots');
    });
  });

  it('reset erases levels, tips and skin but keeps language and sound', () => {
    const played = { ...defaultProgress(), unlocked: 40, completed: [1, 2, 3], seenTips: ['guide'], skin: 'dots' as const, language: 'it' as const, sound: false };
    expect(resetProgress(played)).toEqual({ ...defaultProgress(), language: 'it', sound: false });
  });
});
