import type Phaser from 'phaser';
import type { Skin } from '../core/album';
import { THEME } from './theme';

/**
 * Bucket decorations unlocked by completing stages, drawn over the bucket's paint colour.
 * Patterns only: the paint colour stays readable, which is what the player needs.
 */
export function drawSkin(g: Phaser.GameObjects.Graphics, skin: Skin, x: number, y: number, size: number, alpha = 1): void {
  const l = x - size / 2, t = y - size / 2, s = size;
  const a = 0.35 * alpha;
  switch (skin) {
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
      g.fillStyle(0x43aa8b, 0.8 * alpha);
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
      const colors = [0xe63946, 0xffb703, 0x3a86ff, 0x43aa8b, 0xffffff];
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
      g.lineStyle(s * 0.08, 0xffd166, alpha);
      g.strokeRoundedRect(l + s * 0.06, t + s * 0.06, s * 0.88, s * 0.88, THEME.radius.jar * 0.8);
      g.fillStyle(0xffd166, alpha);
      g.fillTriangle(l + s * 0.5, t + s * 0.08, l + s * 0.42, t + s * 0.22, l + s * 0.58, t + s * 0.22);
      return;
  }
}
