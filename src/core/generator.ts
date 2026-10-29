import { BROWN, PRIMARIES, isPrimary, type Primary } from './colors';
import { paintNeeds, parseImage, parseLevel, parseOverlay, type LevelDef, type ShooterSpec } from './level';
import { createRng, shuffle } from './rng';
import { levelWinRate, solve } from './solver';

export interface GenerateOptions {
  id: number;
  name: string;
  stage?: number;
  boss?: boolean;
  image: string[];
  overlay?: string[];
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
  /** Reject settings that leave fewer shooters than this: few huge buckets mean few decisions. */
  minShooters?: number;
  /**
   * Instead of a hand-drawn overlay: how many ice and hidden pixels to place (seeded, per attempt). `brown` repaints
   * that many pixels of the image brown first (#94).
   */
  special?: { ice?: number; hidden?: number; brown?: number };
}

/**
 * Places `ice` iced pixels (on primary pixels only) and `hidden` pixels (each with at least one
 * orthogonal neighbour that is a visible pixel, so it can be revealed). Returns an overlay.
 */
export function placeSpecial(image: string[], counts: { ice?: number; hidden?: number }, rng: () => number): string[] {
  const { width, height, targets } = parseImage(image);
  const grid = targets.map(() => '.');
  const cells = shuffle(targets.map((_, i) => i), rng);
  let ice = counts.ice ?? 0;
  for (const c of cells) {
    if (ice === 0) break;
    if (isPrimary(targets[c]!)) {
      grid[c] = 'i';
      ice -= 1;
    }
  }
  if (ice > 0) throw new Error(`not enough primary pixels for ${counts.ice} ice`);
  let hidden = counts.hidden ?? 0;
  const neighbours = (c: number) => {
    const x = c % width, y = Math.floor(c / width);
    return [x > 0 ? c - 1 : -1, x < width - 1 ? c + 1 : -1, y > 0 ? c - width : -1, y < height - 1 ? c + width : -1]
      .filter((n) => n >= 0 && targets[n] !== 0);
  };
  for (const c of cells) {
    if (hidden === 0) break;
    if (targets[c] === 0 || grid[c] !== '.') continue;
    if (!neighbours(c).some((n) => grid[n] !== 'h')) continue;
    grid[c] = 'h';
    hidden -= 1;
  }
  if (hidden > 0) throw new Error(`not enough room for ${counts.hidden} hidden pixels`);
  return Array.from({ length: height }, (_, y) => grid.slice(y * width, (y + 1) * width).join(''));
}

/** Repaints `count` seeded pixels of the image brown (`K`); pixels already brown are not picked again. */
export function placeBrown(image: string[], count: number, rng: () => number): string[] {
  const { width, targets } = parseImage(image);
  const grid = image.join('').split('');
  const cells = shuffle(targets.map((_, i) => i), rng).filter((c) => targets[c] !== 0 && targets[c] !== BROWN);
  if (cells.length < count) throw new Error(`not enough pixels for ${count} brown`);
  for (const c of cells.slice(0, count)) grid[c] = 'K';
  return image.map((_, y) => grid.slice(y * width, (y + 1) * width).join(''));
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
  const attempts = opts.attempts ?? 200;
  let unsolvable = 0;
  let lowest = Infinity;
  let highest = -Infinity;
  for (let a = 0; a < attempts; a++) {
    const seed = opts.seed + a;
    const rng = createRng(seed);
    const image = opts.special?.brown ? placeBrown(opts.image, opts.special.brown, rng) : opts.image;
    const { width, targets } = parseImage(image);
    const overlay = opts.special ? placeSpecial(image, opts.special, rng) : opts.overlay;
    const { ice } = parseOverlay(overlay, width, targets);
    const shooters = splitAmmo(paintNeeds(targets, ice), opts.ammoChunk);
    if (opts.minShooters && shooters.length < opts.minShooters) {
      throw new Error(`only ${shooters.length} shooters with ammoChunk ${opts.ammoChunk}, minimum ${opts.minShooters}`);
    }
    const columns: ShooterSpec[][] = Array.from({ length: opts.columns }, () => []);
    shuffle(shooters, rng).forEach((s, i) => columns[i % opts.columns]!.push(s));
    const def: LevelDef = {
      id: opts.id,
      name: opts.name,
      stage: opts.stage ?? 1,
      ...(opts.boss ? { boss: true } : {}),
      image,
      ...(overlay ? { overlay } : {}),
      columns: columns.filter((c) => c.length > 0),
      slots: opts.slots,
      beltCapacity: opts.beltCapacity,
    };
    const level = parseLevel(def);
    const result = solve(level, opts.nodeBudget);
    if (!result.solvable) {
      unsolvable += 1;
      continue;
    }
    const winRate = levelWinRate(level);
    lowest = Math.min(lowest, winRate);
    highest = Math.max(highest, winRate);
    if (opts.winRate && (winRate < opts.winRate[0] || winRate > opts.winRate[1])) continue;
    return { def, seed, nodes: result.nodes, winRate };
  }
  const seen = lowest <= highest ? `; solvable deals had win rates ${lowest.toFixed(2)}–${highest.toFixed(2)}` : '';
  throw new Error(`no solvable deal found for level ${opts.id} in ${attempts} attempts (${unsolvable} unsolvable${seen})`);
}
