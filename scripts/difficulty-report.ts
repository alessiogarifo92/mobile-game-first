/**
 * Difficulty curve of the shipped levels (ticket #29): per-level metrics as JSON and a chart.
 *   npx tsx scripts/difficulty-report.ts
 */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import levelsJson from '../src/levels/levels.json' with { type: 'json' };
import { parseLevel, type LevelDef } from '../src/core/level';
import { createRng } from '../src/core/rng';
import { randomWinRate, solve } from '../src/core/solver';

const rows = (levelsJson as LevelDef[]).map((def) => {
  const l = parseLevel(def);
  return {
    id: l.id,
    stage: l.stage,
    boss: !!l.boss,
    name: l.name,
    size: `${l.width}x${l.height}`,
    pixels: l.targets.filter(Boolean).length,
    shooters: l.columns.flat().length,
    columns: l.columns.length,
    slots: l.slots,
    belt: l.beltCapacity,
    ice: l.ice.reduce((a, b) => a + b, 0),
    hidden: l.hidden.filter(Boolean).length,
    randomWin: Number(randomWinRate(l, 400, createRng(l.id)).toFixed(3)),
    solutionMoves: solve(l).moves.length,
  };
});
const dir = new URL('../docs/reports/', import.meta.url).pathname;
writeFileSync(`${dir}curva-difficolta.json`, JSON.stringify(rows, null, 1) + '\n');

// Two small multiples sharing the level axis (never a dual axis): win rate, then decisions (shooters).
const W = 1100, H = 260, PAD = { l: 56, r: 16, t: 34, b: 30 };
const x = (id: number) => PAD.l + ((id - 0.5) / rows.length) * (W - PAD.l - PAD.r);
function panel(title: string, value: (r: (typeof rows)[number]) => number, max: number, ticks: number[], fmt: (v: number) => string) {
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const bands = Array.from({ length: 10 }, (_, s) =>
    s % 2 ? `<rect x="${x(s * 10 + 0.5)}" y="${PAD.t}" width="${x(s * 10 + 10.5) - x(s * 10 + 0.5)}" height="${H - PAD.t - PAD.b}" fill="var(--band)"/>` : '').join('');
  const grid = ticks.map((t) => `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--grid)"/><text x="${PAD.l - 8}" y="${y(t) + 4}" text-anchor="end" class="axis">${fmt(t)}</text>`).join('');
  const stageLabels = Array.from({ length: 10 }, (_, s) => `<text x="${(x(s * 10 + 1) + x(s * 10 + 10)) / 2}" y="${H - 10}" text-anchor="middle" class="axis">S${s + 1}</text>`).join('');
  const line = rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.id).toFixed(1)},${y(value(r)).toFixed(1)}`).join('');
  const dots = rows.map((r) => r.boss
    ? `<rect x="${x(r.id) - 5}" y="${y(value(r)) - 5}" width="10" height="10" transform="rotate(45 ${x(r.id)} ${y(value(r))})" fill="var(--series)" stroke="var(--surface)" stroke-width="2"/>`
    : `<circle cx="${x(r.id)}" cy="${y(value(r))}" r="4" fill="var(--series)" stroke="var(--surface)" stroke-width="2"/>`).join('');
  return `<svg width="${W}" height="${H}"><text x="${PAD.l}" y="20" class="title">${title}</text>${bands}${grid}${stageLabels}
    <path d="${line}" fill="none" stroke="var(--series)" stroke-width="2" opacity="0.5"/>${dots}</svg>`;
}
const html = `<style>
  body{margin:0;padding:20px;background:var(--surface);font:14px system-ui;color:var(--ink);
    --surface:#fcfcfb;--ink:#0b0b0b;--muted:#52514e;--grid:#e4e3df;--band:#f2f1ed;--series:#2a78d6}
  .title{font-weight:600;fill:var(--ink);font-size:15px}.axis{fill:var(--muted);font-size:12px}
  p{color:var(--muted);margin:4px 0 12px}</style>
  <p>Ogni punto è un livello (1–100), fasce alterne = stage; rombo = boss.</p>
  ${panel('Vittorie di un giocatore casuale (più basso = più difficile)', (r) => r.randomWin, 1, [0, 0.25, 0.5, 0.75, 1], (v) => `${Math.round(v * 100)}%`)}
  ${panel('Secchielli per livello (decisioni)', (r) => r.shooters, 30, [0, 10, 20, 30], String)}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1140, height: 620 } });
await page.setContent(html);
await page.screenshot({ path: `${dir}curva-difficolta.png`, fullPage: true });
await browser.close();

for (let s = 1; s <= 10; s++) {
  const st = rows.filter((r) => r.stage === s);
  const avg = (f: (r: (typeof rows)[number]) => number) => (st.reduce((a, r) => a + f(r), 0) / st.length).toFixed(2);
  console.log(`| ${s} | ${avg((r) => r.randomWin)} | ${Math.min(...st.map((r) => r.randomWin)).toFixed(2)} | ${avg((r) => r.shooters)} | ${avg((r) => r.ice)} | ${avg((r) => r.hidden)} | ${st.find((r) => r.boss)?.randomWin ?? '-'} |`);
}
