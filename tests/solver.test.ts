import { describe, expect, it } from 'vitest';
import { buildLanes } from '../src/core/level';
import { createGame, launchFromColumn, launchFromSlot, step } from '../src/core/sim';
import { runLoop, solve, type Move } from '../src/core/solver';
import { BLUE, RED, YELLOW, level } from './helpers';

/** Replays solver moves in the real simulation, waiting for the belt to empty between moves. */
function replay(l: ReturnType<typeof level>, moves: Move[]) {
  const g = createGame(l);
  for (const m of moves) {
    const ok = m.from === 'column' ? launchFromColumn(g, m.index) : launchFromSlot(g, m.index);
    expect(ok).toBe(true);
    do step(g); while ((g.belt.length || g.pending.length) && g.status === 'playing');
  }
  return g;
}

describe('solver', () => {
  it('runLoop matches a lone shooter in the simulation', () => {
    const l = level(['OR', 'PY'], [[[RED, 3]], [[YELLOW, 2]], [[BLUE, 1]]]);
    const paint = l.targets.map(() => 0);
    const left = runLoop(l, buildLanes(2, 2), paint, RED, 3);
    const g = createGame(l);
    launchFromColumn(g, 0);
    for (let i = 0; i < 8; i++) step(g);
    expect(paint).toEqual(g.paint);
    expect(left).toBe(g.slots[0]?.ammo ?? 0);
  });

  it('finds a solution that wins when replayed in the simulation', () => {
    const l = level(['PPO', 'GRB', 'YOG'], [[[BLUE, 2], [RED, 3]], [[YELLOW, 5], [RED, 2]], [[BLUE, 3]]], { slots: 2 });
    const result = solve(l);
    expect(result.solvable).toBe(true);
    expect(result.exhaustive).toBe(true);
    expect(replay(l, result.moves).status).toBe('won');
  });

  it('proves a level unsolvable when the queue order forces a jam', () => {
    // Both red pixels are walled in by blue; two blocked reds arrive before the blue with one slot.
    const image = ['BBBBB', 'BRBRB', 'BBBBB'];
    const l = level(image, [[[RED, 1], [RED, 1], [BLUE, 13]]], { slots: 1, beltCapacity: 1 });
    const result = solve(l);
    expect(result).toMatchObject({ solvable: false, exhaustive: true, moves: [] });
    // The same image with blue first is solvable.
    expect(solve(level(image, [[[BLUE, 13], [RED, 1], [RED, 1]]], { slots: 1 })).solvable).toBe(true);
  });

  it('reports a non-exhaustive search when the node budget runs out', () => {
    const l = level(['OGPOGP', 'PGOPGO'], [[[RED, 4], [YELLOW, 4]], [[BLUE, 4], [RED, 4]], [[YELLOW, 4], [BLUE, 4]]], { slots: 3 });
    const result = solve(l, 1);
    expect(result.nodes).toBeLessThanOrEqual(1);
    if (!result.solvable) expect(result.exhaustive).toBe(false);
  });
});

describe('randomWinRate', () => {
  it('is 1 for a level with no wrong move and 0 for a level that always jams', async () => {
    const { createRng } = await import('../src/core/rng');
    const { randomWinRate } = await import('../src/core/solver');
    expect(randomWinRate(level(['RR'], [[[RED, 2]]]), 20, createRng(1))).toBe(1);
    const image = ['BBBBB', 'BRBRB', 'BBBBB'];
    const trap = level(image, [[[RED, 1], [RED, 1], [BLUE, 13]]], { slots: 1, beltCapacity: 1 });
    expect(randomWinRate(trap, 20, createRng(1))).toBe(0);
  });
});
