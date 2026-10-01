import Phaser from 'phaser';
import { isComplete, primariesOf } from '../../core/colors';
import { VIEW, beltPoint, cellRect, computeLayout, contains, type Layout } from '../../core/layout';
import type { Level } from '../../core/level';
import {
  continueWithExtraSlot, createGame, launchFromColumn, launchFromSlot, step, type GameState, type HitEvent, type Shooter,
} from '../../core/sim';
import { solve } from '../../core/solver';
import { sfx } from '../audio';
import { publishDebug } from '../debug';
import { HINTS, LEVELS, getProgress, markCompleted, setSound } from '../store';
import { PAINT, SYMBOL, THEME } from '../theme';
import { button, fullBackground, label, viewOffset } from '../ui';

const TICK_MS = 85;
const BELT_JAR = 54;

export class PlayScene extends Phaser.Scene {
  private level!: Level;
  private gs!: GameState;
  private layout!: Layout;
  private acc = 0;
  private pixels!: Phaser.GameObjects.Graphics;
  private dynamic!: Phaser.GameObjects.Graphics;
  private texts: Phaser.GameObjects.Text[] = [];
  private textIndex = 0;
  private overlay: Phaser.GameObjects.Container | null = null;
  private slotFrames!: Phaser.GameObjects.Graphics;
  private solution: ReturnType<typeof solve>['moves'] | undefined;
  private ended = false;
  private moves = 0;

  constructor() {
    super('play');
  }

  init(data: { levelId?: number }): void {
    this.level = LEVELS[(data.levelId ?? 1) - 1] ?? LEVELS[0]!;
    this.layout = computeLayout(this.level.width, this.level.height, this.level.slots, this.level.columns.length);
    this.gs = createGame(this.level, { boardGap: Math.ceil((BELT_JAR + 4) / this.layout.cell) });
    this.acc = 0;
    this.texts = [];
    this.overlay = null;
    this.ended = false;
    this.moves = 0;
    this.solution = undefined;
  }

