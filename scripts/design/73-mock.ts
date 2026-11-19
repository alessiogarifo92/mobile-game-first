/**
 * Frames for docs/design/73-difficolta-ui.md: three directions for showing a level's difficulty (#73), drawn on a 2D canvas
 * with the game's tokens (theme.ts), layout (layout.ts, mapLayout.ts, winPanel.ts) and the real difficulty labels
 * (src/levels/difficulty.json, src/core/difficulty.ts), at 360×640 (720×1280 logical units per phone).
 * Run through scripts/design/73-render.mjs. Every image holds two phones side by side.
 *
 * Design only: the proposed texts live in STR below, not in src/core/i18n.ts; the implementation ticket moves them there.
 */
import type Phaser from 'phaser';
import { PAINT, THEME, css } from '../../src/game/theme';
import { computeLayout, VIEW } from '../../src/core/layout';
import { computeMapLayout } from '../../src/core/mapLayout';
import { bandOf, stageDifficulty, type Band } from '../../src/core/difficulty';
import { LEVELS_PER_STAGE } from '../../src/core/stages';
import { translate } from '../../src/core/i18n';
import { BLUE, RED, YELLOW } from '../../src/core/colors';
import difficulty from '../../src/levels/difficulty.json';
import stages from '../../src/levels/stages.json';

type G = Phaser.GameObjects.Graphics;
type Dir = 'A' | 'B' | 'C';
export type Screen = 'map' | 'play' | 'end';

/** Proposed texts (keys the implementation adds to src/core/i18n.ts, IT and EN). */
const STR: Record<string, Record<string, string>> = {
  it: {
    'diff.easy': 'Facile', 'diff.normal': 'Normale', 'diff.hard': 'Difficile', 'diff.boss': 'Boss',
    'diff.winHard': 'Livello difficile superato', 'diff.winBoss': 'Boss sconfitto',
    'diff.jamHard': 'Questo è uno dei livelli più impegnativi: riprovare è normale.',
    'diff.jamHardC': 'Livello difficile: spesso servono più tentativi.',
    'diff.pips.hard': 'Difficoltà: alta', 'lake': 'Il lago',
  },
  en: {
    'diff.easy': 'Easy', 'diff.normal': 'Normal', 'diff.hard': 'Hard', 'diff.boss': 'Boss',
    'diff.winHard': 'Hard level cleared', 'diff.winBoss': 'Boss beaten',
    'diff.jamHard': 'This is one of the tougher levels: retrying is normal.',
    'diff.jamHardC': 'A hard level: it often takes a few tries.',
    'diff.pips.hard': 'Difficulty: high', 'lake': 'The lake',
  },
};
const s = (lang: string, k: string) => STR[lang]![k]!;

const BAND_OF = new Map<number, Band>(difficulty.levels.map((l) => [l.id, bandOf(l.winRate)]));
const bandOfLevel = (id: number): Band => BAND_OF.get(id) ?? 'normal';
const isBoss = (id: number) => id % LEVELS_PER_STAGE === 0;
const PIPS: Record<Band, number> = { easy: 1, normal: 2, hard: 3 };

function shim(ctx: CanvasRenderingContext2D): G {
  const rgba = (c: number, a: number) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
  const rr = (x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const g = {
    fillStyle(c: number, a = 1) { ctx.fillStyle = rgba(c, a); return g; },
    lineStyle(w: number, c: number, a = 1) { ctx.lineWidth = w; ctx.strokeStyle = rgba(c, a); return g; },
    fillRect(x: number, y: number, w: number, h: number) { ctx.fillRect(x, y, w, h); return g; },
    fillCircle(x: number, y: number, r: number) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); return g; },
    strokeCircle(x: number, y: number, r: number) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); return g; },
    fillRoundedRect(x: number, y: number, w: number, h: number, r: number) { rr(x, y, w, h, r); ctx.fill(); return g; },
    strokeRoundedRect(x: number, y: number, w: number, h: number, r: number) { rr(x, y, w, h, r); ctx.stroke(); return g; },
  };
  return g as unknown as G;
}

