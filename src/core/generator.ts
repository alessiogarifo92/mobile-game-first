import { BROWN, PRIMARIES, isPrimary, type Primary } from './colors';
import { buildLanes, paintNeeds, parseImage, parseLevel, parseOverlay, walledIn, type LevelDef, type ShooterSpec } from './level';
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
   * Instead of a hand-drawn overlay: how many ice, hidden, key and locked pixels and stones to place (seeded, per
   * attempt). `brown` repaints that many pixels of the image brown first (#94). `covered` is the share of buckets
   * (0–1) dealt covered, never the first of a column (see `coverShooters`).
   */
  special?: Special;
  /**
   * Stones must cost the random tapper at least this much win rate (0–1): a deal is kept only when removing its
   * stones would raise `levelWinRate` by `stoneBite` or more (#147). Stones that make a level easier are rejected.
   */
  stoneBite?: number;
}

export interface Special {
  ice?: number;
  hidden?: number;
  brown?: number;
  key?: number;
  lock?: number;
  /** Stones go on empty cells touching the figure (holes inside it or its edge): draw `.` where they may go. */
  stone?: number;
  /**
   * `random` (default): stones go on the first allowed cells of the shuffle. `blocking`: each stone goes where it
   * shields the most pixels from the belt (see `stoneShield`), ties broken by the shuffle (#147).
   */
  stonePlacement?: 'random' | 'blocking';
  covered?: number;
}

/**
 * How much a stone on `cell` would block, given the stones already placed: on each lane through the cell that no
 * earlier stone already cuts, the pixels behind it (up to the next stone), counted twice when no pixel stands in front
 * of it (the stone is then the first thing that lane's shots meet). 0 for a cell that shields nothing.
 */
export function stoneShield(
  width: number,
  height: number,
  targets: readonly number[],
  cell: number,
  stones: readonly boolean[] = [],
): number {
  if (cell < 0 || cell >= width * height) throw new Error(`cell ${cell} is off the board`);
  let score = 0;
  for (const lane of buildLanes(width, height)) {
    const k = lane.indexOf(cell);
    if (k < 0) continue;
    const front = lane.slice(0, k);
    if (front.some((c) => stones[c])) continue;
    let behind = 0;
    for (const c of lane.slice(k + 1)) {
      if (stones[c]) break;
      if (targets[c] !== 0) behind += 1;
    }
    score += front.some((c) => targets[c] !== 0) ? behind : 2 * behind;
  }
  return score;
}

/**
 * Covers `round(share × buckets)` buckets, picked with `rng` among those behind the front of their column: the front
 * one is in view from the start, so the player always sees one colour per column. Returns new columns.
 */
export function coverShooters(columns: ShooterSpec[][], share: number, rng: () => number): ShooterSpec[][] {
  if (!(share >= 0 && share <= 1)) throw new Error('covered must be a share between 0 and 1');
  const total = columns.reduce((n, c) => n + c.length, 0);
  const behind = columns.flatMap((column, c) => column.slice(1).map((_, k) => [c, k + 1] as const));
  const count = Math.round(share * total);
  if (count > behind.length) throw new Error(`only ${behind.length} buckets behind the front, cannot cover ${count}`);
  const out = columns.map((column) => column.map((s) => ({ ...s })));
  for (const [c, k] of shuffle(behind, rng).slice(0, count)) out[c]![k]!.covered = true;
  return out;
}

/**
 * Places `ice` iced pixels (on primary pixels only), `hidden` pixels (each with at least one
 * orthogonal neighbour that is a visible pixel, so it can be revealed), then `key` key pixels and
 * `lock` locked pixels (skipping any lock that would wall a key in), then `stone` stones (on empty cells next to a pixel,
 * never walling a pixel or a key in). Returns an overlay.
 */
