import type { Primary } from './colors';
import { buildLanes, type Level } from './level';
import { createRng } from './rng';
import { applyHit, boardDone, cloneBoard, createBoard, findTarget, type Board } from './rules';
import { beltFull, createGame, launchFromColumn, launchFromSlot, step, type GameState } from './sim';

/** A move in sequential play: launch a column's front shooter or a slot shooter. */
export type Move = { from: 'column'; index: number } | { from: 'slot'; index: number };

export interface SolveResult {
  solvable: boolean;
  /** False when the node budget ran out before a verdict. */
  exhaustive: boolean;
  moves: Move[];
  nodes: number;
}

interface Waiting {
  color: Primary;
  ammo: number;
}

interface Node {
  board: Board;
  heads: number[];
  /** Waiting slots by position, exactly like the game: a returning shooter takes the first free one. */
  slots: (Waiting | null)[];
}

/**
 * One full loop of a lone shooter: fires at every lane in belt order, exactly like `step` does
 * when the belt holds a single shooter. Mutates `board`, returns the ammo left.
 */
export function runLoop(level: Level, lanes: number[][], board: Board, color: Primary, ammo: number): number {
  for (const lane of lanes) {
    if (ammo === 0) break;
    const cell = findTarget(level, board, lane, color);
    if (cell >= 0) {
      applyHit(level, board, cell, color);
      ammo -= 1;
    }
  }
  return ammo;
}

function key(node: Node): string {
  // Positions don't change what can still be solved, so equal multisets of waiting shooters share a key.
  // Stones are part of the level and never change, so they need no place in the key.
  // Covered buckets add no state: the solver knows every colour, and what the player sees follows from `heads`.
  const slots = node.slots.filter((s): s is Waiting => s !== null).map((s) => `${s.color}:${s.ammo}`).sort().join(',');
  const b = node.board;
  return `${b.paint.join('')}|${b.ice.join('')}|${b.hidden.map(Number).join('')}|${b.locked.map(Number).join('')}|${node.heads.join(',')}|${slots}`;
}

/** A move from a node and where it leads, with the pixels it paints. */
interface Candidate {
  move: Move;
  next: Node;
  hits: number;
}

/**
 * Every move a sequential player can make from `node` without jamming: launch a column's front shooter or a slot
 * shooter, which loops once and parks its leftover in the first free slot. A move that would need a slot when none
 * is free (a jam) is left out, and so is relaunching a slot shooter that paints nothing.
 */
function expand(level: Level, lanes: number[][], node: Node): Candidate[] {
  const candidates: Candidate[] = [];
  const tryShooter = (move: Move, shooter: Waiting, base: Node) => {
    const board = cloneBoard(base.board);
    const left = runLoop(level, lanes, board, shooter.color, shooter.ammo);
    const hits = shooter.ammo - left;
    if (move.from === 'slot' && hits === 0) return; // relaunching a blocked shooter changes nothing
    const slots = base.slots.slice();
    if (left > 0) {
      const free = slots.indexOf(null);
      if (free < 0) return; // would jam
      slots[free] = { color: shooter.color, ammo: left };
    }
    candidates.push({ move, next: { board, heads: base.heads, slots }, hits });
  };
  level.columns.forEach((column, c) => {
    const shooter = column[node.heads[c]!];
    if (!shooter) return;
    const heads = node.heads.slice();
    heads[c]! += 1;
    tryShooter({ from: 'column', index: c }, shooter, { ...node, heads });
  });
  node.slots.forEach((shooter, s) => {
    if (!shooter) return;
    const slots = node.slots.slice();
    slots[s] = null;
    tryShooter({ from: 'slot', index: s }, shooter, { ...node, slots });
  });
  return candidates;
}

const startNode = (level: Level): Node => ({
  board: createBoard(level),
  heads: level.columns.map(() => 0),
  slots: Array.from({ length: level.slots }, () => null),
});

/** Depth-first search from `start`, trying the moves that paint the most pixels first. */
function search(level: Level, start: Node, nodeBudget: number): SolveResult {
  const lanes = buildLanes(level.width, level.height);
  const seen = new Set<string>();
  let nodes = 0;
  let exhausted = false;

  const dfs = (node: Node, path: Move[]): Move[] | null => {
    if (boardDone(level, node.board)) return path;
    if (nodes >= nodeBudget) {
      exhausted = true;
      return null;
    }
    const k = key(node);
    if (seen.has(k)) return null;
    seen.add(k);
    nodes += 1;

    const candidates = expand(level, lanes, node);
    candidates.sort((a, b) => b.hits - a.hits);
    for (const c of candidates) {
      const found = dfs(c.next, [...path, c.move]);
      if (found) return found;
    }
    return null;
  };

  const moves = dfs(start, []);
  return { solvable: moves !== null, exhaustive: !exhausted, moves: moves ?? [], nodes };
}

