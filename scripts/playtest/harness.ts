/**
 * Playtest harness (#68): one agent plays the real game in its own browser profile, through the actions a player
 * has — look at the screen, tap. `window.__mix` is read only here, to aim column/slot taps and to record telemetry;
 * nothing read from it is handed back to the agent, who sees screenshots and short notes only.
 *
 * The session ends with the form of #67 (`<sessionId>.json`), checked against `docs/playtest/scheda.schema.json`.
 */
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import type { Level } from '../../src/core/level';
import { STORAGE_KEY } from '../../src/core/progress';
import { validate, validateDef, type Schema } from './jsonSchema';
import { planStep, saveFor } from './saves';
import { BUDGET, SessionRecorder, StuckWatch, type EndReason, type MixSnapshot, type Scheda, type SessionHeader } from './telemetry';

/** Logical width of the game (src/game/theme.ts VIEW): canvas pixels are scaled from it. */
const LOGICAL_WIDTH = 720;
const SEEDED_KEY = 'mix-and-splash/playtest/seeded';
/** Top-bar buttons of a level, in logical coordinates (PlayScene.create). */
const HOME = { x: 60, y: 64 };
const RETRY = { x: LOGICAL_WIDTH - 60, y: 64 };

export interface AgentOptions {
  header: SessionHeader;
  /** All levels of the build, parsed: plans and saves are computed from them. */
  levels: readonly Level[];
  gameUrl: string;
  /** Folder that receives `<sessionId>.json` and the `<sessionId>/` screenshot folder. */
  outDir: string;
  maxAttempts: number | null;
  /** The form's JSON Schema; without it the form is written unchecked (and says so). */
  schema: Schema | null;
  stuckMs?: number;
  /** How often the game is sampled for telemetry between actions. */
  pollMs?: number;
}

export interface ActionResult {
  /** Absolute path of the screenshot taken after the action. */
  screenshot?: string;
  /** What the harness did on its own or could not do (skip, new save, budget, no such column). */
  notes?: string[];
}

type Rect = { x: number; y: number; w: number; h: number };

export class PlaytestAgent {
  private shotCount = 0;
  private timer: NodeJS.Timeout | null = null;
  private busy = Promise.resolve();
  /** Telemetry reads in order: a slow background sample landing after a tap would look like a restart. */
  private sampling = Promise.resolve();
  private polling = false;
  /** Set while the harness changes the save: a sample then would open a phantom attempt. */
  private paused = false;
  private closed = false;
  private budgetOver = false;
  private planDone = false;
  private lastStep = '';
  readonly recorder: SessionRecorder;
  private readonly stuck: StuckWatch;
  readonly sessionDir: string;

  private constructor(readonly page: Page, private readonly context: BrowserContext, private readonly opts: AgentOptions) {
    this.recorder = new SessionRecorder(opts.header, Date.now());
    this.stuck = new StuckWatch(opts.stuckMs);
    this.sessionDir = join(opts.outDir, opts.header.sessionId);
  }

  get sessionId(): string {
    return this.opts.header.sessionId;
  }

  /** Opens the game in a fresh, isolated browser context (its own storage) seeded with the plan's first save. */
  static async start(browser: Browser, opts: AgentOptions): Promise<PlaytestAgent> {
    const { header } = opts;
    const [width, height] = header.device.viewport.split('x').map(Number) as [number, number];
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const save = saveFor(opts.levels, header.plan.levelIds[0]!, header.device.language);
    // Seed once: later reloads keep whatever the agent has played since.
    await context.addInitScript(([key, seeded, value]) => {
      if (localStorage.getItem(seeded)) return;
      localStorage.setItem(key, value);
      localStorage.setItem(seeded, '1');
    }, [STORAGE_KEY, SEEDED_KEY, JSON.stringify(save)] as const);
    const page = await context.newPage();
    const agent = new PlaytestAgent(page, context, opts);
    mkdirSync(agent.sessionDir, { recursive: true });
    page.on('pageerror', (e) => void agent.logError('uncaught', e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') agent.recorder.consoleError(m.text(), Date.now());
    });
    await page.goto(opts.gameUrl);
    await agent.waitForGame();
    agent.timer = setInterval(() => void agent.poll(), opts.pollMs ?? 250);
    agent.saveDraft();
    return agent;
  }

