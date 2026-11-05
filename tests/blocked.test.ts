import { describe, expect, it } from 'vitest';
import { BLUE, RED, YELLOW, level } from './helpers';
import { BLOCKERS_PULSE_MS, BLOCKERS_REST_ALPHA, blockExample, blockerAlpha, blockerSignature, blockingCells, cloneGame, refuseSlotLaunch, slotLaunchHits, unlockColors } from '../src/core/blocked';
import { createGame, launchFromColumn, launchFromSlot, step, type GameState } from '../src/core/sim';

/** Runs the belt until it is empty (or the game ends). */
function settle(g: GameState): GameState {
  for (let i = 0; i < 2000 && g.status === 'playing' && (g.belt.length > 0 || g.pending.length > 0); i++) step(g);
  return g;
}

/** Yellow centre walled in by red: a yellow bucket can land nothing until the red ring is done. */
function walled(): GameState {
  const g = createGame(level(['RRR', 'RYR', 'RRR'], [[[RED, 8]], [[YELLOW, 1]]]));
  launchFromColumn(g, 1);
  settle(g); // the yellow bucket rides a lap in vain and waits in slot 0
  expect(g.slots[0]).toMatchObject({ color: YELLOW, ammo: 1 });
  return g;
}

/** What really happens: launches the slot and counts the shots that bucket lands before it leaves the belt. */
function realHits(g: GameState, slot: number): number {
  const id = g.slots[slot]!.id;
  launchFromSlot(g, slot);
  let hits = 0;
  for (let i = 0; i < 2000 && g.status === 'playing'; i++) {
    step(g);
    hits += g.events.filter((e) => e.shooterId === id).length;
    if (g.departures.some((d) => d.shooterId === id)) break;
  }
  return hits;
}

describe('cloneGame', () => {
  it('copies deeply: playing the copy leaves the original untouched', () => {
    const g = createGame(level(['RR'], [[[RED, 2]]]));
    const before = JSON.stringify(g);
    const c = cloneGame(g);
    launchFromColumn(c, 0);
    settle(c);
    expect(c.status).toBe('won');
    expect(JSON.stringify(g)).toBe(before);
  });
});

describe('slotLaunchHits', () => {
  it('a walled-in bucket lands nothing; the real launch agrees, and the state is not touched', () => {
    const g = walled();
    const before = JSON.stringify(g);
    expect(slotLaunchHits(g, 0)).toBe(0);
    expect(JSON.stringify(g)).toBe(before);
    expect(realHits(g, 0)).toBe(0);
  });

  it('counts the buckets already on the belt: red ahead opens the lane, so yellow lands its shot', () => {
    const g = walled();
    launchFromColumn(g, 0); // red rides first and finishes the ring before yellow gets round
    const predicted = slotLaunchHits(g, 0);
    expect(predicted).toBe(realHits(cloneGame(g), 0));
    expect(predicted).toBe(1);
  });

  it('null when nothing can be said: empty slot, full belt, game over', () => {
    const g = walled();
    expect(slotLaunchHits(g, 1)).toBeNull();
    const full = cloneGame(g);
    full.level = { ...full.level, beltCapacity: 1 };
    launchFromColumn(full, 0);
    expect(slotLaunchHits(full, 0)).toBeNull();
    const over = cloneGame(g);
    over.status = 'jammed';
    expect(slotLaunchHits(over, 0)).toBeNull();
  });

  it('null when the copy ends before the bucket finishes its lap (here a win): the launch is never refused', () => {
    // Red rides ahead and finishes the ring; yellow paints the centre on its way and the picture is done mid-lap.
    const g = walled();
    g.slots[0]!.ammo = 2;
    launchFromColumn(g, 0);
    expect(slotLaunchHits(g, 0)).toBeNull();
    expect(refuseSlotLaunch(g, 0)).toBeNull();
    launchFromSlot(g, 0);
    settle(g);
    expect(g.status).toBe('won'); // the real game agrees
  });
});

