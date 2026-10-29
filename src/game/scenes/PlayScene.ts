import Phaser from 'phaser';
import { newlyCompletedStage, stageSkin } from '../../core/album';
import { primariesOf } from '../../core/colors';
import { cellDone } from '../../core/rules';
import type { StoneEvent } from '../../core/sim';
import { MIN_TOUCH_PX, VIEW, beltPoint, cellRect, computeLayout, contains, slotAt, type Layout } from '../../core/layout';
import type { Level } from '../../core/level';
import { currentLevel } from '../../core/mapLayout';
import { newlyCompletedUniverse } from '../../core/universeMenu';
import { universeLevels, universeOf } from '../../core/universes';
import { COLOR_CODES } from '../../core/colors';
import {
  beltFull, beltLoad, continueWithExtraSlot, createGame, launchFromColumn, launchFromSlot, step, type GameState, type HitEvent, type Shooter,
} from '../../core/sim';
import {
  guideAllows, guideStep, needsGuide, tipOnFullBelt, tipOnLevelStart, tipOnReturn, type CardTip, type GuideStep,
} from '../../core/onboarding';
import { solve } from '../../core/solver';
import { sfx } from '../audio';
import { publishDebug } from '../debug';
import { LEVELS, UNIVERSES, canOpen, getProgress, levelHint, levelTitle, markCompleted, markTip, setSound, t, tipSeen } from '../store';
import { BLUE, BROWN, GREEN, ORANGE, PURPLE, RED, YELLOW } from '../../core/colors';
import { PAINT, SYMBOL, THEME, css } from '../theme';
import { drawSkin } from '../skins';
import { brownPixel, button, drawStone, keyIcon, label, lockIcon, progressBar, screenBackground } from '../ui';

const TICK_MS = 85;
const BELT_JAR = 54;
const TIP_H = 620;
/** How long a refused tap shakes its column and highlights the belt indicator. */
const REFUSE_MS = 450;
/** Belt-load pips: one per bucket the belt holds, drawn only while they fit beside the "waiting" label. */
const PIP = 16;
const PIP_GAP = 6;
const MAX_PIPS = 6;
const GUIDE_TEXT = { tap: 'guide.tap', watch: 'guide.watch', next: 'guide.next', free: 'guide.free' } as const;

