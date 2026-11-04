/**
 * Aggregates the playtest forms of #69 (protocol §9): per level, per session and the deduplicated bug list.
 * Pure: the CLI (`aggregate-cli.ts`) reads the forms and the random-play win rates and writes the JSON.
 */

export type Mood = 'divertito' | 'neutro' | 'annoiato' | 'frustrato';

export interface FormAttempt {
  outcome: string;
  refusals: number;
  jams: number;
  extraSlotUsed: boolean;
  painted: number;
  targets: number;
  durationMs?: number;
  ticks?: number;
}

export interface FormLevel {
  levelId: number;
  result: 'vinto' | 'abbandonato' | 'saltato';
  attempts: FormAttempt[];
  feedback?: {
    understood: number;
    perceivedDifficulty: number;
    mood: Mood;
    notUnderstood: string;
    wouldContinue?: boolean;
    freeText: string;
    mechanic?: { id: string; understood: number; fairness: number };
  };
}

export interface FormBug {
  id: string;
  title: string;
  severity: 'alta' | 'media' | 'bassa';
  category: string;
  levelId?: number;
  reproduced: boolean;
}

export interface Form {
  sessionId: string;
  agent: { agentId: string; profileId: string };
  device: { viewport: string; language: string };
  endReason: string;
  levels: FormLevel[];
  session: { feedback?: { fun: number; wouldReturn: number; stoppedBecause: string; bestMoment?: string; worstMoment?: string } };
  bugs: FormBug[];
}

/** Random-play win rate above which a level should feel easy, and below which it should feel hard. */
export const RANDOM_EASY = 0.7;
export const RANDOM_HARD = 0.35;

export interface LevelStats {
  levelId: number;
  sessions: string[];
  agents: number;
  wins: number;
  firstTryWins: number;
  skipped: number;
  attemptsMean: number;
  jams: number;
  refusals: number;
  extraSlotUses: number;
  missingPixelsOnLoss: number[];
  /** Game time (`ticks`, independent of the agent) and wall time of the winning attempts: rule 7 of #88. */
  winTicks: number | null;
  winDurationMs: number | null;
  totalTicks: number;
  perceivedDifficulty: number | null;
  understood: number | null;
  moods: Record<Mood, number>;
  wouldNotContinue: number;
  notUnderstood: { sessionId: string; text: string }[];
  mechanics: { sessionId: string; id: string; understood: number; fairness: number }[];
  randomWin: number | null;
  /** Protocol §9: perceived difficulty against the random-play curve. */
  anomaly: 'piu-duro-del-previsto' | 'piu-facile-del-previsto' | null;
}

export interface SessionSummary {
  sessionId: string;
  profileId: string;
  viewport: string;
  language: string;
  endReason: string;
  levelsPlayed: number;
  wins: number;
  skipped: number;
  lastLevel: number | null;
  fun: number | null;
  wouldReturn: number | null;
  stoppedBecause: string;
}

export interface Aggregate {
  sessions: SessionSummary[];
  levels: LevelStats[];
  bugs: (FormBug & { sessionId: string; profileId: string })[];
}

const mean = (xs: number[]): number | null => (xs.length ? Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2)) : null);

export function anomalyOf(perceived: number | null, randomWin: number | null): LevelStats['anomaly'] {
  if (perceived === null || randomWin === null) return null;
  if (perceived >= 4 && randomWin >= RANDOM_EASY) return 'piu-duro-del-previsto';
  if (perceived <= 2 && randomWin <= RANDOM_HARD) return 'piu-facile-del-previsto';
  return null;
}

