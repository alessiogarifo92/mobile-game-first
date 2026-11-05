import Phaser from 'phaser';
import { newlyCompletedStage, stageSkin } from '../../core/album';
import { primariesOf } from '../../core/colors';
import { cellDone, colorShown } from '../../core/rules';
import type { StoneEvent } from '../../core/sim';
import { MIN_TOUCH_PX, VIEW, beltPoint, cellRect, computeLayout, contains, slotAt, type Layout } from '../../core/layout';
import type { Level } from '../../core/level';
import { currentLevel } from '../../core/mapLayout';
import { blockExample, blockerAlpha, blockerSignature, refuseSlotLaunch, unlockColors, type BlockExample } from '../../core/blocked';
import type { Primary } from '../../core/colors';
import { missingDots } from '../../core/brownPixel';
import { forecastLeftover, freeSlots, leftoverHint, type LeftoverForecast } from '../../core/leftover';
import { PANEL_ARM_MS, jamHintKey } from '../../core/panelInput';
import { newlyCompletedUniverse } from '../../core/universeMenu';
import { universeLevels, universeOf } from '../../core/universes';
import { COLOR_CODES } from '../../core/colors';
import {
  beltFull, beltLoad, continueWithExtraSlot, createGame, launchFromColumn, launchFromSlot, step, type GameState, type HitEvent, type Shooter,
} from '../../core/sim';
import {
  COLUMN_SHOWN, guideAllows, guideStep, needsGuide, tipOnBlockedTap, tipOnFullBelt, tipOnLevelStart, tipOnReturn, type CardTip, type GuideStep,
} from '../../core/onboarding';
import { solve } from '../../core/solver';
import { sfx } from '../audio';
import { publishDebug } from '../debug';
import { LEVELS, UNIVERSES, canOpen, getProgress, levelHint, levelTitle, markCompleted, markTip, setSound, t, tipSeen } from '../store';
import { BLUE, BROWN, GREEN, ORANGE, PURPLE, RED, YELLOW } from '../../core/colors';
import { PAINT, SYMBOL, THEME, css } from '../theme';
import { drawSkin } from '../skins';
import { brownPixel, button, drawIce, drawStone, keyIcon, label, lockIcon, progressBar, screenBackground } from '../ui';

const TICK_MS = 85;
const BELT_JAR = 54;
const TIP_H = 620;
/** How long a refused tap shakes its column and highlights the belt indicator. */
const REFUSE_MS = 450;
/** How long the pixels that block a refused waiting bucket stay circled (#146). */
/** The blocked-lane tip waits this long after a refusal, so the circles and their colour dots are seen first (#176). */
const BLOCKERS_TIP_MS = 1800;
/** Belt-load pips: one per bucket the belt holds, drawn only while they fit beside the "waiting" label. */
const PIP = 16;
const PIP_GAP = 6;
const MAX_PIPS = 6;
/** Covered bucket reaching the front of its column: it turns over (squash, swap face, unsquash) in this time. */
const REVEAL_MS = 420;
const GUIDE_TEXT = { tap: 'guide.tap', watch: 'guide.watch', next: 'guide.next', free: 'guide.free' } as const;

export class PlayScene extends Phaser.Scene {
  private level!: Level;
  private gs!: GameState;
  private layout!: Layout;
  private acc = 0;
  private pixels!: Phaser.GameObjects.Graphics;
  private dynamic!: Phaser.GameObjects.Graphics;
  private forecasts = new Map<string, LeftoverForecast>();
  /** Labels drawn on the buckets this frame (debug hook for e2e). */
  private hintLabels: string[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private textIndex = 0;
  /** Pixels changed since the last redraw: several hits in one frame cost a single redraw. */
  private pixelsDirty = false;
  private textState = new WeakMap<Phaser.GameObjects.Text, { value: string; size: number; color: string }>();
  private overlay: Phaser.GameObjects.Container | null = null;
  private slotFrames!: Phaser.GameObjects.Graphics;
  private solution: ReturnType<typeof solve>['moves'] | undefined;
  private ended = false;
  private moves = 0;
  private subtitle!: Phaser.GameObjects.Text;
  /** Guided level 1: current step, or null when the player is on their own. */
  private guide: GuideStep | null = null;
  private guideLayer: Phaser.GameObjects.Container | null = null;
  private tip: { id: CardTip; card: Phaser.GameObjects.Container } | null = null;
  /** Ammo each shooter had when it was launched, to tell whether its loop hit anything. */
  private launchAmmo = new Map<number, number>();
  private hiddenMarks = new Map<number, Phaser.GameObjects.Text>();
  /** Covered buckets that reached the front of their column, with the time their reveal started. */
  private reveals = new Map<number, number>();
  /** Stage completed by this win (album reward), if any. */
  private completedStage: number | null = null;
  /** The universe this win completes for the first time: the win panel leads to its party. */
  private completedUniverse: number | null = null;
  /** Whether this win is the first on this level (the universe bar shows +1). */
  private firstWin = false;
  private universeDone: { done: number; total: number; plusOne: boolean } | null = null;
  private winText = '';
  private beltText!: Phaser.GameObjects.Text;
  /** Last launch refused because the belt was full: the tapped column or slot shakes for a moment. */
  private refused: { column: number; slot: number; at: number; belt: boolean } | null = null;
  private refusals = 0;
  /** Last waiting bucket refused because it could not land a shot (#146): the pixels in its way, circled for a moment. */
  /**
   * Pixels circled after a refused waiting bucket (#146), with the colours that open each one (#176). They stay until the
   * next tap or until one of them changes (`sig`); `gs` ties them to the game they were drawn for, since the scene
   * instance is reused from level to level.
   */
  private blockers: { cells: number[]; unlock: Primary[][]; at: number; sig: string; gs: GameState } | null = null;
  /** The case the blocked-lane tip illustrates: the bucket just refused (#176). */
  private blockedCase: BlockExample | null = null;
  private blockedTaps = 0;
  /** Shots stopped by a stone so far (for tests). */
  private stoneSplashes = 0;

  constructor() {
    super('play');
  }

  init(data: { levelId?: number }): void {
    // A level the core refuses (locked, or in a closed universe) opens the player's current level instead.
    const requested = data.levelId ?? 1;
    const { unlocked, completed } = getProgress();
    const id = canOpen(requested) ? requested : currentLevel(unlocked, completed, LEVELS.length);
    this.level = LEVELS[id - 1] ?? LEVELS[0]!;
    this.layout = computeLayout(this.level.width, this.level.height, this.level.slots, this.level.columns.length, this.scale.height);
    this.gs = createGame(this.level, { boardGap: Math.ceil((BELT_JAR + 4) / this.layout.cell) });
    this.acc = 0;
    this.texts = [];
    this.overlay = null;
    this.ended = false;
    this.moves = 0;
    this.solution = undefined;
    this.completedStage = null;
    this.completedUniverse = null;
    this.firstWin = false;
    this.universeDone = null;
    this.winText = '';
    this.guide = null;
    this.guideLayer = null;
    this.tip = null;
    this.launchAmmo = new Map();
    this.reveals = new Map();
    this.pixelsDirty = false;
    this.refused = null;
    this.refusals = 0;
    this.stoneSplashes = 0;
  }

  create(): void {
    const { layout } = this;
    screenBackground(this, THEME.bg);

    label(this, VIEW.width / 2, 62, t('level.title', { n: this.level.id }), THEME.type.lg);
    const hint = levelHint(this.level.id);
    // The hint takes the subtitle line; the level name is shown again on the win panel.
    this.subtitle = label(this, VIEW.width / 2, 110, hint ?? levelTitle(this.level.id), hint ? THEME.type.xs : THEME.type.sm, hint ? THEME.inkCss : THEME.subCss, !!hint);
    // Top-anchored so a two-line guide text grows down, away from the title.
    this.subtitle.setWordWrapWidth(VIEW.width - 2 * THEME.space.md).setOrigin(0.5, 0).setY(96);
    button(this, 60, 64, 84, 64, '◀', () => this.scene.start('menu'), { fill: THEME.belt, color: THEME.inkCss, name: 'home' });
    button(this, VIEW.width - 60, 64, 84, 64, '⟲', () => this.restart(), { fill: THEME.belt, color: THEME.inkCss, name: 'retry' });
    // Muted keeps the same note, faded: a ✕ read as a close button. Spaced from ⟲ so the two are not mistaken.
    const soundBtn = button(this, VIEW.width - 180, 64, 84, 64, '♪', () => {
      const on = !getProgress().sound;
      setSound(on);
      sfx.enabled = on;
      (soundBtn.list[1] as Phaser.GameObjects.Text).setAlpha(on ? 1 : 0.3);
    }, { fill: THEME.belt, color: THEME.inkCss, name: 'sound' });

    // Static board: belt ring and canvas paper.
    const board = this.add.graphics();
    board.fillStyle(THEME.belt, 1);
    board.fillRoundedRect(layout.belt.x, layout.belt.y, layout.belt.w, layout.belt.h, THEME.radius.panel);
    board.lineStyle(2, THEME.beltDark, 1);
    layout.lanes.forEach((p, i) => {
      // Belt tread marks, one per lane.
      const horizontal = i < this.level.width || (i >= this.level.width + this.level.height && i < 2 * this.level.width + this.level.height);
      if (horizontal) board.lineBetween(p.x - layout.cell / 2, p.y - 20, p.x - layout.cell / 2, p.y + 20);
      else board.lineBetween(p.x - 20, p.y - layout.cell / 2, p.x + 20, p.y - layout.cell / 2);
    });
    board.fillStyle(THEME.paper, 1);
    board.fillRoundedRect(layout.canvas.x - 8, layout.canvas.y - 8, layout.canvas.w + 16, layout.canvas.h + 16, THEME.radius.cell * 2);

    label(this, VIEW.width / 2, layout.slots[0]!.y - 20, t('level.waiting'), THEME.type.xs, THEME.subCss);
    // Belt load on the same row, at the left, under the belt entry: the number, plus pips drawn with the buckets.
    this.beltText = label(this, THEME.space.md, layout.slots[0]!.y - 20, '', THEME.type.xs, THEME.subCss).setOrigin(0, 0.5);
    const columnFrames = this.add.graphics();
    columnFrames.fillStyle(THEME.belt, 0.35);
    for (const c of layout.columns) columnFrames.fillRoundedRect(c.x, c.y - 6, c.w, 3 * layout.columnStep + 20, THEME.radius.jar);
    this.slotFrames = this.add.graphics();
    this.drawSlotFrames();

    this.pixels = this.add.graphics();
    this.dynamic = this.add.graphics();
    this.createHiddenMarks();
    this.drawPixels();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tap(p.worldX, p.worldY));
    const seen = getProgress().seenTips;
    if (needsGuide(this.level, seen)) this.updateGuide();
    else {
      const tip = tipOnLevelStart(this.level, seen);
      if (tip) this.time.delayedCall(350, () => this.showTip(tip));
    }
    this.publish();
  }

