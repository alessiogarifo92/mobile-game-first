import { isSkin, unlockedSkins, type Skin } from './album';
import { DEFAULT_LANGUAGE, isLanguage, type Language } from './i18n';
import { lastLevelOf, openUniverse, universeOf } from './universes';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface Progress {
  /** Highest level id the player may open. */
  unlocked: number;
  completed: number[];
  sound: boolean;
  language: Language;
  /** Onboarding tips already shown (see onboarding.ts). */
  seenTips: string[];
  /** Bucket skin in use (unlocked by completing stages, see album.ts). */
  skin: Skin;
  /** Defeats in a row on each level not yet won, by level id (#93): three of them offer a hint. */
  defeats: Record<string, number>;
}

export const STORAGE_KEY = 'mix-and-splash/progress/v1';

export function defaultProgress(): Progress {
  return { unlocked: 1, completed: [], sound: true, language: DEFAULT_LANGUAGE, seenTips: [], skin: 'classic', defeats: {} };
}

/** Level ids and stages of the game: lets a loaded save be checked against what really exists. */
export type LevelRef = { id: number; stage: number };

export function sanitize(raw: unknown, levels?: readonly LevelRef[]): Progress {
  const base = defaultProgress();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const count = levels?.length ?? Infinity;
  const inRange = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= count;
  // Without the level list only the shape is checked; a hard cap still stops an oversized array.
  const ids = Array.isArray(r.completed) ? r.completed.slice(0, 10_000) : [];
  let completed = [...new Set(ids.filter(inRange))].sort((a, b) => a - b);
  // Universe n+1 opens only with the last level of universe n (#90): a hand-edited save keeps nothing beyond the
  // open universes, so it cannot skip one.
  let cap = count;
  if (levels) {
    const open = openUniverse(levels, completed);
    completed = completed.filter((id) => universeOf(levels, id)! <= open);
    cap = Math.min(count, lastLevelOf(levels, open) ?? 1);
  }
  // Whatever is completed must be reachable: unlocked is at least the next level after the highest completed one.
  const claimed = Number.isInteger(r.unlocked) && (r.unlocked as number) >= 1 ? (r.unlocked as number) : 1;
  const unlocked = Math.min(cap, Math.max(claimed, (completed.at(-1) ?? 0) + 1));
  const sound = typeof r.sound === 'boolean' ? r.sound : base.sound;
  // Saves from before v0.2 have no language or tips: they get English and the onboarding.
  const language = isLanguage(r.language) ? r.language : base.language;
  const seenTips = Array.isArray(r.seenTips)
    ? [...new Set(r.seenTips.slice(0, 100).filter((t): t is string => typeof t === 'string'))]
    : [];
  // A skin is only kept if the player has earned it (a hand-edited save cannot grant "gold").
  const skin = isSkin(r.skin) && (!levels || unlockedSkins(levels, completed).includes(r.skin)) ? r.skin : base.skin;
  const defeats: Record<string, number> = {};
  if (r.defeats && typeof r.defeats === 'object' && !Array.isArray(r.defeats)) {
    for (const [id, n] of Object.entries(r.defeats as Record<string, unknown>).slice(0, MAX_DEFEAT_ENTRIES)) {
      // Only a real level, not yet won, with a sane count is kept: a hand-edited save cannot fake the hint on a won level.
      if (!/^[1-9]\d*$/.test(id) || !inRange(Number(id)) || completed.includes(Number(id))) continue;
      if (Number.isInteger(n) && (n as number) >= 1) defeats[id] = Math.min(n as number, MAX_DEFEATS);
    }
  }
  return { unlocked, completed, sound, language, seenTips, skin, defeats };
}

/** Never throws: missing, corrupt or inaccessible storage falls back to a fresh profile. */
export function loadProgress(storage: KeyValueStorage | undefined, levels?: readonly LevelRef[]): Progress {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    return text ? sanitize(JSON.parse(text), levels) : defaultProgress();
  } catch {
    return defaultProgress();
  }
}

/** Returns false when the write failed (private mode, quota), so the game keeps going in memory. */
export function saveProgress(storage: KeyValueStorage | undefined, progress: Progress): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

/** Marks a level complete and unlocks the next one, capped at the number of levels. */
export function completeLevel(progress: Progress, levelId: number, levelCount: number): Progress {
  const completed = progress.completed.includes(levelId)
    ? progress.completed
    : [...progress.completed, levelId].sort((a, b) => a - b);
  const unlocked = Math.min(levelCount, Math.max(progress.unlocked, levelId + 1));
  // A win clears the level's defeat streak (#93).
  const defeats = { ...progress.defeats };
  delete defeats[String(levelId)];
  return { ...progress, completed, unlocked, defeats };
}

/** A fresh profile that keeps the player's language and sound setting: the one way progress is erased. */
export function resetProgress(progress: Progress): Progress {
  return { ...defaultProgress(), language: progress.language, sound: progress.sound };
}

export function markTipSeen(progress: Progress, tip: string): Progress {
  return progress.seenTips.includes(tip) ? progress : { ...progress, seenTips: [...progress.seenTips, tip] };
}

/** Defeats in a row before a level offers the free hint (#93). */
export const HINT_AFTER_DEFEATS = 3;
/** Cap on a stored streak and on how many levels a save may track: enough for any real player, bounded for a forged one. */
export const MAX_DEFEATS = 99;
const MAX_DEFEAT_ENTRIES = 1000;

/** Defeats in a row on `levelId` since its last win. */
export function defeatsOn(progress: Progress, levelId: number): number {
  return progress.defeats[String(levelId)] ?? 0;
}

/** Counts one more defeat on `levelId` (a jam that ends the attempt). */
export function recordDefeat(progress: Progress, levelId: number): Progress {
  const n = Math.min(defeatsOn(progress, levelId) + 1, MAX_DEFEATS);
  return { ...progress, defeats: { ...progress.defeats, [String(levelId)]: n } };
}

/** Whether the next attempt on `levelId` offers the free hint: after `HINT_AFTER_DEFEATS` defeats in a row. */
export function hintOffered(progress: Progress, levelId: number): boolean {
  return defeatsOn(progress, levelId) >= HINT_AFTER_DEFEATS;
}
