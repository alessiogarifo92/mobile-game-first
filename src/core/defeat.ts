import type { Level } from './level';
import { cellDone, type Board } from './rules';

/** At most this many pixels missing makes a defeat a near miss ("So close!"). */
export const NEAR_MISS = 3;

/**
 * Pixels still to finish (#93): unpainted, half-mixed, iced, hidden or locked. Empty cells and stones are never
 * counted, and covered buckets add nothing: they live in the columns, not on the board.
 */
export function missingCells(level: Level, board: Board): number[] {
  const cells: number[] = [];
  level.targets.forEach((_, cell) => {
    if (!cellDone(level, board, cell)) cells.push(cell);
  });
  return cells;
}

export function nearMiss(missing: number): boolean {
  return missing > 0 && missing <= NEAR_MISS;
}
