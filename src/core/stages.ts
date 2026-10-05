import { COLOR_CODES } from './colors';

/** Levels in a full stage; the last one is its boss. How many stages there are comes from the stage files. */
export const LEVELS_PER_STAGE = 10;

/** A stage as the game sees it: written to src/levels/stages.json by gen:levels from the stage files. */
export interface StageInfo {
  id: number;
  /** Stable key: the translated name is `stage.<key>`. */
  key: string;
  /** Paint colour used for the stage header on the map. */
  color: number;
  /** False while the stage is still being built: the map says more levels are coming. */
  complete: boolean;
}

export function stageInfo(stages: readonly StageInfo[], id: number): StageInfo | undefined {
  return stages.find((s) => s.id === id);
}

/** The last stage is still being built: the map tells the player more levels are on the way. */
export function moreLevelsComing(stages: readonly StageInfo[]): boolean {
  return stages.length > 0 && !stages.at(-1)!.complete;
}

export interface StageContent<L extends { name: string }> {
  stage: number;
  /** Stable key: the translated name is `stage.<key>`. */
  key: string;
  /** Colour code of the stage header (`R Y B O G P`, as in level images). */
  color: string;
  /** A complete stage must hold exactly LEVELS_PER_STAGE levels; an incomplete one is still being built. */
  complete?: boolean;
  levels: L[];
}

/** What the game needs to know about each stage (everything but the levels, which go to levels.json). */
export function stageInfos(stages: readonly StageContent<{ name: string }>[]): StageInfo[] {
  return stages.map((s) => ({ id: s.stage, key: s.key, color: COLOR_CODES[s.color]!, complete: !!s.complete }));
}

export class StageError extends Error {}

/**
 * Checks the stage files before generation: stages numbered 1..n with no gaps, each with a known, unique name
 * key and a colour, never empty, at most LEVELS_PER_STAGE levels, exactly that many when marked complete, and
 * every level name a known, unique translation key. Only the last stage may be incomplete: level ids are
 * sequential, so growing an earlier stage would renumber every later level and the saves that point at them.
 */
export function validateStages<L extends { name: string }>(
  stages: StageContent<L>[],
  knownNames: ReadonlySet<string>,
  knownStageKeys: ReadonlySet<string>,
): void {
  const seen = new Set<string>();
  const keys = new Set<string>();
  stages.forEach((s, i) => {
    if (s.stage !== i + 1) throw new StageError(`stage files must be numbered 1..n: found ${s.stage} at position ${i + 1}`);
    if (!knownStageKeys.has(s.key)) throw new StageError(`stage ${s.stage} key "${s.key}" has no translation key stage.${s.key}`);
    if (keys.has(s.key)) throw new StageError(`stage key "${s.key}" is used twice`);
    keys.add(s.key);
    if (!(s.color in COLOR_CODES)) throw new StageError(`stage ${s.stage} colour "${s.color}" is not one of ${Object.keys(COLOR_CODES).join(' ')}`);
    if (s.levels.length === 0) throw new StageError(`stage ${s.stage} is empty`);
    if (s.levels.length > LEVELS_PER_STAGE) throw new StageError(`stage ${s.stage} has ${s.levels.length} levels, max ${LEVELS_PER_STAGE}`);
    if (s.complete && s.levels.length !== LEVELS_PER_STAGE) {
      throw new StageError(`stage ${s.stage} is marked complete but has ${s.levels.length} levels`);
    }
    if (i < stages.length - 1 && !s.complete) {
      throw new StageError(`stage ${s.stage} is not complete: only the last stage may still be in progress`);
    }
    for (const l of s.levels) {
      if (!knownNames.has(l.name)) throw new StageError(`level name "${l.name}" has no translation key level.${l.name}`);
      if (seen.has(l.name)) throw new StageError(`level name "${l.name}" is used twice`);
      seen.add(l.name);
    }
  });
}

/** Flattens stages into levels with sequential ids; the last level of a full stage is its boss. */
export function assignIds<L extends { name: string }>(stages: Pick<StageContent<L>, 'stage' | 'levels'>[]): (L & { id: number; stage: number; boss: boolean })[] {
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
