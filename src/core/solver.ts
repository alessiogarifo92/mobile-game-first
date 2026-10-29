import type { Primary } from './colors';
import { buildLanes, type Level } from './level';
import { createRng } from './rng';
import { applyHit, boardDone, cloneBoard, createBoard, findTarget, type Board } from './rules';
import { beltFull, createGame, launchFromColumn, launchFromSlot, step } from './sim';

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
  const slots = node.slots.filter((s): s is Waiting => s !== null).map((s) => `${s.color}:${s.ammo}`).sort().join(',');
  const b = node.board;
  return `${b.paint.join('')}|${b.ice.join('')}|${b.hidden.map(Number).join('')}|${b.locked.map(Number).join('')}|${node.heads.join(',')}|${slots}`;
}

/**
 * Depth-first search over sequential play (one shooter on the belt at a time). Any level solvable
 * this way is solvable in the real game, because a player can always wait for the belt to empty.
 */
export function solve(level: Level, nodeBudget = 200_000): SolveResult {
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

    const candidates: { move: Move; next: Node; hits: number }[] = [];
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

    candidates.sort((a, b) => b.hits - a.hits);
    for (const c of candidates) {
      const found = dfs(c.next, [...path, c.move]);
      if (found) return found;
    }
    return null;
  };

  const start: Node = { board: createBoard(level), heads: level.columns.map(() => 0), slots: Array.from({ length: level.slots }, () => null) };
  const moves = dfs(start, []);
  return { solvable: moves !== null, exhaustive: !exhausted, moves: moves ?? [], nodes };
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
