import Phaser from 'phaser';
import { LANGUAGES, LANGUAGE_NAMES } from '../../core/i18n';
import { VIEW } from '../../core/layout';
import {
  MAP, clampScroll, computeMapLayout, currentLevel, inertia, keyScrollDelta, mapTapTarget, scrollToLevel, type MapLayout,
} from '../../core/mapLayout';
import { stageInfo } from '../../core/stages';
import { sfx } from '../audio';
import { publishDebug } from '../debug';
import { LEVELS, getProgress, levelTitle, resetTips, setLanguage, setSound, stageTitle, t } from '../store';
import { PAINT, THEME } from '../theme';
import { button, label } from '../ui';

/** Most frequent target colour of a level, used to paint its node on the map once completed. */
function dominantColor(targets: number[]): number {
  const counts = new Map<number, number>();
  for (const c of targets) if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

const DRAG_THRESHOLD = 12;

/** Scrolling level map: one section per stage, a fixed title bar, settings panel. */
export class MenuScene extends Phaser.Scene {
  private layout!: MapLayout;
  private scroll = 0;
  private velocity = 0;
  private dragging = false;
  private dragMoved = false;
  private lastY = 0;
  private lastT = 0;
  private bar!: Phaser.GameObjects.Container;
  /** Map labels created on first view and hidden when off screen: keeps draw calls to what is visible. */
  private cullable: { y: number; make: () => Phaser.GameObjects.Text; text?: Phaser.GameObjects.Text }[] = [];
  private settings: Phaser.GameObjects.Container | null = null;
  private settingsButtons: Record<string, { x: number; y: number }> = {};

  constructor() {
    super('menu');
  }

  relayoutData(): { settings: boolean; scroll: number } {
    return { settings: !!this.settings, scroll: this.scroll };
  }

  private get viewHeight(): number {
    return this.scale.height;
  }

  create(data: { settings?: boolean; scroll?: number } = {}): void {
    const progress = getProgress();
    sfx.enabled = progress.sound;
    this.settings = null;
    this.velocity = 0;
    this.dragging = false;
    this.layout = computeMapLayout(LEVELS.map((l) => ({ id: l.id, stage: l.stage, boss: l.boss })), VIEW.width, this.viewHeight);
    const current = currentLevel(progress.unlocked, progress.completed, LEVELS.length);
    this.scroll = clampScroll(data.scroll ?? scrollToLevel(this.layout, current, this.viewHeight), this.layout, this.viewHeight);

    this.cameras.main.setBackgroundColor(THEME.bg);
    this.cullable = [];
    this.drawPath();
    this.drawHeaders(progress.completed);
    this.drawNodes(progress.completed, progress.unlocked, current);
    if (LEVELS.length % 10 !== 0 || LEVELS.length < 100) {
      const top = this.layout.nodes.at(-1);
      if (top) label(this, VIEW.width / 2, top.y - 90, t('map.comingSoon'), THEME.type.sm, THEME.subCss, false);
    }
    this.createBar();
    this.createDrag();
    this.applyScroll();
    if (data.settings) this.openSettings();
    this.publish();
  }

  // ---------- drawing ----------

  private drawPath(): void {
    const path = this.add.graphics();
    path.lineStyle(18, THEME.belt, 1);
    path.beginPath();
    this.layout.nodes.forEach((n, i) => (i === 0 ? path.moveTo(n.x, n.y) : path.lineTo(n.x, n.y)));
    path.strokePath();
  }

  /** Registers a label that is only created while its row is on (or near) the screen. */
  private lazy(y: number, make: () => Phaser.GameObjects.Text): void {
    this.cullable.push({ y, make });
  }

  private drawHeaders(completed: readonly number[]): void {
    const g = this.add.graphics();
    for (const h of this.layout.headers) {
      const info = stageInfo(h.stage);
      const done = LEVELS.filter((l) => l.stage === h.stage && completed.includes(l.id)).length;
      g.fillStyle(PAINT[info?.color ?? 1]!, 1);
      g.fillRoundedRect(80, h.y - 34, VIEW.width - 160, 68, 34);
      this.lazy(h.y, () => label(this, 120, h.y, `${t('map.stage', { n: h.stage })} · ${info ? stageTitle(info.key) : ''}`, THEME.type.sm, '#ffffff')
        .setOrigin(0, 0.5));
      this.lazy(h.y, () => label(this, VIEW.width - 120, h.y, `${t('map.progress', { done, total: h.count })}  ▸`, THEME.type.sm, '#ffffff').setOrigin(1, 0.5));
    }
  }

  /** The whole map shares a few Graphics and one tap handler instead of one object and one zone per node. */
  private drawNodes(completed: readonly number[], unlocked: number, current: number): void {
    const g = this.add.graphics();
    for (const n of this.layout.nodes) {
      const level = LEVELS[n.id - 1]!;
      const done = completed.includes(n.id);
      const open = n.id <= unlocked;
      const isCurrent = n.id === current && !done;
      const r = isCurrent ? n.r + 4 : n.r;
      // The current node pulses, so it lives in its own Graphics.
      const target = isCurrent ? this.add.graphics() : g;
      target.fillStyle(done ? PAINT[dominantColor(level.targets)]! : isCurrent ? THEME.paper : THEME.emptyPixel, 1);
      target.fillCircle(n.x, n.y, r);
      target.lineStyle(isCurrent ? 6 : 3, THEME.ink, open ? 1 : 0.3);
      target.strokeCircle(n.x, n.y, r);
      if (n.boss) this.lazy(n.y, () => label(this, n.x, n.y - r - 18, '★', THEME.type.md, open ? THEME.inkCss : THEME.subCss));
      this.lazy(n.y, () => label(this, n.x, n.y, String(n.id), isCurrent ? THEME.type.md : THEME.type.sm, done ? '#ffffff' : THEME.inkCss)
        .setAlpha(open ? 1 : 0.35));
      if (isCurrent) {
        this.lazy(n.y, () => label(this, n.x + (n.x < VIEW.width / 2 ? 140 : -140), n.y, levelTitle(n.id), THEME.type.sm, THEME.inkCss));
        this.tweens.add({ targets: target, alpha: 0.75, duration: 700, yoyo: true, repeat: -1 });
      }
    }
  }

  /** Creates labels that came into view and hides the ones that left it. */
  private cull(): void {
    const margin = 140;
    const top = this.scroll - margin;
    const bottom = this.scroll + this.viewHeight + margin;
    for (const item of this.cullable) {
      const visible = item.y >= top && item.y <= bottom;
      if (visible && !item.text) item.text = item.make();
      item.text?.setVisible(visible);
    }
  }

  /** A tap (touch that did not turn into a drag) on a level node or on a stage band. */
  private tapAt(x: number, worldY: number): void {
    if (this.settings) return;
    const target = mapTapTarget(this.layout, getProgress().unlocked, x, worldY);
    if (target?.kind === 'level') {
      sfx.unlock();
      this.scene.start('play', { levelId: target.id });
    } else if (target?.kind === 'stage') {
      this.scene.start('album', { stage: target.stage });
    }
  }

  /** Title bar that stays put while the map scrolls under it (re-positioned every frame). */
  private createBar(): void {
    const bg = this.add.rectangle(0, 0, VIEW.width, MAP.barHeight, THEME.bg).setOrigin(0);
    const title = label(this, VIEW.width / 2, 110, t('app.title'), THEME.type.xl);
    const tagline = label(this, VIEW.width / 2, 170, t('app.tagline'), THEME.type.sm, THEME.subCss, false);
    const gear = button(this, VIEW.width - 70, 50, 84, 64, '⚙', () => this.openSettings(), {
      fill: THEME.belt, color: THEME.inkCss, name: 'settings',
    });
    this.bar = this.add.container(0, 0, [bg, title, tagline, gear]).setDepth(5);
  }

  // ---------- scrolling ----------

  private createDrag(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.settings || p.y < MAP.barHeight) return;
      this.dragging = true;
      this.dragMoved = false;
      this.velocity = 0;
      this.lastY = p.y;
      this.lastT = p.event.timeStamp || this.time.now;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      const dy = p.y - this.lastY;
      if (Math.abs(p.y - p.downY) > DRAG_THRESHOLD) this.dragMoved = true;
      const now = p.event.timeStamp || this.time.now;
      const dt = Math.max(1, now - this.lastT);
      this.scroll = clampScroll(this.scroll - dy, this.layout, this.viewHeight);
      this.velocity = -dy / dt;
      this.lastY = p.y;
      this.lastT = now;
      this.applyScroll();
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const tapped = this.dragging && !this.dragMoved;
      this.endDrag();
      if (tapped) this.tapAt(p.x, p.worldY);
    });
    this.input.on('pointerupoutside', () => this.endDrag());
    // Desktop / PWA: mouse wheel and keyboard scroll the map too.
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => this.scrollBy(dy));
    for (const key of ['UP', 'DOWN', 'PAGE_UP', 'PAGE_DOWN', 'HOME', 'END']) {
      this.input.keyboard?.on(`keydown-${key}`, () => this.scrollBy(keyScrollDelta(key, this.viewHeight) ?? 0));
    }
  }

  private scrollBy(dy: number): void {
    if (this.settings) return;
    this.velocity = 0;
    this.scroll = clampScroll(this.scroll + dy, this.layout, this.viewHeight);
    this.applyScroll();
    this.publish();
  }

  private endDrag(): void {
    if (!this.dragging) return;
    this.dragging = false;
    if (!this.dragMoved) this.velocity = 0;
    this.publish();
  }

  private applyScroll(): void {
    this.cameras.main.setScroll(0, this.scroll);
    this.bar.setY(this.scroll);
    this.cull();
  }

  update(_time: number, delta: number): void {
    // The scene's pointerup is not delivered when the finger lifts over an interactive zone,
    // so a drag also ends whenever no pointer is down any more.
    if (this.dragging && !this.input.activePointer.isDown) this.endDrag();
    if (this.dragging || this.velocity === 0 || this.settings) return;
    const next = inertia(this.scroll, this.velocity, Math.min(delta, 50), this.layout, this.viewHeight);
    this.scroll = next.scroll;
    this.velocity = next.velocity;
    this.applyScroll();
    if (this.velocity === 0) this.publish();
  }

  // ---------- settings ----------

  private openSettings(): void {
    if (this.settings) return;
    this.velocity = 0;
    const progress = getProgress();
    // Panel coordinates are the usual 720×1280 logical ones, centred on the visible screen.
    const originY = this.scroll + (this.viewHeight - VIEW.height) / 2;
    const shade = this.add.rectangle(0, -(this.viewHeight - VIEW.height) / 2, VIEW.width, this.viewHeight, THEME.ink, 0.45)
      .setOrigin(0).setInteractive();
    const g = this.add.graphics();
    const w = 620;
    const h = 820;
    const x0 = (VIEW.width - w) / 2;
    const y0 = (VIEW.height - h) / 2;
    g.fillStyle(THEME.bg, 1);
    g.fillRoundedRect(x0, y0, w, h, THEME.radius.panel);
    const c = this.add.container(0, originY, [shade, g]).setDepth(10);
    c.add(label(this, VIEW.width / 2, y0 + 70, t('settings.title'), THEME.type.lg));
    this.settingsButtons = {};
    const add = (name: string, x: number, y: number, bw: number, bh: number, text: string, onClick: () => void, active = true) => {
      this.settingsButtons[name] = { x, y: y + originY };
      c.add(button(this, x, y, bw, bh, text, onClick, {
        fill: active ? THEME.ink : THEME.belt, color: active ? '#ffffff' : THEME.inkCss, size: THEME.type.sm, name,
      }));
    };
    // Re-entering the scene with the panel open applies a language change to every label at once.
    const reopen = () => this.scene.restart({ settings: true, scroll: this.scroll });

    c.add(label(this, VIEW.width / 2, y0 + 150, t('settings.language'), THEME.type.sm, THEME.subCss));
    LANGUAGES.forEach((lang, i) => {
      add(`lang-${lang}`, VIEW.width / 2 + (i - (LANGUAGES.length - 1) / 2) * 260, y0 + 215, 240, 72, LANGUAGE_NAMES[lang], () => {
        setLanguage(lang);
        reopen();
      }, progress.language === lang);
    });

    c.add(label(this, VIEW.width / 2, y0 + 310, t('settings.sound'), THEME.type.sm, THEME.subCss));
    [true, false].forEach((on, i) => {
      add(on ? 'sound-on' : 'sound-off', VIEW.width / 2 + (i - 0.5) * 260, y0 + 375, 240, 72, t(on ? 'settings.on' : 'settings.off'), () => {
        setSound(on);
        sfx.enabled = on;
        reopen();
      }, progress.sound === on);
    });

    add('howto', VIEW.width / 2, y0 + 480, 420, 80, t('settings.howto'), () => this.scene.start('howto', { page: 0 }), false);
    add('replay-tutorial', VIEW.width / 2, y0 + 570, 420, 80, t('settings.replayTutorial'), () => {
      resetTips();
      this.scene.start('play', { levelId: 1 });
    }, false);
    add('progress', VIEW.width / 2, y0 + 660, 420, 80, t('settings.progress'), () => this.scene.start('data'), false);
    add('close', VIEW.width / 2, y0 + 750, 300, 80, t('settings.close'), () => {
      c.destroy();
      this.settings = null;
      this.publish();
    });
    this.settings = c;
    this.publish();
  }

  private publish(): void {
    publishDebug({
      scene: 'menu',
      nodes: this.layout.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, unlocked: n.id <= getProgress().unlocked, boss: !!n.boss })),
      headers: this.layout.headers,
      scrollY: this.scroll,
      viewHeight: this.viewHeight,
      barHeight: MAP.barHeight,
      settingsOpen: !!this.settings,
      settingsButtons: this.settings ? this.settingsButtons : {},
      language: getProgress().language,
      settingsButton: { x: VIEW.width - 70, y: this.scroll + 50 },
    });
  }
}
