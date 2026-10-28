import Phaser from 'phaser';
import { VIEW } from './core/layout';
import { relayoutAction, screenHeight } from './core/screen';
import { AlbumScene } from './game/scenes/AlbumScene';
import { DataScene } from './game/scenes/DataScene';
import { HowToScene } from './game/scenes/HowToScene';
import { MenuScene } from './game/scenes/MenuScene';
import { PlayScene } from './game/scenes/PlayScene';
import { UniverseEndScene } from './game/scenes/UniverseEndScene';
import { UniversesScene } from './game/scenes/UniversesScene';
import type { DrawnBounds } from './game/debug';
import { THEME } from './game/theme';

/** The element the game lives in: the screen minus the safe areas (notch, status and navigation bars). */
const host = document.getElementById('game')!;
const hostHeight = () => screenHeight(host.clientWidth, host.clientHeight);

// The logical width is always 720; the height follows the screen (1280 for 16:9, taller for tall phones), and
// each scene lays itself out for it. Wider-than-tall screens (tablets, desktop windows) keep the portrait game
// centred with side bars: bucket and board sizes stay comfortable instead of stretching across a landscape window.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: host,
  backgroundColor: THEME.bgCss,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW.width,
    height: hostHeight(),
  },
  input: { activePointers: 2 },
  scene: [MenuScene, PlayScene, HowToScene, AlbumScene, DataScene, UniversesScene, UniverseEndScene],
});

/**
 * The window can change shape after the start (browser/PWA resize, split screen, foldables opening). The game
 * height follows, and the open scene is rebuilt for it, except in the middle of a level: that waits until the
 * level is over or left, so a resize never loses a game.
 */
function applyResize(): void {
  // Phaser only listens to the window: when just the host changes (system bars, insets) it must be told to re-fit,
  // and a window resize event is the one path that re-reads the host size before fitting the canvas.
  window.dispatchEvent(new Event('resize'));
  const wanted = hostHeight();
  const play = game.scene.getScene('play') as PlayScene;
  const action = relayoutAction(game.scale.gameSize.height, wanted, !game.scene.isActive('play') || play.canRelayout());
  if (action === 'none') return;
  if (action === 'wait') {
    window.setTimeout(applyResize, 500);
    return;
  }
  game.scale.setGameSize(VIEW.width, wanted);
  for (const scene of game.scene.getScenes(true)) {
    // Each scene says what it needs to come back to the same page (scroll, stage, page, level).
    scene.scene.restart((scene as unknown as { relayoutData?: () => object }).relayoutData?.());
  }
}

let resizeTimer: number | undefined;
// Observing the host (not the window) also catches inset changes: system bars showing or hiding, a keyboard, split screen.
new ResizeObserver(() => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(applyResize, 150);
}).observe(host);

/** Read-only: where everything visible is, so tests can prove nothing is drawn or tappable outside the screen. */
window.__mixBounds = () => {
  const out: DrawnBounds[] = [];
  const kinds = new Set(['Text', 'Rectangle', 'Image', 'Zone', 'Arc']);
  const visit = (o: Phaser.GameObjects.GameObject, scene: string, inherited = 0): void => {
    const shown = o as Phaser.GameObjects.GameObject & { visible?: boolean; alpha?: number; depth?: number; list?: Phaser.GameObjects.GameObject[] };
    if (shown.visible === false || shown.alpha === 0) return;
    // Children count with the depth of the container they are in (the map's title bar and panels sit above the map).
    const depth = Math.max(shown.depth ?? 0, inherited);
    if (o.type === 'Container') {
      for (const child of shown.list ?? []) visit(child, scene, depth);
      return;
    }
    if (!kinds.has(o.type)) return;
    const b = (o as Phaser.GameObjects.Text).getBounds();
    out.push({ scene, type: o.type, depth, text: o.type === 'Text' ? (o as Phaser.GameObjects.Text).text : null, x: b.x, y: b.y, w: b.width, h: b.height });
  };
  for (const scene of game.scene.getScenes(true)) for (const o of scene.children.list) visit(o, scene.scene.key);
  return out;
};
