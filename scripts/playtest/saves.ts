/**
 * Plans and known saves of a playtest session (#68, protocol of #67 §8): which levels an agent plays, and the save
 * each pack starts from (levels 1..N−1 completed, N open, the tips a player has met before N). Pure: the save goes
 * through the game's own sanitize and canOpenLevel, so it is one the game would accept from a real player.
 */
import { sanitize, type LevelRef, type Progress } from '../../src/core/progress';
import type { Level } from '../../src/core/level';
import { tipOnLevelStart } from '../../src/core/onboarding';
import { isLanguage } from '../../src/core/i18n';
import { canOpenLevel } from '../../src/core/universes';

/** Tips met while playing rather than at a level start: anyone past level 1 has had them. */
const PLAY_TIPS = ['guide', 'blocked', 'slots', 'belt'];

/** Packs that are not a whole stage (protocol §8). */
const NAMED_PACKS: Record<string, [number, number]> = { 'U1-ONB': [1, 10], 'U1-FINE': [95, 100] };

export class SaveError extends Error {}

/**
 * Tips a player who cleared every level before `start` in order has seen: the tips met in play, plus one level-start
 * tip per level, as the game shows them. A mechanic debuting at `start` or later still gets its tip.
 */
export function tipsMetBefore(levels: readonly Level[], start: number): string[] {
  if (start <= 1) return [];
  const seen = [...PLAY_TIPS];
  for (const level of levels) {
    if (level.id >= start) continue;
    const tip = tipOnLevelStart(level, seen);
    if (tip) seen.push(tip);
  }
  return seen;
}

/** Level ids of a pack: `U1-ONB` (1–10), `U1-FINE` (95–100) or `Snn` (the levels of stage nn). */
export function packLevels(levels: readonly LevelRef[], pack: string): number[] {
  const named = NAMED_PACKS[pack];
  const m = /^S(\d{2})$/.exec(pack);
  if (!named && !m) throw new SaveError(`unknown pack "${pack}" (U1-ONB, U1-FINE, S01…S99)`);
  const ids = named
    ? levels.filter((l) => l.id >= named[0] && l.id <= named[1]).map((l) => l.id)
    : levels.filter((l) => l.stage === Number(m![1])).map((l) => l.id);
  if (ids.length === 0) throw new SaveError(`pack "${pack}": the game has no levels for it yet`);
  return ids;
}

/** The levels of a plan, in playing order. */
export function planLevels(levels: readonly LevelRef[], packs: readonly string[]): number[] {
  if (packs.length === 0) throw new SaveError('a plan needs at least one pack');
  const ids = packs.flatMap((p) => packLevels(levels, p));
  if (new Set(ids).size !== ids.length) throw new SaveError(`plan ${packs.join('+')} repeats levels`);
  return ids;
}

/** The planned levels that start from a fresh save: the first, and any that does not follow the one before it. */
export function saveStarts(plan: readonly number[]): number[] {
  return plan.filter((id, i) => i === 0 || plan[i - 1] !== id - 1);
}

/** The save to start level `start` from, in the game's format (what goes into localStorage). */
export function saveFor(levels: readonly Level[], start: number, language: string, sound = false): Progress {
  if (!isLanguage(language)) throw new SaveError(`unknown language "${language}"`);
  if (!levels.some((l) => l.id === start)) throw new SaveError(`the game has no level ${start}`);
  const completed = levels.filter((l) => l.id < start).map((l) => l.id);
  const save = sanitize({ unlocked: start, completed, sound, language, seenTips: tipsMetBefore(levels, start) }, levels);
  // sanitize drops what a real save could not hold, and the core decides what may be opened.
  if (save.unlocked !== start || !canOpenLevel(levels, save, start)) throw new SaveError(`level ${start} is not reachable from a valid save`);
  return save;
}

/** The same save as the form records it (`startSave`). */
export function startSaveOf(save: Progress): { unlocked: number; completedThrough: number; seenTips: string[] } {
  return { unlocked: save.unlocked, completedThrough: save.unlocked - 1, seenTips: [...save.seenTips] };
}

export type PlanStep =
  | { kind: 'none' }
  | { kind: 'load'; levelId: number; skipped: number | null }
  | { kind: 'done'; skipped: number | null };

/**
 * What the harness does between two actions, once no attempt is open on screen. A level that reached the profile's
 * attempt limit without a win is skipped (the next planned level is loaded from its save: the game does not allow
 * skipping); after a won level, a jump in the plan (the second pack) loads that pack's save. Otherwise the agent goes
 * on through the game itself.
 */
export function planStep(
  plan: readonly number[],
  last: number | null,
  state: { attempts: number; won: boolean; skipped: boolean },
  maxAttempts: number | null,
): PlanStep {
  if (last === null) return { kind: 'none' };
  const i = plan.indexOf(last);
  const next = i >= 0 ? plan[i + 1] : undefined;
  const limit = !state.won && !state.skipped && maxAttempts !== null && state.attempts >= maxAttempts;
  if (limit) return next === undefined ? { kind: 'done', skipped: last } : { kind: 'load', levelId: next, skipped: last };
  if (!state.won || i < 0) return { kind: 'none' };
  if (next === undefined) return { kind: 'done', skipped: null };
  return next === last + 1 ? { kind: 'none' } : { kind: 'load', levelId: next, skipped: null };
}