  /** A resize may rebuild the level only before the first move and with no panel open. */
  canRelayout(): boolean {
    return this.moves === 0 && !this.overlay;
  }

  relayoutData(): { levelId: number } {
    return { levelId: this.level.id };
  }

  private restart(): void {
    this.scene.restart({ levelId: this.level.id });
  }

  private tap(x: number, y: number): void {
    sfx.unlock();
    if (this.overlay || this.tip || this.gs.status !== 'playing') return;
    // Any tap moves on from the last refusal: its circles have had their say (#176).
    if (this.blockers) {
      this.blockers = null;
      this.publish();
    }
    const pt = { x, y };
    const column = this.layout.columns.findIndex((r) => contains(r, pt));
    // Logical units per real pixel: a tap target is never smaller than 44 px, however small the screen.
    const slot = column < 0 ? slotAt(this.layout.slots, pt, MIN_TOUCH_PX * this.scale.displayScale.x) : -1;
    if (this.guide && !guideAllows(this.guide, column >= 0 ? column : null, this.guideTarget() ?? -1)) return;
    const wanted: Shooter | null | undefined = column >= 0 ? this.gs.queues[column]?.[0] : slot >= 0 ? this.gs.slots[slot] : null;
    if (!wanted) return;
    if (beltFull(this.gs)) {
      this.refuse(column, slot);
      return;
    }
    const stuck = slot >= 0 ? refuseSlotLaunch(this.gs, slot) : null;
    if (stuck) {
      this.refuseBlocked(slot, stuck.blockers);
      return;
    }
    if (column >= 0 ? !launchFromColumn(this.gs, column) : !launchFromSlot(this.gs, slot)) return;
    this.launchAmmo.set(wanted.id, wanted.ammo);
    this.moves += 1;
    sfx.launch();
    if (this.guide) this.updateGuide();
    this.publish();
  }

  /** A tap the full belt cannot take: shake what was tapped, light up the belt indicator, explain once. */
  private refuse(column: number, slot: number): void {
    this.refused = { column, slot, at: this.time.now, belt: true };
    this.refusals += 1;
    sfx.refuse();
    const tip = tipOnFullBelt(getProgress().seenTips);
    // A short delay lets the shake and the indicator be seen before the card covers them.
    if (tip && !this.guide) this.time.delayedCall(REFUSE_MS, () => this.showTip(tip));
    this.publish();
  }

  /**
   * A waiting bucket that would ride a whole lap without landing a shot (#146): it stays put and shakes, the pixels in
   * its way are circled, and the blocked-lane tip explains the rule the first time.
   */
  private refuseBlocked(slot: number, cells: number[]): void {
    const { gs } = this;
    this.refused = { column: -1, slot, at: this.time.now, belt: false };
    const unlock = cells.map((c) => unlockColors(this.level, gs, c));
    this.blockers = { cells, unlock, at: this.time.now, sig: blockerSignature(gs, cells), gs };
    const color = gs.slots[slot]?.color;
    this.blockedCase = color ? blockExample(this.level, gs, gs.lanes, color, cells) : null;
    this.blockedTaps += 1;
    sfx.refuse();
    const tip = tipOnBlockedTap(getProgress().seenTips);
    // The card waits for the circles and their colour dots to be seen first.
    if (tip && !this.guide) this.time.delayedCall(BLOCKERS_TIP_MS, () => this.showTip(tip));
    this.publish();
  }

  // ---------- onboarding ----------

  /** Column the guide points at: the solver's first two moves, when they are column launches. */
  private guideTarget(step: GuideStep | null = this.guide): number | null {
    const move = this.solutionMoves()[step === 'next' ? 1 : 0];
    return move && move.from === 'column' ? move.index : null;
  }

