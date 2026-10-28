/**
 * Difficulty curve of the shipped levels (tickets #29, #75): per-level metrics as JSON and a chart.
 * `randomWin` is levelWinRate: random playouts with the game's own rules, so `belt` and `slots` weigh in.
 * Ends with the curve per universe and the curve rule violations (#88).
 *   npx tsx scripts/difficulty-report.ts
 */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import levelsJson from '../src/levels/levels.json' with { type: 'json' };
import { parseLevel, type LevelDef } from '../src/core/level';
import { levelWinRate, solve } from '../src/core/solver';
import { CURVE, checkCurve, curveLevel } from '../src/core/curve';
import { universeOfStage } from '../src/core/universes';
import { assignIds } from '../src/core/stages';
import { STAGE_SPECS } from './stages';

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
    randomWin: Number(levelWinRate(l).toFixed(3)),
    solutionMoves: solve(l).moves.length,
  };
});
const dir = new URL('../docs/reports/', import.meta.url).pathname;
writeFileSync(`${dir}curva-difficolta.json`, JSON.stringify(rows, null, 1) + '\n');

// Two small multiples sharing the level axis (never a dual axis): win rate, then decisions (shooters).
const W = 1100, H = 260, PAD = { l: 56, r: 16, t: 34, b: 30 };
const x = (id: number) => PAD.l + ((id - 0.5) / rows.length) * (W - PAD.l - PAD.r);
/** First and last level id of each stage, from the data. */
const stageSpans = [...new Set(rows.map((r) => r.stage))].map((s) => {
  const ids = rows.filter((r) => r.stage === s).map((r) => r.id);
  return { stage: s, first: Math.min(...ids), last: Math.max(...ids) };
});
function panel(title: string, value: (r: (typeof rows)[number]) => number, max: number, ticks: number[], fmt: (v: number) => string) {
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const bands = stageSpans.map((s, i) =>
    i % 2 ? `<rect x="${x(s.first - 0.5)}" y="${PAD.t}" width="${x(s.last + 0.5) - x(s.first - 0.5)}" height="${H - PAD.t - PAD.b}" fill="var(--band)"/>` : '').join('');
  const grid = ticks.map((t) => `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--grid)"/><text x="${PAD.l - 8}" y="${y(t) + 4}" text-anchor="end" class="axis">${fmt(t)}</text>`).join('');
  const stageLabels = stageSpans.map((s) => `<text x="${(x(s.first) + x(s.last)) / 2}" y="${H - 10}" text-anchor="middle" class="axis">S${s.stage}</text>`).join('');
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
  <p>Ogni punto è un livello (1–${rows.length}), fasce alterne = stage; rombo = boss.</p>
  ${panel('Vittorie di un giocatore casuale (più basso = più difficile)', (r) => r.randomWin, 1, [0, 0.25, 0.5, 0.75, 1], (v) => `${Math.round(v * 100)}%`)}
  ${panel('Secchielli per livello (decisioni)', (r) => r.shooters, 30, [0, 10, 20, 30], String)}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1140, height: 620 } });
await page.setContent(html);
await page.screenshot({ path: `${dir}curva-difficolta.png`, fullPage: true });
await browser.close();

for (const { stage: s } of stageSpans) {
  const st = rows.filter((r) => r.stage === s);
  const avg = (f: (r: (typeof rows)[number]) => number) => (st.reduce((a, r) => a + f(r), 0) / st.length).toFixed(2);
  const span = (f: (r: (typeof rows)[number]) => number) => {
    const [lo, hi] = [Math.min(...st.map(f)), Math.max(...st.map(f))];
    return lo === hi ? `${lo}` : `${lo}–${hi}`;
  };
  console.log(`| ${s} | ${avg((r) => r.randomWin)} | ${Math.min(...st.map((r) => r.randomWin)).toFixed(2)} | ${span((r) => r.belt)} | ${span((r) => r.slots)} | ${avg((r) => r.shooters)} | ${avg((r) => r.ice)} | ${avg((r) => r.hidden)} | ${st.find((r) => r.boss)?.randomWin ?? '-'} |`);
}

// Curve per universe (#88): mean of each stage against the universe targets, then every rule violation.
const specs = assignIds(STAGE_SPECS);
const curve = (levelsJson as LevelDef[]).map((def, i) => curveLevel(parseLevel(def), rows[i]!.randomWin, !!specs[i]!.curve?.easyBoss));
for (let u = 1; u <= universeOfStage(Math.max(...rows.map((r) => r.stage))); u++) {
  const stages = [...new Set(rows.filter((r) => universeOfStage(r.stage) === u).map((r) => r.stage))];
  const means = stages.map((s) => { const st = rows.filter((r) => r.stage === s); return st.reduce((a, r) => a + r.randomWin, 0) / st.length; });
  const bosses = rows.filter((r) => r.boss && universeOfStage(r.stage) === u).map((r) => r.randomWin);
  const target = CURVE.universes[u - 1];
  console.log(`\nuniverse ${u}: stage means ${means.map((m) => m.toFixed(2)).join(' ')} · hardest boss ${Math.min(...bosses).toFixed(2)}` +
    (target ? ` · targets: last stage ${target.endMean}, hardest boss ≥ ${target.hardestBoss}` : ''));
}
const violations = checkCurve(curve);
for (const rule of [...new Set(violations.map((v) => v.rule))].sort((a, b) => a - b)) {
  const vs = violations.filter((v) => v.rule === rule);
  console.log(`rule ${rule} (${vs[0]!.severity}): ${vs.map((v) => v.key.split(' ')[1]).join(' ')}`);
}
