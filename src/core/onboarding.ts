import { BROWN, isPrimary } from './colors';
import type { Level } from './level';

/** One-time onboarding tips, shown the first time the mechanic they explain shows up. */
/** Tips shown as a card; 'guide' is the guided level 1 instead. */
export type CardTip =
  | 'mixing' | 'blocked' | 'slots' | 'ice' | 'hidden' | 'lock' | 'belt' | 'brown' | 'stone' | 'covered' | 'queue' | 'leftover';

/** Buckets a column shows; the rest wait behind, counted by the "+N" under it. */
export const COLUMN_SHOWN = 3;
export type TipId = 'guide' | 'map' | CardTip;

/**
 * The map points at the open level until the player has entered a level once (#190).
 * 'map' is marked when a level is opened from the map; 'guide' or any completion means a save that
 * already played (older saves have no 'map' entry), so they never see the hint.
 */
export function needsMapHint(completed: readonly number[], seen: readonly string[]): boolean {
  return completed.length === 0 && !seen.includes('map') && !seen.includes('guide');
}

/** Level 1 is played as a guided tutorial until the player has seen it once. */
export function needsGuide(level: Level, seen: readonly string[]): boolean {
  return level.id === 1 && !seen.includes('guide');
}

/**
 * Tip to show when a level starts, the first time it contains something new: secondary colours,
 * brown (three primaries), ice, hidden pixels, stones, locked pixels, covered buckets or a column longer than it shows
 * (its "+N", #148). One tip per level start, in that order.
 */
export function tipOnLevelStart(level: Level, seen: readonly string[]): CardTip | null {
  return tipsPresent(level).find((tip) => !seen.includes(tip)) ?? null;
}

/** The level-start tips whose mechanic is on the board of `level`, in the order `tipOnLevelStart` shows them. */
export function tipsPresent(level: Level): CardTip[] {
  const present: [CardTip, boolean][] = [
    ['mixing', level.targets.some((t) => t !== 0 && !isPrimary(t))],
    ['brown', level.targets.includes(BROWN)],
    ['ice', level.ice.some((n) => n > 0)],
    ['hidden', level.hidden.some(Boolean)],
    ['stone', level.stone.some(Boolean)],
    ['lock', level.locked.some(Boolean)],
    ['covered', level.columns.some((column) => column.some((s) => s.covered))],
    ['queue', level.columns.some((column) => column.length > COLUMN_SHOWN)],
  ];
  return present.filter(([, here]) => here).map(([tip]) => tip);
}

/**
 * Cards that answer something that just went wrong on screen: a refused tap, a bucket that came back without
 * painting, a full belt. They show whenever the player hits that case, even after another card in the same level.
 */
export const CORRECTIVE_TIPS: readonly CardTip[] = ['blocked', 'belt'];

/**
 * How many cards one level may show (#177). Every card that only teaches (a new mechanic at level start, the
 * slots, why a bucket came back) counts, and at most one of them shows per level: the second waits for a later
 * level, where it fires on the same trigger. Corrective cards (`CORRECTIVE_TIPS`) do not count and are never held
 * back, because without them the player is stuck on a refusal with no explanation.
 */
export function tipAllowed(tip: CardTip, shownThisLevel: readonly CardTip[]): boolean {
  return CORRECTIVE_TIPS.includes(tip) || shownThisLevel.every((t) => CORRECTIVE_TIPS.includes(t));
}

/**
 * Tip to show when a bucket comes back to a waiting slot. A bucket that could not shoot at all is
 * the confusing case, so it explains blocked lanes first; otherwise it explains the slots. Once the slots are known,
 * a bucket that painted and still came back explains why it did (#172): no pixel of its colour was left in
 * reach for the paint it carried. `shownThisLevel` applies the one-card-per-level rule (`tipAllowed`): in level 2
 * the slots card fires on the first return, so "why it came back" waits for the next level instead of following it.
 */
export function tipOnReturn(hadHits: boolean, seen: readonly string[], shownThisLevel: readonly CardTip[] = []): CardTip | null {
  const next = !hadHits && !seen.includes('blocked') ? 'blocked'
    : !seen.includes('slots') ? 'slots'
    : hadHits && !seen.includes('leftover') ? 'leftover'
    : null;
  return next && tipAllowed(next, shownThisLevel) ? next : null;
}

/** Tip to show when a tap on a waiting bucket is refused because it could not land a shot (#146). */
export function tipOnBlockedTap(seen: readonly string[]): CardTip | null {
  return seen.includes('blocked') ? null : 'blocked';
}

/**
 * Tip to show when a launch is refused because the belt is full: every level has a limit, and the first time it
 * stops a tap is when the player needs to know it exists.
 */
export function tipOnFullBelt(seen: readonly string[]): CardTip | null {
  return seen.includes('belt') ? null : 'belt';
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
