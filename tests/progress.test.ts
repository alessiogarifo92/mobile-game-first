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

    it('keeps a universe skin or variant only once earned (#92)', () => {
      const game = Array.from({ length: 300 }, (_, i) => ({ id: i + 1, stage: Math.floor(i / 10) + 1 }));
      const loadGame = (o: object) => loadProgress(memory(JSON.stringify(o)), game);
      const upTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
      expect(loadGame({ skin: 'petals-1', completed: upTo(110) }).skin).toBe('petals-1');
      expect(loadGame({ skin: 'petals-2', completed: upTo(110) }).skin).toBe('classic');
      expect(loadGame({ skin: 'petals', completed: upTo(199) }).skin).toBe('classic');
      expect(loadGame({ skin: 'petals', completed: upTo(200) }).skin).toBe('petals');
      expect(loadGame({ skin: 'stamps', completed: upTo(200) }).skin).toBe('classic');
      expect(loadGame({ skin: 'petals-11', completed: upTo(200) }).skin).toBe('classic');
      // Skins of universe 1 stay valid for players who earned them before universe skins existed.
      expect(loadGame({ skin: 'gold', completed: upTo(100) }).skin).toBe('gold');
    });
  });

  describe('after an update that adds levels', () => {
    // A player who finished the 100-level game, then the game grows to 110 levels (11 stages).
    const levelsOf = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, stage: Math.floor(i / 10) + 1 }));
    const all = levelsOf(100).map((l) => l.id);
    let finished = defaultProgress();
    for (const id of all) finished = completeLevel(finished, id, 100);

    it('keeps every completed level and the earned skin, and opens the first new level', () => {
      expect(finished.unlocked).toBe(100);
      const saved = JSON.stringify({ ...finished, skin: 'gold' });
      const p = loadProgress(memory(saved), levelsOf(110));
      expect(p).toMatchObject({ completed: all, unlocked: 101, skin: 'gold' });
      expect(completeLevel(p, 101, 110).unlocked).toBe(102);
    });

    it('a player midway keeps their place', () => {
      const p = loadProgress(memory(JSON.stringify({ unlocked: 43, completed: levelsOf(42).map((l) => l.id) })), levelsOf(110));
      expect(p).toMatchObject({ unlocked: 43 });
      expect(p.completed).toHaveLength(42);
    });
  });

  describe('universes (#90)', () => {
    const levelsOf = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, stage: Math.floor(i / 10) + 1 }));
    const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
    const load = (o: object, n: number) => loadProgress(memory(JSON.stringify(o)), levelsOf(n));

    it('the 100 levels of today, after the update to 200, open universe 2 at level 101', () => {
      expect(load({ unlocked: 100, completed: range(1, 100) }, 200)).toMatchObject({ unlocked: 101, completed: range(1, 100) });
    });

    it('a hand-edited unlock cannot reach a closed universe', () => {
      expect(load({ unlocked: 150, completed: range(1, 99) }, 200)).toMatchObject({ unlocked: 100, completed: range(1, 99) });
      expect(load({ unlocked: 1e9, completed: [] }, 300).unlocked).toBe(100);
    });

    it('levels completed in a closed universe are dropped, so they cannot open the next one', () => {
      // Level 200 without level 100: universe 2 is closed, so 150 and 200 go, and universe 3 stays closed.
      expect(load({ unlocked: 201, completed: [...range(1, 99), 150, 200] }, 300)).toMatchObject({ unlocked: 100, completed: range(1, 99) });
      // Universe 2 open, universe 3 not (no level 200): its levels go, unlock stops at 200.
      const p = load({ unlocked: 250, completed: [...range(1, 150), 201, 205] }, 300);
      expect(p.completed).toEqual(range(1, 150));
      expect(p.unlocked).toBe(200);
    });

    it('a finished universe 2 opens universe 3, even if it is still being built', () => {
      expect(load({ unlocked: 200, completed: range(1, 200) }, 205)).toMatchObject({ unlocked: 201 });
    });
  });

  it('reset erases levels, tips and skin but keeps language and sound', () => {
    const played = { ...defaultProgress(), unlocked: 40, completed: [1, 2, 3], seenTips: ['guide'], skin: 'dots' as const, language: 'it' as const, sound: false };
    expect(resetProgress(played)).toEqual({ ...defaultProgress(), language: 'it', sound: false });
  });
});
