import Phaser from 'phaser';
import { VIEW } from '../../core/layout';
import { selectorLayout, universeCards, type Rect, type UniverseCard } from '../../core/universeMenu';
import { publishDebug } from '../debug';
import { LEVELS, UNIVERSES, getProgress, t, universeTitle } from '../store';
import { PAINT, THEME } from '../theme';
import { button, drawPicture, label, lockIcon, progressBar, screenBackground } from '../ui';

/**
 * Universe selector (#91): one card per universe with its name, colour and x/100. A closed universe stays visible
 * (padlock, silhouette of its first picture, the level that opens it) and a tap on it explains why it is closed.
 */
export class UniversesScene extends Phaser.Scene {
  private explained: number | null = null;
  private okButton: { x: number; y: number } | null = null;
  private cards: (UniverseCard & Rect)[] = [];

  constructor() {
    super('universes');
  }

  create(): void {
    this.explained = null;
    this.okButton = null;
    const { completed } = getProgress();
    screenBackground(this, THEME.bg);
    button(this, 60, 64, 84, 64, '◀', () => this.scene.start('menu'), { fill: THEME.belt, color: THEME.inkCss, name: 'home' });
    label(this, VIEW.width / 2, 64, t('universes.title'), THEME.type.lg);

    const list = universeCards(UNIVERSES, LEVELS, completed);
    const { cards } = selectorLayout(list.length, VIEW.width, this.scale.height);
    this.cards = list.map((c, i) => ({ ...c, ...cards[i]! }));
    for (const card of this.cards) this.drawCard(card, completed);
    this.publish();
  }

  private drawCard(card: UniverseCard & Rect, completed: readonly number[]): void {
    const { x, y, w, h } = card;
    const g = this.add.graphics();
    g.fillStyle(THEME.paper, 1);
    g.fillRoundedRect(x, y, w, h, THEME.radius.panel);
    // Theme colour as a band on the left; closed cards keep it, faded, so the universe is recognisable.
    g.fillStyle(PAINT[card.color]!, card.open ? 1 : 0.4);
    g.fillRoundedRect(x, y, 28, h, { tl: THEME.radius.panel, bl: THEME.radius.panel, tr: 0, br: 0 });
    g.lineStyle(3, card.open ? THEME.ink : THEME.belt, 1);
    g.strokeRoundedRect(x, y, w, h, THEME.radius.panel);

    // Preview: the universe's first picture, painted once completed (the mural of #92 will take its place).
    const pic = h - 40;
    const px = x + w - pic - 20;
    const first = LEVELS[card.firstLevel - 1]!;
    drawPicture(g, first, px, y + 20, pic, card.open && completed.includes(first.id));
    if (!card.open) lockIcon(g, px + pic / 2, y + 20 + pic / 2, Math.min(80, pic * 0.6));

    const textX = x + 52;
    const textW = px - textX - 20;
    label(this, textX, y + 44, universeTitle(card.id), THEME.type.sm).setOrigin(0, 0.5).setWordWrapWidth(textW);
    if (card.open) {
      progressBar(g, textX, y + h - 56, textW, 16, card.done / card.total, PAINT[card.color]!);
      label(this, textX, y + h - 86, t('map.progress', { done: card.done, total: card.total }), THEME.type.xs, THEME.subCss).setOrigin(0, 0.5);
      if (!card.complete) label(this, textX + textW, y + h - 86, t('map.comingSoon'), THEME.type.xs, THEME.subCss, false).setOrigin(1, 0.5);
    } else {
      label(this, textX, y + h - 60, t('universe.locked', { n: card.unlockLevel! }), THEME.type.xs, THEME.subCss, false)
        .setOrigin(0, 0.5).setWordWrapWidth(textW);
    }

    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      if (this.explained !== null) return;
      if (card.open) this.scene.start('menu', { universe: card.id });
      else this.explain(card);
    });
  }

  /** A tap on a closed card is never silent: the card shakes and a panel says which level opens it. */
  private explain(card: UniverseCard & Rect): void {
    this.explained = card.id;
    this.cameras.main.shake(180, 0.004);
    const shade = screenBackground(this, THEME.ink, 0.45).setInteractive();
    const pw = 560;
    const ph = 400;
    const py = (this.scale.height - ph) / 2;
    const g = this.add.graphics();
    g.fillStyle(THEME.bg, 1);
    g.fillRoundedRect((VIEW.width - pw) / 2, py, pw, ph, THEME.radius.panel);
    lockIcon(g, VIEW.width / 2, py + 80, 72);
    const title = label(this, VIEW.width / 2, py + 160, t('universes.closed'), THEME.type.md);
    const body = label(this, VIEW.width / 2, py + 230, t('universe.locked', { n: card.unlockLevel! }), THEME.type.sm, THEME.subCss, false)
      .setWordWrapWidth(pw - 80);
    this.okButton = { x: VIEW.width / 2, y: py + ph - 70 };
    const panel = this.add.container(0, 0, [shade, g, title, body]).setDepth(10);
    panel.add(button(this, this.okButton.x, this.okButton.y, 220, 80, t('universes.ok'), () => {
      panel.destroy();
      this.explained = null;
      this.okButton = null;
      this.publish();
    }, { name: 'ok' }));
    this.publish();
  }

  private publish(): void {
    publishDebug({
      scene: 'universes',
      cards: this.cards.map((c) => ({ id: c.id, open: c.open, done: c.done, total: c.total, unlockLevel: c.unlockLevel ?? null, x: c.x + c.w / 2, y: c.y + c.h / 2 })),
      explained: this.explained,
      okButton: this.okButton,
      scrollY: 0,
      offsetY: 0,
    });
  }
}
