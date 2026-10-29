import { isPrimary } from './colors';
import type { Level } from './level';
import { LEVELS_PER_STAGE } from './stages';
import { STAGES_PER_UNIVERSE, universeOfStage } from './universes';

/**
 * Difficulty curve rules for any number of universes (epic #87, ticket #88). Every threshold lives in
 * CURVE so the rules can be retuned in one place; `winRate` is always levelWinRate (higher = easier).
 */
export const CURVE = {
  stagesPerUniverse: STAGES_PER_UNIVERSE,
  /** A level at or above this random win rate is "very easy". */
  veryEasy: 0.95,
  /** The first levels of the game may all be very easy. */
  introLevels: 8,
  /** Noise allowed on a comparison: about 1.5 standard errors of 200 playouts. */
  tolerance: 0.03,
  /** Position 9 ("hard in disguise") is at least this much harder than the stage base. */
  hardGap: 0.05,
  /** Provisional targets per universe: mean of its last stage, and floor of its hardest boss. */
  universes: [
    { endMean: 0.69, hardestBoss: 0.35 },
    { endMean: 0.62, hardestBoss: 0.3 },
    { endMean: 0.56, hardestBoss: 0.25 },
    { endMean: 0.5, hardestBoss: 0.22 },
    { endMean: 0.45, hardestBoss: 0.2 },
  ],
  /** How far a universe's last stage may drift from its endMean target. */
  endMeanTolerance: 0.05,
  /** From this stage a picture needs this share of secondary pixels (warning only). */
  secondaryFromStage: 3,
  minSecondaryShare: 0.3,
  /** Hard levels and bosses stay short: at most this times the stage's median shooters (provisional, #66). */
  hardShooterCap: 1.3,
  /** Belt and slots never go below these, except on a boss from extremeFromUniverse on (one of the two, by one). */
  minBelt: 2,
  minSlots: 2,
  extremeFromUniverse: 3,
} as const;

/** Positions in a stage (1-based): the saw-tooth `1 rest · 2–3 base · 4 base+1 · 5–6 base · 7 base+1 · 8 base · 9 hard · 10 boss`. */
const BASE_POSITIONS = [2, 3, 5, 6, 8];
const STEP_POSITIONS = [4, 7];
const HARD_POSITION = 9;

export interface CurveLevel {
  id: number;
  stage: number;
  boss: boolean;
  winRate: number;
  shooters: number;
  /** Share of pixels that need mixing (0–1). */
  secondaryShare: number;
  beltCapacity: number;
  slots: number;
  /** Mechanics the level uses (e.g. `mix`, `ice`, `hidden`); a level that uses one first is its debut. */
  features: readonly string[];
  /** Declared in the spec: this boss is allowed not to be the hardest level of its stage. */
  easyBoss?: boolean;
}

export type CurveSeverity = 'error' | 'warning';

export interface CurveViolation {
  rule: number;
  severity: CurveSeverity;
  /** Stable id such as `r1 #12`, `r2 s4` or `r5 u1`: used to list known violations. */
  key: string;
  message: string;
}

