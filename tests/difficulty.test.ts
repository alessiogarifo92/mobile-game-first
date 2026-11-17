import { describe, expect, it } from 'vitest';
import {
  CHANGE_KINDS, CHANGE_RULES, bannerFor, changeReport, changeKey, changesBetween, levelChanges, levelParams, referenceLevel, seenChangeKinds, unseenChanges,
} from '../src/core/difficulty';
import type { LevelDef } from '../src/core/level';
import { DICTIONARIES, LANGUAGES } from '../src/core/i18n';
import levels from '../src/levels/levels.json';

/** A level with a width × height picture, `columns` columns of buckets carrying `ammo` each: only the numbers the comparison reads. */
function lv(id: number, o: Partial<{ stage: number; w: number; h: number; columns: number; slots: number; belt: number; ammo: number; boss: boolean }> = {}): LevelDef {
  const { stage = 1, w = 8, h = 8, columns = 3, slots = 3, belt = 4, ammo = 12, boss = false } = o;
  return {
    id, name: `n${id}`, stage, ...(boss ? { boss } : {}), image: Array.from({ length: h }, () => 'R'.repeat(w)),
    columns: Array.from({ length: columns }, () => [{ color: 1, ammo }, { color: 1, ammo }]), slots, beltCapacity: belt,
  };
}
const kinds = (a: LevelDef, b: LevelDef | null) => changesBetween(a, b).map((c) => c.kind);

describe('levelParams', () => {
  it('reads size, columns, slots, belt and the average bucket', () => {
    const p = levelParams({ ...lv(1, { w: 6, h: 5, columns: 2, slots: 2, belt: 3 }), columns: [[{ color: 1, ammo: 10 }], [{ color: 2, ammo: 20 }, { color: 4, ammo: 30 }]] });
    expect(p).toEqual({ width: 6, height: 5, columns: 2, slots: 2, belt: 3, avgAmmo: 20, boss: false });
  });
});

describe('changesBetween', () => {
  it('the first level of the game changes nothing', () => {
    expect(changesBetween(lv(1), null)).toEqual([]);
  });

  it('no change: same numbers, or an easier level', () => {
    expect(kinds(lv(2), lv(1))).toEqual([]);
    expect(kinds(lv(2, { belt: 5, slots: 4, columns: 2, w: 6, h: 6, ammo: 20 }), lv(1))).toEqual([]);
  });

  it('a lower belt capacity is a change, with the values before and after', () => {
    expect(changesBetween(lv(2, { belt: 3 }), lv(1, { belt: 5 }))).toEqual([{ kind: 'belt', from: 5, to: 3 }]);
  });

  it('fewer slots, more columns', () => {
    expect(changesBetween(lv(2, { slots: 2 }), lv(1))).toEqual([{ kind: 'slots', from: 3, to: 2 }]);
    expect(changesBetween(lv(2, { columns: 4 }), lv(1))).toEqual([{ kind: 'columns', from: 3, to: 4 }]);
  });

  it('a bigger picture counts only from the threshold', () => {
    expect(kinds(lv(2, { h: 9 }), lv(1, { h: 8 }))).toEqual([]); // +12 %
    expect(kinds(lv(2, { h: 10 }), lv(1, { h: 8 }))).toEqual(['canvas']); // +25 %: exactly the threshold
    expect(changesBetween(lv(2, { w: 10, h: 10 }), lv(1))).toEqual([{ kind: 'canvas', from: 64, to: 100 }]);
  });

  it('smaller buckets count only from the threshold', () => {
    expect(kinds(lv(2, { ammo: 10 }), lv(1, { ammo: 12 }))).toEqual([]); // 83 %
    expect(changesBetween(lv(2, { ammo: 9 }), lv(1, { ammo: 12 }))).toEqual([{ kind: 'chunk', from: 12, to: 9 }]); // 75 %
  });

  it('several changes come back in a fixed order', () => {
    const now = lv(2, { belt: 2, slots: 2, columns: 4, w: 12, h: 12, ammo: 6 });
    expect(kinds(now, lv(1))).toEqual(['belt', 'slots', 'canvas', 'columns', 'chunk']);
    expect(kinds(now, lv(1))).toEqual(CHANGE_KINDS.filter((k) => k !== 'boss'));
  });

  it('a boss is announced as a boss, with or without other changes', () => {
    expect(changesBetween(lv(10, { boss: true }), lv(9))).toEqual([{ kind: 'boss', from: 0, to: 1 }]);
    expect(kinds(lv(10, { boss: true, belt: 2 }), lv(9))).toEqual(['belt', 'boss']);
    expect(kinds(lv(10, { boss: true }), null)).toEqual(['boss']);
  });

  it('keeps every threshold in CHANGE_RULES', () => {
    expect(Object.keys(CHANGE_RULES).sort()).toEqual(['beltDrop', 'canvasGrowth', 'chunkShare', 'columnsGain', 'slotsDrop']);
  });
});

describe('referenceLevel', () => {
  const list = [lv(1), lv(2), lv(3, { stage: 1, boss: true }), lv(4, { stage: 2, belt: 2 }), lv(5, { stage: 2 })];

  it('is the level before, inside a stage', () => {
    expect(referenceLevel(list, 2)?.id).toBe(1);
    expect(referenceLevel(list, 5)?.id).toBe(4);
  });

  it('at the start of a stage it is the opening level of the previous stage, not its boss', () => {
    expect(referenceLevel(list, 4)?.id).toBe(1);
  });

  it('is null for the first level and for an unknown one', () => {
    expect(referenceLevel(list, 1)).toBeNull();
    expect(referenceLevel(list, 99)).toBeNull();
  });

  it('levelChanges compares a stage start with the previous stage opening', () => {
    expect(levelChanges(list, 1)).toEqual([]);
    expect(levelChanges(list, 4)).toEqual([{ kind: 'belt', from: 4, to: 2 }]);
    expect(levelChanges(list, 3).map((c) => c.kind)).toEqual(['boss']);
    expect(levelChanges(list, 99)).toEqual([]);
  });
});