/** Single-line text centred on (x, cy). Returns its width. */
function tc(ctx: CanvasRenderingContext2D, str: string, x: number, cy: number, size: number, color: string, bold = false, align: CanvasTextAlign = 'center'): number {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${THEME.font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, cy);
  return ctx.measureText(str).width;
}

/** Wrapped text, first line centred on cy. Returns the line count. */
function wrap(ctx: CanvasRenderingContext2D, str: string, x: number, cy: number, size: number, color: string, bold: boolean, maxW: number): number {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${THEME.font}`;
  const lines: string[] = [];
  for (const part of str.split('\n')) {
    let cur = '';
    for (const w of part.split(' ')) {
      const next = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(next).width > maxW && cur) { lines.push(cur); cur = w; } else cur = next;
    }
    lines.push(cur);
  }
  lines.forEach((l, i) => tc(ctx, l, x, cy + i * size * 1.25, size, color, bold));
  return lines.length;
}

function width(ctx: CanvasRenderingContext2D, str: string, size: number, bold: boolean): number {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${THEME.font}`;
  return ctx.measureText(str).width;
}

/** The diamond that marks "hard": a shape, so it reads without colour. */
function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke: string | null, lw = 3): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}

/** Three pips, `n` filled: the graded meter of direction B. Hollow pips keep an ink outline, so the count never rests on colour. */
function pips(_ctx: CanvasRenderingContext2D, g: G, cx: number, cy: number, n: number, r: number, gap: number, alpha = 1): void {
  for (let i = 0; i < 3; i++) {
    const x = cx + (i - 1) * gap;
    if (i < n) g.fillStyle(THEME.ink, alpha).fillCircle(x, cy, r);
    else g.lineStyle(3, THEME.ink, alpha).strokeCircle(x, cy, r - 1.5);
  }
}

function pill(_ctx: CanvasRenderingContext2D, g: G, x: number, cy: number, w: number, h: number, fill: number): void {
  g.fillStyle(fill, 1).fillRoundedRect(x, cy - h / 2, w, h, h / 2);
  g.lineStyle(3, THEME.ink, 1).strokeRoundedRect(x, cy - h / 2, w, h, h / 2);
}

// ---------------------------------------------------------------- map