  // ---------- actions (what the agent may do) ----------

  async screenshot(): Promise<ActionResult> {
    return this.serial(async () => ({ screenshot: await this.shot() }), false);
  }

  /** Taps a point of the screenshot (CSS pixels, origin top-left). */
  async tap(x: number, y: number, settleMs = 400): Promise<ActionResult> {
    return this.serial(async () => {
      await this.tapAt(x, y);
      await this.page.waitForTimeout(settleMs);
      return {};
    });
  }

  /** Taps column n (1 = leftmost visible) of the level on screen. */
  async tapColumn(n: number, settleMs = 400): Promise<ActionResult> {
    return this.tapTarget('columns', n, settleMs);
  }

  /** Taps waiting slot n (1 = leftmost visible) of the level on screen. */
  async tapSlot(n: number, settleMs = 400): Promise<ActionResult> {
    return this.tapTarget('slots', n, settleMs);
  }

  /**
   * Several taps in a row, ~150 ms apart, like a quick thumb (a single tap waits for the screen to settle).
   * Steps are `cN` (column N), `sN` (slot N) or `X:Y` (a point). Each step is one action.
   */
  async taps(steps: string[], gapMs = 150): Promise<ActionResult> {
    return this.serial(async () => {
      const notes: string[] = [];
      for (const step of steps) {
        if (this.budgetOver) break;
        const m = /^([cs])(\d+)$/.exec(step) ?? /^(\d+):(\d+)$/.exec(step);
        const point = !m ? null : m[1] === 'c' || m[1] === 's' ? await this.targetPoint(m[1] === 'c' ? 'columns' : 'slots', Number(m[2])) : { x: Number(m[1]), y: Number(m[2]) };
        if (!point) {
          notes.push(`step "${step}" skipped: no such target on screen`);
          continue;
        }
        await this.tapAt(point.x, point.y);
        await this.page.waitForTimeout(gapMs);
      }
      await this.page.waitForTimeout(250);
      return { notes };
    });
  }

  /** The ◀ button of a level: back to the map. */
  async openMenu(): Promise<ActionResult> {
    return this.topButton(HOME);
  }

  /** The ⟲ button of a level: start it again. */
  async restart(): Promise<ActionResult> {
    return this.topButton(RETRY);
  }

  /** Drags the screen vertically by dy CSS pixels (negative scrolls the map up), like a thumb swipe. */
  async swipe(dy: number): Promise<ActionResult> {
    return this.serial(async () => {
      const box = await this.canvasBox();
      const x = box.x + 30, y0 = box.y + box.height / 2;
      await this.page.mouse.move(x, y0);
      await this.page.mouse.down();
      for (let s = 1; s <= 10; s++) await this.page.mouse.move(x, y0 + (dy * s) / 10);
      await this.page.waitForTimeout(120);
      await this.page.mouse.up();
      this.recorder.action();
      await this.page.waitForTimeout(400);
      return {};
    });
  }

  /** Watches the screen for a while without touching it (not an action). */
  async wait(ms: number): Promise<ActionResult> {
    return this.serial(async () => {
      await this.page.waitForTimeout(Math.max(0, Math.min(ms, 30_000)));
      return {};
    }, false);
  }

  /** Watches until the belt is empty or a panel/tip is up (at most `maxMs`), like a player waiting for the move to end. */
  async waitIdle(maxMs = 30_000): Promise<ActionResult> {
    return this.serial(async () => {
      await this.page
        .waitForFunction(() => {
          const m = window.__mix as { scene: string; beltBusy?: boolean; overlay?: string | null; tip?: string | null; status?: string };
          return m.scene !== 'play' || !m.beltBusy || !!m.overlay || !!m.tip || m.status !== 'playing';
        }, null, { timeout: maxMs, polling: 100 })
        .catch(() => undefined);
      await this.page.waitForTimeout(200);
      return {};
    }, false);
  }

