// Drives the app running in the emulator through its WebView DevTools port (forwarded to :9222).
// Usage: node scripts/apk-smoke.mjs first|after-update <out dir>
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const [phase, out = 'smoke-out'] = process.argv.slice(2);
const KEY = 'mix-and-splash/progress/v1';
const PROGRESS = { unlocked: 4, completed: [1, 2, 3], sound: false, language: 'it', seenTips: ['guide'], skin: 'classic' };

const browser = await chromium.connectOverCDP('http://localhost:9222');
try {
  const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().startsWith('http'));
  if (!page) throw new Error('no WebView page found');
  await page.waitForFunction(() => window.__mix?.scene === 'menu', null, { timeout: 60_000 });

  const info = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const host = document.getElementById('game');
    const c = canvas.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    const bad = window.__mixBounds().filter((o) => o.depth >= 5 && (o.x < -2 || o.x + o.w > 722));
    return {
      title: document.title, nodes: window.__mix.nodes.filter((n) => n.unlocked).map((n) => n.id), language: window.__mix.language,
      canvas: { x: c.x, y: c.y, w: c.width, h: c.height }, host: { x: h.x, y: h.y, w: h.width, h: h.height },
      inner: { w: window.innerWidth, h: window.innerHeight }, drawnOutside: bad.length,
      save: JSON.parse(localStorage.getItem('mix-and-splash/progress/v1') ?? 'null'),
    };
  });
  writeFileSync(`${out}/${phase}.json`, JSON.stringify(info, null, 2));
  console.log(phase, JSON.stringify(info));

  if (info.title !== 'Mix & Splash') throw new Error(`unexpected title ${info.title}`);
  // The canvas fits inside the host area (the free area of the screen), with 1 px of rounding.
  const fits = info.canvas.x >= info.host.x - 1 && info.canvas.y >= info.host.y - 1
    && info.canvas.x + info.canvas.w <= info.host.x + info.host.w + 1 && info.canvas.y + info.canvas.h <= info.host.y + info.host.h + 1;
  if (!fits) throw new Error('canvas does not fit its host');
  if (info.drawnOutside > 0) throw new Error('map title bar drawn outside the screen');

  if (phase === 'first') {
    if (info.nodes.join() !== '1') throw new Error(`fresh install should have only level 1 open, got ${info.nodes}`);
    // Make some progress (written the same way the game does), to be found again after the update.
    await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, PROGRESS]);
    await page.waitForTimeout(3000); // let the WebView flush localStorage to disk before the app is stopped
  } else {
    if (info.nodes.join() !== '1,2,3,4') throw new Error(`progress lost after the update: unlocked ${info.nodes}`);
    if (info.language !== 'it') throw new Error('language lost after the update');
  }
} finally {
  await browser.close();
}
