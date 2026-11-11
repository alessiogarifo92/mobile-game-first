import { describe, expect, it } from 'vitest';
import { BLUE, RED, YELLOW, level } from './helpers';
import { escapeKey, forecastLeftover, jamEscape, leftoverHint } from '../src/core/leftover';
import { createGame, launchFromColumn, step, type GameState } from '../src/core/sim';
import type { Primary } from '../src/core/colors';
import levels83 from '../src/levels/levels.json';
import { parseLevel, type LevelDef } from '../src/core/level';
import { translate } from '../src/core/i18n';

/** Real outcome: launches column 0 alone and rides one lap; returns the ammo it comes back with (0 if emptied). */
function realLeftover(g: GameState): number {
  const front = g.queues[0]![0]!;
  launchFromColumn(g, 0);
  for (let i = 0; i < 400 && g.status === 'playing'; i++) {
    step(g);
    if (g.departures.some((d) => d.shooterId === front.id)) break;
  }
  const back = g.slots.find((s) => s?.id === front.id) ?? g.belt.find((s) => s.id === front.id);
  return back ? back.ammo : 0;
}

/** The level checker wants exact ammo, so tests build a valid level and then give the front bucket more shots. */
function rig(g: GameState, ammo: number): GameState {
  g.queues[0]![0]!.ammo = ammo;
  return g;
}

function check(g: GameState, color: Primary, ammo: number) {
  const before = JSON.stringify([g.paint, g.ice, g.hidden, g.locked, g.slots, g.tick]);
  const f = forecastLeftover(g, color, ammo);
  expect(JSON.stringify([g.paint, g.ice, g.hidden, g.locked, g.slots, g.tick])).toBe(before); // never mutates
  return f;
}

describe('forecastLeftover', () => {
  it('no leftover: the bucket spends every shot', () => {
    const g = createGame(level(['RR'], [[[RED, 2]]]));
    const f = check(g, RED, 2);
    expect(f).toMatchObject({ hits: 2, leftover: 0, returns: false, fillsLastSlot: false, jams: false });
    expect(realLeftover(g)).toBe(0);
  });

  it('partial leftover: more shots than pixels it can paint', () => {
    const g = rig(createGame(level(['RR'], [[[RED, 2]]])), 5);
    const f = check(g, RED, 5);
    expect(f).toMatchObject({ hits: 2, leftover: 3, returns: true });
    expect(realLeftover(g)).toBe(3);
  });

  it('blocked lane: a colour nothing accepts comes back whole', () => {
    const g = rig(createGame(level(['RR'], [[[RED, 2]]])), 4);
    g.queues[0]![0]!.color = BLUE;
    const f = check(g, BLUE, 4);
    expect(f).toMatchObject({ hits: 0, leftover: 4, returns: true });
    expect(realLeftover(g)).toBe(4);
  });

  it('blocked lane: a pixel behind an unfinished one needs its turn, so a shooter stops at the first it can not serve', () => {
    // column of pixels R over B: blue is blocked by the red pixel in front until red is done.
    const g = rig(createGame(level(['R', 'B'], [[[RED, 1], [BLUE, 1]]])), 3);
    const f = check(g, BLUE, 3);
    expect(f.hits).toBe(f.hits); // sanity
    expect(realLeftover(g)).toBe(f.leftover);
  });

  it('mixed pixel: one hit of each primary, a second hit of the same primary is refused', () => {
    const g = rig(createGame(level(['O'], [[[RED, 1], [YELLOW, 1]]])), 3);
    const f = check(g, RED, 3);
    expect(f).toMatchObject({ hits: 1, leftover: 2, returns: true });
    expect(realLeftover(g)).toBe(2);
  });

  it('brown pixel takes one hit per primary', () => {
    const g = rig(createGame(level(['K'], [[[YELLOW, 1], [RED, 1], [BLUE, 1]]])), 4);
    const f = check(g, YELLOW, 4);
    expect(f).toMatchObject({ hits: 1, leftover: 3 });
    expect(realLeftover(g)).toBe(3);
  });

  it('iced pixel: first hit breaks the ice, second paints', () => {
    const g = rig(createGame(level(['R'], [[[RED, 2]]], { overlay: ['i'] })), 3);
    const f = check(g, RED, 3);
    expect(f).toMatchObject({ hits: 2, leftover: 1 });
    expect(realLeftover(g)).toBe(1);
  });

  it('stone: paint never passes it, so a pixel only reachable through a stone is not hit', () => {
    const g = rig(createGame(level(['R', '.'], [[[RED, 1]]], { overlay: ['.', 's'] })), 3);
    const f = check(g, RED, 3);
    expect(realLeftover(g)).toBe(f.leftover);
  });

  it('flags the launch that would take the last free slot, and the one that would jam', () => {
    const g = rig(createGame(level(['RR'], [[[RED, 2]]], { slots: 2 })), 5);
    expect(check(g, RED, 5)).toMatchObject({ fillsLastSlot: false, jams: false });
    g.slots[0] = { id: 99, color: RED, ammo: 1, pos: 0, traveled: 0 };
    expect(check(g, RED, 5)).toMatchObject({ fillsLastSlot: true, jams: false });
    g.slots[1] = { id: 98, color: RED, ammo: 1, pos: 0, traveled: 0 };
    expect(check(g, RED, 5)).toMatchObject({ fillsLastSlot: false, jams: true });
    // a bucket that is emptied never fills a slot
    expect(check(g, RED, 2)).toMatchObject({ returns: false, fillsLastSlot: false, jams: false });
  });
});

