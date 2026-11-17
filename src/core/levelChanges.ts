import type { LevelDef } from './level';

/**
 * What a level makes harder than the one before it (#77): the player is told once, when it first happens, instead of
 * finding out by losing. Pure, so the rules and the thresholds live here and are unit-tested; the banner that shows
 * the result is in PlayScene, and the report `npm run difficulty-report` prints the same list for every level.
 */

/** What can be announced, in the order the banner and the report list them. */
export const CHANGE_KINDS = ['belt', 'slots', 'canvas', 'columns', 'chunk', 'boss'] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

/**
 * The thresholds, the only place that holds them. A change must reach its threshold to count, so ordinary noise
 * between two neighbouring levels (a picture one row taller) is not announced.
 */
export const CHANGE_RULES = {
  /** Belt places lost (the belt holds fewer buckets at once). */
  beltDrop: 1,
  /** Waiting slots lost. */
  slotsDrop: 1,
  /** The picture has at least this times the pixels of the reference level (width × height). */
  canvasGrowth: 1.25,
  /** Columns gained. */
  columnsGain: 1,
  /** The average bucket carries at most this share of the reference level's average ammo (smaller buckets, more of them). */
  chunkShare: 0.75,
} as const;

/** The numbers a comparison reads from a level. */
export interface LevelParams {
  width: number;
  height: number;
  columns: number;
  slots: number;
  belt: number;
  /** Average paint a bucket carries (the spec's `ammoChunk`, which levels do not store). */
  avgAmmo: number;
  boss: boolean;
}

export function levelParams(level: LevelDef): LevelParams {
  const ammo = level.columns.flatMap((column) => column.map((s) => s.ammo));
  return {
    width: level.image[0]?.length ?? 0,
    height: level.image.length,
    columns: level.columns.length,
    slots: level.slots,
    belt: level.beltCapacity,
    avgAmmo: ammo.length ? ammo.reduce((a, b) => a + b, 0) / ammo.length : 0,
    boss: level.boss === true,
  };
}

/** One announced change: `to` is the value the player now faces (belt places, slots, columns), `from` the one before. */
export interface DifficultyChange {
  kind: ChangeKind;
  from: number;
  to: number;
}

/**
 * The changes of `level` against `reference` (the level before it), in CHANGE_KINDS order. With no reference (the
 * first level of the game) nothing changed. A boss is announced as itself, whatever else it changes.
 */
export function changesBetween(level: LevelDef, reference: LevelDef | null): DifficultyChange[] {
  const now = levelParams(level);
  const out: DifficultyChange[] = [];
  if (reference) {
    const before = levelParams(reference);
    if (before.belt - now.belt >= CHANGE_RULES.beltDrop) out.push({ kind: 'belt', from: before.belt, to: now.belt });
    if (before.slots - now.slots >= CHANGE_RULES.slotsDrop) out.push({ kind: 'slots', from: before.slots, to: now.slots });
    const area = now.width * now.height;
    const areaBefore = before.width * before.height;
    if (areaBefore > 0 && area >= areaBefore * CHANGE_RULES.canvasGrowth) out.push({ kind: 'canvas', from: areaBefore, to: area });
    if (now.columns - before.columns >= CHANGE_RULES.columnsGain) out.push({ kind: 'columns', from: before.columns, to: now.columns });
    if (before.avgAmmo > 0 && now.avgAmmo <= before.avgAmmo * CHANGE_RULES.chunkShare) {
      out.push({ kind: 'chunk', from: Math.round(before.avgAmmo), to: Math.round(now.avgAmmo) });
    }
  }
  if (now.boss) out.push({ kind: 'boss', from: 0, to: 1 });
  return out;
}

/**
 * The level a level is compared with: the one before it, except at the start of a stage, where the one before is the
 * previous stage's boss (an extreme by design) and the comparison is with the opening level of the previous stage.
 * Null for the first level of the game, and when `levels` does not hold the level.
 */
export function referenceLevel(levels: readonly LevelDef[], id: number): LevelDef | null {
  const i = levels.findIndex((l) => l.id === id);
  if (i <= 0) return null;
  const level = levels[i]!;
  const before = levels[i - 1]!;
  if (before.stage === level.stage) return before;
  return levels.find((l) => l.stage === before.stage) ?? before;
}

/** Changes of level `id` in `levels` (see `referenceLevel`); empty for an unknown id. */
export function levelChanges(levels: readonly LevelDef[], id: number): DifficultyChange[] {
  const level = levels.find((l) => l.id === id);
  return level ? changesBetween(level, referenceLevel(levels, id)) : [];
}

/**
 * Id under which a change is stored among the saved tips, so it shows once. Belt and slots carry the number they
 * fall to: reaching a new floor ("max 2 buckets") is news, the same floor again is not. The other kinds show once.
 */
export function changeKey(change: DifficultyChange): string {
  return change.kind === 'belt' || change.kind === 'slots' ? `chg.${change.kind}.${change.to}` : `chg.${change.kind}`;
}

/** The changes of `changes` the player has not been told about yet. */
export function unseenChanges(changes: readonly DifficultyChange[], seen: readonly string[]): DifficultyChange[] {
  return changes.filter((c) => !seen.includes(changeKey(c)));
}

/** Kinds the player has been told about, in CHANGE_KINDS order (the "How to play" page lists these). */
export function seenChangeKinds(seen: readonly string[]): ChangeKind[] {
  return CHANGE_KINDS.filter((k) => seen.some((id) => id === `chg.${k}` || id.startsWith(`chg.${k}.`)));
}

/**
 * What the banner says for the unseen changes of one level: a single banner. Belt and slots going down together are
 * one message (#77) and come first, because they decide how the level is played; then the boss, then whichever other
 * kind comes first. What does not fit waits for a later level that changes it again, so a level never opens with a
 * wall of notes. Returns the changes covered, which the caller marks as seen.
 */
export function bannerFor(unseen: readonly DifficultyChange[]): DifficultyChange[] {
  const limits = unseen.filter((c) => c.kind === 'belt' || c.kind === 'slots');
  if (limits.length > 0) return limits;
  const boss = unseen.filter((c) => c.kind === 'boss');
  return boss.length > 0 ? boss : unseen.slice(0, 1);
}

/**
 * The report line per level that changes something (#77), for whoever adds a level: `12 belt 4→3 · slots 3→2`, with a
 * leading `▶` when a player meeting the levels in order is told about it at that level (the banner opens there), and
 * a plain space when it was told earlier or another change took the banner. Belt and slots read as numbers, size as
 * pixels (`canvas 64→100px`), buckets as average ammo.
 */
export function changeReport(levels: readonly LevelDef[]): string[] {
  const told: string[] = [];
  const lines: string[] = [];
  for (const level of levels) {
    const changes = levelChanges(levels, level.id);
    const shown = bannerFor(unseenChanges(changes, told));
    told.push(...shown.map(changeKey));
    if (changes.length === 0) continue;
    const text = changes.map((c) => (c.kind === 'boss' ? 'boss' : `${c.kind} ${c.from}→${c.to}${c.kind === 'canvas' ? 'px' : ''}`)).join(' · ');
    lines.push(`${shown.length > 0 ? '▶' : ' '} ${level.id} ${text}`);
  }
  return lines;
}
