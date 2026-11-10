import Phaser from 'phaser';
import { BLUE, BROWN, ORANGE, RED, YELLOW } from '../../core/colors';
import { HOWTO_PAGES, clampPage, howtoPages, pageAfterSwipe } from '../../core/howto';
import { VIEW } from '../../core/layout';
import type { MessageKey } from '../../core/i18n';
import { publishDebug } from '../debug';
import { getProgress, t } from '../store';
import { PAINT, SYMBOL, THEME, css } from '../theme';
import { TIP_ART_WIDTH, drawTipArt, hasSharedArt } from '../tipArt';
import { brownPixel, button, drawStone, keyIcon, label, lockIcon, screenBackground } from '../ui';

/** Gap, in logical units, between the base dots and the "unlocked rule" dots. */
const DOT_STEP = 32;
const DOT_GAP = 24;

/**
 * "How to play": illustrated cards, reachable from Settings. The HOWTO_PAGES base pages come first; then one page per
 * tip card the player has already met in a level and no base page covers (#183), drawn as that card and marked
 * "unlocked rule", with gold dots after a divider.
 */
export class HowToScene extends Phaser.Scene {
  private pageNow = 0;
  private count = HOWTO_PAGES;

  constructor() {
    super('howto');
  }

  relayoutData(): { page: number } {
    return { page: this.pageNow };
  }

  /** Opens another page; out of range does nothing (first page has no "back", the last has no "next"). */
  private go(target: number): void {
    const current = this.pageNow;
    if (target < 0 || target >= this.count || target === current) return;
    this.scene.restart({ page: target });
  }