  private updateGuide(): void {
    let next: GuideStep = guideStep(this.moves, this.gs.belt.length + this.gs.pending.length > 0);
    // If the solution's second move is a slot relaunch there is no column to point at.
    if (next === 'next' && this.guideTarget('next') === null) next = 'free';
    if (next === this.guide) return;
    this.guide = next;
    this.guideLayer?.destroy();
    this.guideLayer = null;
    const text = GUIDE_TEXT;
    // The text always sits on the subtitle line under the title: free space, away from the slots and the highlighted column.
    this.subtitle.setText(t(text[next])).setColor(THEME.inkCss).setFontStyle('bold').setFontSize(THEME.type.xs);
    if (next === 'free') {
      this.guide = null;
      markTip('guide');
      this.publish();
      return;
    }
    if (next === 'watch') {
      this.publish();
      return;
    }
    const target = this.layout.columns[this.guideTarget()!]!;
    const g = this.add.graphics();
    g.fillStyle(THEME.ink, 0.35);
    const top = 0;
    const bottom = this.scale.height;
    const pad = 10;
    // Dim everything except the target column.
    g.fillRect(0, top, VIEW.width, target.y - pad - top);
    g.fillRect(0, target.y - pad, target.x - pad, bottom - target.y + pad);
    g.fillRect(target.x + target.w + pad, target.y - pad, VIEW.width - target.x - target.w - pad, bottom - target.y + pad);
    const boxH = 3 * this.layout.columnStep + 30;
    g.fillRect(target.x - pad, target.y - pad + boxH, target.w + 2 * pad, bottom - target.y + pad - boxH);
    g.lineStyle(6, THEME.white, 1);
    g.strokeRoundedRect(target.x - pad, target.y - pad, target.w + 2 * pad, boxH, THEME.radius.jar);
    // The hand sits below the highlighted column: above it are the waiting slots, and over it it would hide the second bucket.
    const below = target.y - pad + boxH;
    // Never lower than the screen allows: the hand is 72 high and bobs 24 down.
    const hand = label(this, target.x + target.w / 2, Math.min(below + 60, this.scale.height - 90), '👆', 72);
    this.tweens.add({ targets: hand, y: hand.y + 24, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.guideLayer = this.add.container(0, 0, [g, hand]).setDepth(8);
    this.publish();
  }

  private showTip(id: CardTip): void {
    if (this.tip || tipSeen(id) || this.gs.status !== 'playing') return;
    const w = 600;
    const h = TIP_H;
    const x0 = (VIEW.width - w) / 2;
    const y0 = (this.scale.height - h) / 2;
    const shade = screenBackground(this, THEME.ink, 0.45).setInteractive();
    const g = this.add.graphics();
    g.fillStyle(THEME.bg, 1);
    g.fillRoundedRect(x0, y0, w, h, THEME.radius.panel);
    const card = this.add.container(0, 0, [shade, g]).setDepth(12);
    card.add(label(this, VIEW.width / 2, y0 + 60, t(`tip.${id}.title` as const), THEME.type.lg));
    const sq = (gx: number, gy: number, fill: number, alpha = 1) => {
      g.fillStyle(fill, alpha);
      g.fillRoundedRect(gx - 24, gy - 24, 48, 48, THEME.radius.cell);
    };
    const cracks = (gx: number, gy: number) => drawIce(g, gx - 24, gy - 24, 48, 48);
    const cx = VIEW.width / 2;
    if (id === 'mixing') {
      // Visual equations: the whole tip in one glance.
      const rows: [number, number, number][] = [[RED, YELLOW, ORANGE], [YELLOW, BLUE, GREEN], [RED, BLUE, PURPLE]];
      rows.forEach(([a, b, c], i) => {
        const y = y0 + 140 + i * 62;
        [a, b, c].forEach((col, k) => sq(cx - 126 + k * 120, y, PAINT[col]!));
        card.add(label(this, cx - 66, y, '+', THEME.type.md));
        card.add(label(this, cx + 54, y, '=', THEME.type.md));
      });
    } else if (id === 'ice') {
      // Frozen → ice broken → painted.
      const y = y0 + 200;
      sq(cx - 160, y, THEME.emptyPixel);
      sq(cx - 160, y, PAINT[RED]!, 0.3);
      cracks(cx - 160, y);
      sq(cx, y, THEME.emptyPixel);
      sq(cx, y, PAINT[RED]!, 0.3);
      sq(cx + 160, y, PAINT[RED]!);
      card.add(label(this, cx - 80, y, '●→', THEME.type.sm, css(PAINT[RED]!)));
      card.add(label(this, cx + 80, y, '●→', THEME.type.sm, css(PAINT[RED]!)));
    } else if (id === 'brown') {
      // Red + yellow + blue = brown, then a brown pixel with two of its three wedges painted: blue is missing.
      const y = y0 + 150;
      [RED, YELLOW, BLUE, BROWN].forEach((col, k) => sq(cx - 210 + k * 120 + (k === 3 ? 20 : 0), y, PAINT[col]!));
      card.add(label(this, cx - 150, y, '+', THEME.type.md));
      card.add(label(this, cx - 30, y, '+', THEME.type.md));
      card.add(label(this, cx + 100, y, '=', THEME.type.md));
      const y2 = y0 + 225;
      sq(cx - 80, y2, THEME.emptyPixel);
      sq(cx - 80, y2, PAINT[BROWN]!, 0.3);
      brownPixel(g, cx - 104, y2 - 24, 48, 48, RED | YELLOW);
      card.add(label(this, cx, y2, `${SYMBOL[BLUE]}→`, THEME.type.sm, css(PAINT[BLUE]!)));
      sq(cx + 80, y2, PAINT[BROWN]!);
    } else if (id === 'belt') {
      // As many buckets as the belt holds, then one more that cannot board.
      const n = Math.min(this.level.beltCapacity, 5);
      const y = y0 + 200;
      const colors = [RED, YELLOW, BLUE];
      const left = cx - (n * 80) / 2;
      for (let k = 0; k < n; k++) sq(left + k * 80, y, PAINT[colors[k % 3]!]!);
      sq(left + n * 80, y, PAINT[colors[n % 3]!]!, 0.3);
      card.add(label(this, left + n * 80, y, '✕', THEME.type.md, THEME.inkCss));
    } else if (id === 'stone') {
      // Belt → stone: the drop stops; the pixel behind is painted from the other side.
      const y = y0 + 200;
      card.add(label(this, cx - 220, y, '●→', THEME.type.sm, css(PAINT[RED]!)));
      drawStone(g, cx - 164, y - 24, 48, 48);
      sq(cx - 80, y, THEME.emptyPixel);
      sq(cx - 80, y, PAINT[RED]!, 0.3);
      card.add(label(this, cx, y, '←●', THEME.type.sm, css(PAINT[RED]!)));
      card.add(label(this, cx + 80, y, '=', THEME.type.md));
      sq(cx + 160, y, PAINT[RED]!);
    } else if (id === 'lock') {
      // Key done → padlock opens → the pixel can be painted.
      const y = y0 + 200;
      sq(cx - 200, y, PAINT[YELLOW]!);
      keyIcon(g, cx - 200, y, 38);
      card.add(label(this, cx - 120, y, '→', THEME.type.lg));
      sq(cx - 40, y, PAINT[RED]!, 0.3);
      lockIcon(g, cx - 40, y, 36);
      card.add(label(this, cx + 40, y, '→', THEME.type.lg));
      sq(cx + 120, y, THEME.emptyPixel);
      sq(cx + 120, y, PAINT[RED]!, 0.3);
      card.add(label(this, cx + 200, y, '●→', THEME.type.sm, css(PAINT[RED]!)));
    } else if (id === 'covered') {
      // A "?" bucket behind the front → at the front it shows its colour.
      const y = y0 + 200;
      const bucket = (bx: number, fill: number, mark: string) => {
        g.fillStyle(fill, 1);
        g.fillRoundedRect(bx - 32, y - 32, 64, 64, THEME.radius.jar);
        g.lineStyle(3, THEME.ink, 1);
        g.strokeRoundedRect(bx - 32, y - 32, 64, 64, THEME.radius.jar);
        card.add(label(this, bx, y, mark, THEME.type.md, '#ffffff'));
      };
      bucket(cx - 110, THEME.hidden, '?');
      card.add(label(this, cx, y, '→', THEME.type.lg));
      bucket(cx + 110, PAINT[BLUE]!, SYMBOL[BLUE]!);
    } else if (id === 'hidden') {
      // "?" next to a pixel: finish the neighbour, the colour shows.
      const y = y0 + 200;
      sq(cx - 200, y, PAINT[RED]!, 0.3);
      sq(cx - 140, y, THEME.hidden);
      card.add(label(this, cx - 140, y, '?', THEME.type.md, '#ffffff'));
      card.add(label(this, cx - 30, y, '→', THEME.type.lg));
      sq(cx + 80, y, PAINT[RED]!);
      sq(cx + 140, y, THEME.emptyPixel);
      sq(cx + 140, y, PAINT[BLUE]!, 0.3);
    } else if (id === 'blocked') {
      // The bucket just refused (#176): its shot → the first cell in its way (circled, with what opens it) → the pixel
      // it wanted behind. Without a case (never expected), a blue shot stopped by an orange pixel.
      const ex: BlockExample = this.blockedCase ?? { color: BLUE, front: { kind: 'pixel', target: ORANGE, paint: 0, ice: false, unlock: [RED, YELLOW] }, behind: BLUE };
      const y = y0 + 200;
      const fx = cx - 110;
      card.add(label(this, cx - 200, y, `${SYMBOL[ex.color]}→`, THEME.type.sm, css(PAINT[ex.color]!)));
      const f = ex.front;
      if (f.kind === 'stone') drawStone(g, fx - 24, y - 24, 48, 48);
      else if (f.kind === 'hidden') {
        sq(fx, y, THEME.hidden);
        card.add(label(this, fx, y, '?', THEME.type.md, '#ffffff'));
      } else {
        sq(fx, y, THEME.emptyPixel);
        sq(fx, y, PAINT[f.target]!, 0.3);
        if (f.kind === 'locked') lockIcon(g, fx, y, 36);
        else {
          if (f.target === BROWN) brownPixel(g, fx - 24, y - 24, 48, 48, f.paint);
          else if (f.paint) {
            g.fillStyle(PAINT[f.paint]!, 1);
            g.fillTriangle(fx - 24, y - 24, fx + 24, y - 24, fx - 24, y + 24);
          }
          if (f.ice) drawIce(g, fx - 24, y - 24, 48, 48);
        }
      }
      g.lineStyle(5, THEME.ink, 1);
      g.strokeCircle(fx, y, 38);
      if (f.kind === 'pixel') this.unlockDots(g, f.unlock, fx, y - 38, 13, (dx, dy, s) => card.add(label(this, dx, dy, s, 14, THEME.inkCss)));
      card.add(label(this, cx - 20, y, '✕', THEME.type.md, THEME.inkCss));
      sq(cx + 70, y, THEME.emptyPixel);
      sq(cx + 70, y, PAINT[ex.behind]!, 0.3);
    } else if (id === 'queue') {
      // A column shows three buckets and "+2": two more wait behind them, out of sight.
      const jarAt = (bx: number, by: number, fill: number, alpha: number) => {
        g.fillStyle(fill, alpha);
        g.fillRoundedRect(bx - 22, by - 18, 44, 36, THEME.radius.jar / 2);
        g.lineStyle(2, THEME.ink, alpha);
        g.strokeRoundedRect(bx - 22, by - 18, 44, 36, THEME.radius.jar / 2);
      };
      const colX = cx - 110;
      g.fillStyle(THEME.ink, 0.06);
      g.fillRoundedRect(colX - 34, y0 + 104, 68, 140, THEME.radius.jar);
      [RED, YELLOW, BLUE].forEach((col, k) => jarAt(colX, y0 + 128 + k * 44, PAINT[col]!, k === 0 ? 1 : 0.55));
      card.add(label(this, colX, y0 + 262, '+2', THEME.type.sm, THEME.subCss));
      card.add(label(this, cx, y0 + 190, '=', THEME.type.lg));
      jarAt(cx + 90, y0 + 190, THEME.hidden, 0.35);
      jarAt(cx + 150, y0 + 190, THEME.hidden, 0.35);
      card.add(label(this, cx + 120, y0 + 236, '2', THEME.type.sm, THEME.subCss));
    } else if (id === 'leftover') {
      // A bucket of 4 finds only 3 pixels of its colour in reach: 1 shot of paint comes back ("↩1").
      const y = y0 + 190;
      const bucket = (bx: number, n: string) => {
        g.fillStyle(PAINT[RED]!, 1);
        g.fillRoundedRect(bx - 30, y - 30, 60, 60, THEME.radius.jar);
        g.lineStyle(3, THEME.ink, 1);
        g.strokeRoundedRect(bx - 30, y - 30, 60, 60, THEME.radius.jar);
        card.add(label(this, bx, y, n, THEME.type.md, '#ffffff'));
      };
      // Then the same pill as a warning (#176): "!" when that paint would take the last free slot.
      const pill = (px: number, text: string, risky: boolean) => {
        const pw = risky ? 76 : 64;
        g.fillStyle(risky ? THEME.ink : THEME.gold, 1);
        g.fillRoundedRect(px - pw / 2, y - 66, pw, 32, 16);
        g.lineStyle(3, risky ? THEME.white : THEME.ink, 1);
        g.strokeRoundedRect(px - pw / 2, y - 66, pw, 32, 16);
        card.add(label(this, px, y - 50, text, THEME.type.xs, risky ? '#FFFFFF' : THEME.inkCss));
      };
      bucket(cx - 240, '4');
      card.add(label(this, cx - 180, y, '→', THEME.type.md));
      [0, 1, 2].forEach((k) => sq(cx - 122 + k * 54, y, PAINT[RED]!));
      card.add(label(this, cx - 6, y, '→', THEME.type.md));
      bucket(cx + 64, '1');
      pill(cx + 64, '↩1', false);
      bucket(cx + 200, '1');
      pill(cx + 200, '↩1!', true);
    }
    const bodyY = id === 'mixing' ? y0 + 340 : id === 'leftover' ? y0 + 250 : y0 + 290;
    card.add(label(this, VIEW.width / 2, bodyY, t(`tip.${id}.body` as const, { n: this.level.beltCapacity }), THEME.type.sm, THEME.subCss, false)
      .setWordWrapWidth(w - 60).setOrigin(0.5, 0));
    card.add(button(this, VIEW.width / 2, y0 + h - 70, 300, 80, t('tip.gotIt'), () => {
      markTip(id);
      card.destroy();
      this.tip = null;
      this.publish();
    }, { name: 'tip-ok' }));
    this.tip = { id, card };
    this.publish();
  }

  update(_time: number, delta: number): void {
    if (this.gs.status === 'playing' && !this.tip) {
      this.acc += Math.min(delta, 250);
      while (this.acc >= TICK_MS && this.gs.status === 'playing') {
        this.acc -= TICK_MS;
        step(this.gs);
        for (const e of this.gs.events) this.splash(e);
        for (const e of this.gs.stoneHits) this.stoneSplash(e);
        for (const d of this.gs.departures) {
          if (d.slot === null) continue;
          const back = this.gs.slots[d.slot];
          const tip = tipOnReturn(back?.ammo !== this.launchAmmo.get(d.shooterId), getProgress().seenTips);
          if (tip && !this.guide) this.showTip(tip);
        }
        if (this.guide) this.updateGuide();
        this.publish();
      }
    }
    if (!this.ended && this.gs.status !== 'playing') this.finish();
    if (this.pixelsDirty) {
      this.pixelsDirty = false;
      this.drawPixels();
    }
    this.drawDynamic(this.gs.status === 'playing' ? this.acc / TICK_MS : 0);
  }

  // ---------- rendering ----------

  private drawPixels(): void {
    const g = this.pixels;
    g.clear();
    const { targets } = this.level;
    const inset = this.layout.cell > 30 ? 2 : 1;
    targets.forEach((target, i) => {
      if (this.level.stone[i]) {
        const r = cellRect(this.layout, this.level.width, i);
        drawStone(g, r.x + inset, r.y + inset, r.w - 2 * inset, r.h - 2 * inset);
        return;
      }
      if (!target) return;
      const r = cellRect(this.layout, this.level.width, i);
      const x = r.x + inset, y = r.y + inset, w = r.w - 2 * inset, h = r.h - 2 * inset;
      const paint = this.gs.paint[i]!;
      if (this.gs.hidden[i]) {
        // Hidden: no hint of the colour, just a "?" (text drawn once in createHiddenMarks).
        g.fillStyle(THEME.hidden, 1);
        g.fillRoundedRect(x, y, w, h, THEME.radius.cell);
        return;
      }
      this.hiddenMarks.get(i)?.destroy();
      this.hiddenMarks.delete(i);
      if (cellDone(this.level, this.gs, i)) {
        g.fillStyle(PAINT[target]!, 1);
        g.fillRoundedRect(x, y, w, h, THEME.radius.cell);
        return;
      }
      g.fillStyle(THEME.emptyPixel, 1);
      g.fillRoundedRect(x, y, w, h, THEME.radius.cell);
      // Ghost of the target colour: tells the player what this pixel still needs.
      g.fillStyle(PAINT[target]!, 0.3);
      g.fillRoundedRect(x + w * 0.18, y + h * 0.18, w * 0.64, h * 0.64, THEME.radius.cell);
      if (target === BROWN) brownPixel(g, x, y, w, h, paint);
      else if (paint) {
        // Half-mixed secondary: the received primary fills the upper-left triangle.
        g.fillStyle(PAINT[paint]!, 1);
        g.fillTriangle(x, y, x + w, y, x, y + h);
      }
      // What it still needs (#149): a dot of each missing primary, so a half-mixed pixel never reads as finished.
      for (const d of missingDots(target, paint, x, y, w, h)) {
        g.fillStyle(PAINT[d.color]!, 1);
        g.fillCircle(d.x, d.y, d.r);
        g.lineStyle(d.r > 6 ? 2 : 1.5, THEME.ink, 1);
        g.strokeCircle(d.x, d.y, d.r);
      }
      if (this.gs.locked[i]) {
        // Locked: the colour still shows (so the player can plan), under a veil and an ink padlock.
        g.fillStyle(THEME.paper, 0.55);
        g.fillRoundedRect(x, y, w, h, THEME.radius.cell);
        lockIcon(g, x + w / 2, y + h / 2, h * 0.72);
      } else if (this.level.keys[i]) {
        // Key: what opens the padlocks, until it is done.
        keyIcon(g, x + w / 2, y + h / 2, w * 0.78);
      }
      // Ice: frosted cover with a dark rim and cracks (#176).
      if (this.gs.ice[i]! > 0) drawIce(g, x, y, w, h);
    });
  }

  private createHiddenMarks(): void {
    this.hiddenMarks = new Map();
    this.gs.hidden.forEach((hidden, i) => {
      if (!hidden) return;
      const r = cellRect(this.layout, this.level.width, i);
      this.hiddenMarks.set(i, label(this, r.x + r.w / 2, r.y + r.h / 2, '?', Math.max(r.w * 0.55, 22), '#ffffff').setDepth(3));
    });
  }


  private drawSlotFrames(): void {
    this.slotFrames.clear();
    this.slotFrames.lineStyle(3, THEME.ink, 0.25);
    for (const s of this.layout.slots) this.slotFrames.strokeRoundedRect(s.x, s.y, s.w, s.h, THEME.radius.jar);
  }

  /** Pooled text. Phaser re-rasterises and re-uploads a text on every setText/setFontSize/setColor, so only changes are applied. */
  private text(x: number, y: number, value: string, size: number, color = '#ffffff'): void {
    let t = this.texts[this.textIndex];
    if (!t) {
      t = this.add.text(0, 0, '', { fontFamily: THEME.font, fontStyle: 'bold', color }).setOrigin(0.5).setDepth(5);
      this.texts.push(t);
    }
    this.textIndex += 1;
    const shown = this.textState.get(t);
    t.setVisible(true).setPosition(x, y);
    if (shown?.value !== value) t.setText(value);
    if (shown?.size !== size) t.setFontSize(size);
    if (shown?.color !== color) t.setColor(color);
    this.textState.set(t, { value, size, color });
  }

  /** `covered`: draw the bucket's cover ("?", no colour) instead of its paint; `squash` narrows it while it turns over. */
  private jar(x: number, y: number, size: number, shooter: Shooter, alpha = 1, covered = false, squash = 1): void {
    const g = this.dynamic;
    const c = covered ? THEME.hidden : PAINT[shooter.color]!;
    const w = Math.max(size * squash, 2);
    const r = Math.min(THEME.radius.jar, w / 2);
    g.fillStyle(THEME.ink, 0.15 * alpha);
    g.fillRoundedRect(x - w / 2 + 3, y - size / 2 + 5, w, size, r);
    g.fillStyle(c, alpha);
    g.fillRoundedRect(x - w / 2, y - size / 2, w, size, r);
    if (w > 16) {
      g.fillStyle(THEME.ink, 0.25 * alpha);
      g.fillRoundedRect(x - w / 2 + 6, y - size / 2 - 6, w - 12, 12, 5); // lid
    }
    if (!covered && squash === 1) drawSkin(g, getProgress().skin, x, y, size, alpha);
    g.lineStyle(3, THEME.ink, alpha);
    g.strokeRoundedRect(x - w / 2, y - size / 2, w, size, r);
    if (alpha > 0.5 && squash > 0.6) {
      // Floors keep the numbers legible (≥ 12 px on a 360 px phone) on the small belt jars.
      const small = size < 70;
      // A covered bucket shows "?" where its colour symbol goes: the cover is told by its mark, not by its colour.
      this.text(x, y - size * (small ? 0.27 : 0.18), covered ? '?' : SYMBOL[shooter.color]!, Math.max(size * (covered ? 0.32 : 0.26), 18));
      this.text(x, y + size * (small ? 0.2 : 0.16), String(shooter.ammo), Math.max(size * 0.36, 24));
    }
  }

  /** Cover state of a column bucket: hidden behind the front, then turning over once it reaches the front. */
  private columnFace(s: Shooter, k: number): { covered: boolean; squash: number } {
    if (!s.covered) return { covered: false, squash: 1 };
    if (!colorShown(s, k)) return { covered: true, squash: 1 };
    let start = this.reveals.get(s.id);
    if (start === undefined) {
      start = this.time.now;
      this.reveals.set(s.id, start);
      sfx.reveal();
    }
    const p = Math.min((this.time.now - start) / REVEAL_MS, 1);
    return { covered: p < 0.5, squash: Math.abs(Math.cos(p * Math.PI)) };
  }

  private drawDynamic(alpha: number): void {
    const { layout, gs } = this;
    this.dynamic.clear();
    this.textIndex = 0;

    gs.pending.forEach((s, i) => this.jar(layout.entry.x - i * 10, layout.entry.y + i * 6, BELT_JAR, s, 0.85));
    for (const s of gs.belt) {
      const p = beltPoint(layout, s.pos - 1 + alpha);
      this.jar(p.x, p.y, BELT_JAR, s);
    }
    const since = this.refused ? this.time.now - this.refused.at : Infinity;
    const flashing = since < REFUSE_MS;
    // Decaying side-to-side shake of whatever was tapped.
    const shake = flashing ? Math.sin(since / 25) * 8 * (1 - since / REFUSE_MS) : 0;
    this.drawBeltLoad(flashing && !!this.refused?.belt);
    this.drawBlockers();
    gs.slots.forEach((s, i) => {
      const r = layout.slots[i];
      const dx = this.refused?.slot === i ? shake : 0;
      if (s && r) this.jar(r.x + r.w / 2 + dx, r.y + r.h / 2, r.w - 8, s);
    });
    gs.queues.forEach((queue, c) => {
      const r = layout.columns[c]!;
      const dx = this.refused?.column === c ? shake : 0;
      queue.slice(0, COLUMN_SHOWN).forEach((s, k) => {
        const face = this.columnFace(s, k);
        this.jar(r.x + r.w / 2 + dx, r.y + layout.jar / 2 + 6 + k * layout.columnStep, k === 0 ? layout.jar : layout.jar - 14, s, k === 0 ? 1 : 0.55, face.covered, face.squash);
      });
      if (queue.length > COLUMN_SHOWN) {
        this.text(r.x + r.w / 2, r.y + COLUMN_SHOWN * layout.columnStep + 36, `+${queue.length - COLUMN_SHOWN}`, THEME.type.sm, THEME.subCss);
      }
    });

    this.drawLeftoverHints();

    for (let i = this.textIndex; i < this.texts.length; i++) this.texts[i]!.setVisible(false);
  }

  /**
   * Leftover preview (#145): a pill "↩N" on every bucket that could be launched (top of a column, or waiting in a slot)
   * and would come back with N shots. Red, with a "!", when that return takes the last free slot or has none left.
   * The forecast ignores the buckets already on the belt, so it is exact on a quiet belt and an estimate otherwise.
   */
  private drawLeftoverHints(): void {
    const { layout, gs } = this;
    this.hintLabels = [];
    if (gs.status !== 'playing') return;
    const g = this.dynamic;
    const buckets: { s: Shooter; x: number; y: number; size: number; slot: boolean }[] = [];
    gs.queues.forEach((q, c) => {
      const r = layout.columns[c]!;
      if (q[0]) buckets.push({ s: q[0], x: r.x + r.w / 2, y: r.y + layout.jar / 2 + 6, size: layout.jar, slot: false });
    });
    gs.slots.forEach((s, i) => {
      const r = layout.slots[i];
      if (s && r) buckets.push({ s, x: r.x + r.w / 2, y: r.y + r.h / 2, size: r.w - 8, slot: true });
    });
    const free = freeSlots(gs);
    for (const b of buckets) {
      const key = `${gs.tick}:${free}:${b.s.id}`;
      let f = this.forecasts.get(key);
      if (!f) {
        if (this.forecasts.size > 64) this.forecasts.clear();
        f = forecastLeftover(gs, b.s.color, b.s.ammo);
        this.forecasts.set(key, f);
      }
      const hint = leftoverHint(f);
      if (!hint) continue;
      const risky = hint.risky;
      this.hintLabels.push(hint.label);
      // Columns: pill on the top-right corner. Slots: centred under the bucket, so "WAITING" above stays readable.
      const h = b.slot ? 30 : 36;
      const cx = b.slot ? b.x : b.x + b.size / 2 - 6;
      const cy = b.slot ? b.y + b.size / 2 + h / 2 - 2 : b.y - b.size / 2 - 4;
      const w = risky ? 76 : 64;
      // Risky: ink pill with a white rim, so it stands out even on top of a red bucket.
      g.fillStyle(risky ? THEME.ink : THEME.gold, 1);
      g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
      g.lineStyle(3, risky ? 0xffffff : THEME.ink, 1);
      g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
      this.text(cx, cy, hint.label, THEME.type.xs, risky ? '#FFFFFF' : THEME.inkCss);
    }
  }

  /** The blocker circles, when they belong to this game and none of their pixels has changed since; else none. */
  private liveBlockers(): NonNullable<PlayScene['blockers']> | null {
    const b = this.blockers;
    if (!b) return null;
    if (b.gs !== this.gs || blockerSignature(this.gs, b.cells) !== b.sig) {
      this.blockers = null;
      return null;
    }
    return b;
  }

  /**
   * Ink ring, white inside, around each pixel that blocks the waiting bucket just refused (#146): three pulses over
   * 3 s, then steady and fainter until the next tap or a change to those pixels (#176). A dot of each colour that would
   * open the pixel sits on the ring's corner, with its shape for colour-blind players.
   */
  private drawBlockers(): void {
    const had = this.blockers !== null;
    const b = this.liveBlockers();
    if (!b) {
      if (had) this.publish();
      return;
    }
    const g = this.dynamic;
    const alpha = blockerAlpha(this.time.now - b.at);
    // Two dots side by side stay within the pixel's width, so neighbouring circles never overlap theirs.
    const r0 = Math.max(8, Math.floor((this.layout.cell - 4) / 4));
    b.cells.forEach((cell, k) => {
      const r = cellRect(this.layout, this.level.width, cell);
      g.lineStyle(5, THEME.ink, alpha);
      g.strokeRoundedRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, THEME.radius.cell + 2);
      g.lineStyle(2, THEME.white, alpha);
      g.strokeRoundedRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, THEME.radius.cell);
      this.unlockDots(g, b.unlock[k]!, r.x + r.w / 2, r.y - 3, r0, (x, y, s) => this.text(x, y, s, Math.max(12, Math.round(r0 * 1.1)), THEME.inkCss));
    });
  }

