import { describe, expect, it } from 'vitest';
import { buildLanes, parseLevel, type LevelDef } from '../src/core/level';
import { createGame, launchFromColumn, launchFromSlot, step } from '../src/core/sim';
import { createBoard } from '../src/core/rules';
import { createRng } from '../src/core/rng';
import { levelWinRate, playoutTickLimit, randomWinRate, runLoop, solve, type Move } from '../src/core/solver';
import levels from '../src/levels/levels.json';
import { BLUE, RED, YELLOW, level } from './helpers';

const shipped = (id: number) => (levels as LevelDef[])[id - 1]!;

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
    const board = createBoard(l);
    const left = runLoop(l, buildLanes(2, 2), board, RED, 3);
    const g = createGame(l);
    launchFromColumn(g, 0);
    for (let i = 0; i < 8; i++) step(g);
    expect(board.paint).toEqual(g.paint);
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
  const trap = () => level(['BBBBB', 'BRBRB', 'BBBBB'], [[[RED, 1], [RED, 1], [BLUE, 13]]], { slots: 1, beltCapacity: 1 });

  it('is 1 for a level with no wrong move and 0 for a level that always jams', () => {
    expect(randomWinRate(level(['RR'], [[[RED, 2]]]), 20, createRng(1))).toBe(1);
    expect(randomWinRate(trap(), 20, createRng(1))).toBe(0);
  });

  it('is deterministic: same level and seed, same rate', () => {
    const l = parseLevel(shipped(76));
    expect(randomWinRate(l, 50, createRng(7))).toBe(randomWinRate(l, 50, createRng(7)));
    expect(levelWinRate(l)).toBe(levelWinRate(l));
  });

  it('counts a game that never ends as lost, at the tick limit', () => {
    // Both pixels stay hidden forever: every bucket loops, returns to a slot and is relaunched, nothing jams.
    const stuck = level(['RB'], [[[RED, 1]], [[BLUE, 1]]], { overlay: ['hh'] });
    expect(playoutTickLimit(stuck)).toBe(2 * buildLanes(2, 1).length * 30);
    expect(randomWinRate(stuck, 5, createRng(1))).toBe(0);
  });

  // Sampling noise aside (same seed, 300 playouts), a smaller belt or fewer slots never make a level easier.
  const NOISE = 0.03;
  const rate = (def: LevelDef, beltCapacity: number, slots: number) =>
    randomWinRate(parseLevel({ ...def, beltCapacity, slots }), 300, createRng(def.id));

  it.each([44, 59, 76, 88])('level %i: less belt or fewer slots is never easier', (id) => {
    const def = shipped(id);
    const byBelt = [1, 2, 3, 4].map((b) => rate(def, b, 2));
    const bySlots = [1, 2, 3, 4].map((s) => rate(def, 2, s));
    for (const rates of [byBelt, bySlots]) {
      for (let i = 1; i < rates.length; i++) expect(rates[i - 1]!).toBeLessThanOrEqual(rates[i]! + NOISE);
    }
  }, 20_000);

  it('weighs belt capacity and slots separately: changing either one alone changes the rate', () => {
    const def = shipped(59);
    expect(rate(def, 4, 2) - rate(def, 1, 2)).toBeGreaterThan(0.1);
    expect(rate(def, 2, 4) - rate(def, 2, 1)).toBeGreaterThan(0.1);
  });
});

describe('solver slot positions', () => {
  // Found while building ice/hidden pixels: a solution that relaunches from a waiting slot after
  // another slot was freed. The solver used to number slots as a compact list, the game by position.
  const def = {
    id: 16, name: 'test', stage: 2, slots: 4, beltCapacity: 3,
    image: ["BBBBBBBB", "BRRBBRRB", "RRRRRRRR", "RRYRRYRR", "BRRRRRRB", "BBRRRRBB", "BBBRRBBB", "GGGGGGGG"],
    overlay: ["........", ".ii..ii.", "........", "..h..h..", "........", "...ii...", "........", "........"],
    columns: [[{ color: 2, ammo: 10 }, { color: 4, ammo: 8 }, { color: 1, ammo: 4 }, { color: 4, ammo: 8 }], [{ color: 1, ammo: 8 }, { color: 1, ammo: 8 }, { color: 1, ammo: 8 }], [{ color: 4, ammo: 8 }, { color: 1, ammo: 8 }, { color: 4, ammo: 8 }]],
  };

  it('returns moves whose slot indices are the slot positions in the game', () => {
    const l = parseLevel(def as LevelDef);
    const result = solve(l);
    expect(result.solvable).toBe(true);
    expect(result.moves.some((m) => m.from === 'slot')).toBe(true);
    expect(replay(l, result.moves).status).toBe('won');
  });
});
