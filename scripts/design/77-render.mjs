// Renders the frames of docs/design/77-novita-difficolta.md: node scripts/design/77-render.mjs
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const out = 'docs/design/77-novita-difficolta';
mkdirSync(out, { recursive: true });
const bundle = await build({ entryPoints: ['scripts/design/77-mock.ts'], bundle: true, write: false, format: 'iife', globalName: 'Mock', external: ['phaser'] });
const browser = await chromium.launch();
const h = 1280; // logical height at 360x640
const page = await browser.newPage({ viewport: { width: 360, height: h / 2 }, deviceScaleFactor: 2 });
await page.setContent(`<canvas id="c" width="720" height="${h}" style="width:360px;height:${h / 2}px"></canvas>`);
await page.addScriptTag({ content: bundle.outputFiles[0].text });
for (const lang of ['it', 'en']) {
  for (const dir of ['A', 'B', 'C']) {
    const box = await page.evaluate(([dir, lang, h]) => window.Mock.draw(document.getElementById('c').getContext('2d'), h, dir, lang), [dir, lang, h]);
    console.log(dir, lang, JSON.stringify(box));
    await page.locator('#c').screenshot({ path: `${out}/${dir}-${lang}.png` });
  }
}
await browser.close();