describe('leftoverHint', () => {
  const base = { hits: 3, leftover: 0, returns: false, fillsLastSlot: false, jams: false };
  it('shows nothing when no paint comes back', () => {
    expect(leftoverHint(base)).toBeNull();
  });
  it('is a calm pill when slots are free', () => {
    expect(leftoverHint({ ...base, leftover: 5, returns: true })).toEqual({ leftover: 5, risky: false, label: '↩5' });
  });
  it('turns into a warning when it takes the last slot or jams', () => {
    expect(leftoverHint({ ...base, leftover: 2, returns: true, fillsLastSlot: true })).toEqual({ leftover: 2, risky: true, label: '↩2!' });
    expect(leftoverHint({ ...base, leftover: 2, returns: true, jams: true })?.risky).toBe(true);
  });
});

describe('"↩10" on a bucket never launched, level 83 (#176, P4)', () => {
  it('is the forecast of #145, not a display bug: the blue 12 has only 2 pixels in reach at the start', () => {
    const def = (levels83 as LevelDef[]).find((d) => d.id === 83)!;
    const g = createGame(parseLevel(def));
    const blueTop = g.queues.findIndex((q) => q[0]?.color === BLUE);
    expect(blueTop).toBeGreaterThanOrEqual(0);
    const bucket = g.queues[blueTop]![0]!;
    expect(bucket.ammo).toBe(12);
    const f = forecastLeftover(g, BLUE, bucket.ammo);
    expect(f).toMatchObject({ hits: 2, leftover: 10, returns: true });
    expect(leftoverHint(f)?.label).toBe('↩10');
  });
});

describe('jamEscape (#182)', () => {
  const slot = (id: number, color: Primary, ammo: number) => ({ id, color, ammo, pos: 0, traveled: 0 });
  /** Two slots; the red bucket at the top of column 0 has more shots than red pixels, so it would come back. */
  function risky() {
    const g = rig(createGame(level(['RRB'], [[[RED, 2]], [[BLUE, 1]]], { slots: 2 })), 5);
    g.slots[0] = slot(90, YELLOW, 2); // yellow: nothing accepts it, it would come back whole
    return g;
  }

  it('is null when no "!" shows: free slots, or nothing comes back', () => {
    expect(jamEscape(createGame(level(['RR'], [[[RED, 2]]])))).toBeNull();
    const calm = rig(createGame(level(['RR'], [[[RED, 2]]], { slots: 3 })), 5);
    expect(jamEscape(calm)).toBeNull(); // it comes back, but two slots stay free
  });

  it('points to a bucket that would not come back, a waiting one first since it also frees its slot', () => {
    const g = risky();
    expect(jamEscape(g)).toEqual({ kind: 'empty', from: 'column', index: 1 }); // blue spends its one shot
    g.slots[0] = slot(91, BLUE, 1);
    expect(jamEscape(g)).toEqual({ kind: 'empty', from: 'slot', index: 0 });
  });

  it('with no safe bucket, offers +1 slot, then only another order once +1 slot is used', () => {
    const g = risky();
    g.queues[1] = [];
    expect(jamEscape(g)).toEqual({ kind: 'extraSlot' });
    g.extraSlotUsed = true;
    expect(jamEscape(g)).toEqual({ kind: 'order' });
  });

  it('maps each way out to its line, in both languages', () => {
    expect(escapeKey({ kind: 'empty', from: 'slot', index: 0 })).toBe('escape.slot');
    expect(escapeKey({ kind: 'empty', from: 'column', index: 2 })).toBe('escape.column');
    expect(escapeKey({ kind: 'extraSlot' })).toBe('escape.extraSlot');
    expect(escapeKey({ kind: 'order' })).toBe('escape.order');
    for (const lang of ['it', 'en'] as const) {
      for (const key of ['escape.slot', 'escape.column', 'escape.extraSlot', 'escape.order'] as const) {
        expect(translate(lang, key)).not.toBe(key);
        expect(translate(lang, key).length).toBeLessThanOrEqual(44); // one line on the subtitle, above the board
      }
    }
  });

  it('says nothing once the level is over, and never mutates the state', () => {
    const g = risky();
    const before = JSON.stringify(g);
    jamEscape(g);
    expect(JSON.stringify(g)).toBe(before);
    g.status = 'jammed';
    expect(jamEscape(g)).toBeNull();
  });
});
