import Phaser from 'phaser';
import { VIEW } from './core/layout';
import { HowToScene } from './game/scenes/HowToScene';
import { MenuScene } from './game/scenes/MenuScene';
import { PlayScene } from './game/scenes/PlayScene';
import { THEME } from './game/theme';

// Keep the 720-wide logical width; taller phones get a taller game instead of letterbox bands.
const aspect = window.innerHeight / Math.max(1, window.innerWidth);
const height = Math.round(Math.min(1700, Math.max(VIEW.height, VIEW.width * aspect)));

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: THEME.bgCss,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW.width,
    height,
  },
  input: { activePointers: 2 },
  scene: [MenuScene, PlayScene, HowToScene],
});
