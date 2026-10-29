import { COLOR_CODES, PRIMARIES, isPrimary, primariesOf, type Primary } from './colors';

export interface ShooterSpec {
  color: Primary;
  ammo: number;
  /**
   * Covered bucket: the player sees its colour only once it reaches the front of its column. The colour stays in the
   * data, so the simulation and the solver play it as any other bucket; only the UI hides it (see `colorShown`).
   */
  covered?: boolean;
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
  /** Optional layer over the image: `i` = ice, `h` = hidden, `.` = nothing. */
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

/** Parses the optional overlay: ice only on primary pixels, nothing on empty cells. */
export function parseOverlay(
  overlay: readonly string[] | undefined,
  width: number,
  targets: readonly number[],
): { ice: number[]; hidden: boolean[] } {
  const ice = targets.map(() => 0);
  const hidden = targets.map(() => false);
  if (!overlay) return { ice, hidden };
  if (overlay.length * width !== targets.length) throw new LevelError('overlay must have the same rows as the image');
  overlay.forEach((row, y) => {
    if (row.length !== width) throw new LevelError(`overlay row ${y} has length ${row.length}, expected ${width}`);
    [...row].forEach((ch, x) => {
      const cell = y * width + x;
      if (ch === '.') return;
      if (ch !== 'i' && ch !== 'h') throw new LevelError(`unknown overlay code "${ch}" in row ${y}`);
      if (targets[cell] === 0) throw new LevelError(`overlay "${ch}" on an empty cell (${x}, ${y})`);
      if (ch === 'i') {
        if (!isPrimary(targets[cell]!)) throw new LevelError(`ice on a non-primary pixel (${x}, ${y})`);
        ice[cell] = 1;
      } else hidden[cell] = true;
    });
  });
  return { ice, hidden };
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
  const { ice, hidden } = parseOverlay(def.overlay, width, targets);
  if (!Number.isInteger(def.slots) || def.slots < 1) throw new LevelError('slots must be a positive integer');
  if (!Number.isInteger(def.beltCapacity) || def.beltCapacity < 1) {
    throw new LevelError('beltCapacity must be a positive integer');
  }
  if (def.columns.length === 0) throw new LevelError('level has no shooter columns');

  const ammo = { 1: 0, 2: 0, 4: 0 } as Record<Primary, number>;
  for (const [c, column] of def.columns.entries()) {
    for (const [k, s] of column.entries()) {
      if (!isPrimary(s.color)) throw new LevelError(`shooter color ${s.color} is not a primary`);
      if (!Number.isInteger(s.ammo) || s.ammo < 1) throw new LevelError('shooter ammo must be a positive integer');
      if (s.covered !== undefined && typeof s.covered !== 'boolean') throw new LevelError(`covered must be true or false (column ${c}, bucket ${k})`);
      // The front bucket is in view from the start: covering it would hide nothing.
      if (s.covered && k === 0) throw new LevelError(`the first bucket of column ${c} cannot be covered`);
      ammo[s.color] += s.ammo;
    }
  }
  const needs = paintNeeds(targets, ice);
  for (const p of PRIMARIES) {
    if (ammo[p] !== needs[p]) {
      throw new LevelError(`ammo for color ${p} is ${ammo[p]} but the image needs ${needs[p]}`);
    }
  }
  return { ...def, width, height, targets, ice, hidden };
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
