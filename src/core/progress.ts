import { isSkin, type Skin } from './album';
import { DEFAULT_LANGUAGE, isLanguage, type Language } from './i18n';

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
}

export const STORAGE_KEY = 'mix-and-splash/progress/v1';

export function defaultProgress(): Progress {
  return { unlocked: 1, completed: [], sound: true, language: DEFAULT_LANGUAGE, seenTips: [], skin: 'classic' };
}

function sanitize(raw: unknown): Progress {
  const base = defaultProgress();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const unlocked = Number.isInteger(r.unlocked) && (r.unlocked as number) >= 1 ? (r.unlocked as number) : 1;
  const completed = Array.isArray(r.completed)
    ? [...new Set(r.completed.filter((n): n is number => Number.isInteger(n) && n >= 1))].sort((a, b) => a - b)
    : [];
  const sound = typeof r.sound === 'boolean' ? r.sound : base.sound;
  // Saves from before v0.2 have no language or tips: they get English and the onboarding.
  const language = isLanguage(r.language) ? r.language : base.language;
  const seenTips = Array.isArray(r.seenTips) ? [...new Set(r.seenTips.filter((t): t is string => typeof t === 'string'))] : [];
  const skin = isSkin(r.skin) ? r.skin : base.skin;
  return { unlocked, completed, sound, language, seenTips, skin };
}

/** Never throws: missing, corrupt or inaccessible storage falls back to a fresh profile. */
export function loadProgress(storage: KeyValueStorage | undefined): Progress {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    return text ? sanitize(JSON.parse(text)) : defaultProgress();
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
  return { ...progress, completed, unlocked };
}

export function markTipSeen(progress: Progress, tip: string): Progress {
  return progress.seenTips.includes(tip) ? progress : { ...progress, seenTips: [...progress.seenTips, tip] };
}
