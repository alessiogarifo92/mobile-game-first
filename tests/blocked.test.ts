import { describe, expect, it } from 'vitest';
import { BLUE, RED, YELLOW, level } from './helpers';
import { blockingCells, cloneGame, refuseSlotLaunch, slotLaunchHits } from '../src/core/blocked';
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