export function placeSpecial(image: string[], counts: Special, rng: () => number): string[] {
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
  const rows = () => Array.from({ length: height }, (_, y) => grid.slice(y * width, (y + 1) * width).join(''));
  const valid = () => {
    try {
      parseOverlay(rows(), width, targets);
      return true;
    } catch {
      return false;
    }
  };
  let key = counts.key ?? 0;
  let lock = counts.lock ?? 0;
  if ((key > 0) !== (lock > 0)) throw new Error('keys and locks come together');
  for (const c of cells) {
    if (key === 0) break;
    if (targets[c] === 0 || grid[c] !== '.') continue;
    grid[c] = 'k';
    key -= 1;
  }
  if (key > 0) throw new Error(`not enough room for ${counts.key} keys`);
  for (const c of cells) {
    if (lock === 0) break;
    if (targets[c] === 0 || grid[c] !== '.') continue;
    grid[c] = 'l';
    if (!valid()) {
      grid[c] = '.'; // this lock would wall a key in (or leave a lock without a key in sight)
      continue;
    }
    lock -= 1;
  }
  if (lock > 0) throw new Error(`not enough room for ${counts.lock} locks`);
  // Stones last, from the same shuffle: levels without stones keep their overlay draw for draw.
  let stone = counts.stone ?? 0;
  const stones = targets.map(() => false);
  // A stone must not wall a pixel in, nor (with the locks) a key.
  const tryStone = (c: number) => {
    stones[c] = true;
    grid[c] = 's';
    if (walledIn(width, height, targets, stones) >= 0 || !valid()) {
      stones[c] = false;
      grid[c] = '.';
      return false;
    }
    return true;
  };
  const free = cells.filter((c) => targets[c] === 0 && neighbours(c).length > 0);
  if (counts.stonePlacement === 'blocking') {
    // Greedy: the cell that shields most given the stones so far; a cell that fails the checks is dropped.
    const left = [...free];
    while (stone > 0 && left.length > 0) {
      let best = 0;
      let bestScore = -1;
      left.forEach((c, i) => {
        const score = stoneShield(width, height, targets, c, stones);
        if (score > bestScore) [best, bestScore] = [i, score];
      });
      const [c] = left.splice(best, 1);
      if (bestScore > 0 && tryStone(c!)) stone -= 1;
      else if (bestScore <= 0) break; // nothing left shields a pixel: a stone there would be decoration
    }
  } else {
    for (const c of free) {
      if (stone === 0) break;
      if (tryStone(c)) stone -= 1;
    }
  }
  if (stone > 0) throw new Error(`not enough empty cells next to the figure for ${counts.stone} stones`);
  return rows();
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
  if (opts.stoneBite !== undefined && !(opts.stoneBite >= 0 && opts.stoneBite <= 1)) {
    throw new Error('stoneBite must be a share between 0 and 1');
  }
  let unsolvable = 0;
  let toothless = 0;
  let lowest = Infinity;
  let highest = -Infinity;
  for (let a = 0; a < attempts; a++) {
    const seed = opts.seed + a;
    const rng = createRng(seed);
    const image = opts.special?.brown ? placeBrown(opts.image, opts.special.brown, rng) : opts.image;
    const { width, targets } = parseImage(image);
    // Covered buckets change the columns, not the overlay: a level with only `covered` keeps its hand-drawn overlay.
    const placed: Special = { ...opts.special };
    delete placed.covered;
    const overlay = opts.special && Object.keys(placed).length > 0 ? placeSpecial(image, placed, rng) : opts.overlay;
    const { ice } = parseOverlay(overlay, width, targets);
    const shooters = splitAmmo(paintNeeds(targets, ice), opts.ammoChunk);
    if (opts.minShooters && shooters.length < opts.minShooters) {
      throw new Error(`only ${shooters.length} shooters with ammoChunk ${opts.ammoChunk}, minimum ${opts.minShooters}`);
    }
    let columns: ShooterSpec[][] = Array.from({ length: opts.columns }, () => []);
    shuffle(shooters, rng).forEach((s, i) => columns[i % opts.columns]!.push(s));
    if (opts.special?.covered) columns = coverShooters(columns.filter((c) => c.length > 0), opts.special.covered, rng);
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
    if (opts.stoneBite !== undefined) {
      const bare = levelWinRate({ ...level, stone: level.stone.map(() => false) });
      if (bare - winRate < opts.stoneBite) {
        toothless += 1;
        continue;
      }
    }
    return { def, seed, nodes: result.nodes, winRate };
  }
  const seen = lowest <= highest ? `; solvable deals had win rates ${lowest.toFixed(2)}–${highest.toFixed(2)}` : '';
  const bite = toothless > 0 ? `; ${toothless} in band but with stones that do not bite` : '';
  throw new Error(`no solvable deal found for level ${opts.id} in ${attempts} attempts (${unsolvable} unsolvable${seen}${bite})`);
}
