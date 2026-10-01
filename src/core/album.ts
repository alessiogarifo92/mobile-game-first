import { LEVELS_PER_STAGE } from './stages';

/** One bucket skin per completed stage; 'classic' is always available. Drawn in code, no assets. */
export const SKINS = ['classic', 'dots', 'stripes', 'spots', 'leaves', 'waves', 'checks', 'sprinkles', 'racing', 'stars', 'gold'] as const;
export type Skin = (typeof SKINS)[number];

export function isSkin(value: unknown): value is Skin {
  return typeof value === 'string' && (SKINS as readonly string[]).includes(value);
}

/** Skin unlocked by completing a stage (stage 1 → 'dots', …, stage 10 → 'gold'). */
export function stageSkin(stage: number): Skin | null {
  return SKINS[stage] ?? null;
}

export interface StageProgress {
  stage: number;
  done: number;
  total: number;
  /** Every level of a full stage is completed. */
  complete: boolean;
}

export function stageProgress(levels: readonly { id: number; stage: number }[], completed: readonly number[]): StageProgress[] {
  const byStage = new Map<number, StageProgress>();
  for (const l of levels) {
    const p = byStage.get(l.stage) ?? { stage: l.stage, done: 0, total: 0, complete: false };
    p.total += 1;
    if (completed.includes(l.id)) p.done += 1;
    byStage.set(l.stage, p);
  }
  return [...byStage.values()]
    .map((p) => ({ ...p, complete: p.total === LEVELS_PER_STAGE && p.done === p.total }))
    .sort((a, b) => a.stage - b.stage);
}

export function unlockedSkins(levels: readonly { id: number; stage: number }[], completed: readonly number[]): Skin[] {
  const won = stageProgress(levels, completed).filter((p) => p.complete).map((p) => stageSkin(p.stage));
  return ['classic', ...won.filter((s): s is Skin => s !== null)];
}

/** Stages that just became complete with this level: the win screen celebrates them. */
export function newlyCompletedStage(
  levels: readonly { id: number; stage: number }[],
  before: readonly number[],
  levelId: number,
): number | null {
  if (before.includes(levelId)) return null;
  const level = levels.find((l) => l.id === levelId);
  if (!level) return null;
  const after = [...before, levelId];
  const p = stageProgress(levels, after).find((s) => s.stage === level.stage);
  return p?.complete ? level.stage : null;
}