  create(): void {
    const { layout } = this;
    fullBackground(this, THEME.bg);

    label(this, VIEW.width / 2, 62, `Livello ${this.level.id}`, THEME.type.lg);
    const hint = HINTS[this.level.id];
    // The hint takes the subtitle line; the level name is shown again on the win panel.
    const subtitle = label(this, VIEW.width / 2, 110, hint ?? this.level.name, hint ? THEME.type.xs : THEME.type.sm, hint ? THEME.inkCss : THEME.subCss, !!hint);
    subtitle.setWordWrapWidth(VIEW.width - 2 * THEME.space.md);
    button(this, 60, 64, 84, 64, '◀', () => this.scene.start('menu'), { fill: THEME.belt, color: THEME.inkCss, name: 'home' });
    button(this, VIEW.width - 60, 64, 84, 64, '⟲', () => this.restart(), { fill: THEME.belt, color: THEME.inkCss, name: 'retry' });
    const soundBtn = button(this, VIEW.width - 160, 64, 84, 64, getProgress().sound ? '♪' : '✕', () => {
      const on = !getProgress().sound;
      setSound(on);
      sfx.enabled = on;
      (soundBtn.list[1] as Phaser.GameObjects.Text).setText(on ? '♪' : '✕');
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

    label(this, VIEW.width / 2, layout.slots[0]!.y - 20, 'ATTESA', THEME.type.xs * 0.8, THEME.subCss);
    const columnFrames = this.add.graphics();
    columnFrames.fillStyle(THEME.belt, 0.35);
    for (const c of layout.columns) columnFrames.fillRoundedRect(c.x, c.y - 6, c.w, 3 * layout.columnStep + 20, THEME.radius.jar);
    this.slotFrames = this.add.graphics();
    this.drawSlotFrames();

    this.pixels = this.add.graphics();
    this.dynamic = this.add.graphics();
    this.drawPixels();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tap(p.worldX, p.worldY));
    this.publish();
  }

  private restart(): void {
    this.scene.restart({ levelId: this.level.id });
  }

  private tap(x: number, y: number): void {
    sfx.unlock();
    if (this.overlay || this.gs.status !== 'playing') return;
    const pt = { x, y };
    let launched = false;
    this.layout.columns.forEach((r, i) => {
      if (contains(r, pt)) launched = launchFromColumn(this.gs, i);
    });
    this.layout.slots.forEach((r, i) => {
      if (!launched && contains(r, pt)) launched = launchFromSlot(this.gs, i);
    });
    if (launched) {
      this.moves += 1;
      sfx.launch();
    }
  }

  update(_time: number, delta: number): void {
    if (this.gs.status === 'playing') {
      this.acc += Math.min(delta, 250);
      while (this.acc >= TICK_MS && this.gs.status === 'playing') {
        this.acc -= TICK_MS;
        step(this.gs);
        for (const e of this.gs.events) this.splash(e);
        this.publish();
      }
    }
    if (!this.ended && this.gs.status !== 'playing') this.finish();
    this.drawDynamic(this.gs.status === 'playing' ? this.acc / TICK_MS : 0);
  }

  // ---------- rendering ----------

  private drawPixels(): void {
    const g = this.pixels;
    g.clear();
    const { targets } = this.level;
    const inset = this.layout.cell > 30 ? 2 : 1;
    targets.forEach((target, i) => {
      if (!target) return;
      const r = cellRect(this.layout, this.level.width, i);
      const x = r.x + inset, y = r.y + inset, w = r.w - 2 * inset, h = r.h - 2 * inset;
      const paint = this.gs.paint[i]!;
      if (isComplete(target, paint)) {
        g.fillStyle(PAINT[target]!, 1);
        g.fillRoundedRect(x, y, w, h, THEME.radius.cell);
        return;
      }
      g.fillStyle(THEME.emptyPixel, 1);
      g.fillRoundedRect(x, y, w, h, THEME.radius.cell);
      // Ghost of the target colour: tells the player what this pixel still needs.
      g.fillStyle(PAINT[target]!, 0.3);
      g.fillRoundedRect(x + w * 0.18, y + h * 0.18, w * 0.64, h * 0.64, THEME.radius.cell);
      if (paint) {
        // Half-mixed secondary: the received primary fills the upper-left triangle.
        g.fillStyle(PAINT[paint]!, 1);
        g.fillTriangle(x, y, x + w, y, x, y + h);
      }
    });
  }

  private drawSlotFrames(): void {
    this.slotFrames.clear();
    this.slotFrames.lineStyle(3, THEME.ink, 0.25);
    for (const s of this.layout.slots) this.slotFrames.strokeRoundedRect(s.x, s.y, s.w, s.h, THEME.radius.jar);
  }

  private text(x: number, y: number, value: string, size: number, color = '#ffffff'): void {
    let t = this.texts[this.textIndex];
    if (!t) {
      t = this.add.text(0, 0, '', { fontFamily: THEME.font, fontStyle: 'bold', color }).setOrigin(0.5).setDepth(5);
      this.texts.push(t);
    }
    this.textIndex += 1;
    t.setVisible(true).setPosition(x, y).setText(value).setFontSize(size).setColor(color);
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
    g.lineStyle(3, THEME.ink, alpha);
    g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, THEME.radius.jar);
    if (alpha > 0.5) {
      this.text(x, y - size * 0.18, SYMBOL[shooter.color]!, size * 0.26);
      this.text(x, y + size * 0.16, String(shooter.ammo), size * 0.36);
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
    gs.slots.forEach((s, i) => {
      const r = layout.slots[i];
      if (s && r) this.jar(r.x + r.w / 2, r.y + r.h / 2, r.w - 8, s);
    });
    gs.queues.forEach((queue, c) => {
      const r = layout.columns[c]!;
      queue.slice(0, 3).forEach((s, k) => {
        this.jar(r.x + r.w / 2, r.y + layout.jar / 2 + 6 + k * layout.columnStep, k === 0 ? layout.jar : layout.jar - 14, s, k === 0 ? 1 : 0.55);
      });
      if (queue.length > 3) this.text(r.x + r.w / 2, r.y + 3 * layout.columnStep + 36, `+${queue.length - 3}`, THEME.type.sm, THEME.subCss);
    });

    for (let i = this.textIndex; i < this.texts.length; i++) this.texts[i]!.setVisible(false);
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
        this.drawPixels();
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
        if (e.completed && primariesOf(e.paint).length === 2) {
          const ring = this.add.circle(to.x, to.y, r.w / 2, blotColor, 0).setStrokeStyle(4, blotColor).setDepth(4);
          this.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
        }
      },
    });
  }

  // ---------- end of level ----------

  private finish(): void {
    this.ended = true;
    if (this.gs.status === 'won') {
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
    const shade = fullBackground(this, THEME.ink, 0.45).setInteractive();
    const g = this.add.graphics();
    const w = 600;
    const y = (VIEW.height - height) / 2;
    g.fillStyle(THEME.bg, 1);
    g.fillRoundedRect((VIEW.width - w) / 2, y, w, height, THEME.radius.panel);
    const t = label(this, VIEW.width / 2, y + 70, title, THEME.type.xl);
    this.overlay = this.add.container(0, 0, [shade, g, t]).setDepth(10);
    return this.overlay;
  }

  private showWin(): void {
    const c = this.panel('Capolavoro!', 760);
    const top = (VIEW.height - 760) / 2;
    const size = 320;
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
    c.add(label(this, VIEW.width / 2, oy + size + 40, `"${this.level.name}" completato in ${this.moves} mosse`, THEME.type.sm, THEME.subCss, false));
    const isLast = this.level.id >= LEVELS.length;
    c.add(button(this, VIEW.width / 2, top + 600, 360, 88, isLast ? 'Mappa' : 'Avanti', () => {
      if (isLast) this.scene.start('menu');
      else this.scene.start('play', { levelId: this.level.id + 1 });
    }, { name: 'next' }));
    c.add(button(this, VIEW.width / 2, top + 700, 260, 64, 'Mappa', () => this.scene.start('menu'), {
      fill: THEME.belt, color: THEME.inkCss, size: THEME.type.sm, name: 'map',
    }));
    this.publish();
  }

  private showJam(): void {
    const c = this.panel('Ingorgo!', 480);
    const top = (VIEW.height - 480) / 2;
    c.add(label(this, VIEW.width / 2, top + 150, 'Un secchiello non trova posto\nnegli slot d\'attesa.', THEME.type.sm, THEME.subCss, false));
    if (!this.gs.extraSlotUsed) {
      c.add(button(this, VIEW.width / 2, top + 280, 420, 88, '+1 slot e continua', () => {
        continueWithExtraSlot(this.gs);
        this.layout = computeLayout(this.level.width, this.level.height, this.gs.slots.length, this.level.columns.length);
        this.drawSlotFrames();
        this.overlay?.destroy();
        this.overlay = null;
        this.ended = false;
        this.publish();
      }, { name: 'continue' }));
    }
    c.add(button(this, VIEW.width / 2, top + (this.gs.extraSlotUsed ? 300 : 385), 300, 80, 'Riprova', () => this.restart(), {
      fill: this.gs.extraSlotUsed ? THEME.ink : THEME.belt,
      color: this.gs.extraSlotUsed ? '#ffffff' : THEME.inkCss,
      name: 'retry-panel',
    }));
    this.publish();
  }

  private publish(): void {
    const gs = this.gs;
    publishDebug({
      scene: 'play',
      offsetY: viewOffset(this),
      levelId: this.level.id,
      status: gs.status,
      overlay: this.overlay ? (gs.status === 'won' ? 'win' : 'jam') : null,
      beltBusy: gs.belt.length + gs.pending.length > 0,
      columns: this.layout.columns,
      slots: this.layout.slots,
      solution: this.solution ??= solve(this.level).moves,
      painted: gs.paint.filter((p, i) => p && isComplete(this.level.targets[i]!, p)).length,
    });
  }

}
