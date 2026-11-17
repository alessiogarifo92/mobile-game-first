// Renders the frames of docs/design/153-ricompensa-stage.md: node scripts/design/153-render.mjs
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const out = 'docs/design/153-ricompensa-stage';
mkdirSync(out, { recursive: true });
const bundle = await build({ entryPoints: ['scripts/design/153-mock.ts'], bundle: true, write: false, format: 'iife', globalName: 'Mock', external: ['phaser'] });
const code = bundle.outputFiles[0].text;
const browser = await chromium.launch();
// Logical height at 360x640 (1280) and 412x915 (720 * 915 / 412).
const screens = [['360x640', 1280], ['412x915', Math.round((720 * 915) / 412)]];
const bad = [];
for (const lang of ['it', 'en']) {
  for (const [name, h] of screens) {
    const page = await browser.newPage({ viewport: { width: 360, height: Math.round(h / 2) }, deviceScaleFactor: 2 });
    await page.setContent(`<canvas id="c" width="720" height="${h}" style="width:360px;height:${h / 2}px"></canvas>`);
    await page.addScriptTag({ content: code });
    for (const dir of ['A', 'A2', 'B', 'C']) {
      const box = await page.evaluate(([dir, lang, h]) => window.Mock.draw(document.getElementById('c').getContext('2d'), h, dir, lang), [dir, lang, h]);
      if (box.top < 0 || box.top + box.height > h) bad.push(`${dir} ${lang} ${name}`);
      if (name === '360x640') await page.locator('#c').screenshot({ path: `${out}/${dir}-${lang}.png` });
    }
    await page.close();
  }
}
await browser.close();
console.log(bad.length ? `outside: ${bad.join(', ')}` : 'all panels inside 360x640 and 412x915, it and en');