  /**
   * Dots of the colours that open a blocking pixel (#176), side by side and centred on (x, y), the top edge of its
   * ring: full colour, ink rim, and the primary's shape drawn by `mark`.
   */
  private unlockDots(g: Phaser.GameObjects.Graphics, colors: readonly Primary[], x: number, y: number, r: number, mark: (x: number, y: number, s: string) => void): void {
    const step = 2 * r + 2;
    colors.forEach((c, k) => {
      const dx = x + (k - (colors.length - 1) / 2) * step;
      g.fillStyle(PAINT[c]!, 1);
      g.fillCircle(dx, y, r);
      g.lineStyle(2, THEME.ink, 1);
      g.strokeCircle(dx, y, r);
      mark(dx, y, SYMBOL[c]!);
    });
  }

  /** "BELT 1/2" and one pip per place, filled when taken; darker when full or just refused a tap. */
  private drawBeltLoad(flashing: boolean): void {
    const { used, capacity } = beltLoad(this.gs);
    const full = used >= capacity;
    const value = t('play.belt', { used, capacity });
    const color = full || flashing ? THEME.inkCss : THEME.subCss;
    if (this.beltText.text !== value) this.beltText.setText(value);
    if (this.beltText.style.color !== color) this.beltText.setColor(color);
    if (capacity > MAX_PIPS) return;
    const g = this.dynamic;
    const x0 = this.beltText.x + this.beltText.width + THEME.space.sm;
    const y = this.beltText.y - PIP / 2;
    const grow = flashing ? 3 : 0;
    for (let i = 0; i < capacity; i++) {
      const x = x0 + i * (PIP + PIP_GAP) - grow / 2;
      if (i < used) {
        g.fillStyle(THEME.ink, full ? 1 : 0.6);
        g.fillRoundedRect(x, y - grow / 2, PIP + grow, PIP + grow, 4);
      } else {
        g.lineStyle(2, THEME.ink, 0.4);
        g.strokeRoundedRect(x, y - grow / 2, PIP + grow, PIP + grow, 4);
      }
    }
  }