/** Builds the curve view of a parsed level from its measured random win rate. */
export function curveLevel(level: Level, winRate: number, easyBoss?: boolean): CurveLevel {
  const pixels = level.targets.filter((t) => t !== 0);
  const features: string[] = [];
  if (pixels.some((t) => !isPrimary(t))) features.push('mix');
  if (level.ice.some((n) => n > 0)) features.push('ice');
  if (level.hidden.some(Boolean)) features.push('hidden');
  if (level.stone.some(Boolean)) features.push('stone');
  return {
    id: level.id,
    stage: level.stage,
    boss: !!level.boss,
    winRate,
    shooters: level.columns.flat().length,
    secondaryShare: pixels.filter((t) => !isPrimary(t)).length / pixels.length,
    beltCapacity: level.beltCapacity,
    slots: level.slots,
    features,
    ...(easyBoss ? { easyBoss } : {}),
  };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Checks rules 1–8 of ticket #88. Rules on a stage need it complete; rules on a universe need all its stages complete. */
export function checkCurve(levels: readonly CurveLevel[]): CurveViolation[] {
  const out: CurveViolation[] = [];
  const add = (rule: number, severity: CurveSeverity, where: string, message: string) =>
    out.push({ rule, severity, key: `r${rule} ${where}`, message });

  const byStage = new Map<number, CurveLevel[]>();
  for (const l of levels) byStage.set(l.stage, [...(byStage.get(l.stage) ?? []), l]);
  const complete = (s: number) => byStage.get(s)?.length === LEVELS_PER_STAGE;
  const stageMean = (s: number) => mean(byStage.get(s)!.map((l) => l.winRate));

  // Rule 1: very easy only in the intro, on the first level of a universe-1 stage, or on a mechanic's debut.
  const seen = new Set<string>();
  for (const l of levels) {
    const debut = l.features.filter((f) => !seen.has(f));
    l.features.forEach((f) => seen.add(f));
    const first = byStage.get(l.stage)![0] === l;
    if (l.winRate >= CURVE.veryEasy && l.id > CURVE.introLevels && !(first && universeOfStage(l.stage) === 1) && debut.length === 0) {
      add(1, 'error', `#${l.id}`, `level ${l.id} is very easy (${pct(l.winRate)}) but is not an intro, first-of-stage or debut level`);
    }
  }

  for (const [stage, ls] of byStage) {
    const u = universeOfStage(stage);
    // Rule 8: belt 1 or slots 1 only on a boss from universe 3, never both.
    for (const l of ls) {
      const lowBelt = l.beltCapacity < CURVE.minBelt;
      const lowSlots = l.slots < CURVE.minSlots;
      if (!lowBelt && !lowSlots) continue;
      if (!l.boss || u < CURVE.extremeFromUniverse) add(8, 'error', `#${l.id}`, `level ${l.id}: belt ${l.beltCapacity} / slots ${l.slots} are allowed only on a boss from universe ${CURVE.extremeFromUniverse}`);
      else if (lowBelt && lowSlots) add(8, 'error', `#${l.id}`, `boss ${l.id}: belt and slots both reduced`);
      else if (l.beltCapacity < CURVE.minBelt - 1 || l.slots < CURVE.minSlots - 1) add(8, 'error', `#${l.id}`, `boss ${l.id}: reduced by more than one`);
    }
    // Rule 6 (warning): pictures with too little mixing stay easy whatever the belt.
    ls.forEach((l, i) => {
      if (stage >= CURVE.secondaryFromStage && i > 0 && l.secondaryShare < CURVE.minSecondaryShare) {
        add(6, 'warning', `#${l.id}`, `level ${l.id}: only ${pct(l.secondaryShare)} secondary pixels (min ${pct(CURVE.minSecondaryShare)})`);
      }
    });
    if (!complete(stage)) continue;

    // Rule 2: the saw-tooth, relative to the stage base.
    const at = (pos: number) => ls[pos - 1]!;
    const base = median(BASE_POSITIONS.map((p) => at(p).winRate));
    const tol = CURVE.tolerance;
    if (at(1).winRate < base - tol) add(2, 'error', `#${at(1).id}`, `level ${at(1).id} (rest) is harder than its stage base ${pct(base)}`);
    for (const p of STEP_POSITIONS) {
      if (at(p).winRate > base + tol) add(2, 'error', `#${at(p).id}`, `level ${at(p).id} (step) is easier than its stage base ${pct(base)}`);
    }
    const hard = at(HARD_POSITION);
    if (hard.winRate > base - CURVE.hardGap) add(2, 'error', `#${hard.id}`, `level ${hard.id} (hard) is not ${pct(CURVE.hardGap)} below its stage base ${pct(base)}`);
    const boss = ls.find((l) => l.boss);
    const others = Math.min(...ls.filter((l) => !l.boss).map((l) => l.winRate));
    if (boss && !boss.easyBoss && boss.winRate > others + tol) {
      add(2, 'error', `#${boss.id}`, `boss ${boss.id} (${pct(boss.winRate)}) is not the hardest of stage ${stage} (${pct(others)})`);
    }

    // Rule 7 (warning, provisional cap until the playtest #66): hard levels and bosses stay short.
    const cap = Math.ceil(median(ls.map((l) => l.shooters)) * CURVE.hardShooterCap);
    for (const l of [hard, ...(boss ? [boss] : [])]) {
      if (l.shooters > cap) add(7, 'warning', `#${l.id}`, `level ${l.id}: ${l.shooters} shooters, cap ${cap}`);
    }
  }

  // Rules 3–5 per universe, only when all its stages are complete.
  const lastStage = Math.max(0, ...byStage.keys());
  const firstOf = (u: number) => (u - 1) * CURVE.stagesPerUniverse + 1;
  const lastOf = (u: number) => u * CURVE.stagesPerUniverse;
  const universeComplete = (u: number) => Array.from({ length: CURVE.stagesPerUniverse }, (_, i) => firstOf(u) + i).every(complete);
  for (let u = 1; u <= universeOfStage(lastStage); u++) {
    const groupMean = (from: number, to: number) => mean(levels.filter((l) => l.stage >= from && l.stage <= to).map((l) => l.winRate));
    if (universeComplete(u)) {
      // Rule 3: the end of a universe is harder than its start (groups of two stages, as in #75).
      const start = groupMean(firstOf(u), firstOf(u) + 1);
      const end = groupMean(lastOf(u) - 1, lastOf(u));
      if (end >= start - CURVE.tolerance) add(3, 'error', `u${u}`, `universe ${u}: its last stages (${pct(end)}) are not harder than its first (${pct(start)})`);
      // Rule 5: provisional targets at the end of the universe.
      const target = CURVE.universes[u - 1];
      if (target) {
        const endMean = stageMean(lastOf(u));
        if (Math.abs(endMean - target.endMean) > CURVE.endMeanTolerance) {
          add(5, 'error', `u${u}`, `universe ${u}: last stage mean ${pct(endMean)}, target ${pct(target.endMean)} ± ${pct(CURVE.endMeanTolerance)}`);
        }
        const hardest = Math.min(...levels.filter((l) => l.boss && universeOfStage(l.stage) === u).map((l) => l.winRate));
        if (hardest < target.hardestBoss - CURVE.tolerance) {
          add(5, 'error', `u${u}`, `universe ${u}: hardest boss ${pct(hardest)} is below the floor ${pct(target.hardestBoss)}`);
        }
      }
    }
    // Rule 4: a new universe starts easier than the previous one ended, but harder than the previous one started.
    if (u > 1 && complete(firstOf(u)) && complete(lastOf(u - 1)) && complete(firstOf(u - 1))) {
      const first = stageMean(firstOf(u));
      if (first <= stageMean(lastOf(u - 1))) add(4, 'error', `u${u}`, `universe ${u} starts (${pct(first)}) no easier than universe ${u - 1} ends (${pct(stageMean(lastOf(u - 1)))})`);
      if (first >= stageMean(firstOf(u - 1))) add(4, 'error', `u${u}`, `universe ${u} starts (${pct(first)}) no harder than universe ${u - 1} starts (${pct(stageMean(firstOf(u - 1)))})`);
    }
  }
  return out;
}
