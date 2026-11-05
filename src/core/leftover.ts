import type { Primary } from './colors';
import type { GameState } from './sim';
import { beltLength } from './sim';
import { applyHit, cloneBoard, findTarget, type Board } from './rules';

/** What a bucket launched now would do on one lap of the belt, as if it rode it alone (#145). */
export interface LeftoverForecast {
  /** Shots that would land. */
  hits: number;
  /** Shots left when the lap ends: this is the paint that goes back to a waiting slot. 0 when it is emptied. */
  leftover: number;
  /** True when it would come back to a slot, i.e. it has paint left after the lap. */
  returns: boolean;
  /** True when it returns into the only free waiting slot: after it, the next returning bucket jams. */
  fillsLastSlot: boolean;
  /** True when it returns and no slot is free right now (the launch itself is what would jam). */
  jams: boolean;
}

/**
 * Pure forecast, same rules as `step` (`findTarget` + `applyHit` on a copy of the board, one shot per lane,
 * lanes 0..length-1 once). It ignores the other buckets already on the belt: they may paint, or block, before this one
 * arrives, so the number is exact on a quiet belt and an estimate otherwise. It never mutates the state.
 */
export function forecastLeftover(state: GameState, color: Primary, ammo: number): LeftoverForecast {
  const board: Board = cloneBoard(state);
  let left = ammo;
  const length = beltLength(state);
  for (let lane = 0; lane < length && left > 0; lane++) {
    const cell = findTarget(state.level, board, state.lanes[lane]!, color);
    if (cell < 0) continue;
    applyHit(state.level, board, cell, color);
    left -= 1;
  }
  const returns = left > 0;
  const free = freeSlots(state);
  return { hits: ammo - left, leftover: left, returns, fillsLastSlot: returns && free === 1, jams: returns && free === 0 };
}

/** Waiting slots with nobody in them. */
export function freeSlots(state: GameState): number {
  return state.slots.filter((s) => s === null).length;
}

export interface LeftoverHint {
  /** Shots that would come back to the waiting slots. */
  leftover: number;
  /** Warning level: the return takes the last free slot, or finds none. */
  risky: boolean;
  /** Pill text, e.g. "↩16" or "↩3!". */
  label: string;
}

/** What the board shows on a bucket for its forecast, or null when nothing would come back. */
export function leftoverHint(f: LeftoverForecast): LeftoverHint | null {
  if (f.leftover <= 0) return null;
  const risky = f.fillsLastSlot || f.jams;
  return { leftover: f.leftover, risky, label: `↩${f.leftover}${risky ? '!' : ''}` };
}
