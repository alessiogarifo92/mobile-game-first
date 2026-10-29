import { LEVELS_PER_STAGE } from './stages';
import { STAGES_PER_UNIVERSE, isUniverseFinished, universeOfStage } from './universes';

/** Universe 1: one bucket skin per completed stage; 'classic' is always available. Drawn in code, no assets. */
export const SKINS = ['classic', 'dots', 'stripes', 'spots', 'leaves', 'waves', 'checks', 'sprinkles', 'racing', 'stars', 'gold'] as const;
/**
 * Universes 2–5 (#92): one new skin each, earned by finishing the universe, and a colour variant of it for each of its
 * completed stages (`petals-3`: stage 3 of universe 2). A variant only changes the palette, never the drawing.
 */
export const UNIVERSE_SKINS = ['petals', 'stamps', 'bubbles', 'orbits'] as const;
export type StageSkin = (typeof SKINS)[number];
export type UniverseSkin = (typeof UNIVERSE_SKINS)[number];
export type Skin = StageSkin | UniverseSkin | `${UniverseSkin}-${number}`;

const VARIANT = new RegExp(`^(${UNIVERSE_SKINS.join('|')})(?:-([1-9]|10))?$`);

export function isSkin(value: unknown): value is Skin {
  return typeof value === 'string' && ((SKINS as readonly string[]).includes(value) || VARIANT.test(value));
}

/** How a skin is drawn: its pattern, and for a universe skin the colour variant (null: the universe's own colours). */
export function parseSkin(skin: Skin): { pattern: StageSkin | UniverseSkin; variant: number | null } {
  const m = VARIANT.exec(skin);
  if (!m) return { pattern: skin as StageSkin, variant: null };
  return { pattern: m[1] as UniverseSkin, variant: m[2] ? Number(m[2]) : null };
}

/** Skin earned by finishing a universe: universes 2–5 have one; universe 1 rewards its stages instead. */
export function universeSkin(universe: number): UniverseSkin | null {
  return universe >= 2 ? (UNIVERSE_SKINS[universe - 2] ?? null) : null;
}

/** Skin unlocked by completing a stage: stage 1 → 'dots' … stage 10 → 'gold', then a variant of its universe's skin. */
export function stageSkin(stage: number): Skin | null {
  const universe = universeOfStage(stage);
  if (universe === 1) return SKINS[stage] ?? null;
  const base = universeSkin(universe);
  return base && `${base}-${stage - (universe - 1) * STAGES_PER_UNIVERSE}`;
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

/** Classic, the skin of every completed stage, and each finished universe's own skin after its stages. */
export function unlockedSkins(levels: readonly { id: number; stage: number }[], completed: readonly number[]): Skin[] {
  const skins: Skin[] = ['classic'];
  const stages = stageProgress(levels, completed);
  for (const p of stages) {
    const skin = p.complete ? stageSkin(p.stage) : null;
    if (skin) skins.push(skin);
    const universe = universeOfStage(p.stage);
    const own = universeSkin(universe);
    if (own && p.stage === universe * STAGES_PER_UNIVERSE && isUniverseFinished(levels, completed, universe)) skins.push(own);
  }
  return skins;
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