  private splash(e: HitEvent): void {
    const from = beltPoint(this.layout, e.lane);
    const r = cellRect(this.layout, this.level.width, e.cell);
    const to = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    const color = PAINT[e.color]!;
    const drop = this.add.circle(from.x, from.y, 9, color).setDepth(4);
    this.tweens.add({
      targets: drop,
      x: to.x,
      y: to.y,
      duration: 110,
      onComplete: () => {
        drop.destroy();
        this.pixelsDirty = true;
        sfx.splat(e.color, e.completed);
        // Signature: an irregular paint blot with droplets.
        const blotColor = e.completed ? PAINT[e.paint]! : color;
        for (let k = 0; k < 5; k++) {
          const a = Math.random() * Math.PI * 2;
          const d = r.w * (0.3 + Math.random() * 0.5);
          const spot = this.add.circle(to.x, to.y, 3 + Math.random() * 5, blotColor).setDepth(4);
          this.tweens.add({
            targets: spot,
            x: to.x + Math.cos(a) * d,
            y: to.y + Math.sin(a) * d,
            alpha: 0,
            scale: 0.4,
            duration: 260 + Math.random() * 120,
            onComplete: () => spot.destroy(),
          });
        }
        if (e.brokeIce) {
          for (let k = 0; k < 6; k++) {
            const shard = this.add.rectangle(to.x, to.y, 6, 10, THEME.ice).setDepth(4).setAngle(Math.random() * 180);
            this.tweens.add({
              targets: shard,
              x: to.x + (Math.random() - 0.5) * r.w * 1.6,
              y: to.y + (Math.random() - 0.5) * r.h * 1.6,
              alpha: 0,
              duration: 320,
              onComplete: () => shard.destroy(),
            });
          }
        }
        for (const cell of e.unlocked) {
          // The padlock lifts off and fades: the lane is open.
          const rr = cellRect(this.layout, this.level.width, cell);
          const lock = this.add.graphics().setPosition(rr.x + rr.w / 2, rr.y + rr.h / 2).setDepth(4);
          lockIcon(lock, 0, 0, rr.h * 0.72);
          this.tweens.add({ targets: lock, y: lock.y - rr.h * 0.8, angle: 18, alpha: 0, scale: 1.3, duration: 420, ease: 'Back.easeIn', onComplete: () => lock.destroy() });
        }
        for (const cell of e.revealed) {
          const rr = cellRect(this.layout, this.level.width, cell);
          const pop = this.add.circle(rr.x + rr.w / 2, rr.y + rr.h / 2, rr.w / 2, THEME.white, 0.8).setDepth(4);
          this.tweens.add({ targets: pop, scale: 1.6, alpha: 0, duration: 300, onComplete: () => pop.destroy() });
        }
        if (e.completed && primariesOf(e.paint).length === 2) {
          const ring = this.add.circle(to.x, to.y, r.w / 2, blotColor, 0).setStrokeStyle(4, blotColor).setDepth(4);
          this.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
        }
      },
    });
  }

