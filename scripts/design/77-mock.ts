/**
 * Frames for docs/design/77-novita-difficolta.md: three directions for telling the player what a harder level changes,
 * drawn on a 2D canvas with the game's tokens (theme.ts) and layout (layout.ts), at 360×640 (1280 logical units tall).
 * Run through scripts/design/77-render.mjs. The example is level 12: belt 4→3 and slots 3→2 at once (one message).
 */
import type Phaser from 'phaser';
import { drawChangeIcon } from '../../src/game/changeIcon';
import { PAINT, THEME, css } from '../../src/game/theme';
import { computeLayout, VIEW } from '../../src/core/layout';
import { translate } from '../../src/core/i18n';
import { BLUE, RED, YELLOW } from '../../src/core/colors';

type G = Phaser.GameObjects.Graphics;

function shim(ctx: CanvasRenderingContext2D): G {
  const rgba = (c: number, a: number) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
  const rr = (x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const g = {
    fillStyle(c: number, a = 1) { ctx.fillStyle = rgba(c, a); return g; },
    lineStyle(w: number, c: number, a = 1) { ctx.lineWidth = w; ctx.strokeStyle = rgba(c, a); return g; },
    fillRect(x: number, y: number, w: number, h: number) { ctx.fillRect(x, y, w, h); return g; },
    fillTriangle(a: number, b: number, c: number, d: number, e: number, f: number) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e, f); ctx.fill(); return g; },
    lineBetween(a: number, b: number, c: number, d: number) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); return g; },
    fillCircle(x: number, y: number, r: number) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); return g; },
    fillRoundedRect(x: number, y: number, w: number, h: number, r: number) { rr(x, y, w, h, r); ctx.fill(); return g; },
    strokeRoundedRect(x: number, y: number, w: number, h: number, r: number) { rr(x, y, w, h, r); ctx.stroke(); return g; },
  };
  return g as unknown as G;
}

const IMAGE = ['..RRRR..', '.RYYYYR.', 'RYBBBBYR', 'RYBYYBYR', 'RYBYYBYR', 'RYBBBBYR', '.RYYYYR.', '..RRRR..'];
const COL = { R: PAINT[RED]!, Y: PAINT[YELLOW]!, B: PAINT[BLUE]! } as Record<string, number>;

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, bold: boolean, align: CanvasTextAlign = 'center', maxW?: number): number {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${THEME.font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  // Greedy word wrap; returns the height used.
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (maxW && ctx.measureText(next).width > maxW && cur) { lines.push(cur); cur = w; } else cur = next;
  }
  lines.push(cur);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * 1.2));
  return lines.length * size * 1.2;
}

/** The play screen as it is at level 12 with 3 buckets on the belt, before the message. */
function board(ctx: CanvasRenderingContext2D, g: G, screenH: number, lang: string): ReturnType<typeof computeLayout> {
  const L = computeLayout(8, 8, 2, 4, screenH);
  ctx.fillStyle = css(THEME.bg);
  ctx.fillRect(0, 0, VIEW.width, screenH);
  text(ctx, translate(lang, 'level.title', { n: 12 }), 360, 36, THEME.type.lg, THEME.inkCss, true);
  text(ctx, 'Corsia blocked'.length ? (lang === 'it' ? 'Il lago' : 'The lake') : '', 360, 96, THEME.type.sm, THEME.subCss, false);
  for (const [x, ch] of [[60, '◀'], [660, '⟲'], [540, '♪']] as const) {
    g.fillStyle(THEME.belt, 1).fillRoundedRect(x - 42, 32, 84, 64, 32);
    text(ctx, ch, x, 44, THEME.type.md, THEME.inkCss, true);
  }
  g.fillStyle(THEME.belt, 1).fillRoundedRect(L.belt.x, L.belt.y, L.belt.w, L.belt.h, THEME.radius.panel);
  g.fillStyle(THEME.paper, 1).fillRoundedRect(L.canvas.x - 8, L.canvas.y - 8, L.canvas.w + 16, L.canvas.h + 16, 12);
  IMAGE.forEach((row, y) => [...row].forEach((c, x) => {
    g.fillStyle(c === '.' ? THEME.emptyPixel : COL[c]!, c === '.' ? 1 : 0.3).fillRoundedRect(L.canvas.x + x * L.cell + 2, L.canvas.y + y * L.cell + 2, L.cell - 4, L.cell - 4, THEME.radius.cell);
  }));
  text(ctx, translate(lang, 'play.belt', { used: 0, capacity: 3 }), THEME.space.md, L.slots[0]!.y - 32, THEME.type.xs, THEME.subCss, true, 'left');
  text(ctx, translate(lang, 'level.waiting'), 360, L.slots[0]!.y - 32, THEME.type.xs, THEME.subCss, true);
  L.slots.forEach((s) => { g.lineStyle(3, THEME.ink, 0.3).strokeRoundedRect(s.x, s.y, s.w, s.h, THEME.radius.jar); });
  L.columns.forEach((c, i) => {
    g.fillStyle(THEME.belt, 0.35).fillRoundedRect(c.x, c.y - 6, c.w, 3 * L.columnStep + 20, THEME.radius.jar);
    [0, 1, 2].forEach((k) => {
      g.fillStyle([RED, YELLOW, BLUE][(i + k) % 3] === undefined ? 0 : PAINT[[RED, YELLOW, BLUE][(i + k) % 3]!]!, 1).fillRoundedRect(c.x + 18, c.y + k * L.columnStep, L.jar, L.jar, THEME.radius.jar);
      g.lineStyle(3, THEME.ink, 1).strokeRoundedRect(c.x + 18, c.y + k * L.columnStep, L.jar, L.jar, THEME.radius.jar);
    });
  });
  return L;
}

