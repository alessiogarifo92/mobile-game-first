import { describe, expect, it } from 'vitest';
import {
  beltFull, beltLoad, continueWithExtraSlot, createGame, launchFromColumn, launchFromSlot, remainingShooters, step, targetCell,
  type GameState,
} from '../src/core/sim';
import { BLUE, RED, YELLOW, level } from './helpers';

function run(state: GameState, ticks: number) {
  for (let i = 0; i < ticks; i++) step(state);
  return state;
}

describe('simulation', () => {
  it('a single shooter paints a primary image in one loop and wins', () => {
    const g = createGame(level(['RR'], [[[RED, 2]]]));
    expect(launchFromColumn(g, 0)).toBe(true);
    step(g);
    expect(g.events).toHaveLength(1);
    expect(g.events[0]).toMatchObject({ color: RED, lane: 0, cell: 0, completed: true });
    step(g);
    expect(g.status).toBe('won');
    expect(g.departures).toEqual([{ shooterId: 1, slot: null }]);
    expect(remainingShooters(g)).toBe(0);
  });

  it('mixes two primaries on the canvas to complete a secondary', () => {
    const g = createGame(level(['O'], [[[RED, 1]], [[YELLOW, 1]]], { slots: 1 }));
    launchFromColumn(g, 0);
    step(g);
    expect(g.paint[0]).toBe(RED);
    expect(g.events[0]!.completed).toBe(false);
    launchFromColumn(g, 1);
    step(g);
    expect(g.paint[0]).toBe(RED | YELLOW);
    expect(g.status).toBe('won');
  });

  it('paint flies over completed pixels but stops at the first unfinished one', () => {
    // column 0 from the bottom: B (needs blue) then R behind it.
    const g = createGame(level(['R', 'B'], [[[RED, 1], [BLUE, 1]]]));
    expect(targetCell(g, 0, RED)).toBe(-1); // blocked by the blue pixel in front
    expect(targetCell(g, 0, BLUE)).toBe(1);
    g.paint[1] = BLUE;
    expect(targetCell(g, 0, RED)).toBe(0); // flies over the finished blue pixel
  });

  it('a blocked shooter keeps its ammo and returns to a waiting slot', () => {
    const h = createGame(level(['P'], [[[RED, 1]], [[BLUE, 1]]], { slots: 1 }));
    h.paint[0] = RED; // red already there, so the red shooter cannot fire anywhere
    launchFromColumn(h, 0);
    run(h, 4); // 1x1 grid has 4 lanes
    expect(h.slots[0]).toMatchObject({ color: RED, ammo: 1 });
    expect(h.departures).toEqual([{ shooterId: 1, slot: 0 }]);
  });

  it('jams when a shooter returns and every slot is full, then continues once with an extra slot', () => {
    const g = createGame(level(['P'], [[[RED, 1]], [[BLUE, 1]]], { slots: 1, beltCapacity: 2 }));
    g.slots[0] = { id: 99, color: RED, ammo: 1, pos: 0, traveled: 0 };
    g.paint[0] = RED; // pretend red is done so the next red cannot fire
    g.queues[0] = [{ id: 1, color: RED, ammo: 1, pos: 0, traveled: 0 }];
    launchFromColumn(g, 0);
    run(g, 4);
    expect(g.status).toBe('jammed');
    expect(g.jammed).toHaveLength(1);
    expect(launchFromColumn(g, 1)).toBe(false); // no moves while jammed
    expect(step(g).tick).toBe(4); // frozen
    expect(continueWithExtraSlot(g)).toBe(true);
    expect(g.status).toBe('playing');
    expect(g.slots).toHaveLength(2);
    expect(continueWithExtraSlot(g)).toBe(false); // only once
  });

  it('a second jam after the extra slot cannot be continued again', () => {
    const g = createGame(level(['R'], [[[RED, 1]]], { slots: 1 }));
    g.status = 'jammed';
    g.jammed = [{ id: 7, color: RED, ammo: 1, pos: 0, traveled: 0 }];
    g.extraSlotUsed = true; // the one continue was already spent
    expect(continueWithExtraSlot(g)).toBe(false);
    expect(g.status).toBe('jammed');
    expect(g.jammed).toHaveLength(1);
  });

  it('several buckets ride the belt at once and each paints its own pixel', () => {
    const g = createGame(level(['RRR'], [[[RED, 1]], [[RED, 1]], [[RED, 1]]], { beltCapacity: 3 }));
    expect(launchFromColumn(g, 0)).toBe(true);
    expect(launchFromColumn(g, 1)).toBe(true);
    expect(launchFromColumn(g, 2)).toBe(true);
    run(g, 2);
    expect(g.belt.length + g.pending.length).toBeGreaterThan(1); // really in parallel
    run(g, 12);
    expect(g.status).toBe('won');
    expect(g.belt).toHaveLength(0);
  });

  it('refuses a continue when not jammed', () => {
    const g = createGame(level(['R'], [[[RED, 1]]]));
    expect(continueWithExtraSlot(g)).toBe(false);
  });

  it('respects belt capacity and boards one shooter per tick', () => {
    const g = createGame(level(['RRRR'], [[[RED, 2]], [[RED, 1]], [[RED, 1]]], { beltCapacity: 2 }));
    expect(launchFromColumn(g, 0)).toBe(true);
    expect(launchFromColumn(g, 1)).toBe(true);
    expect(launchFromColumn(g, 2)).toBe(false); // belt full
    step(g);
    expect(g.belt).toHaveLength(1);
    expect(g.pending).toHaveLength(1);
    step(g);
    expect(g.belt.length + g.pending.length).toBeLessThanOrEqual(2);
  });

  it('reports the belt load, pending buckets included, and frees a place when a bucket leaves', () => {
    const g = createGame(level(['RRR'], [[[RED, 1]], [[RED, 1]], [[RED, 1]]], { beltCapacity: 2 }));
    expect(beltLoad(g)).toEqual({ used: 0, capacity: 2 });
    expect(beltFull(g)).toBe(false);
    launchFromColumn(g, 0);
    expect(beltLoad(g).used).toBe(1); // still pending, but it already takes a place
    launchFromColumn(g, 1);
    expect(beltFull(g)).toBe(true);
    expect(launchFromColumn(g, 2)).toBe(false);
    step(g); // the first bucket boards and empties on its only pixel
    expect(beltLoad(g).used).toBe(1);
    expect(beltFull(g)).toBe(false);
    expect(launchFromColumn(g, 2)).toBe(true);
  });

  it('keeps boardGap lanes between boarding shooters', () => {
    const g = createGame(level(['RRRRRRRR'], [[[RED, 4]], [[RED, 4]]], { beltCapacity: 2 }), { boardGap: 3 });
    for (let i = 0; i < 7; i++) g.paint[i] = RED; // keep the first shooter from emptying early
    launchFromColumn(g, 0);
    launchFromColumn(g, 1);
    run(g, 3);
    expect(g.belt).toHaveLength(1); // the second shooter waits for a 3-lane gap
    step(g);
    expect(g.belt).toHaveLength(2);
    expect(g.belt[0]!.traveled - g.belt[1]!.traveled).toBe(3);
  });

  it('rejects launches from empty columns, missing columns and empty slots', () => {
    const g = createGame(level(['R'], [[[RED, 1]]]));
    expect(launchFromColumn(g, 5)).toBe(false);
    expect(launchFromSlot(g, 0)).toBe(false);
    launchFromColumn(g, 0);
    expect(launchFromColumn(g, 0)).toBe(false);
  });

  it('relaunches a slot shooter', () => {
    const g = createGame(level(['R'], [[[RED, 1]]]));
    g.queues[0] = [];
    g.slots[0] = { id: 7, color: RED, ammo: 1, pos: 3, traveled: 0 };
    expect(launchFromSlot(g, 0)).toBe(true);
    expect(g.slots[0]).toBeNull();
    expect(g.pending[0]).toMatchObject({ id: 7, pos: 0 });
    step(g);
    expect(g.status).toBe('won');
  });

  it('is deterministic', () => {
    const play = () => {
      const g = createGame(level(['OGP', 'RYB'], [[[RED, 3], [YELLOW, 3]], [[BLUE, 3]]], { slots: 2 }));
      const log: string[] = [];
      for (let t = 0; t < 200 && g.status === 'playing'; t++) {
        if (t % 5 === 0 && !launchFromColumn(g, t % 2) && !launchFromSlot(g, 0)) launchFromSlot(g, 1);
        step(g);
        log.push(g.paint.join(''));
      }
      return { log, status: g.status };
    };
    expect(play()).toEqual(play());
  });
});