function mapPhone(ctx: CanvasRenderingContext2D, g: G, lang: string, dir: Dir, stage: number, current: number): void {
  const levels = Array.from({ length: stages.length * LEVELS_PER_STAGE }, (_, i) => ({ id: i + 1, stage: Math.floor(i / LEVELS_PER_STAGE) + 1, boss: (i + 1) % LEVELS_PER_STAGE === 0 }));
  const layout = computeMapLayout(levels, VIEW.width, 1280);
  const header = layout.headers.find((h) => h.stage === stage)!;
  const scroll = header.y - 1010;
  const sy = (y: number) => y - scroll;
  ctx.fillStyle = css(THEME.bg);
  ctx.fillRect(0, 0, VIEW.width, 1280);

  // Path.
  ctx.lineWidth = 18; ctx.strokeStyle = css(THEME.belt); ctx.lineJoin = 'round';
  ctx.beginPath();
  layout.nodes.filter((n) => sy(n.y) > 180 && sy(n.y) < 1360).forEach((n, i) => (i === 0 ? ctx.moveTo(n.x, sy(n.y)) : ctx.lineTo(n.x, sy(n.y))));
  ctx.stroke();

  // Stage headers.
  for (const h of layout.headers.filter((x) => sy(x.y) > 200 && sy(x.y) < 1300)) {
    const info = stages.find((x) => x.id === h.stage)!;
    const y = sy(h.y);
    const done = levels.filter((l) => l.stage === h.stage && l.id < current).length;
    g.fillStyle(PAINT[info.color]!, 1).fillRoundedRect(80, y - 34, VIEW.width - 160, 68, 34);
    const counter = `${translate(lang, 'map.progress', { done, total: LEVELS_PER_STAGE })}  ▸`;
    const cw = tc(ctx, counter, VIEW.width - 120, y, THEME.type.sm, '#ffffff', false, 'right');
    let title = `${translate(lang, 'map.stage', { n: h.stage })} · ${translate(lang, `stage.${info.key}`)}`;
    let size: number = THEME.type.sm;
    while (size > 20 && width(ctx, title, size, false) > VIEW.width - 240 - cw - 24) size -= 2;
    while (width(ctx, title, size, false) > VIEW.width - 240 - cw - 24 && title.length > 4) title = `${title.slice(0, -2)}…`;
    tc(ctx, title, 120, y, size, '#ffffff', false, 'left');
    // The stage's own label, from the mean win rate of its ten levels (undefined while the stage is incomplete).
    const sd = stageDifficulty(difficulty.levels.filter((l) => Math.floor((l.id - 1) / LEVELS_PER_STAGE) + 1 === h.stage));
    if (sd && dir === 'B') pips(ctx, g, VIEW.width / 2, y + 34 + 24, PIPS[sd.band], 8, 26);
    if (sd && dir === 'C') {
      const word = s(lang, `diff.${sd.band}`);
      const w = width(ctx, word, THEME.type.xs, true) + 44;
      // Under the header, on the side away from the previous stage's boss (its star hangs there), so the two never touch.
      const prevBoss = layout.nodes[(h.stage - 1) * LEVELS_PER_STAGE - 1];
      const cx = prevBoss && prevBoss.x > VIEW.width / 2 ? 230 : 490;
      pill(ctx, g, cx - w / 2, y + 34 + 26, w, 40, THEME.paper);
      tc(ctx, word, cx, y + 34 + 26, THEME.type.xs, THEME.inkCss, true);
    }
  }

  // Nodes: the same shared fills and strokes as MenuScene.drawNodes; the marks below are extra strokes on that same Graphics.
  for (const n of layout.nodes.filter((x) => sy(x.y) > 180 && sy(x.y) < 1340)) {
    const y = sy(n.y);
    const done = n.id < current;
    const open = n.id <= current;
    const isCurrent = n.id === current;
    const r = isCurrent ? n.r + 4 : n.r;
    const band = bandOfLevel(n.id);
    g.fillStyle(done ? PAINT[[RED, YELLOW, BLUE][n.id % 3]!]! : isCurrent ? THEME.paper : THEME.emptyPixel, 1).fillCircle(n.x, y, r);
    g.lineStyle(isCurrent ? 6 : 3, THEME.ink, open ? 1 : 0.3).strokeCircle(n.x, y, r);
    tc(ctx, String(n.id), n.x, y, isCurrent ? THEME.type.md : THEME.type.sm, done ? '#ffffff' : THEME.inkCss, true);
    if (n.boss) tc(ctx, '★', n.x, y - r - 18, THEME.type.md, open ? THEME.inkCss : THEME.subCss, true);
    if (dir === 'A' && band === 'hard') {
      // A diamond on the node's lower right, with a paper edge so it stays apart from the ring and the path.
      diamond(ctx, n.x + n.r * 0.78, y + n.r * 0.78, 13, css(THEME.ink), css(THEME.paper), 4);
    }
    if (dir === 'B') pips(ctx, g, n.x, y + r + 16, PIPS[band], 5, 15, open ? 1 : 0.35);
    if (dir === 'C' && band === 'hard') g.lineStyle(3, THEME.ink, open ? 1 : 0.3).strokeCircle(n.x, y, r + 9);
  }

  // Fixed title bar.
  ctx.fillStyle = css(THEME.bg);
  ctx.fillRect(0, 0, VIEW.width, 240);
  tc(ctx, translate(lang, 'app.title'), VIEW.width / 2, 110, THEME.type.xl, THEME.inkCss, true);
  pill(ctx, g, 100, 190, 520, 56, THEME.paper);
  tc(ctx, `${current - 1}/${levels.length}`, 590, 180, THEME.type.xs, THEME.subCss, false, 'right');
  g.fillStyle(THEME.emptyPixel, 1).fillRoundedRect(124, 198, 472, 10, 5);
  g.fillStyle(PAINT[RED]!, 1).fillRoundedRect(124, 198, 472 * ((current - 1) / levels.length), 10, 5);
}