  create(data: { page?: number } = {}): void {
    const pages = howtoPages(getProgress().seenTips);
    const count = pages.length;
    this.count = count;
    const page = clampPage(data.page ?? 0, count);
    this.pageNow = page;
    const current = pages[page]!;
    screenBackground(this, THEME.bg);
    label(this, VIEW.width / 2, 110, t('howto.title'), THEME.type.lg);

    // Taller screens: the card grows a little, the text follows it and the button goes to the bottom edge (thumb).
    const off = this.scale.height - VIEW.height; // extra height on tall screens
    const g = this.add.graphics();
    g.fillStyle(THEME.paper, 1);
    g.fillRoundedRect(60, 190, VIEW.width - 120, 560 + off / 2, THEME.radius.panel);
    const first = this.children.length;
    const art = this.add.graphics();
    let title: string;
    let body: string;
    if (current.kind === 'base') {
      this.illustrate(art, current.index);
      title = t(`howto.${current.index + 1}.title` as MessageKey);
      body = t(`howto.${current.index + 1}.body` as MessageKey);
    } else {
      const tip = current.tip;
      if (hasSharedArt(tip)) {
        // The very drawing of the in-game card, scaled up to fill this card around the usual illustration height.
        const box = this.add.container(VIEW.width / 2, 420);
        box.add(art);
        drawTipArt(this, art, (o) => box.add(o), tip, 0, -183, 4);
        box.setScale(Math.min(1.5, 540 / TIP_ART_WIDTH[tip]));
      }
      title = t(`tip.${tip}.title` as MessageKey);
      // The card breaks its lines for a narrow box; here the text wraps on its own. The belt shows a typical 4.
      body = t(`tip.${tip}.body` as MessageKey, { n: 4 }).replace(/\n/g, ' ');
    }
    // The illustration sits in the middle of the (taller) card.
    for (const child of this.children.list.slice(first)) (child as Phaser.GameObjects.Text).y += off / 4;
    if (current.kind === 'tip') this.unlockedBadge();

    label(this, VIEW.width / 2, 820 + off / 2, title, THEME.type.lg);
    label(this, VIEW.width / 2, 900 + off / 2, body, THEME.type.sm, THEME.subCss, false)
      .setWordWrapWidth(VIEW.width - 120)
      .setOrigin(0.5, 0);

    // Page dots (their own Graphics: `g` was shifted with the illustration): neutral for the base pages, gold with an
    // ink ring after a divider for the unlocked ones, the current one larger and ink.
    const dotY = 1080 + off * 0.75;
    const at = dotPositions(count);
    const dots = this.add.graphics();
    if (count > HOWTO_PAGES) {
      const dx = (at[HOWTO_PAGES - 1]! + at[HOWTO_PAGES]!) / 2;
      dots.fillStyle(THEME.ink, 0.45);
      dots.fillRect(dx - 1, dotY - 12, 2, 24);
    }
    for (let i = 0; i < count; i++) {
      if (i === page) {
        dots.fillStyle(THEME.ink, 1);
        dots.fillCircle(at[i]!, dotY, 12);
      } else if (i >= HOWTO_PAGES) {
        dots.fillStyle(THEME.gold, 1);
        dots.fillCircle(at[i]!, dotY, 9);
        dots.lineStyle(3, THEME.ink, 1);
        dots.strokeCircle(at[i]!, dotY, 9);
      } else {
        dots.fillStyle(THEME.ink, 0.2);
        dots.fillCircle(at[i]!, dotY, 9);
      }
    }
    const last = page === count - 1;
    button(this, VIEW.width / 2, 1170 + off, 360, 88, t(last ? 'howto.done' : 'howto.next'), () => {
      if (last) this.scene.start('menu');
      else this.scene.restart({ page: page + 1 });
    }, { name: 'howto-next' });
    // Swipe or arrow keys move between pages; the dots are tappable too.
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.go(pageAfterSwipe(page, p.x - p.downX, p.y - p.downY, count));
    });
    this.input.keyboard?.on('keydown-LEFT', () => this.go(page - 1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.go(page + 1));
    // Tap areas wider than the dots (64 apart, as many as fit across the screen), each one opening its page.
    const zone = Math.min(64, (VIEW.width - 120) / count);
    for (let i = 0; i < count; i++) {
      this.add.zone(VIEW.width / 2 + (i - (count - 1) / 2) * zone, dotY, zone, 88).setInteractive({ useHandCursor: true }).on('pointerup', () => this.go(i));
    }
    button(this, 60, 64, 84, 64, '◀', () => this.scene.start('menu', { settings: true }), {
      fill: THEME.belt, color: THEME.inkCss, name: 'home',
    });
    publishDebug({
      scene: 'howto', page, pages: count, tip: current.kind === 'tip' ? current.tip : null,
      offsetY: 0, scrollY: this.cameras.main.scrollY, next: { x: VIEW.width / 2, y: 1170 + off },
    });
  }

  /** Gold "unlocked rule" pill in the top right corner of the card. */
  private unlockedBadge(): void {
    const text = label(this, 0, 0, t('howto.unlocked'), THEME.type.xs, THEME.inkCss);
    const w = text.width + 32;
    const right = VIEW.width - 60 - 20;
    const y = 190 + 20 + 22;
    const g = this.add.graphics();
    g.fillStyle(THEME.gold, 1);
    g.fillRoundedRect(right - w, y - 22, w, 44, 22);
    text.setPosition(right - w / 2, y).setDepth(1);
  }

  /** `color` null: a covered bucket, "?" on the cover colour. */
  private jar(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number | null, size = 84): void {
    g.fillStyle(color === null ? THEME.hidden : PAINT[color]!, 1);
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, THEME.radius.jar);
    g.lineStyle(3, THEME.ink, 1);
    g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, THEME.radius.jar);
    label(this, x, y, color === null ? '?' : SYMBOL[color]!, size * (color === null ? 0.4 : 0.3), '#ffffff');
  }

  private pixel(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, size = 90, half = 0, ghost = false): void {
    g.fillStyle(THEME.emptyPixel, 1);
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, THEME.radius.cell);
    g.fillStyle(PAINT[color]!, half || ghost ? 0.3 : 1);
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
    } else if (page === 4) {
      // Stones (#95): the drop from the left stops on the stone; the pixel behind takes paint from the right.
      label(this, cx - 170, 420, '●→', THEME.type.lg, css(PAINT[RED]!));
      drawStone(g, cx - 100, 375, 90, 90);
      // An unfinished pixel: the ghost of the colour it still needs.
      g.fillStyle(THEME.emptyPixel, 1);
      g.fillRoundedRect(cx + 20, 375, 90, 90, THEME.radius.cell);
      g.fillStyle(PAINT[RED]!, 0.3);
      g.fillRoundedRect(cx + 36, 391, 58, 58, THEME.radius.cell);
      label(this, cx + 180, 420, '←●', THEME.type.lg, css(PAINT[RED]!));
    } else if (page === 5) {
      // A key pixel, then the padlocked pixel it opens.
      this.pixel(g, cx - 150, 420, YELLOW);
      keyIcon(g, cx - 150, 420, 70);
      label(this, cx - 30, 420, '→', THEME.type.xl);
      this.pixel(g, cx + 110, 420, RED, 90, 0, true);
      lockIcon(g, cx + 110, 420, 64);
    } else if (page === 2) {
      // Waiting slots, one free.
      for (let i = 0; i < 3; i++) {
        g.lineStyle(3, THEME.ink, 0.3);
        g.strokeRoundedRect(cx - 105 + i * 105 - 42, 380, 84, 84, THEME.radius.jar);
      }
      this.jar(g, cx - 105, 422, YELLOW);
      this.jar(g, cx, 422, BLUE);
      label(this, cx + 105, 422, '?', THEME.type.lg, THEME.subCss);
    } else {
      // A column with covered buckets behind the front → the next one shows its colour at the top.
      g.fillStyle(THEME.belt, 1);
      g.fillRoundedRect(cx - 230, 260, 140, 330, THEME.radius.jar);
      g.fillRoundedRect(cx + 90, 260, 140, 330, THEME.radius.jar);
      this.jar(g, cx - 160, 320, RED);
      this.jar(g, cx - 160, 420, null, 70);
      this.jar(g, cx - 160, 510, null, 70);
      label(this, cx, 420, '→', THEME.type.xl);
      this.jar(g, cx + 160, 320, BLUE);
      this.jar(g, cx + 160, 420, null, 70);
    }
  }
}

/** x of each page dot: DOT_STEP apart, with an extra DOT_GAP before the first unlocked page, centred on the screen. */
function dotPositions(count: number): number[] {
  const raw = Array.from({ length: count }, (_, i) => i * DOT_STEP + (i >= HOWTO_PAGES ? DOT_GAP : 0));
  const span = raw[count - 1]!;
  return raw.map((x) => VIEW.width / 2 - span / 2 + x);
}
