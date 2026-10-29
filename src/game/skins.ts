import type Phaser from 'phaser';
import { BLUE, GREEN, RED, YELLOW } from '../core/colors';
import { parseSkin, type Skin } from '../core/album';
import { PAINT, SKIN_COLORS, THEME } from './theme';

/**
 * Bucket decorations unlocked by completing stages and universes, drawn over the bucket's paint colour.
 * Patterns only: the paint colour stays readable, which is what the player needs.
 */
export function drawSkin(g: Phaser.GameObjects.Graphics, skin: Skin, x: number, y: number, size: number, alpha = 1): void {
  const l = x - size / 2, t = y - size / 2, s = size;
  const a = 0.35 * alpha;
  const { pattern, variant } = parseSkin(skin);
  const [main, accent] = variant ? SKIN_COLORS.variants[variant - 1]! : SKIN_COLORS.own;
  // Universe skins draw solid shapes in their palette: a thin ink edge keeps them visible on a bucket of the same colour.
  const edge = () => g.lineStyle(Math.max(1, s * 0.025), THEME.ink, 0.5 * alpha);
  switch (pattern) {
    case 'classic':
      return;
    case 'dots':
      g.fillStyle(THEME.white, a);
      for (const [dx, dy] of [[0.25, 0.3], [0.7, 0.25], [0.5, 0.55], [0.22, 0.78], [0.78, 0.75]]) g.fillCircle(l + dx! * s, t + dy! * s, s * 0.07);
      return;
    case 'stripes':
      g.lineStyle(s * 0.07, THEME.white, a);
      for (let k = -1; k < 3; k++) g.lineBetween(l + k * s * 0.35, t + s, l + (k + 1) * s * 0.35, t);
      return;
    case 'spots':
      g.fillStyle(THEME.ink, a);
      for (const [dx, dy, r] of [[0.3, 0.35, 0.11], [0.68, 0.6, 0.13], [0.35, 0.75, 0.07]]) g.fillCircle(l + dx! * s, t + dy! * s, r! * s);
      return;
    case 'leaves':
      g.fillStyle(PAINT[GREEN]!, 0.8 * alpha);
      g.fillEllipse(l + s * 0.3, t + s * 0.12, s * 0.3, s * 0.14);
      g.fillEllipse(l + s * 0.7, t + s * 0.12, s * 0.3, s * 0.14);
      return;
    case 'waves':
      g.lineStyle(s * 0.06, THEME.white, a);
      for (const dy of [0.35, 0.65]) {
        g.beginPath();
        for (let k = 0; k <= 8; k++) {
          const px = l + (k / 8) * s, py = t + dy * s + Math.sin(k * 1.6) * s * 0.06;
          if (k === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.strokePath();
      }
      return;
    case 'checks':
      g.fillStyle(THEME.white, a);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) g.fillRect(l + i * s / 4, t + j * s / 4, s / 4, s / 4);
      return;
    case 'sprinkles': {
      const colors = [PAINT[RED]!, PAINT[YELLOW]!, PAINT[BLUE]!, PAINT[GREEN]!, THEME.white];
      [[0.2, 0.3], [0.55, 0.2], [0.75, 0.45], [0.3, 0.6], [0.6, 0.75], [0.2, 0.82]].forEach(([dx, dy], k) => {
        g.fillStyle(colors[k % colors.length]!, 0.9 * alpha);
        g.fillRect(l + dx! * s, t + dy! * s, s * 0.12, s * 0.05);
      });
      return;
    }
    case 'racing':
      g.fillStyle(THEME.white, 0.55 * alpha);
      g.fillRect(l + s * 0.4, t, s * 0.08, s);
      g.fillRect(l + s * 0.52, t, s * 0.08, s);
      return;
    case 'stars':
      g.fillStyle(THEME.white, 0.6 * alpha);
      for (const [dx, dy, r] of [[0.28, 0.3, 0.07], [0.72, 0.4, 0.05], [0.45, 0.72, 0.06]]) {
        const cx = l + dx! * s, cy = t + dy! * s, rr = r! * s;
        g.fillTriangle(cx - rr, cy, cx + rr, cy, cx, cy - rr * 2);
        g.fillTriangle(cx - rr, cy, cx + rr, cy, cx, cy + rr * 2);
      }
      return;
    case 'gold':
      g.lineStyle(s * 0.08, THEME.gold, alpha);
      g.strokeRoundedRect(l + s * 0.06, t + s * 0.06, s * 0.88, s * 0.88, THEME.radius.jar * 0.8);
      g.fillStyle(THEME.gold, alpha);
      g.fillTriangle(l + s * 0.5, t + s * 0.08, l + s * 0.42, t + s * 0.22, l + s * 0.58, t + s * 0.22);
      return;
    case 'petals':
      // Two flowers: five petals around a heart.
      for (const [dx, dy] of [[0.28, 0.3], [0.72, 0.7]]) {
        const cx = l + dx! * s, cy = t + dy! * s, r = s * 0.075;
        g.fillStyle(main, alpha);
        edge();
        for (let k = 0; k < 5; k++) {
          const angle = (k / 5) * Math.PI * 2 - Math.PI / 2;
          g.fillCircle(cx + Math.cos(angle) * r * 1.3, cy + Math.sin(angle) * r * 1.3, r);
          g.strokeCircle(cx + Math.cos(angle) * r * 1.3, cy + Math.sin(angle) * r * 1.3, r);
        }
        g.fillStyle(accent, alpha);
        g.fillCircle(cx, cy, r * 0.8);
      }
      return;
    case 'stamps':
      // A postage stamp: perforated edge all round and a round postmark.
      g.fillStyle(main, alpha);
      for (let k = 0; k < 6; k++) {
        const p = 0.12 + k * 0.152;
        for (const [px, py] of [[p, 0.1], [p, 0.9], [0.1, p], [0.9, p]]) g.fillCircle(l + px! * s, t + py! * s, s * 0.035);
      }
      edge();
      g.strokeCircle(l + s * 0.5, t + s * 0.5, s * 0.2);
      g.lineStyle(s * 0.05, accent, alpha);
      g.strokeCircle(l + s * 0.5, t + s * 0.5, s * 0.17);
      return;
    case 'bubbles':
      // Bubbles of three sizes, each with a highlight.
      for (const [dx, dy, r] of [[0.3, 0.32, 0.13], [0.7, 0.5, 0.09], [0.42, 0.74, 0.07]]) {
        const cx = l + dx! * s, cy = t + dy! * s, rr = r! * s;
        g.fillStyle(main, 0.75 * alpha);
        g.fillCircle(cx, cy, rr);
        edge();
        g.strokeCircle(cx, cy, rr);
        g.fillStyle(accent, alpha);
        g.fillCircle(cx - rr * 0.35, cy - rr * 0.35, rr * 0.3);
      }
      return;
    case 'orbits': {
      // A planet on its orbit, and two small stars.
      edge();
      g.strokeEllipse(l + s * 0.5, t + s * 0.5, s * 0.84, s * 0.36);
      g.lineStyle(s * 0.04, main, alpha);
      g.strokeEllipse(l + s * 0.5, t + s * 0.5, s * 0.8, s * 0.32);
      g.fillStyle(accent, alpha);
      g.fillCircle(l + s * 0.82, t + s * 0.45, s * 0.09);
      edge();
      g.strokeCircle(l + s * 0.82, t + s * 0.45, s * 0.09);
      g.fillStyle(main, alpha);
      for (const [dx, dy] of [[0.25, 0.2], [0.6, 0.82]]) g.fillCircle(l + dx! * s, t + dy! * s, s * 0.04);
      return;
    }
  }
}