// ---------------------------------------------------------------- play

const IMAGE = ['..RRRR..', '.RYYYYR.', 'RYBBBBYR', 'RYBYYBYR', 'RYBYYBYR', 'RYBBBBYR', '.RYYYYR.', '..RRRR..'];
const COL = { R: PAINT[RED]!, Y: PAINT[YELLOW]!, B: PAINT[BLUE]! } as Record<string, number>;

/** The play screen of a level with 3 buckets on the belt, as in scripts/design/77-mock.ts. Returns the layout. */
function board(ctx: CanvasRenderingContext2D, g: G, lang: string, id: number): ReturnType<typeof computeLayout> {
  const L = computeLayout(8, 8, 2, 4, 1280);
  ctx.fillStyle = css(THEME.bg);
  ctx.fillRect(0, 0, VIEW.width, 1280);
  tc(ctx, translate(lang, 'level.title', { n: id }), 360, 62, THEME.type.lg, THEME.inkCss, true);
  for (const [x, ch] of [[60, '◀'], [660, '⟲'], [540, '♪']] as const) {
    g.fillStyle(THEME.belt, 1).fillRoundedRect(x - 42, 32, 84, 64, 32);
    tc(ctx, ch, x, 64, THEME.type.md, THEME.inkCss, true);
  }
  g.fillStyle(THEME.belt, 1).fillRoundedRect(L.belt.x, L.belt.y, L.belt.w, L.belt.h, THEME.radius.panel);
  g.fillStyle(THEME.paper, 1).fillRoundedRect(L.canvas.x - 8, L.canvas.y - 8, L.canvas.w + 16, L.canvas.h + 16, 12);
  IMAGE.forEach((row, y) => [...row].forEach((c, x) => {
    g.fillStyle(c === '.' ? THEME.emptyPixel : COL[c]!, c === '.' ? 1 : 0.3).fillRoundedRect(L.canvas.x + x * L.cell + 2, L.canvas.y + y * L.cell + 2, L.cell - 4, L.cell - 4, THEME.radius.cell);
  }));
  tc(ctx, translate(lang, 'play.belt', { used: 1, capacity: 4 }), THEME.space.md, L.slots[0]!.y - 20, THEME.type.xs, THEME.subCss, true, 'left');
  tc(ctx, translate(lang, 'level.waiting'), 360, L.slots[0]!.y - 20, THEME.type.xs, THEME.subCss, true);
  L.slots.forEach((sl) => g.lineStyle(3, THEME.ink, 0.3).strokeRoundedRect(sl.x, sl.y, sl.w, sl.h, THEME.radius.jar));
  L.columns.forEach((c, i) => {
    g.fillStyle(THEME.belt, 0.35).fillRoundedRect(c.x, c.y - 6, c.w, 3 * L.columnStep + 20, THEME.radius.jar);
    [0, 1, 2].forEach((k) => {
      g.fillStyle(PAINT[[RED, YELLOW, BLUE][(i + k) % 3]!]!, 1).fillRoundedRect(c.x + 18, c.y + k * L.columnStep, L.jar, L.jar, THEME.radius.jar);
      g.lineStyle(3, THEME.ink, 1).strokeRoundedRect(c.x + 18, c.y + k * L.columnStep, L.jar, L.jar, THEME.radius.jar);
    });
  });
  return L;
}

