/**
 * Playtest telemetry (#68) in the shape of the session form of #67 (`docs/playtest/scheda.schema.json`,
 * schemaVersion 1): what the harness writes, attempt by attempt, from snapshots of `window.__mix` (read only, never
 * shown to the agent) and the agent's taps. Pure: no Playwright, no DOM, no clock — times come in as arguments.
 *
 * The form's other parts (level and session feedback, bugs) are the agent's: the recorder only stores them.
 */

export const SCHEMA_VERSION = 1;

/** Action budget of the protocol (§4): screenshots and waits are not actions. */
export const BUDGET = { attempt: 80, session: 1500 };

/** Seconds without a scene or tick change, after a tap, before a screen counts as stuck (protocol §6). */
export const STUCK_MS = 10_000;

type Rect = { x: number; y: number; w: number; h: number };
type Point = { x: number; y: number };

/** The part of `window.__mix` the harness reads. Every field but `scene` is only there on some scenes. */
export interface MixSnapshot {
  scene: string;
  levelId?: number;
  status?: string;
  overlay?: 'win' | 'jam' | null;
  tip?: string | null;
  guide?: string | null;
  tick?: number;
  moves?: number;
  refusals?: number;
  belt?: { used: number; capacity: number };
  columns?: Rect[];
  slots?: Rect[];
  slotsUsed?: number;
  painted?: number;
  targets?: number;
  ice?: number;
  hidden?: number;
  locked?: number;
  covered?: number;
  stoneSplashes?: number;
  reveals?: number;
  jamButtons?: { continue: Point | null; retry: Point };
  tipButton?: Point;
  language?: string;
  scrollY?: number;
}

export type Outcome = 'vinto' | 'ingorgo' | 'riprova' | 'uscita' | 'budget';
export type EndReason = 'piano-finito' | 'soglia-abbandono' | 'budget-azioni' | 'bloccato-da-bug' | 'errore-harness';

export interface AttemptTelemetry {
  attempt: number;
  outcome: Outcome;
  durationMs: number;
  timeToFirstTapMs: number | null;
  ticks: number;
  taps: number;
  offTargetTaps: number;
  launches: number;
  refusals: number;
  jams: number;
  extraSlotUsed: boolean;
  maxSlotsUsed: number;
  slotCount: number;
  maxBeltUsed: number;
  beltCapacity: number;
  painted: number;
  targets: number;
  remaining: { ice: number; hidden: number; locked: number; covered: number };
  stoneSplashes: number;
  reveals: number;
  tipsShown: string[];
  tipDismissMs: number | null;
  consoleErrors: number;
  screenshots: string[];
}

export interface LogEntry {
  at: string;
  levelId?: number;
  message: string;
  screenshot?: string;
}

export interface SessionTelemetry {
  durationMs: number;
  actions: number;
  screens: Record<string, number>;
  languageChanges: number;
  uncaughtErrors: LogEntry[];
  stuckScreens: LogEntry[];
}

/** Everything about a session that is known before it starts (from the turn config and the build). */
export interface SessionHeader {
  sessionId: string;
  agent: { agentId: string; profileId: string; model?: string };
  turn: number;
  build: { commit: string; version: string; tag?: string; variant: 'normale' | 'senza-copertura' };
  device: { viewport: string; language: string };
  startSave: { unlocked: number; completedThrough: number; seenTips: string[] };
  plan: { packs: string[]; levelIds: number[] };
}

/** The whole form; `feedback` and `bugs` are whatever the agent sent (checked against the schema at the end). */
export interface Scheda extends SessionHeader {
  schemaVersion: number;
  startedAt: string;
  endedAt: string;
  endReason: EndReason;
  levels: { levelId: number; result: 'vinto' | 'abbandonato' | 'saltato'; attempts: AttemptTelemetry[]; feedback?: unknown }[];
  session: { telemetry: SessionTelemetry; feedback?: unknown };
  bugs: unknown[];
}

