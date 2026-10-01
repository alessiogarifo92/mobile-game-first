import Phaser from 'phaser';
import { LANGUAGES, LANGUAGE_NAMES } from '../../core/i18n';
import { VIEW } from '../../core/layout';
import {
  MAP, clampScroll, computeMapLayout, currentLevel, inertia, scrollToLevel, type MapLayout,
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
  private settings: Phaser.GameObjects.Container | null = null;
  private settingsButtons: Record<string, { x: number; y: number }> = {};

  constructor() {
    super('menu');
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
    this.scroll = data.scroll ?? scrollToLevel(this.layout, current, this.viewHeight);

    this.add.rectangle(0, 0, VIEW.width, this.layout.height, THEME.bg).setOrigin(0);
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

  private drawHeaders(completed: readonly number[]): void {
    for (const h of this.layout.headers) {
      const info = stageInfo(h.stage);
      const done = LEVELS.filter((l) => l.stage === h.stage && completed.includes(l.id)).length;
      const g = this.add.graphics();
      g.fillStyle(PAINT[info?.color ?? 1]!, 1);
      g.fillRoundedRect(80, h.y - 34, VIEW.width - 160, 68, 34);
      label(this, 120, h.y, `${t('map.stage', { n: h.stage })} · ${info ? stageTitle(info.key) : ''}`, THEME.type.sm, '#ffffff')
        .setOrigin(0, 0.5);
      label(this, VIEW.width - 120, h.y, `${t('map.progress', { done, total: h.count })}  ▸`, THEME.type.sm, '#ffffff').setOrigin(1, 0.5);
      // Tapping a stage band opens its album page.
      this.add
        .zone(VIEW.width / 2, h.y, VIEW.width - 160, 68)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (this.settings || this.dragMoved) return;
          this.scene.start('album', { stage: h.stage });
        });
    }
  }

  private drawNodes(completed: readonly number[], unlocked: number, current: number): void {
    for (const n of this.layout.nodes) {
      const level = LEVELS[n.id - 1]!;
      const done = completed.includes(n.id);
      const open = n.id <= unlocked;
      const isCurrent = n.id === current && !done;
      const r = isCurrent ? n.r + 4 : n.r;
      const g = this.add.graphics();
      g.fillStyle(done ? PAINT[dominantColor(level.targets)]! : isCurrent ? THEME.paper : THEME.emptyPixel, 1);
      g.fillCircle(n.x, n.y, r);
      g.lineStyle(isCurrent ? 6 : 3, THEME.ink, open ? 1 : 0.3);
      g.strokeCircle(n.x, n.y, r);
      if (n.boss) label(this, n.x, n.y - r - 18, '★', THEME.type.md, open ? THEME.inkCss : THEME.subCss);
      label(this, n.x, n.y, String(n.id), isCurrent ? THEME.type.md : THEME.type.sm, done ? '#ffffff' : THEME.inkCss)
        .setAlpha(open ? 1 : 0.35);
      if (isCurrent) {
        label(this, n.x + (n.x < VIEW.width / 2 ? 140 : -140), n.y, levelTitle(n.id), THEME.type.sm, THEME.inkCss);
        this.tweens.add({ targets: g, alpha: 0.75, duration: 700, yoyo: true, repeat: -1 });
      }
      if (open) {
        this.add
          .zone(n.x, n.y, r * 2.4, r * 2.4)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => {
            if (this.settings || this.dragMoved) return;
            sfx.unlock();
            this.scene.start('play', { levelId: n.id });
          });
      }
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
    this.input.on('pointerup', () => this.endDrag());
    this.input.on('pointerupoutside', () => this.endDrag());
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

    add('howto', VIEW.width / 2, y0 + 500, 420, 80, t('settings.howto'), () => this.scene.start('howto'), false);
    add('replay-tutorial', VIEW.width / 2, y0 + 600, 420, 80, t('settings.replayTutorial'), () => {
      resetTips();
      this.scene.start('play', { levelId: 1 });
    }, false);
    add('close', VIEW.width / 2, y0 + 730, 300, 80, t('settings.close'), () => {
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
