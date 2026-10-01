/**
 * Renders public/icon.svg into every icon the web app and the Android project need, plus the Android
 * splash images (icon centred on the paper background). Uses the preinstalled Chromium.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const root = new URL('..', import.meta.url).pathname;
const svg = readFileSync(`${root}public/icon.svg`, 'utf8');
const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const BG = '#FFF6E9';

const browser = await chromium.launch();
async function render(path: string, w: number, h: number, body: string, transparent = true) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<style>html,body{margin:0;background:${transparent ? 'transparent' : BG}}</style>${body}`);
  await page.screenshot({ path, omitBackground: transparent });
  await page.close();
}
const icon = (size: number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">${inner}</svg>`;
// Adaptive-icon foreground: art inside the 66% safe zone, transparent around it.
const foreground = (size: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}"><g transform="translate(87 87) scale(0.66)">${inner}</g></svg>`;

for (const size of [192, 512]) await render(`${root}public/icons/icon-${size}.png`, size, size, icon(size));

const res = `${root}android/app/src/main/res`;
const dims = (file: string) => execFileSync('file', ['-b', file]).toString().match(/(\d+) x (\d+)/)!.slice(1).map(Number) as [number, number];
for (const dir of readdirSync(res)) {
  for (const name of readdirSync(`${res}/${dir}`)) {
    const file = `${res}/${dir}/${name}`;
    if (!name.endsWith('.png')) continue;
    const [w, h] = dims(file);
    if (name === 'ic_launcher.png' || name === 'ic_launcher_round.png') await render(file, w, h, icon(w));
    else if (name === 'ic_launcher_foreground.png') await render(file, w, h, foreground(w));
    else if (name === 'splash.png') {
      const s = Math.round(Math.min(w, h) * 0.4);
      await render(file, w, h, `<div style="display:flex;align-items:center;justify-content:center;width:${w}px;height:${h}px">${icon(s)}</div>`, false);
    }
  }
}
await browser.close();
