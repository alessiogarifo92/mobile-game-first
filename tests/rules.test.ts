import { describe, expect, it } from 'vitest';
import { buildLanes, paintNeeds, parseLevel, LevelError } from '../src/core/level';
import { applyHit, boardDone, cellDone, cloneBoard, createBoard, findTarget } from '../src/core/rules';
import { createGame, launchFromColumn, step } from '../src/core/sim';
import { createRng } from '../src/core/rng';
import { runLoop, solve } from '../src/core/solver';
import { BLUE, RED, YELLOW, level } from './helpers';

describe('ice', () => {
  // 1x1 red pixel with ice: two red hits.
  const iced = level(['R'], [[[RED, 2]]], { overlay: ['i'] });

  it('needs one more hit of its colour, counted in the ammo', () => {
    expect(iced.ice).toEqual([1]);
    expect(paintNeeds(iced.targets, iced.ice)).toEqual({ 1: 2, 2: 0, 4: 0 });
    expect(() => level(['R'], [[[RED, 1]]], { overlay: ['i'] })).toThrow('ammo for color 1');
  });

  it('first hit breaks the ice, second paints', () => {
    const b = createBoard(iced);
    expect(findTarget(iced, b, [0], RED)).toBe(0);
    expect(findTarget(iced, b, [0], BLUE)).toBe(-1);
    expect(applyHit(iced, b, 0, RED)).toEqual({ brokeIce: true, completed: false, revealed: [], unlocked: [] });
    expect(b.paint[0]).toBe(0);
    expect(applyHit(iced, b, 0, RED)).toMatchObject({ brokeIce: false, completed: true });
    expect(boardDone(iced, b)).toBe(true);
  });

  it('an iced pixel blocks the lane behind it until it is done', () => {
    const l = level(['Y', 'R'], [[[RED, 2]], [[YELLOW, 1]]], { overlay: ['.', 'i'] });
    const b = createBoard(l);
    const upFromBottom = [1, 0];
    expect(findTarget(l, b, upFromBottom, YELLOW)).toBe(-1);
    applyHit(l, b, 1, RED);
    expect(findTarget(l, b, upFromBottom, YELLOW)).toBe(-1); // ice broken, still unpainted
    applyHit(l, b, 1, RED);
    expect(findTarget(l, b, upFromBottom, YELLOW)).toBe(0);
  });

  it('is rejected on secondary pixels, empty cells and unknown codes', () => {
    expect(() => level(['O'], [[[RED, 1]], [[YELLOW, 1]]], { overlay: ['i'] })).toThrow('non-primary');
    expect(() => level(['R.'], [[[RED, 1]]], { overlay: ['.i'] })).toThrow('empty cell');
    expect(() => level(['R'], [[[RED, 1]]], { overlay: ['x'] })).toThrow('unknown overlay');
    expect(() => level(['R'], [[[RED, 1]]], { overlay: ['.', '.'] })).toThrow(LevelError);
    expect(() => level(['RR'], [[[RED, 2]]], { overlay: ['.'] })).toThrow('overlay row 0');
  });
});

describe('hidden pixels', () => {
  // Row: R then hidden B. The hidden pixel blocks until the red one next to it is done.
  const l = level(['RB'], [[[RED, 1]], [[BLUE, 1]]], { overlay: ['.h'] });

  it('blocks its lane and is not done while hidden', () => {
    const b = createBoard(l);
    expect(b.hidden).toEqual([false, true]);
    expect(findTarget(l, b, [1], BLUE)).toBe(-1);
    expect(cellDone(l, b, 1)).toBe(false);
  });

  it('is revealed when a neighbour is completed, then plays normally', () => {
    const b = createBoard(l);
    expect(applyHit(l, b, 0, RED)).toEqual({ brokeIce: false, completed: true, revealed: [1], unlocked: [] });
    expect(findTarget(l, b, [1], BLUE)).toBe(1);
    applyHit(l, b, 1, BLUE);
    expect(boardDone(l, b)).toBe(true);
  });

  it('reveals only orthogonal neighbours inside the grid', () => {
    const g = level(['RBR', 'BRB', 'RBR'], [[[RED, 5]], [[BLUE, 4]]], { overlay: ['h.h', '...', 'h.h'] });
    const b = createBoard(g);
    expect(applyHit(g, b, 4, RED).revealed).toEqual([]); // centre: diagonal corners stay hidden
    expect(applyHit(g, b, 1, BLUE).revealed.sort()).toEqual([0, 2]);
  });

  it('a level whose hidden pixels can never be reached is unsolvable', () => {
    const trapped = level(['B'], [[[BLUE, 1]]], { overlay: ['h'] });
    expect(solve(trapped)).toMatchObject({ solvable: false, exhaustive: true });
  });
});

describe('simulation and solver apply the same rules', () => {
  const special = parseLevel({
    id: 1, name: 'test', stage: 1, slots: 3, beltCapacity: 3,
    image: ['RYBR', 'OGPB', 'RBYR', 'YRRB'],
    overlay: ['i..i', '.h..', '..h.', 'i..i'],
    columns: [[{ color: RED, ammo: 6 }, { color: YELLOW, ammo: 4 }], [{ color: BLUE, ammo: 7 }, { color: RED, ammo: 4 }], [{ color: YELLOW, ammo: 2 }]],
  });

  it('runLoop equals a lone shooter on the belt, for random sequences', () => {
    const rng = createRng(3);
    for (let trial = 0; trial < 30; trial++) {
      const g = createGame(special);
      const board = createBoard(special);
      const lanes = buildLanes(special.width, special.height);
      for (let k = 0; k < 4; k++) {
        const col = Math.floor(rng() * special.columns.length);
        const shooter = g.queues[col]?.[0];
        if (!shooter || !launchFromColumn(g, col)) continue;
        const left = runLoop(special, lanes, board, shooter.color, shooter.ammo);
        while (g.belt.length + g.pending.length > 0 && g.status === 'playing') step(g);
        expect({ paint: g.paint, ice: g.ice, hidden: g.hidden, locked: g.locked }).toEqual(cloneBoard(board));
        const back = g.slots.find((s) => s?.id === shooter.id);
        expect(back?.ammo ?? 0).toBe(left);
        g.slots = g.slots.map(() => null); // keep slots free so the sequence never jams
      }
    }
  });

  it('reports ice breaks and reveals as hit events', () => {
    const g = createGame(level(['RB'], [[[RED, 2]], [[BLUE, 1]]], { overlay: ['ih'] }));
    launchFromColumn(g, 0);
    const events = [];
    for (let i = 0; i < 6 && g.status === 'playing'; i++) {
      step(g);
      events.push(...g.events);
    }
    expect(events.map((e) => [e.brokeIce, e.completed, e.revealed])).toEqual([[true, false, []], [false, true, [1]]]);
  });
});
