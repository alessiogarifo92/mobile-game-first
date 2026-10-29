import Phaser from 'phaser';
import { BLUE, BROWN, ORANGE, RED, YELLOW } from '../../core/colors';
import { HOWTO_PAGES, clampPage, pageAfterSwipe } from '../../core/howto';
import { VIEW } from '../../core/layout';
import type { MessageKey } from '../../core/i18n';
import { publishDebug } from '../debug';
import { t } from '../store';
import { PAINT, SYMBOL, THEME } from '../theme';
import { brownPixel, button, label, screenBackground } from '../ui';

const PAGES = HOWTO_PAGES;

/** "How to play": illustrated cards (one per HOWTO_PAGES), reachable from Settings. */
export class HowToScene extends Phaser.Scene {
  private pageNow = 0;

  constructor() {
    super('howto');
  }

  relayoutData(): { page: number } {
    return { page: this.pageNow };
  }

  /** Opens another page; out of range does nothing (first page has no "back", the last has no "next"). */
  private go(target: number): void {
    const current = this.pageNow;
    if (target < 0 || target >= PAGES || target === current) return;
    this.scene.restart({ page: target });
  }

  create(data: { page?: number } = {}): void {
    const page = clampPage(data.page ?? 0);
    this.pageNow = page;
    screenBackground(this, THEME.bg);
    label(this, VIEW.width / 2, 110, t('howto.title'), THEME.type.lg);

    // Taller screens: the card grows a little, the text follows it and the button goes to the bottom edge (thumb).
    const off = this.scale.height - VIEW.height; // extra height on tall screens
    const g = this.add.graphics();
    g.fillStyle(THEME.paper, 1);
    g.fillRoundedRect(60, 190, VIEW.width - 120, 560 + off / 2, THEME.radius.panel);
    const first = this.children.length;
    const art = this.add.graphics();
    this.illustrate(art, page);
    // The illustration sits in the middle of the (taller) card.
    for (const child of this.children.list.slice(first)) (child as Phaser.GameObjects.Text).y += off / 4;

    const n = page + 1;
    label(this, VIEW.width / 2, 820 + off / 2, t(`howto.${n}.title` as MessageKey), THEME.type.lg);
    label(this, VIEW.width / 2, 900 + off / 2, t(`howto.${n}.body` as MessageKey), THEME.type.sm, THEME.subCss, false)
      .setWordWrapWidth(VIEW.width - 120)
      .setOrigin(0.5, 0);

    // Page dots (their own Graphics: `g` was shifted with the illustration).
    const dots = this.add.graphics();
    for (let i = 0; i < PAGES; i++) {
      dots.fillStyle(THEME.ink, i === page ? 1 : 0.2);
      dots.fillCircle(VIEW.width / 2 + (i - (PAGES - 1) / 2) * 32, 1080 + off * 0.75, 9);
    }
    const last = page === PAGES - 1;
    button(this, VIEW.width / 2, 1170 + off, 360, 88, t(last ? 'howto.done' : 'howto.next'), () => {
      if (last) this.scene.start('menu');
      else this.scene.restart({ page: page + 1 });
    }, { name: 'howto-next' });
    // Swipe or arrow keys move between pages; the dots are tappable too.
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.go(pageAfterSwipe(page, p.x - p.downX, p.y - p.downY));
    });
    this.input.keyboard?.on('keydown-LEFT', () => this.go(page - 1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.go(page + 1));
    for (let i = 0; i < PAGES; i++) {
      this.add.zone(VIEW.width / 2 + (i - (PAGES - 1) / 2) * 64, 1080 + off * 0.75, 64, 88).setInteractive({ useHandCursor: true }).on('pointerup', () => this.go(i));
    }
    button(this, 60, 64, 84, 64, '◀', () => this.scene.start('menu', { settings: true }), {
      fill: THEME.belt, color: THEME.inkCss, name: 'home',
    });
    publishDebug({ scene: 'howto', page, offsetY: 0, scrollY: this.cameras.main.scrollY, next: { x: VIEW.width / 2, y: 1170 + off } });
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
      // Whole row centred on the card, with room around the operators.
      this.pixel(g, cx - 205, 420, RED);
      label(this, cx - 140, 420, '+', THEME.type.xl);
      this.pixel(g, cx - 75, 420, YELLOW);
      label(this, cx - 10, 420, '=', THEME.type.xl);
      this.pixel(g, cx + 55, 420, ORANGE, 90, RED);
      label(this, cx + 135, 420, '→', THEME.type.lg);
      this.pixel(g, cx + 215, 420, ORANGE, 70);
    } else if (page === 3) {
      // Red + yellow + blue = brown; below, a brown pixel still missing its blue wedge.
      this.pixel(g, cx - 225, 360, RED, 80);
      label(this, cx - 165, 360, '+', THEME.type.lg);
      this.pixel(g, cx - 105, 360, YELLOW, 80);
      label(this, cx - 45, 360, '+', THEME.type.lg);
      this.pixel(g, cx + 15, 360, BLUE, 80);
      label(this, cx + 85, 360, '=', THEME.type.lg);
      this.pixel(g, cx + 165, 360, BROWN, 80);
      g.fillStyle(THEME.emptyPixel, 1);
      g.fillRoundedRect(cx - 165, 485, 110, 110, THEME.radius.cell);
      g.fillStyle(PAINT[BROWN]!, 0.3);
      g.fillRoundedRect(cx - 145, 505, 70, 70, THEME.radius.cell);
      brownPixel(g, cx - 165, 485, 110, 110, RED | YELLOW);
      this.jar(g, cx + 20, 540, BLUE, 70);
      label(this, cx + 90, 540, '→', THEME.type.lg);
      this.pixel(g, cx + 170, 540, BROWN, 90);
    } else {
      // Waiting slots, one free.
      for (let i = 0; i < 3; i++) {
        g.lineStyle(3, THEME.ink, 0.3);
        g.strokeRoundedRect(cx - 105 + i * 105 - 42, 380, 84, 84, THEME.radius.jar);
      }
      this.jar(g, cx - 105, 422, YELLOW);
      this.jar(g, cx, 422, BLUE);
      label(this, cx + 105, 422, '?', THEME.type.lg, THEME.subCss);
    }
  }
}