describe('blockingCells', () => {
  it('points at the pixel in front of each lane that leads to a wanted pixel', () => {
    const g = walled();
    // The centre is reached only through the middle of each side: top (1), left (3), right (5), bottom (7).
    expect(blockingCells(g.level, g, g.lanes, YELLOW)).toEqual([1, 3, 5, 7]);
  });

  it('keeps only the closest blockers when some sit right in front of the wanted pixel', () => {
    const g = createGame(level(['RRRR', 'RYRR', 'RRRR'], [[[RED, 11]], [[YELLOW, 1]]]));
    // Yellow (cell 5) sits right behind 1 (top), 4 (left) and 9 (bottom); from the right two reds (7, 6) stand in front.
    expect(blockingCells(g.level, g, g.lanes, YELLOW)).toEqual([1, 4, 9]);
  });

  it('falls back to every lane front when the wanted pixel lies deeper on all sides', () => {
    const g = createGame(level(['RRRRR', 'RRRRR', 'RRYRR', 'RRRRR', 'RRRRR'], [[[RED, 24]], [[YELLOW, 1]]]));
    expect(blockingCells(g.level, g, g.lanes, YELLOW)).toEqual([2, 10, 14, 22]);
  });

  it('nothing to point at for a colour the picture does not need, or once the lane is open', () => {
    const g = walled();
    expect(blockingCells(g.level, g, g.lanes, BLUE)).toEqual([]);
    for (const cell of [0, 1, 2, 3, 5, 6, 7, 8]) g.paint[cell] = RED;
    expect(blockingCells(g.level, g, g.lanes, YELLOW)).toEqual([]);
  });

  it('a lane whose front takes the colour is not blocked', () => {
    const g = createGame(level(['RR'], [[[RED, 2]]]));
    expect(blockingCells(g.level, g, g.lanes, RED)).toEqual([]);
  });

  it('stones, hidden and locked pixels block too', () => {
    const stone = createGame(level(['R.R', '.Y.'], [[[RED, 2]], [[YELLOW, 1]]], { overlay: ['.s.', '...'] }));
    expect(stone.level.stone[1]).toBe(true);
    // From the top, the stone stands over the yellow pixel (cell 4).
    expect(blockingCells(stone.level, stone, stone.lanes, YELLOW)).toContain(1);
    const hidden = createGame(level(['RB'], [[[RED, 1]], [[BLUE, 1]]], { overlay: ['h.'] }));
    // From the left the hidden red pixel stands before blue.
    expect(blockingCells(hidden.level, hidden, hidden.lanes, BLUE)).toEqual([0]);
  });
});

describe('refuseSlotLaunch', () => {
  it('refuses a bucket that would land nothing, and says what is in its way', () => {
    expect(refuseSlotLaunch(walled(), 0)).toEqual({ blockers: [1, 3, 5, 7] });
  });

  it('allows a bucket that would land a shot, and ignores empty slots', () => {
    const g = walled();
    expect(refuseSlotLaunch(g, 1)).toBeNull();
    launchFromColumn(g, 0);
    expect(refuseSlotLaunch(g, 0)).toBeNull();
  });
});

describe('unlockColors (#176)', () => {
  const ORANGE = RED | YELLOW;
  it('an unfinished mixed pixel needs every primary it still misses, in R, Y, B order', () => {
    const g = createGame(level(['O'], [[[RED, 1]], [[YELLOW, 1]]]));
    expect(unlockColors(g.level, g, 0)).toEqual([RED, YELLOW]);
    g.paint[0] = RED;
    expect(unlockColors(g.level, g, 0)).toEqual([YELLOW]);
  });

  it('nothing for a finished pixel, an empty cell or out of range', () => {
    const g = createGame(level(['R.'], [[[RED, 1]]]));
    g.paint[0] = RED;
    expect(unlockColors(g.level, g, 0)).toEqual([]);
    expect(unlockColors(g.level, g, 1)).toEqual([]);
    expect(unlockColors(g.level, g, 99)).toEqual([]);
    expect(ORANGE).toBe(RED | YELLOW);
  });

  it('a frozen pixel needs its own colour to break the ice', () => {
    const g = createGame(level(['R'], [[[RED, 2]]], { overlay: ['i'] }));
    expect(g.ice[0]).toBeGreaterThan(0);
    expect(unlockColors(g.level, g, 0)).toEqual([RED]);
  });

  it('no colour opens a stone, a hidden pixel or a locked one', () => {
    const stone = createGame(level(['R.R'], [[[RED, 2]]], { overlay: ['.s.'] }));
    expect(unlockColors(stone.level, stone, 1)).toEqual([]);
    const hidden = createGame(level(['RR'], [[[RED, 2]]], { overlay: ['.h'] }));
    expect(unlockColors(hidden.level, hidden, 1)).toEqual([]);
    const locked = createGame(level(['RR'], [[[RED, 2]]]));
    locked.locked[1] = true;
    expect(unlockColors(locked.level, locked, 1)).toEqual([]);
  });
});