function playPhone(ctx: CanvasRenderingContext2D, g: G, lang: string, dir: Dir, id: number): void {
  const L = board(ctx, g, lang, id);
  const band = bandOfLevel(id);
  const boss = isBoss(id);
  const name = s(lang, 'lake');
  const sub = 108; // the subtitle line (PlayScene: level name, y 96..130)
  const rowY = L.slots[0]!.y - 20; // the belt-counter row
  if (dir === 'A') {
    // One quiet line replaces the plain name: shapes first, then the name. Only hard and boss add anything.
    const parts: string[] = [];
    if (boss) parts.push(`★ ${s(lang, 'diff.boss')}`);
    if (band === 'hard') parts.push(`◆ ${s(lang, 'diff.hard')}`);
    parts.push(name);
    tc(ctx, parts.join('  ·  '), 360, sub, THEME.type.sm, THEME.subCss, false);
  } else if (dir === 'B') {
    tc(ctx, boss ? `★ ${name}` : name, 360, sub, THEME.type.sm, THEME.subCss, false);
    // The meter sits in the belt-counter row, right-aligned: that row has nothing on its right.
    pips(ctx, g, VIEW.width - THEME.space.md - 54, rowY, PIPS[band], 9, 36);
  } else {
    tc(ctx, name, 250, sub, THEME.type.sm, THEME.subCss, false, 'right');
    const words: string[] = [];
    if (boss) words.push(`★ ${s(lang, 'diff.boss')}`);
    words.push(s(lang, `diff.${band}`));
    const label = words.join(' · ');
    const w = width(ctx, label, THEME.type.xs, true) + 44;
    pill(ctx, g, 270, sub, w, 44, band === 'hard' ? THEME.gold : THEME.paper);
    tc(ctx, label, 270 + w / 2, sub, THEME.type.xs, THEME.inkCss, true);
  }
}

// ---------------------------------------------------------------- end-of-level panels

function panel(ctx: CanvasRenderingContext2D, g: G, height: number, title: string): number {
  ctx.fillStyle = 'rgba(43,45,66,0.45)';
  ctx.fillRect(0, 0, VIEW.width, 1280);
  const top = (1280 - height) / 2;
  g.fillStyle(THEME.bg, 1).fillRoundedRect(60, top, 600, height, THEME.radius.panel);
  tc(ctx, title, 360, top + 70, THEME.type.xl, THEME.inkCss, true);
  return top;
}

function button(ctx: CanvasRenderingContext2D, g: G, cy: number, w: number, label: string, primary: boolean): void {
  g.fillStyle(primary ? THEME.ink : THEME.belt, 1).fillRoundedRect(360 - w / 2, cy - 44, w, 88, 44);
  tc(ctx, label, 360, cy, THEME.type.md, primary ? '#ffffff' : THEME.inkCss, true);
}

function picture(g: G, x: number, y: number, size: number, alpha = 1): void {
  const cell = Math.floor(size / 8);
  IMAGE.forEach((row, ry) => [...row].forEach((c, rx) => {
    if (c !== '.') g.fillStyle(COL[c]!, alpha).fillRect(x + rx * cell, y + ry * cell, cell - 1, cell - 1);
  }));
}

