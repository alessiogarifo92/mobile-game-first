import { CURVE } from './curve';
import { LEVELS_PER_STAGE } from './stages';

/**
 * The difficulty label of a level and of a stage (epic #70, ticket #72; decisions in docs/reports/2026-11-17-modello-difficolta.md).
 *
 * There is one definition: the label is a pure function of `levelWinRate` (random playouts with the game's own rules, so
 * belt capacity, slots, ice and hidden pixels already weigh in) and of nothing else. No second formula, no threshold outside
 * this table. The thresholds are absolute and frozen: a new level never moves them, so adding a harder level never relabels
 * an old one. Changing a threshold or the measure needs explicit evidence (report §3.3.4), `version` + 1 and a table of the
 * levels that change band in the PR.
 */
export const DIFFICULTY = {
  version: 1,
  /** From the highest threshold down; a win rate at or above `min` belongs to the first band that holds it. The last band is open below. */
  bands: [
    { name: 'easy', min: 0.85 },
    { name: 'normal', min: 0.65 },
    { name: 'hard', min: 0 },
  ],
  /** Noise of 200 playouts: a level this close to a threshold may land on the other side after a regeneration (informative). */
  nearThreshold: CURVE.tolerance,
  /** Internal sub-band of "easy", never shown. */
  veryEasy: CURVE.veryEasy,
} as const;

export type Band = (typeof DIFFICULTY.bands)[number]['name'];

/** The thresholds between bands (the `min` of every band but the last, which is open). */
const THRESHOLDS: readonly number[] = DIFFICULTY.bands.slice(0, -1).map((b) => b.min);

export function bandOf(winRate: number): Band {
  return DIFFICULTY.bands.find((b) => winRate >= b.min)!.name;
}

export interface LevelDifficulty {
  band: Band;
  /** A flag, not a band: a boss is "easy", "normal" or "hard" like any level, and is marked as boss on top. */
  boss: boolean;
  veryEasy: boolean;
}

/** Label of one level from its measured win rate; recomputes nothing. */
export function levelDifficulty(winRate: number, level: { boss?: boolean }): LevelDifficulty {
  return { band: bandOf(winRate), boss: !!level.boss, veryEasy: winRate >= DIFFICULTY.veryEasy };
}

export interface StageDifficulty {
  /** Mean win rate of the stage's levels, boss included (the `stageMean` of the curve rules). */
  winRate: number;
  band: Band;
}

/** Aggregate of a stage: the mean of its levels' win rates. Undefined until the stage is complete. */
export function stageDifficulty(levels: readonly { winRate: number }[]): StageDifficulty | undefined {
  if (levels.length !== LEVELS_PER_STAGE) return undefined;
  // Rounded to 6 decimals so a mean that is exactly a threshold in decimals (ten levels at 85%) is not pushed below it by float error.
  const winRate = Math.round((levels.reduce((sum, l) => sum + l.winRate, 0) / levels.length) * 1e6) / 1e6;
  return { winRate, band: bandOf(winRate) };
}

/** The threshold within `DIFFICULTY.nearThreshold` of this win rate, if any. */
export function nearThreshold(winRate: number): number | undefined {
  // Compared in whole points: 0.85 - 0.82 is 0.0300000000000000027 in floating point and must count as 3 points.
  const close = (t: number) => Math.abs(Math.round(winRate * 1000) - Math.round(t * 1000)) <= Math.round(DIFFICULTY.nearThreshold * 1000);
  return THRESHOLDS.find(close);
}

/** Thresholds a spec's win-rate band `[lo, hi]` crosses: a level generated inside it may land in either band. */
export function crossedThresholds([lo, hi]: readonly [number, number]): number[] {
  return THRESHOLDS.filter((t) => lo < t && t <= hi);
}

/** What `gen:levels` stores per level in src/levels/difficulty.json (beside levels.json, so stage PRs do not conflict on it). */
export interface StoredDifficulty {
  id: number;
  /** Spec hash of the level when it was measured: the win rate is measured again only when it changes. */
  specHash: string;
  winRate: number;
  band: Band;
}

export interface DifficultyFile {
  /** `DIFFICULTY.version` the bands were computed with. */
  version: number;
  levels: StoredDifficulty[];
}

export function buildDifficultyFile(entries: readonly { id: number; specHash: string; winRate: number }[]): DifficultyFile {
  return { version: DIFFICULTY.version, levels: entries.map((e) => ({ id: e.id, specHash: e.specHash, winRate: e.winRate, band: bandOf(e.winRate) })) };
}

/** Levels whose stored band differs from the one the current table gives to their stored win rate. */
export function bandChanges(file: DifficultyFile): { id: number; winRate: number; from: Band; to: Band }[] {
  return file.levels
    .filter((l) => bandOf(l.winRate) !== l.band)
    .map((l) => ({ id: l.id, winRate: l.winRate, from: l.band, to: bandOf(l.winRate) }));
}

