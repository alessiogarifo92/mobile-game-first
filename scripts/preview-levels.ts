/**
 * Contact sheet of every stage's pixel art: docs/levels/stage-NN.png, to review the art without playing.
 *   npm run preview:levels
 */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import levelsJson from '../src/levels/levels.json' with { type: 'json' };
import { translate } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { STAGES } from '../src/core/stages';
import { css, PAINT } from '../src/game/theme';

const levels = (levelsJson as LevelDef[]).map(parseLevel);
const dir = new URL('../docs/levels/', import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();

for (const stage of STAGES) {
  const inStage = levels.filter((l) => l.stage === stage.id);
  if (inStage.length === 0) continue;
  const cards = inStage.map((l) => {
    const cell = Math.floor(200 / Math.max(l.width, l.height));
    const rects = l.targets
      .map((t, i) => (t ? `<rect x="${(i % l.width) * cell}" y="${Math.floor(i / l.width) * cell}" width="${cell - 1}" height="${cell - 1}" fill="${css(PAINT[t]!)}"/>` : ''))
      .join('');
    return `<figure><svg width="${l.width * cell}" height="${l.height * cell}">${rects}</svg>
      <figcaption>#${l.id}${l.boss ? ' ★' : ''} ${translate('en', `level.${l.name}`)} · ${l.width}×${l.height}</figcaption></figure>`;
  });
  const html = `<style>body{margin:0;padding:24px;background:#FFF6E9;font:16px system-ui;color:#2B2D42}
    h1{margin:0 0 16px}main{display:grid;grid-template-columns:repeat(5,220px);gap:20px}
    figure{margin:0;background:#FFFDF8;border-radius:12px;padding:10px;display:flex;flex-direction:column;align-items:center;gap:8px}</style>
    <h1>Stage ${stage.id} — ${translate('en', `stage.${stage.key}`)} (${inStage.length}/10)</h1><main>${cards.join('')}</main>`;
  const page = await browser.newPage({ viewport: { width: 1250, height: 400 } });
  await page.setContent(html);
  const path = `${dir}stage-${String(stage.id).padStart(2, '0')}.png`;
  await page.screenshot({ path, fullPage: true });
  await page.close();
  console.log(`wrote ${path}`);
}
await browser.close();
