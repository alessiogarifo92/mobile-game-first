import { accepts, isComplete, type Primary } from './colors';
import { buildLanes, type Level } from './level';

export interface Shooter {
  id: number;
  color: Primary;
  ammo: number;
  /** Lane index on the belt (only meaningful while on the belt). */
  pos: number;
  /** Lanes already visited in the current loop. */
  traveled: number;
}

export type Status = 'playing' | 'won' | 'jammed';

export interface HitEvent {
  shooterId: number;
  color: Primary;
  lane: number;
  cell: number;
  /** Paint state of the cell after the hit. */
  paint: number;
  completed: boolean;
}

export interface GameState {
  level: Level;
  lanes: number[][];
  paint: number[];
  /** Remaining shooters per column; index 0 is the front. */
  queues: Shooter[][];
  slots: (Shooter | null)[];
  /** Shooters waiting to enter the belt, at most one per tick and `boardGap` lanes apart. */
  pending: Shooter[];
  belt: Shooter[];
  status: Status;
  tick: number;
  /** Shooters that could not return because every slot was full (rarely more than one). */
  jammed: Shooter[];
  extraSlotUsed: boolean;
  /** Minimum lanes between consecutive shooters on the belt, so they never overlap on screen. */
  boardGap: number;
  /** Hits produced by the last step, for rendering. */
  events: HitEvent[];
  /** Shooters that left the belt in the last step: to a slot (index) or emptied (null). */
  departures: { shooterId: number; slot: number | null }[];
}

export function createGame(level: Level, options: { boardGap?: number } = {}): GameState {
  let nextId = 1;
  return {
    level,
    lanes: buildLanes(level.width, level.height),
    paint: level.targets.map(() => 0),
    queues: level.columns.map((col) => col.map((s) => ({ ...s, id: nextId++, pos: 0, traveled: 0 }))),
    slots: Array.from({ length: level.slots }, () => null),
    pending: [],
    belt: [],
    status: 'playing',
    tick: 0,
    jammed: [],
    extraSlotUsed: false,
    boardGap: Math.max(1, Math.floor(options.boardGap ?? 1)),
    events: [],
    departures: [],
  };
}

export function beltLength(state: GameState): number {
  return state.lanes.length;
}

function canBoard(state: GameState): boolean {
  return state.status === 'playing' && state.belt.length + state.pending.length < state.level.beltCapacity;
}

/** Sends the front shooter of a column to the belt. Returns false when the move is not allowed. */
export function launchFromColumn(state: GameState, column: number): boolean {
  const queue = state.queues[column];
  if (!queue || queue.length === 0 || !canBoard(state)) return false;
  const shooter = queue.shift()!;
  state.pending.push({ ...shooter, pos: 0, traveled: 0 });
  return true;
}

/** Relaunches a shooter waiting in a slot. */
export function launchFromSlot(state: GameState, slot: number): boolean {
  const shooter = state.slots[slot];
  if (!shooter || !canBoard(state)) return false;
  state.slots[slot] = null;
  state.pending.push({ ...shooter, pos: 0, traveled: 0 });
  return true;
}

/** Anti-frustration continue (once per level): adds a slot for each jammed shooter and parks it there. */
export function continueWithExtraSlot(state: GameState): boolean {
  if (state.status !== 'jammed' || state.extraSlotUsed || state.jammed.length === 0) return false;
  state.slots.push(...state.jammed);
  state.jammed = [];
  state.extraSlotUsed = true;
  state.status = 'playing';
  return true;
}

/** Cell a shooter of `color` would hit from `lane`, or -1 when the lane is blocked or empty. */
export function targetCell(state: GameState, lane: number, color: Primary): number {
  const cells = state.lanes[lane]!;
  const { targets } = state.level;
  for (const cell of cells) {
    const target = targets[cell]!;
    if (isComplete(target, state.paint[cell]!)) continue;
    return accepts(target, state.paint[cell]!, color) ? cell : -1;
  }
  return -1;
}

export function isWon(state: GameState): boolean {
  return state.level.targets.every((t, i) => isComplete(t, state.paint[i]!));
}

/** Advances the simulation by one tick. Deterministic: same inputs, same result. */
export function step(state: GameState): GameState {
  state.events = [];
  state.departures = [];
  if (state.status !== 'playing') return state;
  state.tick += 1;

  if (state.pending.length > 0 && state.belt.every((s) => s.traveled >= state.boardGap)) {
    state.belt.push(state.pending.shift()!);
  }

  const length = beltLength(state);
  const stillOnBelt: Shooter[] = [];
  for (const shooter of state.belt) {
    const cell = targetCell(state, shooter.pos, shooter.color);
    if (cell >= 0) {
      state.paint[cell]! |= shooter.color;
      shooter.ammo -= 1;
      state.events.push({
        shooterId: shooter.id,
        color: shooter.color,
        lane: shooter.pos,
        cell,
        paint: state.paint[cell]!,
        completed: isComplete(state.level.targets[cell]!, state.paint[cell]!),
      });
    }
    if (shooter.ammo === 0) {
      state.departures.push({ shooterId: shooter.id, slot: null });
      continue;
    }
    shooter.pos = (shooter.pos + 1) % length;
    shooter.traveled += 1;
    if (shooter.traveled < length) {
      stillOnBelt.push(shooter);
      continue;
    }
    const free = state.slots.indexOf(null);
    if (free >= 0) {
      state.slots[free] = { ...shooter, pos: 0, traveled: 0 };
      state.departures.push({ shooterId: shooter.id, slot: free });
    } else {
      state.jammed.push({ ...shooter, pos: 0, traveled: 0 });
      state.status = 'jammed';
    }
  }
  state.belt = stillOnBelt;

  if (isWon(state)) state.status = 'won';
  return state;
}

export function remainingShooters(state: GameState): number {
  return (
    state.queues.reduce((n, q) => n + q.length, 0) +
    state.slots.filter(Boolean).length +
    state.pending.length +
    state.belt.length
  );
}