export class PlayScene extends Phaser.Scene {
  private level!: Level;
  private gs!: GameState;
  private layout!: Layout;
  private acc = 0;
  private pixels!: Phaser.GameObjects.Graphics;
  private dynamic!: Phaser.GameObjects.Graphics;
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
  private refused: { column: number; slot: number; at: number } | null = null;
  private refusals = 0;
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
    if (column >= 0 ? !launchFromColumn(this.gs, column) : !launchFromSlot(this.gs, slot)) return;
    this.launchAmmo.set(wanted.id, wanted.ammo);
    this.moves += 1;
    sfx.launch();
    if (this.guide) this.updateGuide();
    this.publish();
  }

  /** A tap the full belt cannot take: shake what was tapped, light up the belt indicator, explain once. */
  private refuse(column: number, slot: number): void {
    this.refused = { column, slot, at: this.time.now };
    this.refusals += 1;
    sfx.refuse();
    const tip = tipOnFullBelt(getProgress().seenTips);
    // A short delay lets the shake and the indicator be seen before the card covers them.
    if (tip && !this.guide) this.time.delayedCall(REFUSE_MS, () => this.showTip(tip));
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
    const cracks = (gx: number, gy: number) => {
      g.fillStyle(THEME.ice, 0.6);
      g.fillRoundedRect(gx - 24, gy - 24, 48, 48, THEME.radius.cell);
      g.lineStyle(2, THEME.white, 0.9);
      g.lineBetween(gx - 14, gy - 12, gx, gy);
      g.lineBetween(gx, gy, gx - 2, gy + 18);
      g.lineBetween(gx, gy, gx + 16, gy - 4);
    };
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
    }
    const bodyY = id === 'mixing' ? y0 + 340 : y0 + 290;
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
      if (this.gs.locked[i]) {
        // Locked: the colour still shows (so the player can plan), under a veil and an ink padlock.
        g.fillStyle(THEME.paper, 0.55);
        g.fillRoundedRect(x, y, w, h, THEME.radius.cell);
        lockIcon(g, x + w / 2, y + h / 2, h * 0.72);
      } else if (this.level.keys[i]) {
        // Key: what opens the padlocks, until it is done.
        keyIcon(g, x + w / 2, y + h / 2, w * 0.78);
      }
      if (this.gs.ice[i]! > 0) {
        // Ice: frosted cover with cracks.
        g.fillStyle(THEME.ice, 0.6);
        g.fillRoundedRect(x, y, w, h, THEME.radius.cell);
        g.lineStyle(2, THEME.white, 0.9);
        g.lineBetween(x + w * 0.2, y + h * 0.25, x + w * 0.5, y + h * 0.5);
        g.lineBetween(x + w * 0.5, y + h * 0.5, x + w * 0.45, y + h * 0.85);
        g.lineBetween(x + w * 0.5, y + h * 0.5, x + w * 0.85, y + h * 0.4);
      }
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

  private jar(x: number, y: number, size: number, shooter: Shooter, alpha = 1): void {
    const g = this.dynamic;
    const c = PAINT[shooter.color]!;
    g.fillStyle(THEME.ink, 0.15 * alpha);
    g.fillRoundedRect(x - size / 2 + 3, y - size / 2 + 5, size, size, THEME.radius.jar);
    g.fillStyle(c, alpha);
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, THEME.radius.jar);
    g.fillStyle(THEME.ink, 0.25 * alpha);
    g.fillRoundedRect(x - size / 2 + 6, y - size / 2 - 6, size - 12, 12, 5); // lid
    drawSkin(g, getProgress().skin, x, y, size, alpha);
    g.lineStyle(3, THEME.ink, alpha);
    g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, THEME.radius.jar);
    if (alpha > 0.5) {
      // Floors keep the numbers legible (≥ 12 px on a 360 px phone) on the small belt jars.
      const small = size < 70;
      this.text(x, y - size * (small ? 0.27 : 0.18), SYMBOL[shooter.color]!, Math.max(size * 0.26, 18));
      this.text(x, y + size * (small ? 0.2 : 0.16), String(shooter.ammo), Math.max(size * 0.36, 24));
    }
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
    this.drawBeltLoad(flashing);
    gs.slots.forEach((s, i) => {
      const r = layout.slots[i];
      const dx = this.refused?.slot === i ? shake : 0;
      if (s && r) this.jar(r.x + r.w / 2 + dx, r.y + r.h / 2, r.w - 8, s);
    });
    gs.queues.forEach((queue, c) => {
      const r = layout.columns[c]!;
      const dx = this.refused?.column === c ? shake : 0;
      queue.slice(0, 3).forEach((s, k) => {
        this.jar(r.x + r.w / 2 + dx, r.y + layout.jar / 2 + 6 + k * layout.columnStep, k === 0 ? layout.jar : layout.jar - 14, s, k === 0 ? 1 : 0.55);
      });
      if (queue.length > 3) this.text(r.x + r.w / 2, r.y + 3 * layout.columnStep + 36, `+${queue.length - 3}`, THEME.type.sm, THEME.subCss);
    });

    for (let i = this.textIndex; i < this.texts.length; i++) this.texts[i]!.setVisible(false);
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
    const size = 280;
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
    const summary = stageDone || t('win.summary', { name: levelTitle(this.level.id), moves: this.moves });
    this.winText = summary;
    c.add(label(this, VIEW.width / 2, oy + size + 36, summary, THEME.type.sm, this.completedStage ? THEME.inkCss : THEME.subCss, !!this.completedStage)
      .setWordWrapWidth(520));
    this.addUniverseProgress(c, top + 512);
    const isLast = this.level.id >= LEVELS.length;
    const party = this.completedUniverse;
    const nextLabel = party ? t('universes.celebrate') : t(isLast ? 'win.map' : 'win.next');
    c.add(button(this, VIEW.width / 2, top + 600, party ? 460 : 360, 88, nextLabel, () => {
      if (party) this.scene.start('universeEnd', { universe: party });
      else if (isLast) this.scene.start('menu');
      else this.scene.start('play', { levelId: this.level.id + 1 });
    }, { name: 'next' }));
    const stage = this.completedStage;
    c.add(button(this, VIEW.width / 2, top + 700, 260, 64, t(stage ? 'win.album' : 'win.map'), () => {
      if (stage) this.scene.start('album', { stage });
      else this.scene.start('menu');
    }, { fill: THEME.belt, color: THEME.inkCss, size: THEME.type.sm, name: stage ? 'album' : 'map' }));
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
    c.add(label(this, VIEW.width / 2, top + 150, t('jam.body'), THEME.type.sm, THEME.subCss, false));
    if (!this.gs.extraSlotUsed) {
      c.add(button(this, VIEW.width / 2, top + 280, 420, 88, t('jam.continue'), () => {
        continueWithExtraSlot(this.gs);
        this.layout = computeLayout(this.level.width, this.level.height, this.gs.slots.length, this.level.columns.length, this.scale.height);
        this.drawSlotFrames();
        this.overlay?.destroy();
        this.overlay = null;
        this.ended = false;
        this.publish();
      }, { name: 'continue' }));
    }
    c.add(button(this, VIEW.width / 2, top + (this.gs.extraSlotUsed ? 300 : 385), 300, 80, t('jam.retry'), () => this.restart(), {
      fill: this.gs.extraSlotUsed ? THEME.ink : THEME.belt,
      color: this.gs.extraSlotUsed ? '#ffffff' : THEME.inkCss,
      name: 'retry-panel',
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
      columns: this.layout.columns,
      slots: this.layout.slots,
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
      ice: gs.ice.reduce((a, b) => a + b, 0),
      hidden: gs.hidden.filter(Boolean).length,
      stones: this.level.stone.filter(Boolean).length,
      stoneSplashes: this.stoneSplashes,
      locked: gs.locked.filter(Boolean).length,
    });
  }

}
