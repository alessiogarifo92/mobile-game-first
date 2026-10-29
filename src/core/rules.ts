import { accepts, type Primary } from './colors';
import type { Level } from './level';

/**
 * Mutable painting state shared by the simulation and the solver, so the two apply exactly the same
 * rules: what a shot hits, what a hit does, when a pixel is done.
 */
export interface Board {
  /** Primaries each pixel has received (bitmask). */
  paint: number[];
  /** Ice layers left on each pixel (0 or 1): a hit of the pixel's colour breaks a layer instead of painting. */
  ice: number[];
  /** Hidden pixels block their lane until a neighbour is done. */
  hidden: boolean[];
  /** Locked pixels block their lane until every key pixel of the level is done. */
  locked: boolean[];
}

export interface HitResult {
  brokeIce: boolean;
  completed: boolean;
  /** Hidden pixels revealed because this hit completed their neighbour. */
  revealed: number[];
  /** Locked pixels opened because this hit completed the last key. */
  unlocked: number[];
}

export function createBoard(level: Level): Board {
  return { paint: level.targets.map(() => 0), ice: level.ice.slice(), hidden: level.hidden.slice(), locked: level.locked.slice() };
}

export function cloneBoard(board: Board): Board {
  return { paint: board.paint.slice(), ice: board.ice.slice(), hidden: board.hidden.slice(), locked: board.locked.slice() };
}

export function cellDone(level: Level, board: Board, cell: number): boolean {
  const target = level.targets[cell]!;
  return target === 0 || (board.paint[cell] === target && board.ice[cell] === 0 && !board.hidden[cell] && !board.locked[cell]);
}

export function boardDone(level: Level, board: Board): boolean {
  return level.targets.every((_, i) => cellDone(level, board, i));
}

/**
 * Cell a shot of `color` hits along `laneCells`: paint flies over finished pixels and stops at the
 * first unfinished one, which takes the shot only if it can use it. -1 when the lane is blocked,
 * also by a stone (paint never passes one).
 */
export function findTarget(level: Level, board: Board, laneCells: readonly number[], color: Primary): number {
  for (const cell of laneCells) {
    if (level.stone[cell]) return -1;
    if (cellDone(level, board, cell)) continue;
    if (board.hidden[cell] || board.locked[cell]) return -1;
    const target = level.targets[cell]!;
    if (board.ice[cell]! > 0) return (target & color) !== 0 ? cell : -1;
    return accepts(target, board.paint[cell]!, color) ? cell : -1;
  }
  return -1;
}

/**
 * Stone that stops a shot of `color` along `laneCells`: the shot would hit a pixel behind it, but paint never
 * passes a stone. -1 otherwise. Only feedback (an uncoloured splash on the stone): findTarget already returns -1.
 */
export function blockingStone(level: Level, board: Board, laneCells: readonly number[], color: Primary): number {
  for (let k = 0; k < laneCells.length; k++) {
    const cell = laneCells[k]!;
    if (level.stone[cell]) return findTarget(level, board, laneCells.slice(k + 1), color) >= 0 ? cell : -1;
    if (!cellDone(level, board, cell)) return -1;
  }
  return -1;
}

/** Applies a hit returned by findTarget. */
export function applyHit(level: Level, board: Board, cell: number, color: Primary): HitResult {
  let brokeIce = false;
  if (board.ice[cell]! > 0) {
    board.ice[cell]! -= 1;
    brokeIce = true;
  } else {
    board.paint[cell]! |= color;
  }
  const completed = cellDone(level, board, cell);
  const revealed: number[] = [];
  if (completed) {
    const x = cell % level.width;
    const y = Math.floor(cell / level.width);
    const around = [
      x > 0 ? cell - 1 : -1,
      x < level.width - 1 ? cell + 1 : -1,
      y > 0 ? cell - level.width : -1,
      y < level.height - 1 ? cell + level.width : -1,
    ];
    for (const n of around) {
      if (n >= 0 && board.hidden[n]) {
        board.hidden[n] = false;
        revealed.push(n);
      }
    }
  }
  const unlocked: number[] = [];
  if (completed && level.keys[cell] && level.keys.every((key, i) => !key || cellDone(level, board, i))) {
    board.locked.forEach((locked, i) => {
      if (!locked) return;
      board.locked[i] = false;
      unlocked.push(i);
    });
  }
  return { brokeIce, completed, revealed, unlocked };
}

/**
 * Covered buckets (`ShooterSpec.covered`): whether the player may see a bucket's colour. A covered bucket shows it
 * only from the front of its column (`position` 0) onwards, and once launched it stays revealed. The rule only hides
 * information: what a bucket paints never changes, so play, `solve` and `levelWinRate` need no extra state.
 */
export function colorShown(bucket: { covered?: boolean }, position: number): boolean {
  return !bucket.covered || position === 0;
}
