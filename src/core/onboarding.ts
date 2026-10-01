import { isPrimary } from './colors';
import type { Level } from './level';

/** One-time onboarding tips, shown the first time the mechanic they explain shows up. */
/** Tips shown as a card; 'guide' is the guided level 1 instead. */
export type CardTip = 'mixing' | 'blocked' | 'slots';
export type TipId = 'guide' | CardTip;

/** Level 1 is played as a guided tutorial until the player has seen it once. */
export function needsGuide(level: Level, seen: readonly string[]): boolean {
  return level.id === 1 && !seen.includes('guide');
}

/** Tip to show when a level starts: mixing, the first time a level contains secondary colours. */
export function tipOnLevelStart(level: Level, seen: readonly string[]): CardTip | null {
  const hasSecondary = level.targets.some((t) => t !== 0 && !isPrimary(t));
  return hasSecondary && !seen.includes('mixing') ? 'mixing' : null;
}

/**
 * Tip to show when a bucket comes back to a waiting slot. A bucket that could not shoot at all is
 * the confusing case, so it explains blocked lanes first; otherwise it explains the slots.
 */
export function tipOnReturn(hadHits: boolean, seen: readonly string[]): CardTip | null {
  if (!hadHits && !seen.includes('blocked')) return 'blocked';
  if (!seen.includes('slots')) return 'slots';
  return null;
}

export type GuideStep = 'tap' | 'watch' | 'next' | 'free';

/**
 * Guided level 1: point at a column, let the first bucket ride, point at the next column, then
 * leave the player alone. `launches` counts buckets sent so far; `beltBusy` is whether one is moving.
 */
export function guideStep(launches: number, beltBusy: boolean): GuideStep {
  if (launches === 0) return 'tap';
  if (launches === 1) return beltBusy ? 'watch' : 'next';
  return 'free';
}

/** During the guided steps only the highlighted column accepts taps. */
export function guideAllows(step: GuideStep, column: number | null, target: number): boolean {
  if (step === 'watch') return false;
  if (step === 'tap' || step === 'next') return column === target;
  return true;
}
