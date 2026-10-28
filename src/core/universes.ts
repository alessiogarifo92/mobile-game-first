import { COLOR_CODES } from './colors';
import { LEVELS_PER_STAGE, type StageContent } from './stages';

/** Stages in a full universe (10 × LEVELS_PER_STAGE = 100 levels). How many universes there are comes from the stage files. */
export const STAGES_PER_UNIVERSE = 10;
/** Largest picture side any universe may use: on a 360 px phone a 16×16 pixel is still ~14 px wide (#90). */
export const MAX_CANVAS = 16;

export interface UniverseInfo {
  id: number;
  /** Stable key: the translated name is `universe.<key>`. */
  key: string;
  /** Colour code of the universe theme (`R Y B O G P`, as in level images). */
  color: string;
  /** Largest picture side (width and height) its levels may use, at most MAX_CANVAS. */
  maxCanvas: number;
}

/**
 * The universes of epic #87, one entry per universe that has stages. A universe is a theme for a run of
 * STAGES_PER_UNIVERSE stages: which stages and levels it holds, and whether it is complete, come from the data.
 */
export const UNIVERSES: readonly UniverseInfo[] = [{ id: 1, key: 'atelier', color: 'R', maxCanvas: 14 }];

/** Level ids and stages of the game (the shape progress.ts checks saves against). */
type LevelRef = { id: number; stage: number };

export const universeOfStage = (stage: number): number => Math.ceil(stage / STAGES_PER_UNIVERSE);

/** Universe of a level, or undefined for an id the game does not have. */
export function universeOf(levels: readonly LevelRef[], levelId: number): number | undefined {
  const level = levels.find((l) => l.id === levelId);
  return level && universeOfStage(level.stage);
}

/** Ids of the levels a universe holds so far, in order (empty for a universe with no levels). */
export function universeLevels(levels: readonly LevelRef[], universe: number): number[] {
  return levels.filter((l) => universeOfStage(l.stage) === universe).map((l) => l.id);
}

export function lastLevelOf(levels: readonly LevelRef[], universe: number): number | undefined {
  return universeLevels(levels, universe).at(-1);
}

/**
 * Universe 1 is always open; universe n opens when universe n−1 is open and its last level is completed.
 * A universe the game has no levels for is never open.
 */
export function isUniverseUnlocked(levels: readonly LevelRef[], completed: readonly number[], universe: number): boolean {
  if (universeLevels(levels, universe).length === 0) return false;
  if (universe === 1) return true;
  const previousLast = lastLevelOf(levels, universe - 1);
  return previousLast !== undefined && completed.includes(previousLast) && isUniverseUnlocked(levels, completed, universe - 1);
}

/** The highest open universe (0 for a game with no levels). */
export function openUniverse(levels: readonly LevelRef[], completed: readonly number[]): number {
  let open = 0;
  while (isUniverseUnlocked(levels, completed, open + 1)) open += 1;
  return open;
}

/** The core decides whether a level may be played: unlocked, and in an open universe. The UI only follows. */
export function canOpenLevel(levels: readonly LevelRef[], progress: { unlocked: number; completed: readonly number[] }, levelId: number): boolean {
  const universe = universeOf(levels, levelId);
  return universe !== undefined && levelId <= progress.unlocked && universe <= openUniverse(levels, progress.completed);
}

export class UniverseError extends Error {}

type Picture = { name: string; image: readonly string[] };

/**
 * Checks the universes against the stage files: universes numbered 1..n, each with a known, unique name key, a
 * colour and a canvas limit up to MAX_CANVAS; every stage in a listed universe and no universe without stages;
 * only the last universe may be partial (fewer than STAGES_PER_UNIVERSE complete stages); every picture within
 * its universe's canvas.
 */
export function validateUniverses(
  universes: readonly UniverseInfo[],
  stages: readonly StageContent<Picture>[],
  knownKeys: ReadonlySet<string>,
): void {
  const keys = new Set<string>();
  universes.forEach((u, i) => {
    if (u.id !== i + 1) throw new UniverseError(`universes must be numbered 1..n: found ${u.id} at position ${i + 1}`);
    if (!knownKeys.has(u.key)) throw new UniverseError(`universe ${u.id} key "${u.key}" has no translation key universe.${u.key}`);
    if (keys.has(u.key)) throw new UniverseError(`universe key "${u.key}" is used twice`);
    keys.add(u.key);
    if (!(u.color in COLOR_CODES)) throw new UniverseError(`universe ${u.id} colour "${u.color}" is not one of ${Object.keys(COLOR_CODES).join(' ')}`);
    if (!Number.isInteger(u.maxCanvas) || u.maxCanvas < 1 || u.maxCanvas > MAX_CANVAS) {
      throw new UniverseError(`universe ${u.id} canvas ${u.maxCanvas} is not between 1 and ${MAX_CANVAS}`);
    }
  });
  const inUniverse = (id: number) => stages.filter((s) => universeOfStage(s.stage) === id);
  const last = universeOfStage(stages.at(-1)?.stage ?? 0);
  if (last > universes.length) throw new UniverseError(`stage ${stages.at(-1)!.stage} is in universe ${last}, which is not in UNIVERSES`);
  for (const u of universes) {
    const own = inUniverse(u.id);
    if (own.length === 0) throw new UniverseError(`universe ${u.id} has no stages`);
    const full = own.length === STAGES_PER_UNIVERSE && own.every((s) => s.complete);
    if (u.id < universes.length && !full) {
      throw new UniverseError(`universe ${u.id} is not complete: only the last universe may still be in progress`);
    }
    for (const s of own) {
      for (const l of s.levels) {
        const width = Math.max(...l.image.map((row) => row.length));
        if (width > u.maxCanvas || l.image.length > u.maxCanvas) {
          throw new UniverseError(`level "${l.name}" is ${width}×${l.image.length}, universe ${u.id} allows up to ${u.maxCanvas}×${u.maxCanvas}`);
        }
      }
    }
  }
}

/** A universe holds all its levels: STAGES_PER_UNIVERSE stages of LEVELS_PER_STAGE levels. */
export function isUniverseComplete(levels: readonly LevelRef[], universe: number): boolean {
  return universeLevels(levels, universe).length === STAGES_PER_UNIVERSE * LEVELS_PER_STAGE;
}