  /** The agent gives up the level on screen at its profile's limit: the harness loads the next planned level. */
  async skip(): Promise<ActionResult> {
    return this.serial(async () => {
      const plan = this.opts.header.plan.levelIds;
      // The level on screen, or else the one the agent is due to play next.
      const level = this.recorder.playing?.levelId ?? plan.find((id) => {
        const st = this.recorder.levelState(id);
        return !st.won && !st.skipped;
      });
      if (level === undefined) return { notes: ['every planned level is already won or skipped'] };
      const next = plan[plan.indexOf(level) + 1];
      await this.exclusive(async () => this.recorder.skip(level, Date.now()));
      if (next === undefined) {
        this.planDone = true;
        return { notes: [`level ${level} skipped; that was the last planned level: send your feedback, then end the session`] };
      }
      await this.loadSave(next);
      return { notes: [`level ${level} skipped; your save now opens level ${next}`] };
    }, false);
  }

  // ---------- the agent's parts of the form ----------

  levelFeedback(levelId: number, feedback: unknown): string[] {
    const errors = this.opts.schema ? validateDef(this.opts.schema, 'levelFeedback', feedback) : [];
    if (!this.recorder.levelState(levelId).attempts) errors.push(`level ${levelId} has not been played in this session`);
    if (!errors.length) this.recorder.setLevelFeedback(levelId, feedback);
    this.saveDraft();
    return errors;
  }

  sessionFeedback(feedback: unknown): string[] {
    const errors = this.opts.schema ? validateDef(this.opts.schema, 'sessionFeedback', feedback) : [];
    if (!errors.length) this.recorder.sessionFeedback = feedback;
    this.saveDraft();
    return errors;
  }

  /** Adds a bug; its id (`Tnn-Ann-Bnn`) is given by the harness. */
  bug(bug: unknown): { id: string; errors: string[] } {
    const id = `${this.sessionId}-B${String(this.recorder.bugs.length + 1).padStart(2, '0')}`;
    const withId = bug && typeof bug === 'object' && !Array.isArray(bug) ? { ...bug, id } : bug;
    const errors = this.opts.schema ? validateDef(this.opts.schema, 'bug', withId) : [];
    if (!errors.length) this.recorder.bugs.push(withId);
    this.saveDraft();
    return { id, errors };
  }

  // ---------- end ----------

  /** The form as it would be written now. */
  scheda(reason: EndReason): Scheda {
    return this.recorder.scheda(Date.now(), reason);
  }

  /**
   * Ends the session and writes `<sessionId>.json`. A form the schema rejects is not written (the agent can still
   * send what is missing) unless `force`, which writes `<sessionId>.invalid.json` instead: it stays out of the report.
   */
  async end(reason?: EndReason, force = false): Promise<{ file: string | null; errors: string[]; validated: boolean }> {
    const why: EndReason = reason ?? (this.budgetOver ? 'budget-azioni' : 'piano-finito');
    await this.busy.catch(() => undefined);
    await this.exclusive(async () => {
      const snap = await this.read();
      if (snap) this.recorder.observe(snap, Date.now());
    });
    const scheda = this.scheda(why);
    const errors = this.opts.schema ? validate(this.opts.schema, JSON.parse(JSON.stringify(scheda))) : [];
    if (errors.length && !force) return { file: null, errors, validated: true };
    const file = join(this.opts.outDir, `${this.sessionId}${errors.length ? '.invalid' : ''}.json`);
    this.write(file, scheda);
    await this.close();
    rmSync(join(this.opts.outDir, `${this.sessionId}.draft.json`), { force: true });
    return { file, errors, validated: !!this.opts.schema };
  }

