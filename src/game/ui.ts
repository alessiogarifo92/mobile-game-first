import Phaser from 'phaser';
import { VIEW } from '../core/layout';
import { THEME } from './theme';

const MIN_TOUCH = 88;

export interface ButtonOptions {
  fill?: number;
  color?: string;
  size?: number;
  name?: string;
}

/** Pill button: rounded rect + label + hit zone. Returns the container so callers can show/hide it. */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  opts: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(opts.fill ?? THEME.ink, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: THEME.font,
      fontSize: `${opts.size ?? THEME.type.md}px`,
      fontStyle: 'bold',
      color: opts.color ?? '#ffffff',
    })
    .setOrigin(0.5);
  // Touch area is at least 88 logical units (44 px on a 360 px wide phone) even when the drawing is smaller.
  const zone = scene.add.zone(0, 0, Math.max(w, MIN_TOUCH), Math.max(h, MIN_TOUCH)).setInteractive({ useHandCursor: true });
  zone.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
    e.stopPropagation();
    onClick();
  });
  const container = scene.add.container(x, y, [g, text, zone]);
  if (opts.name) container.setName(opts.name);
  return container;
}

export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number = THEME.type.md,
  color: string = THEME.inkCss,
  bold = true,
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, { fontFamily: THEME.font, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', color, align: 'center' })
    .setOrigin(0.5);
}

/** Logical content is 720x1280; taller screens get a taller game, and the camera centres the content. */
export function viewOffset(scene: Phaser.Scene): number {
  return (scene.scale.height - VIEW.height) / 2;
}

/** Centres the camera on the 1280-tall content and paints a background over the whole screen. */
export function fullBackground(scene: Phaser.Scene, color: number, alpha = 1): Phaser.GameObjects.Rectangle {
  const off = viewOffset(scene);
  scene.cameras.main.setScroll(0, -off);
  return scene.add.rectangle(0, -off, VIEW.width, scene.scale.height, color, alpha).setOrigin(0);
}
