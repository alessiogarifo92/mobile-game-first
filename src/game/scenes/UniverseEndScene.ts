import Phaser from 'phaser';
import { COLOR_CODES } from '../../core/colors';
import { VIEW } from '../../core/layout';
import { universeSkin, type Skin } from '../../core/album';
import { paintedTiles } from '../../core/mural';
import { universeLevels } from '../../core/universes';
import { universeName } from '../../core/i18n';
import { sfx } from '../audio';
import { publishDebug } from '../debug';
import { LEVELS, UNIVERSES, getProgress, t } from '../store';
import { PAINT, THEME } from '../theme';
import { drawSkin } from '../skins';
import { button, drawMural, drawMuralTile, label, lockIcon, screenBackground } from '../ui';

/** Time between two tiles joining the mural, and how long each takes to appear. */
const TILE_STEP_MS = 24;
const TILE_FADE_MS = 260;

/**
 * End of a universe (#91, peak-end): every tile of the universe's mural (#92) joins it one by one, its new bucket style
 * shows below, then the next universe's card opens with the button to go there, or says a new universe is on its way.
 * Shown once, on the win that completes the universe; the album can show it again.
 */
export class UniverseEndScene extends Phaser.Scene {
  private universe = 1;
  private done = false;
  private next: number | null = null;
  private goButton = { x: 0, y: 0 };
  private skin: Skin | null = null;

  constructor() {
    super('universeEnd');
  }

  relayoutData(): { universe: number } {
    return { universe: this.universe };
  }

  create(data: { universe?: number } = {}): void {
    this.universe = data.universe ?? 1;
    this.done = false;
    const info = UNIVERSES.find((u) => u.id === this.universe);
    const name = info ? universeName(getProgress().language, info.key) : '';
    screenBackground(this, THEME.bg);
    const off = this.scale.height - VIEW.height; // extra height on tall screens
    label(this, VIEW.width / 2, 90 + off / 4, t('universes.done'), THEME.type.lg);
    label(this, VIEW.width / 2, 150 + off / 4, t('universes.body', { name }), THEME.type.sm, THEME.subCss, false).setWordWrapWidth(VIEW.width - 120);

    // Mural (#92): the empty tiles first, then every tile of a painted level joins one by one.
    const tiles = paintedTiles(LEVELS, getProgress().completed, this.universe);
    const area = 500;
    const left = (VIEW.width - area) / 2;
    const top = 200 + off / 3;
    const frame = this.add.graphics();
    frame.fillStyle(THEME.paper, 1);
    frame.fillRoundedRect(left - 16, top - 16, area + 32, area + 32, THEME.radius.panel);
    drawMural(frame, this.universe, tiles.map(() => false), left, top, area);
    tiles.forEach((painted, i) => {
      if (!painted) return;
      const g = this.add.graphics().setAlpha(0);
      drawMuralTile(g, this.universe, i, left, top, area, true);
      this.tweens.add({ targets: g, alpha: 1, delay: i * TILE_STEP_MS, duration: TILE_FADE_MS });
    });
    const mosaicMs = tiles.length * TILE_STEP_MS + TILE_FADE_MS;

    // The universe's own bucket style (universes 2–5), shown under the mural.
    this.skin = universeSkin(this.universe);
    const skinY = top + area + 50;
    if (this.skin) {
      const jar = this.add.graphics();
      const jx = 130;
      jar.fillStyle(PAINT[COLOR_CODES[info?.color ?? 'R']!]!, 1);
      jar.fillRoundedRect(jx - 36, skinY - 36, 72, 72, THEME.radius.jar);
      drawSkin(jar, this.skin, jx, skinY, 72);
      jar.lineStyle(3, THEME.ink, 1);
      jar.strokeRoundedRect(jx - 36, skinY - 36, 72, 72, THEME.radius.jar);
      label(this, jx + 60, skinY, t('album.newSkin'), THEME.type.xs, THEME.inkCss).setOrigin(0, 0.5).setAlign('left').setWordWrapWidth(VIEW.width - jx - 120);
    }

    // Next universe: its card opens once the mosaic is complete.
    const next = UNIVERSES.find((u) => u.id === this.universe + 1 && universeLevels(LEVELS, u.id).length > 0);
    const cardY = top + area + 110;
    const card = this.add.graphics();
    card.fillStyle(THEME.paper, 1);
    card.fillRoundedRect(60, cardY, VIEW.width - 120, 120, THEME.radius.panel);
    if (next) {
      card.fillStyle(PAINT[COLOR_CODES[next.color]!]!, 1);
      card.fillRoundedRect(60, cardY, 28, 120, { tl: THEME.radius.panel, bl: THEME.radius.panel, tr: 0, br: 0 });
      const lock = this.add.graphics();
      lockIcon(lock, VIEW.width - 130, cardY + 60, 64);
      const status = label(this, 120, cardY + 60, t('universes.card', { n: next.id, name: universeName(getProgress().language, next.key) }), THEME.type.sm)
        .setOrigin(0, 0.5);
      this.time.delayedCall(mosaicMs, () => {
        status.setText(t('universes.opened', { n: next.id }));
        sfx.win();
        this.tweens.add({
          targets: lock, alpha: 0, y: -40, duration: 400, onComplete: () => {
            this.done = true;
            this.publish();
          },
        });
      });
    } else {
      label(this, VIEW.width / 2, cardY + 60, t('universes.soon'), THEME.type.sm, THEME.subCss, false).setWordWrapWidth(VIEW.width - 180);
      this.time.delayedCall(mosaicMs, () => {
        this.done = true;
        this.publish();
      });
    }

    const by = Math.min(this.scale.height - 80, cardY + 220);
    button(this, VIEW.width / 2, by, 460, 88, next ? t('universes.next', { n: next.id }) : t('win.map'), () => {
      this.scene.start('menu', next ? { universe: next.id } : {});
    }, { name: 'go' });
    this.next = next?.id ?? null;
    this.goButton = { x: VIEW.width / 2, y: by };
    this.publish();
  }

  private publish(): void {
    publishDebug({
      scene: 'universeEnd', universe: this.universe, next: this.next, done: this.done, goButton: this.goButton, newSkin: this.skin, scrollY: 0, offsetY: 0,
    });
  }
}