describe('blockExample (#176)', () => {
  it('describes the refused bucket: its colour, the red pixel in the way (opened by red), the yellow pixel behind', () => {
    const g = walled();
    const refusal = refuseSlotLaunch(g, 0)!;
    const ex = blockExample(g.level, g, g.lanes, YELLOW, refusal.blockers);
    expect(ex).toEqual({ color: YELLOW, front: { kind: 'pixel', target: RED, paint: 0, ice: false, unlock: [RED] }, behind: YELLOW });
  });

  it('reports a stone, a hidden or a locked front by kind, without colours to open it', () => {
    const g = walled();
    const front = refuseSlotLaunch(g, 0)!.blockers[0]!;
    g.locked[front] = true;
    expect(blockExample(g.level, g, g.lanes, YELLOW, [front])!.front).toEqual({ kind: 'locked', target: RED });
    g.locked[front] = false;
    g.hidden[front] = true;
    expect(blockExample(g.level, g, g.lanes, YELLOW, [front])!.front).toEqual({ kind: 'hidden', target: RED });
  });

  it('a stone front', () => {
    // Row R s Y: from the left, a yellow shot meets the stone before the yellow pixel.
    const g = createGame(level(['R.Y'], [[[RED, 1]], [[YELLOW, 1]]], { overlay: ['.s.'] }));
    const lane = g.lanes.find((l) => l[0] === 1 && l.includes(2));
    const ex = blockExample(g.level, g, lane ? [lane] : [[1, 2]], YELLOW, [1]);
    expect(ex?.front).toEqual({ kind: 'stone', target: 0 });
    expect(ex?.behind).toBe(YELLOW);
  });

  it('null when no lane has one of the blockers in front of a pixel wanting the colour', () => {
    const g = walled();
    expect(blockExample(g.level, g, g.lanes, YELLOW, [])).toBeNull();
    // Blue is wanted nowhere: no lane qualifies even with the right fronts.
    expect(blockExample(g.level, g, g.lanes, BLUE, refuseSlotLaunch(g, 0)!.blockers)).toBeNull();
  });
});

describe('blocker circles timing and fingerprint (#176)', () => {
  it('pulse three times over 3 s, then rest steady and fainter', () => {
    expect(blockerAlpha(0)).toBe(1);
    expect(blockerAlpha(BLOCKERS_PULSE_MS / 2)).toBeCloseTo(0.1);
    expect(blockerAlpha(BLOCKERS_PULSE_MS)).toBe(BLOCKERS_REST_ALPHA);
    expect(blockerAlpha(60_000)).toBe(BLOCKERS_REST_ALPHA);
    expect(blockerAlpha(-10)).toBe(1);
    expect(BLOCKERS_PULSE_MS).toBeGreaterThanOrEqual(2500);
  });

  it('the fingerprint changes when a circled pixel is painted, thawed, revealed or unlocked, not otherwise', () => {
    const g = walled();
    const cells = refuseSlotLaunch(g, 0)!.blockers;
    const sig = blockerSignature(g, cells);
    expect(blockerSignature(cloneGame(g), cells)).toBe(sig);
    const other = g.level.targets.findIndex((_, i) => !cells.includes(i));
    const moved = cloneGame(g);
    moved.paint[other] = RED;
    expect(blockerSignature(moved, cells)).toBe(sig);
    for (const change of [(s: GameState) => { s.paint[cells[0]!] = RED; }, (s: GameState) => { s.ice[cells[0]!] = 1; },
      (s: GameState) => { s.hidden[cells[0]!] = true; }, (s: GameState) => { s.locked[cells[0]!] = true; }]) {
      const c = cloneGame(g);
      change(c);
      expect(blockerSignature(c, cells)).not.toBe(sig);
    }
    expect(blockerSignature(g, [])).toBe('');
  });
});
