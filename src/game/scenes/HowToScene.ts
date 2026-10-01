import Phaser from 'phaser';
import { BLUE, ORANGE, RED, YELLOW } from '../../core/colors';
import { VIEW } from '../../core/layout';
import type { MessageKey } from '../../core/i18n';
import { publishDebug } from '../debug';
import { t } from '../store';
import { PAINT, SYMBOL, THEME } from '../theme';
import { button, fullBackground, label, viewOffset } from '../ui';

const PAGES = 3;

/** "How to play": three illustrated cards, reachable from Settings. */
export class HowToScene extends Phaser.Scene {
  constructor() {
    super('howto');
  }

  create(data: { page?: number } = {}): void {
    const page = Math.min(Math.max(data.page ?? 0, 0), PAGES - 1);
    fullBackground(this, THEME.bg);
    label(this, VIEW.width / 2, 110, t('howto.title'), THEME.type.lg);

    const g = this.add.graphics();
    g.fillStyle(THEME.paper, 1);
    g.fillRoundedRect(60, 190, VIEW.width - 120, 560, THEME.radius.panel);
    this.illustrate(g, page);

    const n = page + 1;
    label(this, VIEW.width / 2, 820, t(`howto.${n}.title` as MessageKey), THEME.type.lg);
    label(this, VIEW.width / 2, 900, t(`howto.${n}.body` as MessageKey), THEME.type.sm, THEME.subCss, false)
      .setWordWrapWidth(VIEW.width - 120)
      .setOrigin(0.5, 0);

    // Page dots.
    for (let i = 0; i < PAGES; i++) {
      g.fillStyle(THEME.ink, i === page ? 1 : 0.2);
      g.fillCircle(VIEW.width / 2 + (i - 1) * 32, 1080, 9);
    }
    const last = page === PAGES - 1;
    button(this, VIEW.width / 2, 1170, 360, 88, t(last ? 'howto.done' : 'howto.next'), () => {
      if (last) this.scene.start('menu');
      else this.scene.restart({ page: page + 1 });
    }, { name: 'howto-next' });
    button(this, 60, 64, 84, 64, '◀', () => this.scene.start('menu', { settings: true }), {
      fill: THEME.belt, color: THEME.inkCss, name: 'home',
    });
    publishDebug({ scene: 'howto', page, offsetY: viewOffset(this), scrollY: this.cameras.main.scrollY, next: { x: VIEW.width / 2, y: 1170 } });
  }

  private jar(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, size = 84): void {
    g.fillStyle(PAINT[color]!, 1);
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, THEME.radius.jar);
    g.lineStyle(3, THEME.ink, 1);
    g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, THEME.radius.jar);
    label(this, x, y, SYMBOL[color]!, size * 0.3, '#ffffff');
  }

  private pixel(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, size = 90, half = 0): void {
    g.fillStyle(THEME.emptyPixel, 1);
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, THEME.radius.cell);
    g.fillStyle(PAINT[color]!, half ? 0.3 : 1);
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, THEME.radius.cell);
    if (half) {
      g.fillStyle(PAINT[half]!, 1);
      g.fillTriangle(x - size / 2, y - size / 2, x + size / 2, y - size / 2, x - size / 2, y + size / 2);
    }
  }

  private illustrate(g: Phaser.GameObjects.Graphics, page: number): void {
    const cx = VIEW.width / 2;
    if (page === 0) {
      // Column → belt around a small canvas.
      g.fillStyle(THEME.belt, 1);
      g.fillRoundedRect(cx - 170, 230, 340, 300, THEME.radius.panel);
      g.fillStyle(THEME.paper, 1);
      g.fillRoundedRect(cx - 110, 280, 220, 200, THEME.radius.cell);
      [RED, RED, BLUE].forEach((c, i) => this.pixel(g, cx - 70 + i * 70, 340, c, 60));
      [YELLOW, RED, RED].forEach((c, i) => this.pixel(g, cx - 70 + i * 70, 420, c, 60));
      this.jar(g, cx - 70, 505, RED, 56);
      this.jar(g, cx, 650, RED);
      g.lineStyle(6, THEME.ink, 0.6);
      g.lineBetween(cx, 600, cx - 60, 545);
    } else if (page === 1) {
      this.pixel(g, cx - 200, 420, RED);
      label(this, cx - 125, 420, '+', THEME.type.xl);
      this.pixel(g, cx - 50, 420, YELLOW);
      label(this, cx + 25, 420, '=', THEME.type.xl);
      this.pixel(g, cx + 100, 420, ORANGE, 90, RED);
      label(this, cx + 160, 420, '→', THEME.type.lg);
      this.pixel(g, cx + 230, 420, ORANGE, 70);
    } else {
      // Waiting slots, one free.
      for (let i = 0; i < 3; i++) {
        g.lineStyle(3, THEME.ink, 0.3);
        g.strokeRoundedRect(cx - 150 + i * 105 - 42, 380, 84, 84, THEME.radius.jar);
      }
      this.jar(g, cx - 150, 422, YELLOW);
      this.jar(g, cx - 45, 422, BLUE);
      label(this, cx + 60, 422, '?', THEME.type.lg, THEME.subCss);
    }
  }
}
