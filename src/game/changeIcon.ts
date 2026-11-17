import type Phaser from 'phaser';
import type { ChangeKind } from '../core/difficulty';
import { BLUE, RED, YELLOW } from '../core/colors';
import { PAINT, THEME } from './theme';

type G = Phaser.GameObjects.Graphics;

/**
 * Icon of a difficulty change (#77), centred on (cx, cy) in a `s`-unit square, drawn with ink outlines and paint fills so
 * the kind is told by its shape, never by colour alone. Shared by the in-game banner and the design frames.
 */
export function drawChangeIcon(g: G, kind: ChangeKind, cx: number, cy: number, s: number): void {
  const r = s / 2;
  g.lineStyle(3, THEME.ink, 1);
  const box = (x: number, y: number, w: number, h: number, fill: number | null, radius: number = THEME.radius.cell) => {
    if (fill !== null) g.fillStyle(fill, 1).fillRoundedRect(x, y, w, h, radius);
    g.strokeRoundedRect(x, y, w, h, radius);
  };
  if (kind === 'belt') {
    // The belt ring with a few buckets on it.
    box(cx - r, cy - r, s, s, THEME.belt, THEME.radius.jar);
    box(cx - r * 0.45, cy - r * 0.45, r * 0.9, r * 0.9, THEME.paper);
    [[-0.78, -0.78, RED], [0.22, -0.78, YELLOW], [-0.78, 0.22, BLUE]].forEach(([dx, dy, c]) => {
      g.fillStyle(PAINT[c as number]!, 1).fillRoundedRect(cx + (dx as number) * r, cy + (dy as number) * r, r * 0.56, r * 0.56, 3);
    });
  } else if (kind === 'slots') {
    // Two waiting slots: one holds a bucket, one is empty.
    box(cx - r, cy - r * 0.5, r * 0.9, r, THEME.paper);
    box(cx + r * 0.1, cy - r * 0.5, r * 0.9, r, PAINT[YELLOW]!);
  } else if (kind === 'canvas') {
    // A grid of pixels.
    const c = s / 3;
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) box(cx - r + x * c + 1, cy - r + y * c + 1, c - 2, c - 2, (x + y) % 2 ? PAINT[BLUE]! : THEME.emptyPixel, 3);
  } else if (kind === 'columns') {
    // Three columns of buckets.
    const w = s / 3.4;
    [0, 1, 2].forEach((i) => {
      const x = cx - r + i * (w + (s - 3 * w) / 2);
      box(x, cy - r, w, s, THEME.belt, 4);
      g.fillStyle(PAINT[[RED, YELLOW, BLUE][i]!]!, 1).fillRoundedRect(x + 3, cy - r + 4, w - 6, w - 6, 3);
    });
  } else if (kind === 'chunk') {
    // Many small buckets.
    const c = s / 2.4;
    [0, 1].forEach((y) => [0, 1].forEach((x) => box(cx - r + x * (s - c), cy - r + y * (s - c), c, c, PAINT[[RED, YELLOW, BLUE, RED][y * 2 + x]!]!, 4)));
  } else {
    // A crown: the boss.
    g.fillStyle(THEME.gold, 1);
    g.fillTriangle(cx - r, cy + r * 0.6, cx - r, cy - r * 0.7, cx - r * 0.2, cy);
    g.fillTriangle(cx - r * 0.5, cy + r * 0.2, cx, cy - r, cx + r * 0.5, cy + r * 0.2);
    g.fillTriangle(cx + r, cy + r * 0.6, cx + r, cy - r * 0.7, cx + r * 0.2, cy);
    g.fillRect(cx - r, cy, s, r * 0.6);
    g.lineStyle(3, THEME.ink, 1);
    g.lineBetween(cx - r, cy + r * 0.6, cx + r, cy + r * 0.6);
    g.lineBetween(cx - r, cy + r * 0.6, cx - r, cy - r * 0.7);
    g.lineBetween(cx + r, cy + r * 0.6, cx + r, cy - r * 0.7);
    g.lineBetween(cx - r, cy - r * 0.7, cx - r * 0.2, cy);
    g.lineBetween(cx + r, cy - r * 0.7, cx + r * 0.2, cy);
    g.lineBetween(cx - r * 0.5, cy + r * 0.2, cx, cy - r);
    g.lineBetween(cx + r * 0.5, cy + r * 0.2, cx, cy - r);
  }
}