function pill(ctx: CanvasRenderingContext2D, g: G, lang: string, y: number): { top: number; height: number } {
  const x = THEME.space.md;
  const w = VIEW.width - 2 * x;
  const fact = `${translate(lang, 'change.belt.fact', { n: 3 })} · ${translate(lang, 'change.slots.fact', { n: 2 })}`;
  const why = translate(lang, 'change.limits.why');
  const pad = THEME.space.xs + 2;
  const textX = x + 84;
  const textW = w - 84 - 56;
  // Measure first.
  ctx.font = `${THEME.type.xs}px ${THEME.font}`;
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.font = `${THEME.type.xs}px ${THEME.font}`;
  const lines = (s: string) => { let n = 1, cur = ''; for (const wd of s.split(' ')) { const nx = cur ? `${cur} ${wd}` : wd; if (probe.measureText(nx).width > textW && cur) { n++; cur = wd; } else cur = nx; } return n; };
  const h = Math.ceil((lines(fact) + lines(why)) * THEME.type.xs * 1.2) + 2 * pad;
  g.fillStyle(THEME.paper, 1).fillRoundedRect(x, y, w, h, THEME.radius.panel);
  g.lineStyle(3, THEME.ink, 1).strokeRoundedRect(x, y, w, h, THEME.radius.panel);
  drawChangeIcon(g, 'belt', x + 42, y + h / 2, 40);
  const used = text(ctx, fact, textX, y + pad, THEME.type.xs, THEME.inkCss, true, 'left', textW);
  text(ctx, why, textX, y + pad + used, THEME.type.xs, THEME.subCss, false, 'left', textW);
  text(ctx, '✕', x + w - 30, y + h / 2 - 14, THEME.type.sm, THEME.inkCss, true);
  return { top: y, height: h };
}

export function draw(ctx: CanvasRenderingContext2D, screenH: number, dir: string, lang: string): { top: number; height: number } {
  const g = shim(ctx);
  const L = board(ctx, g, screenH, lang);
  if (dir === 'A') return pill(ctx, g, lang, 88);
  if (dir === 'B') {
    // The belt counter itself: a chip with the new numbers next to it, nothing else on the screen changes.
    const s = translate(lang, 'change.belt.fact', { n: 3 });
    const y = L.slots[0]!.y - 74;
    ctx.font = `bold ${THEME.type.xs}px ${THEME.font}`;
    const w = ctx.measureText(s).width + 70;
    g.fillStyle(THEME.gold, 1).fillRoundedRect(THEME.space.md, y, w, 40, 20);
    g.lineStyle(3, THEME.ink, 1).strokeRoundedRect(THEME.space.md, y, w, 40, 20);
    drawChangeIcon(g, 'belt', THEME.space.md + 26, y + 20, 26);
    text(ctx, s, THEME.space.md + 50, y + 8, THEME.type.xs, THEME.inkCss, true, 'left');
    return { top: y, height: 40 };
  }
  // C: a card docked under the belt, as the teaching cards, with a shade over the rest.
  ctx.fillStyle = 'rgba(43,45,66,0.45)';
  ctx.fillRect(0, 0, VIEW.width, screenH);
  const top = L.belt.y + L.belt.h + THEME.space.xs;
  const w = 600;
  const h = 330;
  g.fillStyle(THEME.bg, 1).fillRoundedRect(60, top, w, h, THEME.radius.panel);
  text(ctx, translate(lang, 'change.belt.label'), 360, top + 22, THEME.type.lg - 8, THEME.inkCss, true);
  drawChangeIcon(g, 'belt', 360, top + 120, 64);
  text(ctx, `${translate(lang, 'change.belt.fact', { n: 3 })} · ${translate(lang, 'change.slots.fact', { n: 2 })}`, 360, top + 168, THEME.type.sm, THEME.inkCss, true, 'center', w - 60);
  text(ctx, translate(lang, 'change.limits.why'), 360, top + 208, THEME.type.sm, THEME.subCss, false, 'center', w - 60);
  g.fillStyle(THEME.ink, 1).fillRoundedRect(210, top + h - 90, 300, 70, 35);
  text(ctx, lang === 'it' ? 'Ho capito' : 'Got it', 360, top + h - 72, THEME.type.md, '#ffffff', true);
  return { top, height: h };
}
