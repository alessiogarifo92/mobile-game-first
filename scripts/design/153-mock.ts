/**
 * Frames for docs/design/153-ricompensa-stage.md: the win panel of a stage end, three directions, drawn on a 2D canvas
 * with the game's own tokens (theme.ts) and bucket skins (skins.ts). Run through scripts/design/153-render.mjs.
 */
import type Phaser from 'phaser';
import { drawSkin } from '../../src/game/skins';
import { PAINT, THEME, css } from '../../src/game/theme';
import type { Skin } from '../../src/core/album';

type G = Phaser.GameObjects.Graphics;

/** The subset of Phaser.Graphics the skins use, on a canvas. */
function shim(ctx: CanvasRenderingContext2D): G {
  const rgba = (c: number, a: number) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
  const rr = (x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const g = {
    fillStyle(c: number, a = 1) { ctx.fillStyle = rgba(c, a); return g; },
    lineStyle(w: number, c: number, a = 1) { ctx.lineWidth = w; ctx.strokeStyle = rgba(c, a); return g; },
    fillCircle(x: number, y: number, r: number) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); return g; },
    strokeCircle(x: number, y: number, r: number) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); return g; },
    fillEllipse(x: number, y: number, w: number, h: number) { ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, 0, 0, 7); ctx.fill(); return g; },
    strokeEllipse(x: number, y: number, w: number, h: number) { ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, 0, 0, 7); ctx.stroke(); return g; },
    fillRect(x: number, y: number, w: number, h: number) { ctx.fillRect(x, y, w, h); return g; },
    fillTriangle(a: number, b: number, c: number, d: number, e: number, f: number) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e, f); ctx.fill(); return g; },
    lineBetween(a: number, b: number, c: number, d: number) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); return g; },
    beginPath() { ctx.beginPath(); return g; },
    moveTo(x: number, y: number) { ctx.moveTo(x, y); return g; },
    lineTo(x: number, y: number) { ctx.lineTo(x, y); return g; },
    strokePath() { ctx.stroke(); return g; },
    fillRoundedRect(x: number, y: number, w: number, h: number, r: number) { rr(x, y, w, h, r); ctx.fill(); return g; },
    strokeRoundedRect(x: number, y: number, w: number, h: number, r: number) { rr(x, y, w, h, r); ctx.stroke(); return g; },
  };
  return g as unknown as G;
}

const W = 720;
const PICTURE = [
  '..11..', '.1221.', '122221', '124421', '.1221.', '..11..',
].map((r) => [...r].map((c) => (c === '.' ? 0 : Number(c))));
const COLORS: Record<number, number> = { 1: PAINT[4]!, 2: PAINT[2]!, 4: PAINT[1]! };

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, bold = true) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${THEME.font}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function button(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s: string, fill: number, color: string, size: number) {
  ctx.fillStyle = css(fill);
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
  text(ctx, s, x, y, size, color);
}

function jar(g: G, skin: Skin, x: number, y: number, size: number, color: number, alpha = 1) {
  g.fillStyle(color, alpha).fillRoundedRect(x - size / 2, y - size / 2, size, size, THEME.radius.jar);
  drawSkin(g, skin, x, y, size, alpha);
  g.lineStyle(3, THEME.ink, alpha).strokeRoundedRect(x - size / 2, y - size / 2, size, size, THEME.radius.jar);
}

function picture(ctx: CanvasRenderingContext2D, cx: number, top: number, size: number) {
  const cell = Math.floor(size / 6);
  const ox = cx - (cell * 6) / 2;
  PICTURE.forEach((row, j) => row.forEach((c, i) => {
    if (!c) return;
    ctx.fillStyle = css(COLORS[c]!);
    ctx.fillRect(ox + i * cell, top + j * cell, cell - 1, cell - 1);
  }));
}

function progress(ctx: CanvasRenderingContext2D, y: number, label: string) {
  ctx.fillStyle = css(THEME.belt);
  ctx.beginPath(); ctx.roundRect(140, y - 8, 300, 16, 8); ctx.fill();
  ctx.fillStyle = css(PAINT[1]!);
  ctx.beginPath(); ctx.roundRect(140, y - 8, 30, 16, 8); ctx.fill();
  ctx.font = `bold ${THEME.type.xs}px ${THEME.font}`; ctx.fillStyle = THEME.inkCss; ctx.textAlign = 'left';
  ctx.fillText(label, 460, y);
}

