import { unlockedSkins, type Skin } from '../core/album';
import { DEFAULT_LANGUAGE, levelName, stageName, translate, type Language, type MessageKey, type Params } from '../core/i18n';
import { parseLevel, type Level, type LevelDef } from '../core/level';
import {
  completeLevel, loadProgress, markTipSeen, resetProgress as resetProgressData, saveProgress, type KeyValueStorage, type Progress,
} from '../core/progress';
import type { StageInfo } from '../core/stages';
import levelsJson from '../levels/levels.json';
import stagesJson from '../levels/stages.json';

/** Levels and stages come from the generated data (npm run gen:levels): nothing here assumes how many there are. */
export const LEVELS: Level[] = (levelsJson as LevelDef[]).map(parseLevel);
export const STAGES: readonly StageInfo[] = stagesJson as StageInfo[];

function storage(): KeyValueStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

let progress: Progress = loadProgress(storage(), LEVELS);
applyDocumentLanguage();

function update(next: Progress): void {
  progress = next;
  saveProgress(storage(), progress);
}

function applyDocumentLanguage(): void {
  if (typeof document !== 'undefined') document.documentElement.lang = progress.language ?? DEFAULT_LANGUAGE;
}

export function getProgress(): Progress {
  return progress;
}

export function markCompleted(levelId: number): void {
  update(completeLevel(progress, levelId, LEVELS.length));
}

export function setSound(on: boolean): void {
  update({ ...progress, sound: on });
}

export function setLanguage(language: Language): void {
  update({ ...progress, language });
  applyDocumentLanguage();
}

export function tipSeen(tip: string): boolean {
  return progress.seenTips.includes(tip);
}

export function markTip(tip: string): void {
  update(markTipSeen(progress, tip));
}

export function setSkin(skin: Skin): void {
  update({ ...progress, skin });
}

export function skinsUnlocked(): Skin[] {
  return unlockedSkins(LEVELS, progress.completed);
}

/** Replaces the whole save (a loaded save code). */
export function replaceProgress(next: Progress): void {
  update(next);
  applyDocumentLanguage();
}

/** The one way progress is erased: levels, album, skin and tips go; language and sound stay. */
export function resetProgress(): void {
  replaceProgress(resetProgressData(progress));
}

export function resetTips(): void {
  update({ ...progress, seenTips: [] });
}

/** Translate in the player's current language. */
export function t(key: MessageKey, params?: Params): string {
  return translate(progress.language, key, params);
}

export function levelTitle(id: number): string {
  const level = LEVELS[id - 1];
  return level ? levelName(progress.language, level.name) : translate(progress.language, 'level.title', { n: id });
}

export function stageTitle(key: string): string {
  return stageName(progress.language, key);
}

/** Short subtitle hint for levels that introduce something; keys live in the dictionary as hint.<id>. */
export function levelHint(id: number): string | null {
  const key = `hint.${id}`;
  const text = translate(progress.language, key);
  return text === key ? null : text;
}
