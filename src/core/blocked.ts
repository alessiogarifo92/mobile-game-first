import { accepts, type Primary } from './colors';
import type { Level } from './level';
import { cellDone, type Board } from './rules';
import { beltFull, launchFromSlot, step, type GameState } from './sim';

/** Deep copy of a game state, so a launch can be tried without touching the real one. */
export function cloneGame(state: GameState): GameState {
  const copy = (s: GameState['belt'][number]) => ({ ...s });
  return {
    ...state,
    paint: state.paint.slice(),
    ice: state.ice.slice(),
    hidden: state.hidden.slice(),
    locked: state.locked.slice(),
    queues: state.queues.map((q) => q.map(copy)),
    slots: state.slots.map((s) => (s ? copy(s) : null)),
    pending: state.pending.map(copy),
    belt: state.belt.map(copy),
    jammed: state.jammed.map(copy),
    events: [],
    stoneHits: [],
    departures: [],
  };
}

/**
 * Shots a bucket waiting in `slot` would land if it were launched now and nobody tapped anything else: the real
 * `step` runs on a copy until that bucket leaves the belt, so the buckets already riding it (which may open a lane
 * before it gets there) are counted too. null when the launch is not possible (empty slot, full belt, game over) or
 * when the copy stops before the bucket finishes its lap (a jam, a win): then nothing certain can be said.
 */
export function slotLaunchHits(state: GameState, slot: number): number | null {
  const shooter = state.slots[slot];
  if (!shooter || state.status !== 'playing' || beltFull(state)) return null;
  const sim = cloneGame(state);
  if (!launchFromSlot(sim, slot)) return null;
  let hits = 0;
  // Boarding waits for the belt to clear the entry, then one lap: the bound is generous and only guards a bug.
  const limit = (sim.belt.length + sim.pending.length + 2) * (sim.lanes.length + sim.boardGap + 1);
  for (let tick = 0; tick < limit && sim.status === 'playing'; tick++) {
    step(sim);
    hits += sim.events.filter((e) => e.shooterId === shooter.id).length;
    if (sim.departures.some((d) => d.shooterId === shooter.id)) return hits;
  }
  return null;
}

/** Whether `color` still has work on `cell`: paint it needs, or ice of its colour to break. */
function wants(level: Level, board: Board, cell: number, color: Primary): boolean {
  if (level.stone[cell] || cellDone(level, board, cell)) return false;
  const target = level.targets[cell]!;
  if (board.ice[cell]! > 0) return (target & color) !== 0;
  return accepts(target, board.paint[cell]!, color);
}

/**
 * Cells that stop a shot of `color` before it reaches a pixel that wants it (#146): along each lane, the first cell
 * the paint cannot fly over (an unfinished pixel of another colour, a hidden or locked pixel, a stone), when a pixel
 * further down that lane is still waiting for `color`. Only the closest ones are kept: those with the wanted pixel
 * right behind them (nothing else unfinished in between), so finishing one of them opens a lane. When every wanted
 * pixel lies deeper, all the lane fronts are kept. Sorted, each cell once.
 */
export function blockingCells(level: Level, board: Board, lanes: readonly (readonly number[])[], color: Primary): number[] {
  const near = new Set<number>();
  const far = new Set<number>();
  for (const lane of lanes) {
    const open = lane.filter((cell) => level.stone[cell] || !cellDone(level, board, cell));
    const front = open[0];
    if (front === undefined) continue;
    const takes = !level.stone[front] && !board.hidden[front] && !board.locked[front] && wants(level, board, front, color);
    if (takes || !open.slice(1).some((cell) => wants(level, board, cell, color))) continue;
    const next = open[1]!;
    (!level.stone[next] && wants(level, board, next, color) ? near : far).add(front);
  }
  return [...(near.size > 0 ? near : far)].sort((a, b) => a - b);
}

export interface SlotRefusal {
  /** The cells to point at: what stands between this bucket and the pixels it could paint. */
  blockers: number[];
}

/**
 * A tap on a waiting bucket that would ride a whole lap without landing a shot (#146): the launch is refused, so the
 * player gets a shake and the blocking pixels instead of a silent, wasted loop. null when the launch is allowed.
 */
export function refuseSlotLaunch(state: GameState, slot: number): SlotRefusal | null {
  const shooter = state.slots[slot];
  if (!shooter || slotLaunchHits(state, slot) !== 0) return null;
  return { blockers: blockingCells(state.level, state, state.lanes, shooter.color) };
}
