import Phaser from 'phaser';
import { BLUE, RED, YELLOW } from '../core/colors';
import type { CardTip } from '../core/onboarding';
import { PAINT, THEME, css } from './theme';
import { drawIce, drawStone, label } from './ui';

/** Tips whose illustration is shared by the in-game card and How to play (#183): the rules How to play has no base page for. */
export type SharedTipArt = 'ice' | 'belt' | 'hidden' | 'queue' | 'leftover' | 'stone';

export function hasSharedArt(id: CardTip): id is SharedTipArt {
  return id === 'ice' || id === 'belt' || id === 'hidden' || id === 'queue' || id === 'leftover' || id === 'stone';
}

/** Horizontal extent of each illustration (belt at 4 buckets), so How to play can scale it to its card. */
export const TIP_ART_WIDTH: Record<SharedTipArt, number> = { ice: 370, belt: 370, hidden: 390, queue: 320, leftover: 500, stone: 300 };

/**
 * Draws a tip's illustration around (cx, y0): y0 is the top of the in-game tip card, so the art sits where it always has.
 * Shapes go on `g`; each text object is created on the scene and handed to `add` (the caller's container).
 */
export function drawTipArt(
  scene: Phaser.Scene,
  g: Phaser.GameObjects.Graphics,
  add: (o: Phaser.GameObjects.GameObject) => void,
  id: SharedTipArt,
  cx: number,
  y0: number,
  beltCapacity: number,
): void {
  const sq = (gx: number, gy: number, fill: number, alpha = 1) => {
    g.fillStyle(fill, alpha);
    g.fillRoundedRect(gx - 24, gy - 24, 48, 48, THEME.radius.cell);
  };
  if (id === 'ice') {
    // Frozen → ice broken → painted.
    const y = y0 + 200;
    sq(cx - 160, y, THEME.emptyPixel);
    sq(cx - 160, y, PAINT[RED]!, 0.3);
    drawIce(g, cx - 160 - 24, y - 24, 48, 48);
    sq(cx, y, THEME.emptyPixel);
    sq(cx, y, PAINT[RED]!, 0.3);
    sq(cx + 160, y, PAINT[RED]!);
    add(label(scene, cx - 80, y, '●→', THEME.type.sm, css(PAINT[RED]!)));
    add(label(scene, cx + 80, y, '●→', THEME.type.sm, css(PAINT[RED]!)));
  } else if (id === 'belt') {
    // As many buckets as the belt holds, then one more that cannot board.
    const n = Math.min(beltCapacity, 5);
    const y = y0 + 200;
    const colors = [RED, YELLOW, BLUE];
    const left = cx - (n * 80) / 2;
    for (let k = 0; k < n; k++) sq(left + k * 80, y, PAINT[colors[k % 3]!]!);
    sq(left + n * 80, y, PAINT[colors[n % 3]!]!, 0.3);
    add(label(scene, left + n * 80, y, '✕', THEME.type.md, THEME.inkCss));
  } else if (id === 'hidden') {
    // "?" next to a pixel: finish the neighbour, the colour shows.
    const y = y0 + 200;
    sq(cx - 200, y, PAINT[RED]!, 0.3);
    sq(cx - 140, y, THEME.hidden);
    add(label(scene, cx - 140, y, '?', THEME.type.md, '#ffffff'));
    add(label(scene, cx - 30, y, '→', THEME.type.lg));
    sq(cx + 80, y, PAINT[RED]!);
    sq(cx + 140, y, THEME.emptyPixel);
    sq(cx + 140, y, PAINT[BLUE]!, 0.3);
  } else if (id === 'stone') {
    // Two lanes through the same stone and pixel (#147). Top: the drop from the left bursts on the stone and the pixel
    // behind stays unpainted (✕). Bottom: the drop from the right meets the pixel first and paints it.
    const ya = y0 + 140;
    const yb = y0 + 220;
    const stoneX = cx - 40;
    const pixelX = cx + 20;
    add(label(scene, cx - 110, ya, '●→', THEME.type.sm, css(PAINT[RED]!)));
    drawStone(g, stoneX - 24, ya - 24, 48, 48);
    g.fillStyle(THEME.stoneDark, 1);
    [[-30, -10, 4], [-34, 6, 3], [-28, 16, 2]].forEach(([dx, dy, r]) => g.fillCircle(stoneX + dx!, ya + dy!, r!));
    sq(pixelX, ya, THEME.emptyPixel);
    sq(pixelX, ya, PAINT[RED]!, 0.3);
    add(label(scene, pixelX, ya, '✕', THEME.type.md, THEME.inkCss));
    drawStone(g, stoneX - 24, yb - 24, 48, 48);
    sq(pixelX, yb, PAINT[RED]!);
    add(label(scene, cx + 90, yb, '←●', THEME.type.sm, css(PAINT[RED]!)));
  } else if (id === 'queue') {
    // A column shows three buckets and "+2": two more wait behind them, out of sight.
    const jarAt = (bx: number, by: number, fill: number, alpha: number) => {
      g.fillStyle(fill, alpha);
      g.fillRoundedRect(bx - 22, by - 18, 44, 36, THEME.radius.jar / 2);
      g.lineStyle(2, THEME.ink, alpha);
      g.strokeRoundedRect(bx - 22, by - 18, 44, 36, THEME.radius.jar / 2);
    };
    const colX = cx - 110;
    g.fillStyle(THEME.ink, 0.06);
    g.fillRoundedRect(colX - 34, y0 + 104, 68, 140, THEME.radius.jar);
    [RED, YELLOW, BLUE].forEach((col, k) => jarAt(colX, y0 + 128 + k * 44, PAINT[col]!, k === 0 ? 1 : 0.55));
    add(label(scene, colX, y0 + 262, '+2', THEME.type.sm, THEME.subCss));
    add(label(scene, cx, y0 + 190, '=', THEME.type.lg));
    jarAt(cx + 90, y0 + 190, THEME.hidden, 0.35);
    jarAt(cx + 150, y0 + 190, THEME.hidden, 0.35);
    add(label(scene, cx + 120, y0 + 236, '2', THEME.type.sm, THEME.subCss));
  } else {
    // A bucket of 4 finds only 3 pixels of its colour in reach: 1 shot of paint comes back ("↩1").
    const y = y0 + 190;
    const bucket = (bx: number, n: string) => {
      g.fillStyle(PAINT[RED]!, 1);
      g.fillRoundedRect(bx - 30, y - 30, 60, 60, THEME.radius.jar);
      g.lineStyle(3, THEME.ink, 1);
      g.strokeRoundedRect(bx - 30, y - 30, 60, 60, THEME.radius.jar);
      add(label(scene, bx, y, n, THEME.type.md, '#ffffff'));
    };
    // Then the same pill as a warning (#176): "!" when that paint would take the last free slot.
    const pill = (px: number, text: string, risky: boolean) => {
      const pw = risky ? 76 : 64;
      g.fillStyle(risky ? THEME.ink : THEME.gold, 1);
      g.fillRoundedRect(px - pw / 2, y - 66, pw, 32, 16);
      g.lineStyle(3, risky ? THEME.white : THEME.ink, 1);
      g.strokeRoundedRect(px - pw / 2, y - 66, pw, 32, 16);
      add(label(scene, px, y - 50, text, THEME.type.xs, risky ? '#FFFFFF' : THEME.inkCss));
    };
    bucket(cx - 240, '4');
    add(label(scene, cx - 180, y, '→', THEME.type.md));
    [0, 1, 2].forEach((k) => sq(cx - 122 + k * 54, y, PAINT[RED]!));
    add(label(scene, cx - 6, y, '→', THEME.type.md));
    bucket(cx + 64, '1');
    pill(cx + 64, '↩1', false);
    bucket(cx + 200, '1');
    pill(cx + 200, '↩1!', true);
  }
}