const pct = (w: number) => `${Math.round(w * 100)}%`;

/** Why the stored file is not what `gen:levels` would write for these levels (empty = up to date). */
export function storedProblems(file: DifficultyFile | undefined, levels: readonly { id: number; specHash: string }[]): string[] {
  if (!file) return ['difficulty.json is missing'];
  const out: string[] = [];
  if (file.version !== DIFFICULTY.version) out.push(`difficulty.json was computed with table version ${file.version}, the table is at ${DIFFICULTY.version}`);
  for (const c of bandChanges(file)) out.push(`#${c.id}: stored band ${c.from} but ${pct(c.winRate)} is ${c.to}`);
  const byId = new Map(file.levels.map((l) => [l.id, l]));
  for (const l of levels) {
    const s = byId.get(l.id);
    if (!s) out.push(`#${l.id} is not in difficulty.json`);
    else if (s.specHash !== l.specHash) out.push(`#${l.id}: spec changed since it was measured`);
  }
  const ids = new Set(levels.map((l) => l.id));
  for (const s of file.levels) if (!ids.has(s.id)) out.push(`#${s.id} is in difficulty.json but no longer in levels.json`);
  return out;
}

/** One level as the CI check sees it. */
export interface DifficultyInput {
  id: number;
  stage: number;
  boss: boolean;
  winRate: number;
  beltCapacity: number;
  slots: number;
  /** The spec's `winRate` band, if it has one. */
  specBand?: readonly [number, number];
  /** The spec's `curve.difficulty`: the label the author expects, with the reason. */
  declared?: { band: Band; why: string };
}

export interface DifficultyNote {
  /** `error` fails CI; `info` is printed only. */
  severity: 'error' | 'info';
  kind: 'override' | 'near' | 'spec-crossing' | 'generous';
  /** `#<id>` for a level, `s<stage>` for a stage. */
  key: string;
  message: string;
}

/**
 * CI checks over the labels. Errors: the computed label contradicts the one the spec declares, or the declaration has no reason.
 * Information only: levels within 3 points of a threshold, spec bands that cross a threshold (unless the level declares its
 * label), stages whose boss has more belt or more slots than any other level but the rest one (it should only get tighter).
 */
export function checkDifficulty(levels: readonly DifficultyInput[]): DifficultyNote[] {
  const levelNotes: DifficultyNote[] = [];
  const stageNotes: DifficultyNote[] = [];
  for (const l of levels) {
    const key = `#${l.id}`;
    const computed = bandOf(l.winRate);
    if (l.declared) {
      if (!l.declared.why.trim()) levelNotes.push({ severity: 'error', kind: 'override', key, message: `level ${l.id} declares difficulty ${l.declared.band} without a reason` });
      else if (l.declared.band !== computed) {
        levelNotes.push({ severity: 'error', kind: 'override', key, message: `level ${l.id} declares ${l.declared.band} (${l.declared.why}) but ${pct(l.winRate)} is ${computed}` });
      }
    }
    const near = nearThreshold(l.winRate);
    if (near !== undefined) levelNotes.push({ severity: 'info', kind: 'near', key, message: `level ${l.id} is at ${pct(l.winRate)}, within ${Math.round(DIFFICULTY.nearThreshold * 100)} points of ${pct(near)}: a regeneration may change its band` });
    if (!l.declared && l.specBand) {
      const crossed = crossedThresholds(l.specBand);
      if (crossed.length > 0) {
        levelNotes.push({ severity: 'info', kind: 'spec-crossing', key, message: `level ${l.id} spec band ${pct(l.specBand[0])}–${pct(l.specBand[1])} crosses ${crossed.map(pct).join(', ')}: narrow it or declare curve.difficulty` });
      }
    }
  }
  const byStage = new Map<number, DifficultyInput[]>();
  for (const l of levels) byStage.set(l.stage, [...(byStage.get(l.stage) ?? []), l]);
  for (const [stage, ls] of byStage) {
    if (ls.length !== LEVELS_PER_STAGE) continue;
    const boss = ls[ls.length - 1]!;
    // The first level of a stage is the rest level: it may be as generous as it likes.
    const before = ls.slice(1, -1);
    const belt = Math.max(...before.map((l) => l.beltCapacity));
    const slots = Math.max(...before.map((l) => l.slots));
    if (boss.beltCapacity > belt || boss.slots > slots) {
      stageNotes.push({ severity: 'info', kind: 'generous', key: `s${stage}`, message: `stage ${stage}: boss ${boss.id} has belt ${boss.beltCapacity} / slots ${boss.slots}, more than levels 2–9 (max belt ${belt}, max slots ${slots})` });
    }
  }
  return [...levelNotes, ...stageNotes];
}