function winPhone(ctx: CanvasRenderingContext2D, g: G, lang: string, dir: Dir, id: number): void {
  board(ctx, g, lang, id);
  const band = bandOfLevel(id);
  const top = panel(ctx, g, 760, translate(lang, 'win.title'));
  picture(g, 360 - 120, top + 140, 240);
  wrap(ctx, translate(lang, 'win.summary', { name: s(lang, 'lake'), moves: 31 }), 360, top + 412, THEME.type.sm, THEME.subCss, false, 520);
  // The stage line's slot (offset 460) is free unless the level also completes a stage; then the stage message keeps it.
  const y = top + 470;
  if (band === 'hard') {
    if (dir === 'A') tc(ctx, `◆ ${s(lang, 'diff.winHard')}`, 360, y, THEME.type.sm, THEME.inkCss, true);
    if (dir === 'B') pips(ctx, g, 360, y, 3, 9, 36);
    if (dir === 'C') {
      const label = s(lang, 'diff.hard');
      const w = width(ctx, label, THEME.type.sm, true) + 56;
      pill(ctx, g, 360 - w / 2, y, w, 52, THEME.gold);
      tc(ctx, label, 360, y, THEME.type.sm, THEME.inkCss, true);
    }
  }
  g.fillStyle(THEME.emptyPixel, 1).fillRoundedRect(120, top + 538, 480, 12, 6);
  g.fillStyle(PAINT[RED]!, 1).fillRoundedRect(120, top + 538, 480 * 0.74, 12, 6);
  button(ctx, g, top + 600, 360, translate(lang, 'win.next'), true);
  button(ctx, g, top + 700, 300, translate(lang, 'win.map'), false);
}

function jamPhone(ctx: CanvasRenderingContext2D, g: G, lang: string, dir: Dir, id: number): void {
  board(ctx, g, lang, id);
  const band = bandOfLevel(id);
  // After three defeats in a row (what the "Hint" button already keys on), only on a hard level, only in A and C.
  const tone = band === 'hard' && dir !== 'B' ? s(lang, dir === 'A' ? 'diff.jamHard' : 'diff.jamHardC') : null;
  const extra = tone ? 64 : 0;
  const height = 792 + extra;
  const top = panel(ctx, g, height, translate(lang, 'jam.title'));
  wrap(ctx, translate(lang, 'jam.body'), 360, top + 146, THEME.type.sm, THEME.subCss, false, 520);
  tc(ctx, translate(lang, 'jam.missing', { n: 6 }), 360, top + 214, THEME.type.sm, THEME.inkCss, true);
  picture(g, 360 - 100, top + 252, 200, 0.35);
  tc(ctx, translate(lang, 'jam.hint'), 360, top + 500, THEME.type.xs, THEME.inkCss, false);
  let y = top + 548;
  if (tone) { wrap(ctx, tone, 360, y, THEME.type.xs, THEME.inkCss, false, 520); y += extra; }
  button(ctx, g, y + 40, 520, translate(lang, 'jam.continue'), false);
  button(ctx, g, y + 140, 360, translate(lang, 'jam.retry'), true);
}

// ---------------------------------------------------------------- entry

const PHONE_W = VIEW.width;
export const GAP = 80;
export const SHEET = { width: PHONE_W * 2 + GAP, height: 1280 };

/** Draws one sheet of two phones; returns nothing (the renderer screenshots the canvas). */
export function draw(ctx: CanvasRenderingContext2D, screen: Screen, dir: Dir, lang: string): void {
  ctx.clearRect(0, 0, SHEET.width, SHEET.height);
  ctx.fillStyle = '#e9e2d3';
  ctx.fillRect(0, 0, SHEET.width, SHEET.height);
  const phones: ((c: CanvasRenderingContext2D, g: G) => void)[] =
    screen === 'map' ? [(c, g) => mapPhone(c, g, lang, dir, 8, 74), (c, g) => mapPhone(c, g, lang, dir, 9, 83)]
    : screen === 'play' ? [(c, g) => playPhone(c, g, lang, dir, 74), (c, g) => playPhone(c, g, lang, dir, 80)]
    : [(c, g) => winPhone(c, g, lang, dir, 74), (c, g) => jamPhone(c, g, lang, dir, 74)];
  phones.forEach((fn, i) => {
    ctx.save();
    ctx.translate(i * (PHONE_W + GAP), 0);
    ctx.beginPath(); ctx.rect(0, 0, PHONE_W, 1280); ctx.clip();
    fn(ctx, shim(ctx));
    ctx.restore();
  });
}
