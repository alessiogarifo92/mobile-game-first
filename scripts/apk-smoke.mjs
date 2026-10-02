// Drives the app running in the emulator through its WebView DevTools port (forwarded to :9222), speaking the Chrome
// DevTools Protocol directly: Playwright cannot attach to an Android WebView (no browser context management).
// Usage: node scripts/apk-smoke.mjs first|after-update <out dir>
import { mkdirSync, writeFileSync } from 'node:fs';

const [phase, out = 'smoke-out'] = process.argv.slice(2);
const PORT = process.env.CDP_PORT ?? '9222';
const KEY = 'mix-and-splash/progress/v1';
const PROGRESS = { unlocked: 4, completed: [1, 2, 3], sound: false, language: 'it', seenTips: ['guide'], skin: 'classic' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      const targets = await (await fetch(`http://localhost:${PORT}/json`)).json();
      const page = targets.find((t) => t.type === 'page' && t.url.startsWith('http') && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // not up yet
    }
    if (Date.now() > deadline) throw new Error('no WebView page found on the DevTools port');
    await sleep(1000);
  }
}

const ws = new WebSocket(await connect());
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = () => reject(new Error('could not open the DevTools socket'));
});
let nextId = 0;
const pending = new Map();
ws.onmessage = (message) => {
  const data = JSON.parse(message.data);
  pending.get(data.id)?.(data);
  pending.delete(data.id);
};
const send = (method, params = {}) => new Promise((resolve) => {
  const id = ++nextId;
  pending.set(id, resolve);
  ws.send(JSON.stringify({ id, method, params }));
});

/** Evaluates an expression in the page and returns its (JSON) value. */
async function evaluate(expression) {
  const reply = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (reply.error || reply.result?.exceptionDetails) throw new Error(`evaluate failed: ${JSON.stringify(reply.error ?? reply.result.exceptionDetails.text)}`);
  return reply.result.result.value;
}

try {
  // Wait for the game's map.
  const deadline = Date.now() + 60_000;
  while (!(await evaluate('window.__mix?.scene === "menu"'))) {
    if (Date.now() > deadline) throw new Error('the app did not reach the map in 60 s');
    await sleep(1000);
  }

  // The page must be laid out (the app in the foreground, the WebView with a size) before anything is measured.
  const laidOut = Date.now() + 60_000;
  while (!(await evaluate('window.innerWidth > 0 && window.innerHeight > 0 && document.querySelector("canvas")?.getBoundingClientRect().width > 0'))) {
    if (Date.now() > laidOut) {
      console.log('page size', await evaluate('JSON.stringify({ w: window.innerWidth, h: window.innerHeight, vis: document.visibilityState })'));
      throw new Error('the WebView has no size after 60 s: the app is not in the foreground');
    }
    await sleep(1000);
  }

  const info = await evaluate(`(() => {
    const c = document.querySelector('canvas').getBoundingClientRect();
    const h = document.getElementById('game').getBoundingClientRect();
    const bad = window.__mixBounds().filter((o) => o.depth >= 5 && (o.x < -2 || o.x + o.w > 722));
    return {
      title: document.title,
      nodes: window.__mix.nodes.filter((n) => n.unlocked).map((n) => n.id),
      language: window.__mix.language,
      canvas: { x: c.x, y: c.y, w: c.width, h: c.height },
      host: { x: h.x, y: h.y, w: h.width, h: h.height },
      inner: { w: window.innerWidth, h: window.innerHeight },
      drawnOutside: bad.length,
      save: JSON.parse(localStorage.getItem(${JSON.stringify(KEY)}) ?? 'null'),
    };
  })()`);
  mkdirSync(out, { recursive: true });
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
    await evaluate(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(PROGRESS))})`);
    await sleep(10_000); // Chromium commits localStorage to disk in batches (~5 s): wait before the app is force-stopped
  } else {
    if (info.nodes.join() !== '1,2,3,4') throw new Error(`progress lost after the update: unlocked ${info.nodes}`);
    if (info.language !== 'it') throw new Error('language lost after the update');
  }
} finally {
  ws.close();
}