  /** A shot stopped by a stone: a grey drop that bursts on the stone without colouring anything (#95). */
  private stoneSplash(e: StoneEvent): void {
    this.stoneSplashes += 1;
    const from = beltPoint(this.layout, e.lane);
    const r = cellRect(this.layout, this.level.width, e.cell);
    const to = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    const drop = this.add.circle(from.x, from.y, 9, THEME.stone).setStrokeStyle(2, THEME.stoneDark).setDepth(4);
    this.tweens.add({
      targets: drop,
      x: to.x,
      y: to.y,
      duration: 110,
      onComplete: () => {
        drop.destroy();
        for (let k = 0; k < 4; k++) {
          const a = Math.random() * Math.PI * 2;
          const d = r.w * (0.4 + Math.random() * 0.4);
          const spot = this.add.circle(to.x, to.y, 2 + Math.random() * 3, THEME.stoneDark).setDepth(4);
          this.tweens.add({
            targets: spot, x: to.x + Math.cos(a) * d, y: to.y + Math.sin(a) * d, alpha: 0, duration: 220, onComplete: () => spot.destroy(),
          });
        }
      },
    });
  }

  // ---------- end of level ----------

  private finish(): void {
    this.ended = true;
    if (this.gs.status === 'won') {
      const before = getProgress().completed;
      this.completedStage = newlyCompletedStage(LEVELS, before, this.level.id);
      this.completedUniverse = newlyCompletedUniverse(LEVELS, before, this.level.id);
      this.firstWin = !before.includes(this.level.id);
      markCompleted(this.level.id);
      this.time.delayedCall(450, () => {
        sfx.win();
        this.showWin();
      });
    } else {
      sfx.jam();
      this.showJam();
    }
  }

