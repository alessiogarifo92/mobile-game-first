import { PRIMARIES, type Primary } from './colors';
import { paintNeeds, parseImage, parseLevel, type LevelDef, type ShooterSpec } from './level';
import { createRng, shuffle } from './rng';
import { randomWinRate, solve } from './solver';

export interface GenerateOptions {
  id: number;
  name: string;
  stage?: number;
  boss?: boolean;
  image: string[];
  columns: number;
  /** Preferred ammo per shooter; the last shooter of each color takes the remainder. */
  ammoChunk: number;
  slots: number;
  beltCapacity: number;
  seed: number;
  /** Seeds to try before giving up. */
  attempts?: number;
  nodeBudget?: number;
  /** Accept only deals whose random-tapper win rate falls in [min, max] (difficulty band). */
  winRate?: [number, number];
}

/** Splits each color's paint need into shooters of roughly `chunk` ammo. */
export function splitAmmo(needs: Record<Primary, number>, chunk: number): ShooterSpec[] {
  if (!Number.isInteger(chunk) || chunk < 1) throw new Error('ammoChunk must be a positive integer');
  const shooters: ShooterSpec[] = [];
  for (const color of PRIMARIES) {
    let left = needs[color];
    while (left > 0) {
      // Avoid a tiny last shooter: fold a remainder under half a chunk into the previous one.
      const take = left - chunk < Math.ceil(chunk / 2) ? left : chunk;
      shooters.push({ color, ammo: take });
      left -= take;
    }
  }
  return shooters;
}

/**
 * Deals shuffled shooters into columns and keeps the first deal the solver proves solvable.
 * Throws when no attempt is solvable, so an unplayable level can never ship.
 */
export function generateLevel(opts: GenerateOptions): { def: LevelDef; seed: number; nodes: number; winRate: number } {
  const { targets } = parseImage(opts.image);
  const shooters = splitAmmo(paintNeeds(targets), opts.ammoChunk);
  const attempts = opts.attempts ?? 200;
  for (let a = 0; a < attempts; a++) {
    const seed = opts.seed + a;
    const rng = createRng(seed);
    const columns: ShooterSpec[][] = Array.from({ length: opts.columns }, () => []);
    shuffle(shooters, rng).forEach((s, i) => columns[i % opts.columns]!.push(s));
    const def: LevelDef = {
      id: opts.id,
      name: opts.name,
      stage: opts.stage ?? 1,
      ...(opts.boss ? { boss: true } : {}),
      image: opts.image,
      columns: columns.filter((c) => c.length > 0),
      slots: opts.slots,
      beltCapacity: opts.beltCapacity,
    };
    const level = parseLevel(def);
    const result = solve(level, opts.nodeBudget);
    if (!result.solvable) continue;
    const winRate = randomWinRate(level, 200, createRng(seed));
    if (opts.winRate && (winRate < opts.winRate[0] || winRate > opts.winRate[1])) continue;
    return { def, seed, nodes: result.nodes, winRate };
  }
  throw new Error(`no solvable deal found for level ${opts.id} in ${attempts} attempts`);
}