function levelStats(levelId: number, entries: { form: Form; level: FormLevel }[], randomWin: number | null): LevelStats {
  const attempts = entries.flatMap((e) => e.level.attempts);
  const feedback = entries.flatMap((e) => (e.level.feedback ? [{ sessionId: e.form.sessionId, ...e.level.feedback }] : []));
  const moods: Record<Mood, number> = { divertito: 0, neutro: 0, annoiato: 0, frustrato: 0 };
  for (const f of feedback) moods[f.mood]++;
  const perceived = mean(feedback.map((f) => f.perceivedDifficulty));
  return {
    levelId,
    sessions: entries.map((e) => e.form.sessionId),
    agents: entries.length,
    wins: entries.filter((e) => e.level.result === 'vinto').length,
    firstTryWins: entries.filter((e) => e.level.attempts[0]?.outcome === 'vinto').length,
    skipped: entries.filter((e) => e.level.result === 'saltato').length,
    attemptsMean: mean(entries.map((e) => e.level.attempts.length)) ?? 0,
    jams: attempts.reduce((a, t) => a + t.jams, 0),
    refusals: attempts.reduce((a, t) => a + t.refusals, 0),
    extraSlotUses: attempts.filter((t) => t.extraSlotUsed).length,
    winTicks: mean(attempts.filter((t) => t.outcome === 'vinto' && t.ticks !== undefined).map((t) => t.ticks!)),
    winDurationMs: mean(attempts.filter((t) => t.outcome === 'vinto' && t.durationMs !== undefined).map((t) => t.durationMs!)),
    totalTicks: attempts.reduce((a, t) => a + (t.ticks ?? 0), 0),
    missingPixelsOnLoss: attempts.filter((t) => t.outcome !== 'vinto').map((t) => t.targets - t.painted),
    perceivedDifficulty: perceived,
    understood: mean(feedback.map((f) => f.understood)),
    moods,
    wouldNotContinue: feedback.filter((f) => f.wouldContinue === false).length,
    notUnderstood: feedback.filter((f) => f.notUnderstood.trim()).map((f) => ({ sessionId: f.sessionId, text: f.notUnderstood.trim() })),
    mechanics: feedback.flatMap((f) => (f.mechanic ? [{ sessionId: f.sessionId, ...f.mechanic }] : [])),
    randomWin,
    anomaly: anomalyOf(perceived, randomWin),
  };
}

/** A level counts as seen by a session when it has at least one attempt (protocol §8, rule 1). */
export function aggregate(forms: Form[], randomWin: Record<number, number> = {}): Aggregate {
  const byLevel = new Map<number, { form: Form; level: FormLevel }[]>();
  for (const form of forms) {
    for (const level of form.levels) {
      if (level.attempts.length === 0) continue;
      const list = byLevel.get(level.levelId) ?? [];
      list.push({ form, level });
      byLevel.set(level.levelId, list);
    }
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b).map((id) => levelStats(id, byLevel.get(id)!, randomWin[id] ?? null));
  const sessions = forms.map((form): SessionSummary => {
    const played = form.levels.filter((l) => l.attempts.length > 0);
    const fb = form.session.feedback;
    return {
      sessionId: form.sessionId,
      profileId: form.agent.profileId,
      viewport: form.device.viewport,
      language: form.device.language,
      endReason: form.endReason,
      levelsPlayed: played.length,
      wins: played.filter((l) => l.result === 'vinto').length,
      skipped: played.filter((l) => l.result === 'saltato').length,
      lastLevel: played.at(-1)?.levelId ?? null,
      fun: fb?.fun ?? null,
      wouldReturn: fb?.wouldReturn ?? null,
      stoppedBecause: fb?.stoppedBecause ?? '',
    };
  });
  const bugs = forms.flatMap((form) => form.bugs.map((b) => ({ ...b, sessionId: form.sessionId, profileId: form.agent.profileId })));
  return { sessions, levels, bugs };
}

/** Levels of `wanted` seen by fewer than `min` sessions. */
export function coverageGaps(agg: Aggregate, wanted: number[], min: number): { levelId: number; agents: number }[] {
  const seen = new Map(agg.levels.map((l) => [l.levelId, l.agents]));
  return wanted.map((levelId) => ({ levelId, agents: seen.get(levelId) ?? 0 })).filter((g) => g.agents < min);
}