  private panel(title: string, height: number): Phaser.GameObjects.Container {
    const shade = screenBackground(this, THEME.ink, 0.45).setInteractive();
    const g = this.add.graphics();
    const w = 600;
    const y = (this.scale.height - height) / 2;
    g.fillStyle(THEME.bg, 1);
    g.fillRoundedRect((VIEW.width - w) / 2, y, w, height, THEME.radius.panel);
    const t = label(this, VIEW.width / 2, y + 70, title, THEME.type.xl);
    this.overlay = this.add.container(0, 0, [shade, g, t]).setDepth(10);
    return this.overlay;
  }

  private showWin(): void {
    const c = this.panel(t('win.title'), 760);
    const top = (this.scale.height - 760) / 2;
    const size = 240;
    const cell = Math.floor(size / Math.max(this.level.width, this.level.height));
    const ox = VIEW.width / 2 - (cell * this.level.width) / 2;
    const oy = top + 140;
    const g = this.add.graphics();
    this.level.targets.forEach((t, i) => {
      if (!t) return;
      g.fillStyle(PAINT[t]!, 1);
      g.fillRect(ox + (i % this.level.width) * cell, oy + Math.floor(i / this.level.width) * cell, cell - 1, cell - 1);
    });
    c.add(g);
    // A stage beyond the skin list is celebrated without promising a new style.
    const stageDone = this.completedStage && (stageSkin(this.completedStage) ? t('win.stageComplete') : t('win.stageCompleteNoSkin'));
    // The stage message adds to the name and moves, it does not replace them (#155).
    const summary = t('win.summary', { name: levelTitle(this.level.id), moves: this.moves });
    this.winText = stageDone ? `${summary}\n${stageDone}` : summary;
    c.add(label(this, VIEW.width / 2, oy + size + 32, summary, THEME.type.sm, THEME.subCss, false).setWordWrapWidth(520));
    if (stageDone) c.add(label(this, VIEW.width / 2, oy + size + 96, stageDone, THEME.type.sm, THEME.inkCss, true).setWordWrapWidth(520));
    this.addUniverseProgress(c, top + 538);
    const isLast = this.level.id >= LEVELS.length;
    const party = this.completedUniverse;
    const nextLabel = party ? t('universes.celebrate') : t(isLast ? 'win.map' : 'win.next');
    c.add(button(this, VIEW.width / 2, top + 600, party ? 460 : 360, 88, nextLabel, () => {
      if (party) this.scene.start('universeEnd', { universe: party });
      else if (isLast) this.scene.start('menu');
      else this.scene.start('play', { levelId: this.level.id + 1 });
    }, { name: 'next', armMs: PANEL_ARM_MS }));
    const stage = this.completedStage;
    c.add(button(this, VIEW.width / 2, top + 700, 260, 64, t(stage ? 'win.album' : 'win.map'), () => {
      if (stage) this.scene.start('album', { stage });
      else this.scene.start('menu');
    }, { fill: THEME.belt, color: THEME.inkCss, size: THEME.type.sm, name: stage ? 'album' : 'map', armMs: PANEL_ARM_MS }));
    this.publish();
  }