describe('what was already told', () => {
  const changes = changesBetween(lv(2, { belt: 2, slots: 2, columns: 4 }), lv(1));

  it('keeps the changes not yet saved, and nothing once saved', () => {
    expect(unseenChanges(changes, []).map((c) => c.kind)).toEqual(['belt', 'slots', 'columns']);
    expect(unseenChanges(changes, ['chg.belt.2', 'ice']).map((c) => c.kind)).toEqual(['slots', 'columns']);
    expect(unseenChanges(changes, changes.map(changeKey))).toEqual([]);
  });

  it('belt and slots are saved with the value they fall to: a new floor is news, the same one is not', () => {
    expect(changeKey({ kind: 'belt', from: 4, to: 3 })).toBe('chg.belt.3');
    expect(changeKey({ kind: 'slots', from: 3, to: 2 })).toBe('chg.slots.2');
    expect(changeKey({ kind: 'columns', from: 3, to: 4 })).toBe('chg.columns');
    const drop = [{ kind: 'belt' as const, from: 3, to: 2 }];
    expect(unseenChanges(drop, ['chg.belt.3'])).toEqual(drop);
    expect(unseenChanges(drop, ['chg.belt.2'])).toEqual([]);
  });

  it('seenChangeKinds lists the saved kinds in the fixed order, ignoring other tips', () => {
    expect(seenChangeKinds(['guide', 'chg.chunk', 'chg.belt.3', 'chg.belt.2', 'chg.nope', 'chg.beltx'])).toEqual(['belt', 'chunk']);
  });
});

describe('bannerFor', () => {
  const c = (kind: (typeof CHANGE_KINDS)[number]) => ({ kind, from: 0, to: 1 });

  it('nothing unseen, no banner', () => {
    expect(bannerFor([])).toEqual([]);
  });

  it('belt and slots together make one banner', () => {
    expect(bannerFor([c('belt'), c('slots'), c('columns')]).map((x) => x.kind)).toEqual(['belt', 'slots']);
  });

  it('a boss comes before the other kinds; otherwise the first kind alone', () => {
    expect(bannerFor([c('canvas'), c('boss')]).map((x) => x.kind)).toEqual(['boss']);
    expect(bannerFor([c('canvas'), c('columns'), c('chunk')]).map((x) => x.kind)).toEqual(['canvas']);
  });
});

describe('the shipped levels', () => {
  const all = levels as LevelDef[];
  it('announce something at a handful of levels, never at the first, and every kind shows up', () => {
    expect(levelChanges(all, 1)).toEqual([]);
    const seen = new Set(all.flatMap((l) => levelChanges(all, l.id).map((x) => x.kind)));
    expect([...seen].sort()).toEqual([...CHANGE_KINDS].sort());
  });

  it('a player who meets the levels in order is told each change once, at most one banner a level', () => {
    let known: string[] = [];
    const told: number[] = [];
    for (const l of all) {
      const shown = bannerFor(unseenChanges(levelChanges(all, l.id), known));
      if (shown.length) told.push(l.id);
      known = [...known, ...shown.map(changeKey)];
    }
    expect(new Set(known).size).toBe(known.length);
    // Belt (5 values), slots (4 values) and the four other kinds: a bounded number of banners in the whole game.
    expect(told.length).toBeLessThanOrEqual(CHANGE_KINDS.length + 8);
    expect(told[0]).toBeGreaterThan(1);
  });
});

describe('the messages', () => {
  /** What fits on one line of the banner at 24 px on a 360 px phone: the strip stays two lines tall (#77). */
  const MAX_WHY = 46;

  it('every kind has a label and a "why" in every language, each "why" short enough for one line', () => {
    for (const lang of LANGUAGES) {
      const dict = DICTIONARIES[lang] as Record<string, string>;
      for (const kind of CHANGE_KINDS) {
        expect(dict[`change.${kind}.label`], `${lang} ${kind} label`).toBeTruthy();
        expect(dict[`change.${kind}.why`], `${lang} ${kind} why`).toBeTruthy();
        expect(dict[`change.${kind}.why`]!.length, `${lang} ${kind} why`).toBeLessThanOrEqual(MAX_WHY);
      }
      expect(dict['change.limits.why']!.length).toBeLessThanOrEqual(MAX_WHY);
      // The kinds that carry a number say it, so the figure is never written in code.
      for (const kind of ['belt', 'slots', 'columns']) expect(dict[`change.${kind}.fact`]).toContain('{n}');
    }
  });
});

describe('changeReport', () => {
  it('lists the levels that change something, marking where a player in order is told', () => {
    const list = [lv(1), lv(2, { slots: 2 }), lv(3, { slots: 2, belt: 2, w: 10, h: 10 }), lv(4, { stage: 1, boss: true, slots: 2, belt: 2, w: 10, h: 10 })];
    expect(changeReport(list)).toEqual([
      '▶ 2 slots 3→2',
      '▶ 3 belt 4→2 · canvas 64→100px',
      '▶ 4 boss',
    ]);
  });

  it('a change already told, or one that lost the banner to another, has no marker', () => {
    const list = [lv(1), lv(2, { slots: 2 }), lv(3), lv(4, { slots: 2 })];
    expect(changeReport(list)).toEqual(['▶ 2 slots 3→2', '  4 slots 3→2']);
  });
});
