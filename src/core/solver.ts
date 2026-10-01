import { isComplete, type Primary } from './colors';
import { buildLanes, type Level } from './level';

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
  paint: number[];
  heads: number[];
  slots: Waiting[];
}

/**
 * One full loop of a lone shooter: fires at every lane in belt order, exactly like `step` does
 * when the belt holds a single shooter. Mutates `paint`, returns the ammo left.
 */
export function runLoop(level: Level, lanes: number[][], paint: number[], color: Primary, ammo: number): number {
  for (const lane of lanes) {
    if (ammo === 0) break;
    for (const cell of lane) {
      const target = level.targets[cell]!;
      if (isComplete(target, paint[cell]!)) continue;
      if ((target & color) !== 0 && (paint[cell]! & color) === 0) {
        paint[cell]! |= color;
        ammo -= 1;
      }
      break;
    }
  }
  return ammo;
}

function key(node: Node): string {
  const slots = node.slots.map((s) => `${s.color}:${s.ammo}`).sort().join(',');
  return `${node.paint.join('')}|${node.heads.join(',')}|${slots}`;
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

  const done = (paint: number[]) => level.targets.every((t, i) => isComplete(t, paint[i]!));

  const dfs = (node: Node, path: Move[]): Move[] | null => {
    if (done(node.paint)) return path;
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
      const paint = base.paint.slice();
      const left = runLoop(level, lanes, paint, shooter.color, shooter.ammo);
      const hits = shooter.ammo - left;
      if (move.from === 'slot' && hits === 0) return; // relaunching a blocked shooter changes nothing
      const slots = base.slots.slice();
      if (left > 0) {
        if (slots.length >= level.slots) return; // would jam
        slots.push({ color: shooter.color, ammo: left });
      }
      candidates.push({ move, next: { paint, heads: base.heads, slots }, hits });
    };

    level.columns.forEach((column, c) => {
      const shooter = column[node.heads[c]!];
      if (!shooter) return;
      const heads = node.heads.slice();
      heads[c]! += 1;
      tryShooter({ from: 'column', index: c }, shooter, { ...node, heads });
    });
    node.slots.forEach((shooter, s) => {
      const slots = node.slots.slice();
      slots.splice(s, 1);
      tryShooter({ from: 'slot', index: s }, shooter, { ...node, slots });
    });

    candidates.sort((a, b) => b.hits - a.hits);
    for (const c of candidates) {
      const found = dfs(c.next, [...path, c.move]);
      if (found) return found;
    }
    return null;
  };

  const start: Node = { paint: level.targets.map(() => 0), heads: level.columns.map(() => 0), slots: [] };
  const moves = dfs(start, []);
  return { solvable: moves !== null, exhaustive: !exhausted, moves: moves ?? [], nodes };
}

/**
 * Difficulty probe: share of random sequential playthroughs that win. A level a random tapper
 * clears 100% of the time has no puzzle in it; a low rate means order really matters.
 */
export function randomWinRate(level: Level, playouts: number, rng: () => number): number {
  const lanes = buildLanes(level.width, level.height);
  let wins = 0;
  for (let p = 0; p < playouts; p++) {
    const paint = level.targets.map(() => 0);
    const heads = level.columns.map(() => 0);
    const slots: Waiting[] = [];
    // Guard against a random tapper relaunching blocked slot shooters forever.
    for (let moves = 0; moves < 10_000; moves++) {
      if (level.targets.every((t, i) => isComplete(t, paint[i]!))) {
        wins += 1;
        break;
      }
      const options: (() => Waiting)[] = [];
      level.columns.forEach((column, c) => {
        const s = column[heads[c]!];
        if (s) options.push(() => ((heads[c]! += 1), { ...s }));
      });
      slots.forEach((_, i) => options.push(() => slots.splice(i, 1)[0]!));
      if (options.length === 0) break;
      const shooter = options[Math.floor(rng() * options.length)]!();
      const left = runLoop(level, lanes, paint, shooter.color, shooter.ammo);
      if (left > 0) {
        if (slots.length >= level.slots) break; // jam
        slots.push({ color: shooter.color, ammo: left });
      }
    }
  }
  return wins / playouts;
}
