import { describe, expect, it } from 'vitest';
import { missingCells, nearMiss, NEAR_MISS } from '../src/core/defeat';
import { parseLevel } from '../src/core/level';
import { createBoard } from '../src/core/rules';
import { createGame, launchFromColumn, step } from '../src/core/sim';
import { BLUE, RED, YELLOW, level } from './helpers';

/** Paints every target pixel with its own colour: what a finished board looks like, before any overlay. */
function painted(l: ReturnType<typeof level>) {
  const board = createBoard(l);
  l.targets.forEach((t, i) => (board.paint[i] = t));
  return board;
}

describe('defeat: missing pixels (#93)', () => {
  it('counts every unpainted pixel on a fresh board and none on a finished one', () => {
    const l = level(['RRB'], [[[RED, 2]], [[BLUE, 1]]]);
    expect(missingCells(l, createBoard(l))).toEqual([0, 1, 2]);
    expect(missingCells(l, painted(l))).toEqual([]);
  });

  it('counts a half-mixed secondary pixel as missing', () => {
    const l = level(['OR'], [[[RED, 2]], [[YELLOW, 1]]]);
    const board = painted(l);
    board.paint[0] = RED;
    expect(missingCells(l, board)).toEqual([0]);
  });

  it('never counts empty cells or stones', () => {
    const l = level(['R..', 'RRB'], [[[RED, 3]], [[BLUE, 1]]], { overlay: ['.s.', '...'] });
    expect(l.stone[1]).toBe(true);
    expect(missingCells(l, createBoard(l))).toEqual([0, 3, 4, 5]);
    expect(missingCells(l, painted(l))).toEqual([]);
  });

  it('counts painted pixels still under ice, hidden or locked', () => {
    const l = level(['RRRB'], [[[RED, 4]], [[BLUE, 1]]], { overlay: ['ihlk'] });
    // Paint alone does not finish them: the ice still has a layer, the hidden pixel is face down, the lock is shut.
    expect(missingCells(l, painted(l))).toEqual([0, 1, 2]);
    const board = painted(l);
    board.ice[0] = 0;
    board.hidden[1] = false;
    board.locked[2] = false;
    expect(missingCells(l, board)).toEqual([]);
  });

  it('adds nothing for covered buckets: they wait in the columns, not on the board', () => {
    const l = parseLevel({
      id: 1, name: 'test', stage: 1, image: ['RRB'], slots: 3, beltCapacity: 3,
      columns: [[{ color: RED, ammo: 2 }, { color: BLUE, ammo: 1, covered: true }]],
    });
    const g = createGame(l);
    launchFromColumn(g, 0);
    while (g.belt.length || g.pending.length) step(g);
    // Red is done, the covered blue bucket is still waiting: only the blue pixel is missing.
    expect(missingCells(l, g)).toEqual([2]);
  });

  it('flags a near miss only for 1 to NEAR_MISS missing pixels', () => {
    expect(NEAR_MISS).toBe(3);
    expect(nearMiss(0)).toBe(false);
    expect(nearMiss(1)).toBe(true);
    expect(nearMiss(3)).toBe(true);
    expect(nearMiss(4)).toBe(false);
  });
});
