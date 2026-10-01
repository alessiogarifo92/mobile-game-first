import Phaser from 'phaser';
import { LANGUAGES, LANGUAGE_NAMES } from '../../core/i18n';
import { VIEW } from '../../core/layout';
import { sfx } from '../audio';
import { publishDebug } from '../debug';
import { LEVELS, getProgress, levelTitle, resetTips, setLanguage, setSound, t } from '../store';
import { PAINT, THEME } from '../theme';
import { button, fullBackground, label, viewOffset } from '../ui';

/** Most frequent target colour of a level, used to paint its node on the map once completed. */
function dominantColor(targets: number[]): number {
  const counts = new Map<number, number>();
  for (const c of targets) if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

export class MenuScene extends Phaser.Scene {
  private settings: Phaser.GameObjects.Container | null = null;
  private nodes: { id: number; x: number; y: number; unlocked: boolean }[] = [];
  private settingsButtons: Record<string, { x: number; y: number }> = {};

  constructor() {
    super('menu');
  }

  create(data: { settings?: boolean } = {}): void {
    const progress = getProgress();
    sfx.enabled = progress.sound;
    this.settings = null;
    this.nodes = [];
    fullBackground(this, THEME.bg);
    label(this, VIEW.width / 2, 130, t('app.title'), THEME.type.xl);
    label(this, VIEW.width / 2, 190, t('app.tagline'), THEME.type.sm, THEME.subCss, false);

    const top = 280;
    const bottom = VIEW.height - 90;
    const step = (bottom - top) / (LEVELS.length - 1);
    const points = LEVELS.map((_, i) => ({ x: VIEW.width / 2 + Math.sin(i * 1.1) * 190, y: bottom - i * step }));

    const path = this.add.graphics();
    path.lineStyle(18, THEME.belt, 1);
    path.beginPath();
    points.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
    path.strokePath();

    LEVELS.forEach((level, i) => {
      const p = points[i]!;
      const done = progress.completed.includes(level.id);
      const unlocked = level.id <= progress.unlocked;
      const current = unlocked && !done;
      const r = current ? 36 : 30;
      const g = this.add.graphics();
      g.fillStyle(done ? PAINT[dominantColor(level.targets)]! : current ? THEME.paper : THEME.emptyPixel, 1);
      g.fillCircle(p.x, p.y, r);
      g.lineStyle(current ? 6 : 3, THEME.ink, unlocked ? 1 : 0.3);
      g.strokeCircle(p.x, p.y, r);
      label(this, p.x, p.y, String(level.id), current ? THEME.type.md : THEME.type.sm, done ? '#ffffff' : THEME.inkCss)
        .setAlpha(unlocked ? 1 : 0.35);
      if (current) {
        label(this, p.x + (p.x < VIEW.width / 2 ? 130 : -130), p.y, levelTitle(level.id), THEME.type.sm, THEME.inkCss);
        this.tweens.add({ targets: g, alpha: 0.75, duration: 700, yoyo: true, repeat: -1 });
      }
      if (unlocked) {
        this.add
          .zone(p.x, p.y, r * 2.4, r * 2.4)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => {
            if (this.settings) return;
            sfx.unlock();
            this.scene.start('play', { levelId: level.id });
          });
      }
      this.nodes.push({ id: level.id, x: p.x, y: p.y, unlocked });
    });

    button(this, VIEW.width - 70, 60, 84, 64, '⚙', () => this.openSettings(), {
      fill: THEME.belt, color: THEME.inkCss, name: 'settings',
    });
    if (data.settings) this.openSettings();
    this.publish();
  }

  private openSettings(): void {
    if (this.settings) return;
    const progress = getProgress();
    const shade = fullBackground(this, THEME.ink, 0.45).setInteractive();
    const g = this.add.graphics();
    const w = 620;
    const h = 820;
    const x0 = (VIEW.width - w) / 2;
    const y0 = (VIEW.height - h) / 2;
    g.fillStyle(THEME.bg, 1);
    g.fillRoundedRect(x0, y0, w, h, THEME.radius.panel);
    const c = this.add.container(0, 0, [shade, g]).setDepth(10);
    c.add(label(this, VIEW.width / 2, y0 + 70, t('settings.title'), THEME.type.lg));
    this.settingsButtons = {};
    const add = (name: string, x: number, y: number, bw: number, bh: number, text: string, onClick: () => void, active = true) => {
      this.settingsButtons[name] = { x, y };
      c.add(button(this, x, y, bw, bh, text, onClick, {
        fill: active ? THEME.ink : THEME.belt, color: active ? '#ffffff' : THEME.inkCss, size: THEME.type.sm, name,
      }));
    };
    // Re-entering the scene with the panel open applies a language change to every label at once.
    const reopen = () => this.scene.restart({ settings: true });

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
      nodes: this.nodes,
      offsetY: viewOffset(this),
      settingsOpen: !!this.settings,
      settingsButtons: this.settings ? this.settingsButtons : {},
      language: getProgress().language,
      settingsButton: { x: VIEW.width - 70, y: 60 },
    });
  }
}
