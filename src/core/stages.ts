import { BLUE, GREEN, ORANGE, PURPLE, RED, YELLOW } from './colors';

export const LEVELS_PER_STAGE = 10;

export interface StageInfo {
  id: number;
  /** Stable key: the translated name is `stage.<key>`. */
  key: string;
  /** Paint colour used for the stage header on the map. */
  color: number;
}

/** The ten themed stages of the 100-level plan (epic #22). */
export const STAGES: readonly StageInfo[] = [
  { id: 1, key: 'atelier', color: RED },
  { id: 2, key: 'fruit', color: ORANGE },
  { id: 3, key: 'animals', color: YELLOW },
  { id: 4, key: 'garden', color: GREEN },
  { id: 5, key: 'sea', color: BLUE },
  { id: 6, key: 'city', color: PURPLE },
  { id: 7, key: 'food', color: RED },
  { id: 8, key: 'vehicles', color: ORANGE },
  { id: 9, key: 'space', color: BLUE },
  { id: 10, key: 'fantasy', color: PURPLE },
];

export function stageInfo(id: number): StageInfo | undefined {
  return STAGES.find((s) => s.id === id);
}

export interface StageContent<L extends { name: string }> {
  stage: number;
  /** A complete stage must hold exactly LEVELS_PER_STAGE levels; an incomplete one is still being built. */
  complete?: boolean;
  levels: L[];
}

export class StageError extends Error {}

/**
 * Checks the stage files before generation: stages numbered 1..n with no gaps, at most ten levels
 * each, exactly ten when marked complete, and every level name a known, unique translation key.
 */
export function validateStages<L extends { name: string }>(stages: StageContent<L>[], knownNames: ReadonlySet<string>): void {
  const seen = new Set<string>();
  stages.forEach((s, i) => {
    if (s.stage !== i + 1) throw new StageError(`stage files must be numbered 1..n: found ${s.stage} at position ${i + 1}`);
    if (!stageInfo(s.stage)) throw new StageError(`stage ${s.stage} is not in STAGES`);
    if (s.levels.length > LEVELS_PER_STAGE) throw new StageError(`stage ${s.stage} has ${s.levels.length} levels, max ${LEVELS_PER_STAGE}`);
    if (s.complete && s.levels.length !== LEVELS_PER_STAGE) {
      throw new StageError(`stage ${s.stage} is marked complete but has ${s.levels.length} levels`);
    }
    if (i < stages.length - 1 && s.levels.length === 0) throw new StageError(`stage ${s.stage} is empty`);
    for (const l of s.levels) {
      if (!knownNames.has(l.name)) throw new StageError(`level name "${l.name}" has no translation key level.${l.name}`);
      if (seen.has(l.name)) throw new StageError(`level name "${l.name}" is used twice`);
      seen.add(l.name);
    }
  });
}

/** Flattens stages into levels with sequential ids; the 10th level of a stage is its boss. */
export function assignIds<L extends { name: string }>(stages: StageContent<L>[]): (L & { id: number; stage: number; boss: boolean })[] {
  let id = 0;
  return stages.flatMap((s) => s.levels.map((l, i) => ({ ...l, id: ++id, stage: s.stage, boss: i === LEVELS_PER_STAGE - 1 })));
}

/** Deterministic JSON (sorted keys), so equal specs always hash the same. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** FNV-1a 32-bit hash of a spec, as 8 hex digits: identifies which levels need regenerating. */
export function specHash(spec: unknown): string {
  let h = 0x811c9dc5;
  for (const ch of stableStringify(spec)) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