  /** The universe's x/100 under the summary, with "+1" on a first win (goal gradient, #91). */
  private addUniverseProgress(c: Phaser.GameObjects.Container, y: number): void {
    const universe = universeOf(LEVELS, this.level.id) ?? 1;
    const ids = universeLevels(LEVELS, universe);
    const { completed } = getProgress();
    const done = ids.filter((id) => completed.includes(id)).length;
    const info = UNIVERSES.find((u) => u.id === universe);
    const g = this.add.graphics();
    progressBar(g, 140, y - 8, 300, 16, done / Math.max(1, ids.length), info ? PAINT[COLOR_CODES[info.color]!]! : THEME.ink);
    c.add(g);
    const count = `${t('map.progress', { done, total: ids.length })}${this.firstWin ? '  +1' : ''}`;
    c.add(label(this, 460, y, count, THEME.type.xs, THEME.inkCss).setOrigin(0, 0.5));
    this.universeDone = { done, total: ids.length, plusOne: this.firstWin };
  }

  private showJam(): void {
    const c = this.panel(t('jam.title'), 480);
    const top = (this.scale.height - 480) / 2;
    c.add(label(this, VIEW.width / 2, top + 130, t('jam.body'), THEME.type.sm, THEME.subCss, false));
    // #151: say why the panel offers "+1 slot" (once per attempt) or only "Retry".
    c.add(label(this, VIEW.width / 2, top + (this.gs.extraSlotUsed ? 205 : 210), t(jamHintKey(this.gs.extraSlotUsed)), THEME.type.xs, THEME.inkCss, false));
    if (!this.gs.extraSlotUsed) {
      c.add(button(this, VIEW.width / 2, top + 280, 420, 88, t('jam.continue'), () => {
        continueWithExtraSlot(this.gs);
        this.layout = computeLayout(this.level.width, this.level.height, this.gs.slots.length, this.level.columns.length, this.scale.height);
        this.drawSlotFrames();
        this.overlay?.destroy();
        this.overlay = null;
        this.ended = false;
        this.publish();
      }, { name: 'continue', armMs: PANEL_ARM_MS }));
    }
    c.add(button(this, VIEW.width / 2, top + (this.gs.extraSlotUsed ? 300 : 385), 300, 80, t('jam.retry'), () => this.restart(), {
      fill: this.gs.extraSlotUsed ? THEME.ink : THEME.belt,
      color: this.gs.extraSlotUsed ? '#ffffff' : THEME.inkCss,
      name: 'retry-panel',
      armMs: PANEL_ARM_MS,
    }));
    this.publish();
  }

  private solutionMoves(): ReturnType<typeof solve>['moves'] {
    return (this.solution ??= solve(this.level).moves);
  }

  private publish(): void {
    const gs = this.gs;
    const solutionOf = () => this.solutionMoves();
    publishDebug({
      scene: 'play',
      offsetY: 0,
      screenHeight: this.scale.height,
      scrollY: this.cameras.main.scrollY,
      levelId: this.level.id,
      status: gs.status,
      overlay: this.overlay ? (gs.status === 'won' ? 'win' : 'jam') : null,
      completedStage: this.completedStage,
      completedUniverse: this.completedUniverse,
      universeProgress: this.universeDone,
      winText: this.winText,
      winButtons: { next: { x: VIEW.width / 2, y: (this.scale.height - 760) / 2 + 600 }, second: { x: VIEW.width / 2, y: (this.scale.height - 760) / 2 + 700 } },
      beltBusy: gs.belt.length + gs.pending.length > 0,
      belt: beltLoad(gs),
      refusals: this.refusals,
      // Waiting buckets refused because they could not land a shot, and the pixels circled for the last one (#146).
      blockedTaps: this.blockedTaps,
      blockers: this.liveBlockers()?.cells.slice() ?? [],
      // The colours dotted on each circle (#176), and the case the blocked-lane tip draws.
      blockerUnlock: this.liveBlockers()?.unlock.map((u) => u.slice()) ?? [],
      blockedCase: this.blockedCase,
      // Started mixed or brown pixels and the primaries their dots show (#149).
      missing: this.level.targets.flatMap((target, i) => {
        const colors = gs.hidden[i] ? [] : missingDots(target, gs.paint[i]!, 0, 0, 1, 1).map((d) => d.color);
        return colors.length ? [{ cell: i, colors }] : [];
      }),
      columns: this.layout.columns,
      slots: this.layout.slots,
      // Waiting slots holding a bucket: playtest telemetry records the highest occupancy (#68).
      slotsUsed: gs.slots.filter(Boolean).length,
      // Leftover pills currently drawn on the buckets (#145).
      leftoverHints: [...this.hintLabels],
      // Solved on demand (only the guide and tests read it), not at every level start.
      get solution() {
        return solutionOf();
      },
      tick: gs.tick,
      subtitle: this.subtitle.text,
      guideText: this.guide ? t(GUIDE_TEXT[this.guide]) : null,
      jamButtons: {
        continue: gs.extraSlotUsed ? null : { x: VIEW.width / 2, y: (this.scale.height - 480) / 2 + 280 },
        retry: { x: VIEW.width / 2, y: (this.scale.height - 480) / 2 + (gs.extraSlotUsed ? 300 : 385) },
      },
      tip: this.tip?.id ?? null,
      moves: this.moves,
      tipButton: { x: VIEW.width / 2, y: (this.scale.height + TIP_H) / 2 - 70 },
      guide: this.guide,
      painted: this.level.targets.filter((t, i) => t && cellDone(this.level, gs, i)).length,
      // Pixels to paint, so playtest telemetry can say how many were missing (#68).
      targets: this.level.targets.filter(Boolean).length,
      ice: gs.ice.reduce((a, b) => a + b, 0),
      hidden: gs.hidden.filter(Boolean).length,
      stones: this.level.stone.filter(Boolean).length,
      stoneSplashes: this.stoneSplashes,
      locked: gs.locked.filter(Boolean).length,
      // What the player can see of each column's top three buckets: a covered one reads as null.
      queueColors: gs.queues.map((q) => q.slice(0, 3).map((s, k) => (colorShown(s, k) ? s.color : null))),
      covered: gs.queues.reduce((n, q) => n + q.filter((s, k) => !colorShown(s, k)).length, 0),
      reveals: this.reveals.size,
    });
  }

}