  /** Stops sampling and closes the browser profile (the draft form stays on disk). */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.timer) clearInterval(this.timer);
    await this.context.close().catch(() => undefined);
  }

  // ---------- internals ----------

  /**
   * One action at a time per agent. Counted actions pass the budget and plan checks first, and every action ends
   * with a screenshot and the draft form on disk.
   */
  private serial(fn: () => Promise<ActionResult>, counted = true): Promise<ActionResult> {
    if (this.closed) return Promise.reject(new Error('session ended'));
    const run = this.busy.then(async (): Promise<ActionResult> => {
      const notes: string[] = [];
      if (counted) {
        notes.push(...(await this.beforeAction()));
        if (this.budgetOver) return { notes, screenshot: await this.shot() };
      }
      const r = await fn();
      if (counted) notes.push(...(await this.afterAction()));
      notes.push(...(r.notes ?? []));
      return { screenshot: r.screenshot ?? (await this.shot()), ...(notes.length ? { notes } : {}) };
    });
    this.busy = run.then(() => undefined, () => undefined);
    return run.finally(() => this.saveDraft());
  }

  private async beforeAction(): Promise<string[]> {
    if (this.recorder.actions >= BUDGET.session) {
      this.budgetOver = true;
      return [`session budget of ${BUDGET.session} actions reached: send your feedback, then end the session`];
    }
    const playing = this.recorder.playing;
    if (playing && playing.actions >= BUDGET.attempt) {
      await this.exclusive(async () => this.recorder.endForBudget(Date.now()));
      const retry = await this.toScreen(RETRY);
      await this.page.mouse.click(retry.x, retry.y);
      await this.page.waitForTimeout(500);
      return [`attempt budget of ${BUDGET.attempt} actions reached: the harness restarted level ${playing.levelId}`];
    }
    return [];
  }

  /** After an action: skip at the attempt limit, the next pack's save, or the end of the plan. */
  private async afterAction(): Promise<string[]> {
    await this.exclusive(async () => {
      const snap = await this.read();
      if (snap) this.recorder.observe(snap, Date.now());
    });
    // Retrying past the profile's limit opens one attempt too many: it is dropped and the level skipped.
    const playing = this.recorder.playing;
    const max = this.opts.maxAttempts;
    const over = playing && max !== null && playing.attempt > max && playing.actions === 0 && !this.recorder.levelState(playing.levelId).won;
    if (playing && !over) return [];
    this.paused = true;
    try {
      return await this.followPlan(!!over);
    } finally {
      this.paused = false;
    }
  }

  private async followPlan(dropOpen: boolean): Promise<string[]> {
    if (dropOpen) await this.exclusive(() => this.recorder.discardOpen());
    const last = this.recorder.lastLevel;
    const step = planStep(this.opts.header.plan.levelIds, last, last === null ? { attempts: 0, won: false, skipped: false } : this.recorder.levelState(last), this.opts.maxAttempts);
    const key = JSON.stringify(step);
    if (step.kind === 'none' || key === this.lastStep) return [];
    this.lastStep = key;
    const notes: string[] = [];
    if (step.skipped !== null) {
      this.recorder.skip(step.skipped, Date.now());
      notes.push(`level ${step.skipped} reached your limit of ${this.opts.maxAttempts} attempts and is skipped`);
    }
    if (step.kind === 'done') {
      this.planDone = true;
      notes.push('that was the last planned level: send your feedback, then end the session');
    } else {
      await this.loadSave(step.levelId);
      notes.push(`your save now opens level ${step.levelId}`);
    }
    return notes;
  }

  /** Replaces the save with the one that opens `levelId`, as a new install would hold it, and reloads the game. */
  private async loadSave(levelId: number): Promise<void> {
    const save = JSON.stringify(saveFor(this.opts.levels, levelId, this.opts.header.device.language));
    await this.page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, save] as const);
    await this.page.reload();
    await this.waitForGame();
  }

  private async waitForGame(): Promise<void> {
    await this.page.waitForFunction(() => !!window.__mix?.scene, null, { timeout: 60_000 });
  }

  private exclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    const run = this.sampling.then(fn);
    this.sampling = run.then(() => undefined, () => undefined);
    return run;
  }

  private async read(): Promise<MixSnapshot | null> {
    try {
      // No named helpers inside: tsx wraps them in __name(), which the page does not have.
      return await this.page.evaluate(() => {
        const m = window.__mix as unknown as MixSnapshot | undefined;
        if (!m?.scene) return null;
        return {
          scene: m.scene, levelId: m.levelId, status: m.status, overlay: m.overlay, tip: m.tip, guide: m.guide, tick: m.tick,
          moves: m.moves, refusals: m.refusals, belt: m.belt, columns: m.columns, slots: m.slots, slotsUsed: m.slotsUsed,
          painted: m.painted, targets: m.targets, ice: m.ice, hidden: m.hidden, locked: m.locked, covered: m.covered,
          stoneSplashes: m.stoneSplashes, reveals: m.reveals, jamButtons: m.jamButtons, tipButton: m.tipButton,
          language: m.language, scrollY: m.scrollY,
        };
      });
    } catch {
      return null; // page navigating or closed
    }
  }

  private async poll(): Promise<void> {
    if (this.closed || this.polling || this.paused) return;
    this.polling = true;
    try {
      const snap = await this.exclusive(async () => {
        const s = await this.read();
        if (s) this.recorder.observe(s, Date.now());
        return s;
      });
      if (this.stuck.feed(snap, Date.now())) await this.logError('stuck', `nothing moved for ${this.opts.stuckMs ?? 10_000} ms after a tap`);
    } finally {
      this.polling = false;
    }
  }

  private async canvasBox() {
    const box = await this.page.locator('canvas').boundingBox();
    if (!box) throw new Error('the game canvas is not on screen');
    return box;
  }

  /** Screen point (CSS px) of a logical game point. */
  private async toScreen(p: { x: number; y: number }) {
    const box = await this.canvasBox();
    const k = box.width / LOGICAL_WIDTH;
    const scroll = (await this.read())?.scrollY ?? 0;
    return { x: box.x + p.x * k, y: box.y + (p.y - scroll) * k };
  }

  private async tapAt(x: number, y: number): Promise<void> {
    const box = await this.canvasBox();
    const k = box.width / LOGICAL_WIDTH;
    await this.exclusive(async () => {
      const before = await this.read();
      await this.page.mouse.click(x, y);
      // Long enough for the scene to publish the tap's effect, short enough to fall before the next move.
      await this.page.waitForTimeout(80);
      const after = await this.read();
      const t = Date.now();
      if (before && after) this.recorder.tap(before, after, { x: (x - box.x) / k, y: (y - box.y) / k + (before.scrollY ?? 0) }, t);
      else this.recorder.action();
      this.stuck.tapped(after, t);
    });
  }

  private async targetPoint(kind: 'columns' | 'slots', n: number): Promise<{ x: number; y: number } | null> {
    const rects = await this.page.evaluate((k) => (window.__mix?.scene === 'play' ? (window.__mix[k] as Rect[]) : null), kind).catch(() => null);
    const r = rects?.[n - 1];
    if (!r) return null;
    // Aim at the top of the column, where the next bucket sits; a slot is a single cell.
    return this.toScreen({ x: r.x + r.w / 2, y: kind === 'columns' ? r.y + 40 : r.y + r.h / 2 });
  }

  private async tapTarget(kind: 'columns' | 'slots', n: number, settleMs: number): Promise<ActionResult> {
    return this.serial(async () => {
      const p = await this.targetPoint(kind, n);
      if (!p) return { notes: [`there is no ${kind === 'columns' ? 'column' : 'slot'} ${n} on screen`] };
      await this.tapAt(p.x, p.y);
      await this.page.waitForTimeout(settleMs);
      return {};
    });
  }

  private async topButton(at: { x: number; y: number }): Promise<ActionResult> {
    return this.serial(async () => {
      if ((await this.read())?.scene !== 'play') return { notes: ['this button is only on a level screen'] };
      const p = await this.toScreen(at);
      await this.tapAt(p.x, p.y);
      await this.page.waitForTimeout(500);
      return {};
    });
  }

  /** Screenshot into the session folder; attached to the attempt on screen. Returns the absolute path. */
  private async shot(suffix = ''): Promise<string> {
    const name = `${String(++this.shotCount).padStart(4, '0')}${suffix}.png`;
    const file = join(this.sessionDir, name);
    await this.page.screenshot({ path: file, scale: 'css' });
    this.recorder.screenshot(name);
    return file;
  }

  private async logError(kind: 'uncaught' | 'stuck', message: string): Promise<void> {
    const file = await this.shot(`-${kind}`).catch(() => null);
    const rel = file ? file.slice(this.sessionDir.length + 1) : undefined;
    if (kind === 'stuck') this.recorder.stuckScreen(message, Date.now(), rel);
    else this.recorder.uncaughtError(message, Date.now(), rel);
    this.saveDraft();
  }

  /** The form so far, after every action, so a session cut short still leaves its data (as `errore-harness`). */
  private saveDraft(): void {
    if (this.closed) return;
    this.write(join(this.opts.outDir, `${this.sessionId}.draft.json`), this.scheda('errore-harness'));
  }

  private write(file: string, data: unknown): void {
    writeFileSync(`${file}.tmp`, `${JSON.stringify(data, null, 2)}\n`);
    renameSync(`${file}.tmp`, file);
  }

  /** Whether the plan is over (last planned level won or skipped). */
  get finished(): boolean {
    return this.planDone;
  }
}
