// Renders the frames of docs/design/73-difficolta-ui.md: node scripts/design/73-render.mjs
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const out = 'docs/design/73-difficolta-ui';
mkdirSync(out, { recursive: true });
const bundle = await build({ entryPoints: ['scripts/design/73-mock.ts'], bundle: true, write: false, format: 'iife', globalName: 'Mock', external: ['phaser'] });
const browser = await chromium.launch();
const W = 1520; // two phones of 720 logical units and a gap, at 2 logical units per CSS pixel
const H = 1280;
const page = await browser.newPage({ viewport: { width: W / 2, height: H / 2 }, deviceScaleFactor: 2 });
await page.setContent(`<body style="margin:0"><canvas id="c" width="${W}" height="${H}" style="width:${W / 2}px;height:${H / 2}px;display:block"></canvas></body>`);
await page.addScriptTag({ content: bundle.outputFiles[0].text });
for (const lang of ['it', 'en']) {
  for (const dir of ['A', 'B', 'C']) {
    for (const screen of ['map', 'play', 'end']) {
      await page.evaluate(([screen, dir, lang]) => window.Mock.draw(document.getElementById('c').getContext('2d'), screen, dir, lang), [screen, dir, lang]);
      await page.locator('#c').screenshot({ path: `${out}/${screen}-${dir}-${lang}.png` });
    }
  }
}
await browser.close();
console.log(`frames written to ${out}`);
