import { expect, test } from '@playwright/test';
import { mix, waitScene } from './helpers';

const KEY = 'mix-and-splash/progress/v1';
const SAVE = { unlocked: 7, completed: [1, 2, 3, 4, 5, 6], sound: false, language: 'it', seenTips: ['guide'], skin: 'classic' };

/** Seeds the save once: the init script runs on every navigation and would overwrite progress made later. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(([k, v]) => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem(k as string, v as string);
    }
  }, [KEY, JSON.stringify(SAVE)]);
});

async function controlled(page: import('@playwright/test').Page) {
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return !!reg?.active && !!navigator.serviceWorker.controller;
  }, null, { timeout: 30_000 });
}

test('the service worker installs, takes control and precaches the game', async ({ page }) => {
  await page.goto('/');
  await waitScene(page, 'menu');
  await controlled(page);
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) for (const r of await (await caches.open(name)).keys()) urls.push(new URL(r.url).pathname);
    return urls;
  });
  // The page, the manifest's icons and the game bundles are all available offline.
  expect(cached.some((u) => u.endsWith('/') || u.endsWith('/index.html'))).toBe(true);
  expect(cached.some((u) => /\/assets\/index-.*\.js$/.test(u))).toBe(true);
  expect(cached.some((u) => /\/assets\/phaser-.*\.js$/.test(u))).toBe(true);
  expect(cached.some((u) => u.endsWith('/icons/icon-192.png'))).toBe(true);
});

test('the game opens offline after the first visit, with the progress intact', async ({ page, context }) => {
  await page.goto('/');
  await waitScene(page, 'menu');
  await controlled(page);

  await context.setOffline(true);
  await page.reload();
  await waitScene(page, 'menu');
  const nodes = await mix<{ id: number; unlocked: boolean }[]>(page, 'nodes');
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(await mix(page, 'language')).toBe('it');

  // The map still scrolls with the network down.
  await page.keyboard.press('End');
  await page.waitForFunction(() => (window as unknown as { __mix: { scrollY: number } }).__mix.scrollY > 0);
  await context.setOffline(false);
});

test('a new visit after an update keeps the saved progress', async ({ page }) => {
  await page.goto('/');
  await waitScene(page, 'menu');
  await controlled(page);
  // Same origin, new document: what an update does (autoUpdate activates the new worker and reloads the page).
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg?.update();
  });
  await page.reload();
  await waitScene(page, 'menu');
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY)).toMatchObject({ unlocked: 7, completed: [1, 2, 3, 4, 5, 6], language: 'it' });
});

test('a change made offline (language) is saved and survives a reload', async ({ page, context }) => {
  await page.goto('/');
  await waitScene(page, 'menu');
  await controlled(page);
  await context.setOffline(true);
  await page.reload();
  await waitScene(page, 'menu');
  // Change something in the save through the real UI (language), still offline.
  const gear = await mix<{ x: number; y: number }>(page, 'settingsButton');
  const box = (await page.locator('canvas').boundingBox())!;
  const k = box.width / 720;
  const scroll = await mix<number>(page, 'scrollY');
  await page.mouse.click(box.x + gear.x * k, box.y + (gear.y - scroll) * k);
  await page.waitForFunction(() => (window as unknown as { __mix: { settingsOpen: boolean } }).__mix.settingsOpen);
  const buttons = await mix<Record<string, { x: number; y: number }>>(page, 'settingsButtons');
  await page.mouse.click(box.x + buttons['lang-en']!.x * k, box.y + (buttons['lang-en']!.y - scroll) * k);
  await page.waitForFunction(() => (window as unknown as { __mix: { language: string } }).__mix.language === 'en');
  await page.reload();
  await waitScene(page, 'menu');
  expect(await mix(page, 'language')).toBe('en');
  await context.setOffline(false);
});