type Key = 'title' | 'summary' | 'stage' | 'reward' | 'use' | 'inUse' | 'next' | 'album' | 'progress' | 'before' | 'after' | 'albumNote' | 'albumGo' | 'applied' | 'keep';
export type Copy = Record<Key, string>;
export const COPY: Record<'it' | 'en', Copy> = {
  it: {
    title: 'Capolavoro!', summary: '"Ciambella" completato in 9 mosse', stage: 'Stage 1 completato!', reward: 'Nuovo stile: Pois',
    use: 'Usalo subito', inUse: '✓ In uso', next: 'Avanti', album: 'Album', progress: '10/100  +1', before: 'prima', after: 'ora',
    albumNote: "Lo trovi nell'Album, stage 1", albumGo: "Vedi nell'Album", applied: 'I tuoi secchielli ora sono così', keep: 'Torna al classico',
  },
  en: {
    title: 'Masterpiece!', summary: '"Doughnut" painted in 9 moves', stage: 'Stage 1 complete!', reward: 'New style: Dots',
    use: 'Use it now', inUse: '✓ In use', next: 'Next', album: 'Album', progress: '10/100  +1', before: 'before', after: 'now',
    albumNote: 'Find it in the Album, stage 1', albumGo: 'See it in the Album', applied: 'Your buckets now look like this', keep: 'Back to classic',
  },
};

/** Draws one direction's panel on a 720 x `h` logical canvas; returns the panel's box for the bounds check. */
export function draw(ctx: CanvasRenderingContext2D, h: number, dir: 'A' | 'A2' | 'B' | 'C', lang: 'it' | 'en') {
  const c = COPY[lang];
  const g = shim(ctx);
  ctx.fillStyle = THEME.bgCss; ctx.fillRect(0, 0, W, h);
  ctx.fillStyle = 'rgba(43,45,66,0.45)'; ctx.fillRect(0, 0, W, h);
  const height = dir === 'C' ? 860 : 940;
  const top = (h - height) / 2;
  ctx.fillStyle = css(THEME.bg);
  ctx.beginPath(); ctx.roundRect(60, top, 600, height, THEME.radius.panel); ctx.fill();
  text(ctx, c.title, W / 2, top + 70, THEME.type.xl, THEME.inkCss);
  picture(ctx, W / 2, top + 130, 180);
  text(ctx, c.summary, W / 2, top + 338, THEME.type.sm, THEME.subCss, false);
  text(ctx, c.stage, W / 2, top + 384, THEME.type.sm, THEME.inkCss);
  // Reward card.
  const card = top + 420;
  const cardH = dir === 'C' ? 180 : 260;
  ctx.fillStyle = css(THEME.paper);
  ctx.beginPath(); ctx.roundRect(100, card, 520, cardH, THEME.radius.panel); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = css(THEME.gold); ctx.stroke();
  if (dir === 'A' || dir === 'A2') {
    text(ctx, c.reward, W / 2, card + 38, THEME.type.md, THEME.inkCss);
    [PAINT[1]!, PAINT[2]!, PAINT[4]!].forEach((col, k) => jar(g, 'dots', W / 2 - 110 + k * 110, card + 120, 84, col));
    const applied = dir === 'A2';
    button(ctx, W / 2, card + 210, 300, 76, applied ? c.inUse : c.use, applied ? THEME.belt : THEME.ink, applied ? THEME.inkCss : '#ffffff', THEME.type.sm);
  } else if (dir === 'B') {
    text(ctx, c.applied, W / 2, card + 38, THEME.type.sm, THEME.inkCss);
    jar(g, 'classic', W / 2 - 130, card + 120, 84, PAINT[1]!, 0.5);
    text(ctx, c.before, W / 2 - 130, card + 182, THEME.type.xs, THEME.subCss, false);
    text(ctx, '→', W / 2, card + 120, THEME.type.lg, THEME.inkCss);
    jar(g, 'dots', W / 2 + 130, card + 120, 100, PAINT[1]!);
    text(ctx, c.after, W / 2 + 130, card + 190, THEME.type.xs, THEME.inkCss);
    button(ctx, W / 2, card + 228, 280, 52, c.keep, THEME.paper, THEME.subCss, THEME.type.xs);
  } else {
    jar(g, 'dots', 190, card + 90, 100, PAINT[2]!);
    ctx.textAlign = 'left';
    ctx.font = `bold ${THEME.type.md}px ${THEME.font}`; ctx.fillStyle = THEME.inkCss; ctx.fillText(c.reward, 270, card + 66);
    ctx.font = `${THEME.type.xs}px ${THEME.font}`; ctx.fillStyle = THEME.subCss; ctx.fillText(c.albumNote, 270, card + 112);
  }
  const after = card + cardH;
  progress(ctx, after + 46, c.progress);
  button(ctx, W / 2, after + 120, 360, 88, c.next, THEME.ink, '#ffffff', THEME.type.md);
  if (dir === 'C') {
    button(ctx, W / 2, after + 222, 360, 72, `🎨 ${c.albumGo}`, THEME.gold, THEME.inkCss, THEME.type.sm);
  } else {
    button(ctx, W / 2, after + 214, 260, 64, c.album, THEME.belt, THEME.inkCss, THEME.type.sm);
  }
  return { top, height };
}
