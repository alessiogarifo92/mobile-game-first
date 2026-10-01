import { completeLevel, loadProgress, saveProgress, type KeyValueStorage, type Progress } from '../core/progress';
import levelsJson from '../levels/levels.json';
import { parseLevel, type Level, type LevelDef } from '../core/level';

export const LEVELS: Level[] = (levelsJson as LevelDef[]).map(parseLevel);

function storage(): KeyValueStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

let progress: Progress = loadProgress(storage());

export function getProgress(): Progress {
  return progress;
}

export function markCompleted(levelId: number): void {
  progress = completeLevel(progress, levelId, LEVELS.length);
  saveProgress(storage(), progress);
}

export function setSound(on: boolean): void {
  progress = { ...progress, sound: on };
  saveProgress(storage(), progress);
}

export const HINTS: Record<number, string> = {
  1: 'Tocca una colonna per lanciare un secchiello',
  2: 'La vernice si ferma sul primo pixel non finito',
  4: 'Rosso + Giallo = Arancione',
  5: 'Giallo + Blu = Verde',
  7: 'Rosso + Blu = Viola',
  8: 'Pochi slot d\'attesa: scegli l\'ordine!',
};
