import { COLOR_CODES } from './colors';
import { currentLevel } from './mapLayout';
import {
  isUniverseComplete, isUniverseUnlocked, lastLevelOf, universeLevels, universeOf, type UniverseInfo,
} from './universes';

/** Level ids and stages of the game. */
type LevelRef = { id: number; stage: number };

export interface UniverseCard {
  id: number;
  key: string;
  /** Paint colour of the universe theme. */
  color: number;
  done: number;
  total: number;
  open: boolean;
  /** For a closed universe: the level to complete to open it. */
  unlockLevel?: number;
  /** All its levels exist (STAGES_PER_UNIVERSE full stages). */
  complete: boolean;
  firstLevel: number;
}

/** One card per universe that has levels, in order: open or closed, with its x/total progress. */
export function universeCards(universes: readonly UniverseInfo[], levels: readonly LevelRef[], completed: readonly number[]): UniverseCard[] {
  const done = new Set(completed);
  return universes
    .map((u) => ({ u, ids: universeLevels(levels, u.id) }))
    .filter(({ ids }) => ids.length > 0)
    .map(({ u, ids }) => {
      const open = isUniverseUnlocked(levels, completed, u.id);
      return {
        id: u.id,
        key: u.key,
        color: COLOR_CODES[u.color]!,
        done: ids.filter((id) => done.has(id)).length,
        total: ids.length,
        open,
        ...(open ? {} : { unlockLevel: lastLevelOf(levels, u.id - 1)! }),
        complete: isUniverseComplete(levels, u.id),
        firstLevel: ids[0]!,
      };
    });
}

/**
 * The universe the map shows: the one asked for if it is open, else the universe of the player's current level
 * (the map opens where the player is).
 */
export function mapUniverse(levels: readonly LevelRef[], progress: { unlocked: number; completed: readonly number[] }, requested?: number): number {
  if (requested !== undefined && isUniverseUnlocked(levels, progress.completed, requested)) return requested;
  return universeOf(levels, currentLevel(progress.unlocked, progress.completed, levels.length)) ?? 1;
}

/** The universe this win completes for the first time (its last level, every level done), else null. */
export function newlyCompletedUniverse(levels: readonly LevelRef[], before: readonly number[], levelId: number): number | null {
  if (before.includes(levelId)) return null;
  const universe = universeOf(levels, levelId);
  if (universe === undefined || !isUniverseComplete(levels, universe) || lastLevelOf(levels, universe) !== levelId) return null;
  const after = new Set([...before, levelId]);
  return universeLevels(levels, universe).every((id) => after.has(id)) ? universe : null;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SELECTOR = {
  /** Header (back button and title) above the first card. */
  top: 220,
  bottomPad: 40,
  side: 40,
  gap: 24,
  maxCard: 260,
  minCard: 150,
} as const;

/**
 * Cards of the universe selector, stacked under the header and centred in the space left: as tall as they fit, between
 * minCard and maxCard. Returns the content height too; it exceeds the view only past ~6 universes at 1280.
 */
export function selectorLayout(count: number, width: number, viewHeight: number): { cards: Rect[]; height: number } {
  const avail = viewHeight - SELECTOR.top - SELECTOR.bottomPad;
  const fit = count > 0 ? (avail - SELECTOR.gap * (count - 1)) / count : 0;
  const h = Math.floor(Math.max(SELECTOR.minCard, Math.min(SELECTOR.maxCard, fit)));
  const used = count * h + Math.max(0, count - 1) * SELECTOR.gap;
  const start = SELECTOR.top + Math.max(0, (avail - used) / 2);
  const cards = Array.from({ length: count }, (_, i) => ({ x: SELECTOR.side, y: start + i * (h + SELECTOR.gap), w: width - 2 * SELECTOR.side, h }));
  return { cards, height: Math.max(viewHeight, start + used + SELECTOR.bottomPad) };
}

/** Index of the card under a tap, or -1. */
export function cardAt(cards: readonly Rect[], x: number, y: number): number {
  return cards.findIndex((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
}