const iso = (t: number) => new Date(t).toISOString();
const within = (p: Point, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const around = (c: Point, w: number, h: number): Rect => ({ x: c.x - w / 2, y: c.y - h / 2, w, h });

/** Top-bar buttons of a level (PlayScene.create): ◀ menu, ♪ sound, ⟲ restart. */
export const TOP_BAR: readonly Rect[] = [around({ x: 60, y: 64 }, 84, 64), around({ x: 540, y: 64 }, 84, 64), around({ x: 660, y: 64 }, 84, 64)];

/**
 * Whether a tap (logical coordinates) lands on something it can act on: a column, a slot, the top bar, or — when a
 * panel or tip covers the board — that panel's buttons only.
 */
export function onTarget(snap: MixSnapshot, p: Point): boolean {
  if (TOP_BAR.some((r) => within(p, r)) && !snap.overlay && !snap.tip) return true;
  if (snap.tip) return !!snap.tipButton && within(p, around(snap.tipButton, 300, 80));
  if (snap.overlay === 'jam') {
    const b = snap.jamButtons;
    return !!b && ((!!b.continue && within(p, around(b.continue, 420, 88))) || within(p, around(b.retry, 300, 80)));
  }
  if (snap.overlay) return true; // the win panel: its buttons are not part of the attempt
  return [...(snap.columns ?? []), ...(snap.slots ?? [])].some((r) => within(p, r));
}

interface Open extends AttemptTelemetry {
  levelId: number;
  startedAt: number;
  endedAt: number | null;
  actions: number;
  lastTick: number;
  lastMoves: number;
  lastOverlay: MixSnapshot['overlay'];
  tipSince: number | null;
}

/** Builds a session's telemetry from snapshots, taps and errors, in the order they happen. */
export class SessionRecorder {
  private readonly attempts: Open[] = [];
  private readonly skipped = new Set<number>();
  private readonly levelFeedback = new Map<number, unknown>();
  private readonly uncaught: LogEntry[] = [];
  private readonly stuck: LogEntry[] = [];
  private readonly screens: Record<string, number> = {};
  private current: Open | null = null;
  private last: MixSnapshot | null = null;
  private language: string | null = null;
  private languageChanges = 0;
  actions = 0;
  sessionFeedback: unknown = undefined;
  readonly bugs: unknown[] = [];

  constructor(private readonly header: SessionHeader, private readonly startedAt: number) {}

  /** Level being played now (an open attempt), or null. */
  get playing(): { levelId: number; attempt: number; actions: number } | null {
    const a = this.current;
    return a && a.endedAt === null ? { levelId: a.levelId, attempt: a.attempt, actions: a.actions } : null;
  }

  /** Attempts so far on a level, and whether one was won. */
  levelState(levelId: number): { attempts: number; won: boolean; skipped: boolean } {
    const runs = this.attempts.filter((a) => a.levelId === levelId);
    return { attempts: runs.length, won: runs.some((a) => a.outcome === 'vinto'), skipped: this.skipped.has(levelId) };
  }

  /** The level of the last attempt, open or closed. */
  get lastLevel(): number | null {
    return this.attempts.at(-1)?.levelId ?? null;
  }

  observe(snap: MixSnapshot, t: number): void {
    const prev = this.last;
    this.last = snap;
    if (snap.scene !== prev?.scene) this.screens[snap.scene] = (this.screens[snap.scene] ?? 0) + 1;
    if (snap.language !== undefined) {
      if (this.language !== null && snap.language !== this.language) this.languageChanges += 1;
      this.language = snap.language;
    }
    const cur = this.current;
    if (snap.scene !== 'play' || snap.levelId === undefined) {
      if (cur) this.close(cur, 'uscita', t);
      this.current = null;
      return;
    }
    const sameRun = cur && cur.levelId === snap.levelId && (snap.tick ?? 0) >= cur.lastTick && (snap.moves ?? 0) >= cur.lastMoves;
    if (!sameRun) {
      if (cur) this.close(cur, cur.levelId !== snap.levelId ? 'uscita' : cur.lastOverlay === 'jam' ? 'ingorgo' : 'riprova', t);
      // A restart or the next level re-enters the play scene without leaving it: still an entry.
      if (prev?.scene === 'play') this.screens.play = (this.screens.play ?? 0) + 1;
      this.current = this.open(snap, t);
    }
    const a = this.current!;
    a.lastTick = snap.tick ?? a.lastTick;
    a.lastMoves = snap.moves ?? a.lastMoves;
    if (a.endedAt !== null) return; // a won level stays on screen until the player moves on
    a.ticks = a.lastTick;
    a.launches = a.lastMoves;
    a.durationMs = t - a.startedAt;
    a.refusals = Math.max(a.refusals, snap.refusals ?? 0);
    a.maxSlotsUsed = Math.max(a.maxSlotsUsed, snap.slotsUsed ?? 0);
    if ((snap.slots?.length ?? 0) > a.slotCount) a.extraSlotUsed = true;
    if (snap.belt) {
      a.maxBeltUsed = Math.max(a.maxBeltUsed, snap.belt.used);
      a.beltCapacity = snap.belt.capacity;
    }
    a.painted = snap.painted ?? a.painted;
    a.targets = snap.targets ?? a.targets;
    a.remaining = { ice: snap.ice ?? 0, hidden: snap.hidden ?? 0, locked: snap.locked ?? 0, covered: snap.covered ?? 0 };
    a.stoneSplashes = Math.max(a.stoneSplashes, snap.stoneSplashes ?? 0);
    a.reveals = Math.max(a.reveals, snap.reveals ?? 0);
    const tip = snap.tip ?? null;
    if (tip && !a.tipsShown.includes(tip)) a.tipsShown.push(tip);
    if (snap.guide && !a.tipsShown.includes('guide')) a.tipsShown.push('guide');
    if (tip && a.tipSince === null) a.tipSince = t;
    if (!tip && a.tipSince !== null) {
      a.tipDismissMs = (a.tipDismissMs ?? 0) + (t - a.tipSince);
      a.tipSince = null;
    }
    const overlay = snap.overlay ?? null;
    if (overlay === 'jam' && a.lastOverlay !== 'jam') a.jams += 1;
    a.lastOverlay = overlay;
    if (overlay === 'win' || snap.status === 'won') this.close(a, 'vinto', t);
  }

  /** Records one tap of the agent (logical point), counting it before its effect is observed. */
  tap(before: MixSnapshot, after: MixSnapshot, p: Point, t: number): void {
    this.observe(before, t);
    this.actions += 1;
    const a = this.current;
    if (a && a.endedAt === null) {
      a.actions += 1;
      a.taps += 1;
      a.timeToFirstTapMs ??= t - a.startedAt;
      if (!onTarget(before, p)) a.offTargetTaps += 1;
    }
    this.observe(after, t);
  }

  /** An action that is not a tap (a swipe on the map). */
  action(): void {
    this.actions += 1;
    if (this.current && this.current.endedAt === null) this.current.actions += 1;
  }

  /** The harness ends the attempt on screen for the action budget; the restart that follows opens a new one. */
  endForBudget(t: number): void {
    if (this.current) this.close(this.current, 'budget', t);
  }

  /** Drops the attempt on screen if the agent has not acted in it yet (one opened past the attempt limit). */
  discardOpen(): void {
    const a = this.current;
    if (!a || a.endedAt !== null || a.actions > 0) return;
    this.attempts.splice(this.attempts.indexOf(a), 1);
    this.current = null;
  }

  /** The harness loaded the save after this level: it stays in the form as "saltato". */
  skip(levelId: number, t: number): void {
    if (this.current) this.close(this.current, 'uscita', t);
    this.skipped.add(levelId);
  }

  screenshot(file: string): void {
    if (this.current && this.current.endedAt === null) this.current.screenshots.push(file);
  }

  consoleError(message: string, t: number): void {
    const a = this.current;
    if (a && a.endedAt === null) a.consoleErrors += 1;
    else this.uncaught.push(this.log(`console: ${message}`, t));
  }

  uncaughtError(message: string, t: number, screenshot?: string): void {
    this.uncaught.push(this.log(message, t, screenshot));
  }

  stuckScreen(message: string, t: number, screenshot?: string): void {
    this.stuck.push(this.log(message, t, screenshot));
  }

  setLevelFeedback(levelId: number, feedback: unknown): void {
    this.levelFeedback.set(levelId, feedback);
  }

  /** Levels played so far that still have no feedback from the agent. */
  missingFeedback(): number[] {
    return [...new Set(this.attempts.map((a) => a.levelId))].filter((id) => !this.levelFeedback.has(id));
  }

  /** The form as it stands at time `t`; an attempt still open is closed as `uscita` (the agent stopped there). */
  scheda(t: number, endReason: EndReason): Scheda {
    const ids = [...new Set([...this.attempts.map((a) => a.levelId)])];
    return {
      schemaVersion: SCHEMA_VERSION,
      ...this.header,
      startedAt: iso(this.startedAt),
      endedAt: iso(t),
      endReason,
      levels: ids.map((levelId) => {
        const runs = this.attempts.filter((a) => a.levelId === levelId).map((a) => this.finished(a, t));
        const result = runs.some((a) => a.outcome === 'vinto') ? 'vinto' : this.skipped.has(levelId) ? 'saltato' : 'abbandonato';
        const feedback = this.levelFeedback.get(levelId);
        return { levelId, result, attempts: runs, ...(feedback === undefined ? {} : { feedback }) };
      }),
      session: {
        telemetry: {
          durationMs: Math.max(0, Math.round(t - this.startedAt)),
          actions: this.actions,
          screens: { ...this.screens },
          languageChanges: this.languageChanges,
          uncaughtErrors: [...this.uncaught],
          stuckScreens: [...this.stuck],
        },
        ...(this.sessionFeedback === undefined ? {} : { feedback: this.sessionFeedback }),
      },
      bugs: [...this.bugs],
    };
  }

  private open(snap: MixSnapshot, t: number): Open {
    const a: Open = {
      levelId: snap.levelId!, startedAt: t, endedAt: null, actions: 0, lastTick: snap.tick ?? 0, lastMoves: snap.moves ?? 0, lastOverlay: null, tipSince: null,
      attempt: this.attempts.filter((x) => x.levelId === snap.levelId).length + 1,
      outcome: 'uscita', durationMs: 0, timeToFirstTapMs: null, ticks: 0, taps: 0, offTargetTaps: 0, launches: 0, refusals: 0, jams: 0,
      extraSlotUsed: false, maxSlotsUsed: 0, slotCount: snap.slots?.length ?? 1, maxBeltUsed: 0, beltCapacity: snap.belt?.capacity ?? 1,
      painted: 0, targets: snap.targets ?? 1, remaining: { ice: 0, hidden: 0, locked: 0, covered: 0 }, stoneSplashes: 0, reveals: 0,
      tipsShown: [], tipDismissMs: null, consoleErrors: 0, screenshots: [],
    };
    this.attempts.push(a);
    return a;
  }

  private close(a: Open, outcome: Outcome, t: number): void {
    if (a.endedAt !== null) return;
    a.outcome = outcome;
    a.endedAt = t;
    a.durationMs = t - a.startedAt;
    if (a.tipSince !== null) {
      a.tipDismissMs = (a.tipDismissMs ?? 0) + (t - a.tipSince);
      a.tipSince = null;
    }
  }

  /** The attempt as the form holds it: integers only, an open one closed at `t` without changing the recorder. */
  private finished(a: Open, t: number): AttemptTelemetry {
    const open = a.endedAt === null;
    const tipOpen = open && a.tipSince !== null ? t - a.tipSince : 0;
    // Field by field, in the schema's order: the recorder's own bookkeeping stays out of the form.
    return {
      attempt: a.attempt,
      outcome: open ? 'uscita' : a.outcome,
      durationMs: Math.max(0, Math.round(open ? t - a.startedAt : a.durationMs)),
      timeToFirstTapMs: a.timeToFirstTapMs === null ? null : Math.max(0, Math.round(a.timeToFirstTapMs)),
      ticks: a.ticks, taps: a.taps, offTargetTaps: a.offTargetTaps, launches: a.launches, refusals: a.refusals, jams: a.jams,
      extraSlotUsed: a.extraSlotUsed, maxSlotsUsed: a.maxSlotsUsed, slotCount: a.slotCount, maxBeltUsed: a.maxBeltUsed,
      beltCapacity: a.beltCapacity, painted: a.painted, targets: a.targets, remaining: { ...a.remaining },
      stoneSplashes: a.stoneSplashes, reveals: a.reveals, tipsShown: [...a.tipsShown],
      tipDismissMs: a.tipDismissMs === null && !tipOpen ? null : Math.round((a.tipDismissMs ?? 0) + tipOpen),
      consoleErrors: a.consoleErrors, screenshots: [...a.screenshots],
    };
  }

  private log(message: string, t: number, screenshot?: string): LogEntry {
    const levelId = this.last?.scene === 'play' ? this.last.levelId : undefined;
    return { at: iso(t), ...(levelId === undefined ? {} : { levelId }), message: message.slice(0, 2000), ...(screenshot ? { screenshot } : {}) };
  }
}

/**
 * Spots a stuck screen after a tap: on a level in play (no tip, no panel) the simulation ticks on its own, so a tick
 * and a scene that do not change for `limitMs` mean the game froze. Armed by a tap, fires at most once per tap.
 */
export class StuckWatch {
  private armedAt: number | null = null;
  private key = '';

  constructor(private readonly limitMs = STUCK_MS) {}

  tapped(snap: MixSnapshot | null, t: number): void {
    this.armedAt = t;
    this.key = keyOf(snap);
  }

  feed(snap: MixSnapshot | null, t: number): boolean {
    if (this.armedAt === null) return false;
    const live = !!snap && snap.scene === 'play' && snap.status === 'playing' && !snap.tip && !snap.overlay;
    if (!live || keyOf(snap) !== this.key) {
      this.armedAt = null;
      return false;
    }
    if (t - this.armedAt < this.limitMs) return false;
    this.armedAt = null;
    return true;
  }
}

const keyOf = (s: MixSnapshot | null) => (s ? `${s.scene}|${s.levelId}|${s.tick}` : 'none');
