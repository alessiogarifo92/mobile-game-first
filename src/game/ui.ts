import Phaser from 'phaser';
import { VIEW } from '../core/layout';
import type { Level } from '../core/level';
import { brownWedges } from '../core/brownPixel';
import { PRIMARIES } from '../core/colors';
import { MURAL_SIDE, TILE_CELLS, tileCells } from '../core/mural';
import { MURAL_PAINT, PAINT, THEME } from './theme';

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

/** Paints a background over the whole screen with the camera at the origin: play-space y runs 0 → screen height. */
export function screenBackground(scene: Phaser.Scene, color: number, alpha = 1): Phaser.GameObjects.Rectangle {
  scene.cameras.main.setScroll(0, 0);
  return scene.add.rectangle(0, 0, VIEW.width, scene.scale.height, color, alpha).setOrigin(0);
}

/** Progress bar: a belt-coloured track filled to `fraction` with `color` (the numbers go in a label beside it). */
export function progressBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fraction: number, color: number): void {
  g.fillStyle(THEME.belt, 1);
  g.fillRoundedRect(x, y, w, h, h / 2);
  const filled = Math.max(0, Math.min(1, fraction)) * w;
  if (filled > 0) {
    g.fillStyle(color, 1);
    g.fillRoundedRect(x, y, Math.max(filled, h), h, h / 2);
  }
}

/** Padlock centred on (x, y), `size` tall: a shape, so "closed" never rests on colour alone. */
export function lockIcon(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, color: number = THEME.ink): void {
  const w = size * 0.8;
  const body = size * 0.55;
  g.lineStyle(size * 0.12, color, 1);
  g.beginPath();
  g.arc(x, y - size / 2 + size * 0.32, w * 0.32, Math.PI, 0);
  g.strokePath();
  g.lineBetween(x - w * 0.32, y - size / 2 + size * 0.32, x - w * 0.32, y + size / 2 - body);
  g.lineBetween(x + w * 0.32, y - size / 2 + size * 0.32, x + w * 0.32, y + size / 2 - body);
  g.fillStyle(color, 1);
  g.fillRoundedRect(x - w / 2, y + size / 2 - body, w, body, size * 0.1);
}

/** A level's picture fitted in a `size` square at (x, y): painted, or as a silhouette in the empty-pixel colour. */
export function drawPicture(g: Phaser.GameObjects.Graphics, level: Level, x: number, y: number, size: number, painted: boolean): void {
  const cell = size / Math.max(level.width, level.height);
  const ox = x + (size - cell * level.width) / 2;
  const oy = y + (size - cell * level.height) / 2;
  level.targets.forEach((target, i) => {
    if (!target) return;
    g.fillStyle(painted ? PAINT[target]! : THEME.emptyPixel, 1);
    g.fillRect(ox + (i % level.width) * cell, oy + Math.floor(i / level.width) * cell, Math.ceil(cell), Math.ceil(cell));
  });
}

/**
 * One tile of a universe's mural (#92), in a mural `size` wide at (x, y): its cells when painted, else an empty tile
 * with a small gap around it, so the missing pieces read as boxes still to fill.
 */
export function drawMuralTile(g: Phaser.GameObjects.Graphics, universe: number, tile: number, x: number, y: number, size: number, painted: boolean): void {
  const side = size / MURAL_SIDE;
  const tx = x + (tile % MURAL_SIDE) * side, ty = y + Math.floor(tile / MURAL_SIDE) * side;
  if (!painted) {
    const gap = Math.max(1, side * 0.06);
    g.fillStyle(THEME.emptyPixel, 1);
    g.fillRect(tx + gap, ty + gap, side - 2 * gap, side - 2 * gap);
    return;
  }
  const cell = side / TILE_CELLS;
  tileCells(universe, tile).forEach((row, j) => row.forEach((code, i) => {
    g.fillStyle(MURAL_PAINT[code]!, 1);
    g.fillRect(tx + i * cell, ty + j * cell, Math.ceil(cell), Math.ceil(cell));
  }));
}

/** A universe's whole mural in a `size` square at (x, y) on a paper frame: painted tiles in colour, the others empty. */
export function drawMural(g: Phaser.GameObjects.Graphics, universe: number, painted: readonly boolean[], x: number, y: number, size: number): void {
  g.fillStyle(THEME.paper, 1);
  g.fillRect(x, y, size, size);
  painted.forEach((p, tile) => drawMuralTile(g, universe, tile, x, y, size, p));
}

/**
 * Unfinished brown pixel (#94), drawn over its empty background: each received primary fills its own wedge, and thin
 * dividers mark the three parts, so what is missing reads by position as well as by colour.
 */
export function brownPixel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, paint: number): void {
  const wedges = brownWedges(x, y, w, h);
  for (const p of PRIMARIES) {
    if (!(paint & p)) continue;
    g.fillStyle(PAINT[p]!, 1);
    g.fillPoints(wedges[p].map(([px, py]) => new Phaser.Math.Vector2(px, py)), true);
  }
  g.lineStyle(Math.max(1, w / 24), THEME.ink, 0.35);
  for (const p of PRIMARIES) {
    const [[cx, cy], [ex, ey]] = wedges[p] as [readonly [number, number], readonly [number, number]];
    g.lineBetween(cx, cy, ex, ey);
  }
}
