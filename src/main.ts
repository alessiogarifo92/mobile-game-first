import Phaser from 'phaser';
import { VIEW } from './core/layout';
import { screenHeight } from './core/screen';
import { AlbumScene } from './game/scenes/AlbumScene';
import { DataScene } from './game/scenes/DataScene';
import { HowToScene } from './game/scenes/HowToScene';
import { MenuScene } from './game/scenes/MenuScene';
import { PlayScene } from './game/scenes/PlayScene';
import { THEME } from './game/theme';

// The logical width is always 720; the height follows the screen (1280 for 16:9, taller for tall phones), and
// each scene lays itself out for it. Wider-than-tall screens (tablets, desktop windows) keep the portrait game
// centred with side bars: bucket and board sizes stay comfortable instead of stretching across a landscape window.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: THEME.bgCss,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW.width,
    height: screenHeight(window.innerWidth, window.innerHeight),
  },
  input: { activePointers: 2 },
  scene: [MenuScene, PlayScene, HowToScene, AlbumScene, DataScene],
});

/**
 * The window can change shape after the start (browser/PWA resize, split screen, foldables opening). The game
 * height follows, and the open scene is rebuilt for it, except in the middle of a level: that waits until the
 * level is over or left, so a resize never loses a game.
 */
function applyResize(): void {
  const wanted = screenHeight(window.innerWidth, window.innerHeight);
  if (wanted === game.scale.gameSize.height) return;
  const play = game.scene.getScene('play') as PlayScene;
  if (game.scene.isActive('play') && !play.canRelayout()) {
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
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(applyResize, 150);
});