/**
 * Depth-first search over sequential play (one shooter on the belt at a time). Any level solvable
 * this way is solvable in the real game, because a player can always wait for the belt to empty.
 */
export function solve(level: Level, nodeBudget = 200_000): SolveResult {
  return search(level, startNode(level), nodeBudget);
}

/**
 * The same search from a game in progress (#93): the board as it is now, the shooters still in each column and
 * the ones parked in the slots, "+1 slot" included when it was used. It only answers with the belt empty and no
 * shooter about to return, because sequential play has no move for a shooter that is still riding; a finished game
 * has no move either. `moves[0]` is the hint: playing it leaves a game that can still be won.
 */
export function solveFrom(state: GameState, nodeBudget = 200_000): SolveResult {
  if (state.status !== 'playing' || state.belt.length > 0 || state.pending.length > 0) {
    return { solvable: false, exhaustive: true, moves: [], nodes: 0 };
  }
  const level = state.level;
  const start: Node = {
    board: cloneBoard(state),
    heads: level.columns.map((column, c) => column.length - state.queues[c]!.length),
    slots: state.slots.map((s) => (s ? { color: s.color, ammo: s.ammo } : null)),
  };
  return search(level, start, nodeBudget);
}

/** Upper bound on ticks for one random playout: guards against relaunching blocked shooters forever. */
export function playoutTickLimit(level: Level): number {
  const shooters = level.columns.reduce((n, c) => n + c.length, 0);
  return shooters * buildLanes(level.width, level.height).length * 30;
}

/**
 * Difficulty probe: share of random playouts that win, played tick by tick with the game's own rules
 * (`sim.ts`): an "eager" tapper launches a shooter picked at random among the column fronts and the
 * occupied slots whenever the belt has room, so belt capacity and waiting slots both weigh in (a
 * shooter riding the belt does not hold a slot). A playout is lost on a jam or at the tick limit.
 * A level a random tapper clears 100% of the time has no puzzle in it; a low rate means order matters.
 */
export function randomWinRate(level: Level, playouts: number, rng: () => number): number {
  const limit = playoutTickLimit(level);
  let wins = 0;
  for (let p = 0; p < playouts; p++) {
    const g = createGame(level, { boardGap: 1 });
    while (g.status === 'playing' && g.tick < limit) {
      if (!beltFull(g)) {
        const options: (() => boolean)[] = [];
        g.queues.forEach((q, c) => q.length > 0 && options.push(() => launchFromColumn(g, c)));
        g.slots.forEach((s, i) => s && options.push(() => launchFromSlot(g, i)));
        if (options.length > 0) options[Math.floor(rng() * options.length)]!();
      }
      step(g);
    }
    if (g.status === 'won') wins += 1;
  }
  return wins / playouts;
}

/** Playouts behind every shipped difficulty figure: generator bands, tests and the difficulty report. */
export const WIN_RATE_PLAYOUTS = 200;

/** A level's difficulty: `randomWinRate` with a fixed sample and the level id as seed, so anyone can reproduce it. */
export function levelWinRate(level: Level): number {
  return randomWinRate(level, WIN_RATE_PLAYOUTS, createRng(level.id));
}

/**
 * Margin probe for a careful player (#162): share of playouts won by a player who plays one shooter at a time,
 * always launches the one that paints the most pixels (ties at random), never jams while a safe move exists and
 * never takes "+1 slot". A playout is lost when every remaining move would jam. Where `randomWinRate` measures how
 * much room there is for random mistakes, this measures whether the obvious sensible play leaves room for the
 * leftovers it parks in the slots: a level a careful player rarely wins only rewards trial and error.
 */
export function carefulWinRate(level: Level, playouts: number, rng: () => number): number {
  const lanes = buildLanes(level.width, level.height);
  let wins = 0;
  for (let p = 0; p < playouts; p++) {
    let node = startNode(level);
    for (;;) {
      if (boardDone(level, node.board)) {
        wins += 1;
        break;
      }
      const candidates = expand(level, lanes, node);
      if (candidates.length === 0) break;
      const best = Math.max(...candidates.map((c) => c.hits));
      const top = candidates.filter((c) => c.hits === best);
      node = top[Math.floor(rng() * top.length)]!.next;
    }
  }
  return wins / playouts;
}

/** A level's careful-player margin: `carefulWinRate` with the same sample and seed as `levelWinRate`. */
export function levelCarefulWinRate(level: Level): number {
  return carefulWinRate(level, WIN_RATE_PLAYOUTS, createRng(level.id));
}
