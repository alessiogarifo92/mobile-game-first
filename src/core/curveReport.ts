import { CURVE, type CurveLevel } from './curve';

/**
 * Summaries of the curve for the difficulty report (`scripts/difficulty-report.ts`, #100): one row per stage,
 * the debut of each mechanic and of each combination, and the 20-level windows with nothing new (epic #87).
 * Pure: it reads CurveLevel values only, so it works for any universe and on incomplete stages.
 */

/** Mechanics that count as "something new"; `mix` (secondaries) is the base game from level 1, not a novelty. */
export const MECHANICS = ['ice', 'hidden', 'brown', 'stone', 'lock'] as const;

/** Epic #87: a new mechanic or a new combination at least every this many levels. */
export const NOVELTY_EVERY = 20;

export interface Extreme {
  id: number;
  winRate: number;
}

export interface StageSummary {
  stage: number;
  levels: number;
  mean: number;
  /** Levels at or above CURVE.veryEasy. */
  veryEasy: number;
  hardest: Extreme;
  boss?: Extreme;
  belt: [number, number];
  slots: [number, number];
  /** Mechanics used in the stage (MECHANICS order), with how many levels use each. */
  mechanics: { name: string; levels: number }[];
  /** Mean share of secondary or brown pixels. */
  meanSecondary: number;
  /** Levels after the first of the stage below CURVE.minSecondaryShare (rule 6 counts them from secondaryFromStage). */
  lowSecondary: number;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const range = (xs: number[]): [number, number] => [Math.min(...xs), Math.max(...xs)];

/** `2` or `2–3`. */
export function formatSpan([lo, hi]: readonly [number, number]): string {
  return lo === hi ? `${lo}` : `${lo}–${hi}`;
}

/** One summary per stage, in stage order. Levels keep their given order inside a stage (the first is the rest level). */
export function summarizeStages(levels: readonly CurveLevel[]): StageSummary[] {
  const stages = [...new Set(levels.map((l) => l.stage))].sort((a, b) => a - b);
  return stages.map((stage) => {
    const ls = levels.filter((l) => l.stage === stage);
    const hardest = ls.reduce((a, b) => (b.winRate < a.winRate ? b : a));
    const boss = ls.find((l) => l.boss);
    return {
      stage,
      levels: ls.length,
      mean: mean(ls.map((l) => l.winRate)),
      veryEasy: ls.filter((l) => l.winRate >= CURVE.veryEasy).length,
      hardest: { id: hardest.id, winRate: hardest.winRate },
      ...(boss ? { boss: { id: boss.id, winRate: boss.winRate } } : {}),
      belt: range(ls.map((l) => l.beltCapacity)),
      slots: range(ls.map((l) => l.slots)),
      mechanics: MECHANICS.map((name) => ({ name, levels: ls.filter((l) => l.features.includes(name)).length })).filter((m) => m.levels > 0),
      meanSecondary: mean(ls.map((l) => l.secondaryShare)),
      lowSecondary: ls.filter((l, i) => i > 0 && l.secondaryShare < CURVE.minSecondaryShare).length,
    };
  });
}

/** The mechanics of a level as a combination key, e.g. `brown+ice`; empty for a level with none. */
export function comboOf(level: CurveLevel): string {
  return MECHANICS.filter((m) => level.features.includes(m)).join('+');
}

export interface Novelty {
  id: number;
  /** `mechanic` for a mechanic's first level, `combo` for the first level of a combination of two or more. */
  kind: 'mechanic' | 'combo';
  name: string;
}

/** First level of each mechanic and of each combination of two or more mechanics, in level order. */
export function novelties(levels: readonly CurveLevel[]): Novelty[] {
  const out: Novelty[] = [];
  const seen = new Set<string>();
  for (const l of [...levels].sort((a, b) => a.id - b.id)) {
    for (const m of MECHANICS) {
      if (l.features.includes(m) && !seen.has(m)) {
        seen.add(m);
        out.push({ id: l.id, kind: 'mechanic', name: m });
      }
    }
    const combo = comboOf(l);
    if (combo.includes('+') && !seen.has(combo)) {
      seen.add(combo);
      out.push({ id: l.id, kind: 'combo', name: combo });
    }
  }
  return out;
}

/**
 * Windows of NOVELTY_EVERY levels (1–20, 21–40, …) inside [from, to] with no novelty. The first window of the game
 * is the tutorial and is not checked by callers that start later; a partial last window is not checked either.
 */
export function noveltyGaps(levels: readonly CurveLevel[], from: number, to: number, every: number = NOVELTY_EVERY): [number, number][] {
  const ids = novelties(levels).map((n) => n.id);
  const gaps: [number, number][] = [];
  for (let start = from; start + every - 1 <= to; start += every) {
    const end = start + every - 1;
    if (!ids.some((id) => id >= start && id <= end)) gaps.push([start, end]);
  }
  return gaps;
}
