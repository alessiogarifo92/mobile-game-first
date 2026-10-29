import { COLOR_CODES, PRIMARIES, isPrimary, primariesOf, type Primary } from './colors';

export interface ShooterSpec {
  color: Primary;
  ammo: number;
}

/** Level as stored in JSON. Images are rows of `.RYBOGP` characters. */
export interface LevelDef {
  id: number;
  /** Translation key: the displayed name is `level.<name>`. */
  name: string;
  stage: number;
  /** The 10th level of a stage. */
  boss?: boolean;
  /** Hash of the spec this level was generated from (see stages.ts). */
  specHash?: string;
  image: string[];
  /** Optional layer over the image: `i` = ice, `h` = hidden, `s` = stone (on an empty cell), `.` = nothing. */
  overlay?: string[];
  columns: ShooterSpec[][];
  slots: number;
  beltCapacity: number;
}

export interface Level extends LevelDef {
  width: number;
  height: number;
  /** Row-major target masks; 0 = no pixel. */
  targets: number[];
  /** Ice layers per cell (0 or 1). */
  ice: number[];
  hidden: boolean[];
  /** Stones: fixed cells with no pixel where paint stops (#95). */
  stone: boolean[];
}

export class LevelError extends Error {}

/** Number of hits of each primary needed to complete an image (an iced pixel takes one more). */
export function paintNeeds(targets: readonly number[], ice: readonly number[] = []): Record<Primary, number> {
  const needs = { 1: 0, 2: 0, 4: 0 } as Record<Primary, number>;
  targets.forEach((t, i) => {
    for (const p of primariesOf(t)) needs[p] += 1 + (ice[i] ?? 0);
  });
  return needs;
}

/** Parses the optional overlay: ice only on primary pixels, stones only on empty cells, nothing else on empty cells. */
export function parseOverlay(
  overlay: readonly string[] | undefined,
  width: number,
  targets: readonly number[],
): { ice: number[]; hidden: boolean[]; stone: boolean[] } {
  const ice = targets.map(() => 0);
  const hidden = targets.map(() => false);
  const stone = targets.map(() => false);
  if (!overlay) return { ice, hidden, stone };
  if (overlay.length * width !== targets.length) throw new LevelError('overlay must have the same rows as the image');
  overlay.forEach((row, y) => {
    if (row.length !== width) throw new LevelError(`overlay row ${y} has length ${row.length}, expected ${width}`);
    [...row].forEach((ch, x) => {
      const cell = y * width + x;
      if (ch === '.') return;
      if (ch === 's') {
        if (targets[cell] !== 0) throw new LevelError(`stone on a pixel (${x}, ${y}): a stone takes an empty cell`);
        stone[cell] = true;
        return;
      }
      if (ch !== 'i' && ch !== 'h') throw new LevelError(`unknown overlay code "${ch}" in row ${y}`);
      if (targets[cell] === 0) throw new LevelError(`overlay "${ch}" on an empty cell (${x}, ${y})`);
      if (ch === 'i') {
        if (!isPrimary(targets[cell]!)) throw new LevelError(`ice on a non-primary pixel (${x}, ${y})`);
        ice[cell] = 1;
      } else hidden[cell] = true;
    });
  });
  return { ice, hidden, stone };
}

/** First pixel that no lane reaches before a stone (stones stop paint), or -1 when every pixel can be painted. */
export function walledIn(width: number, height: number, targets: readonly number[], stone: readonly boolean[]): number {
  if (!stone.some(Boolean)) return -1;
  const reached = targets.map(() => false);
  for (const lane of buildLanes(width, height)) {
    for (const cell of lane) {
      if (stone[cell]) break;
      reached[cell] = true;
    }
  }
  return targets.findIndex((t, i) => t !== 0 && !reached[i]);
}

/** Every pixel needs at least one lane that reaches it before any stone; checked before the solver runs. */
export function checkReachable(width: number, height: number, targets: readonly number[], stone: readonly boolean[]): void {
  const cell = walledIn(width, height, targets, stone);
  if (cell >= 0) {
    throw new LevelError(`pixel (${cell % width}, ${Math.floor(cell / width)}) is walled in: a stone blocks every lane to it`);
  }
}

export function parseImage(image: readonly string[]): { width: number; height: number; targets: number[] } {
  if (image.length === 0) throw new LevelError('image has no rows');
  const width = image[0]!.length;
  if (width === 0) throw new LevelError('image rows are empty');
  const targets: number[] = [];
  image.forEach((row, y) => {
    if (row.length !== width) throw new LevelError(`row ${y} has length ${row.length}, expected ${width}`);
    for (const ch of row) {
      if (ch === '.') targets.push(0);
      else if (ch in COLOR_CODES) targets.push(COLOR_CODES[ch]!);
      else throw new LevelError(`unknown color code "${ch}" in row ${y}`);
    }
  });
  if (targets.every((t) => t === 0)) throw new LevelError('image has no pixels');
  return { width, height: image.length, targets };
}

/** Parses and validates a level definition; throws LevelError when it can never be completed. */
export function parseLevel(def: LevelDef): Level {
  const { width, height, targets } = parseImage(def.image);
  const { ice, hidden, stone } = parseOverlay(def.overlay, width, targets);
  checkReachable(width, height, targets, stone);
  if (!Number.isInteger(def.slots) || def.slots < 1) throw new LevelError('slots must be a positive integer');
  if (!Number.isInteger(def.beltCapacity) || def.beltCapacity < 1) {
    throw new LevelError('beltCapacity must be a positive integer');
  }
  if (def.columns.length === 0) throw new LevelError('level has no shooter columns');

  const ammo = { 1: 0, 2: 0, 4: 0 } as Record<Primary, number>;
  for (const column of def.columns) {
    for (const s of column) {
      if (!isPrimary(s.color)) throw new LevelError(`shooter color ${s.color} is not a primary`);
      if (!Number.isInteger(s.ammo) || s.ammo < 1) throw new LevelError('shooter ammo must be a positive integer');
      ammo[s.color] += s.ammo;
    }
  }
  const needs = paintNeeds(targets, ice);
  for (const p of PRIMARIES) {
    if (ammo[p] !== needs[p]) {
      throw new LevelError(`ammo for color ${p} is ${ammo[p]} but the image needs ${needs[p]}`);
    }
  }
  return { ...def, width, height, targets, ice, hidden, stone };
}

/**
 * Belt lanes, in belt order: bottom side (left→right, looking up), right side (bottom→top, looking left),
 * top side (right→left, looking down), left side (top→bottom, looking right).
 * Each lane lists cell indices in the order paint travels through them.
 */
export function buildLanes(width: number, height: number): number[][] {
  const lanes: number[][] = [];
  const idx = (x: number, y: number) => y * width + x;
  for (let x = 0; x < width; x++) lanes.push(range(height).map((k) => idx(x, height - 1 - k)));
  for (let k = 0; k < height; k++) {
    const y = height - 1 - k;
    lanes.push(range(width).map((j) => idx(width - 1 - j, y)));
  }
  for (let k = 0; k < width; k++) {
    const x = width - 1 - k;
    lanes.push(range(height).map((j) => idx(x, j)));
  }
  for (let y = 0; y < height; y++) lanes.push(range(width).map((j) => idx(j, y)));
  return lanes;
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}
