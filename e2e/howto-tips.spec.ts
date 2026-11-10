import { expect, test, type Page } from '@playwright/test';
import { EXTRA_TIPS, HOWTO_PAGES } from '../src/core/howto';
import { mix, tap, waitScene } from './helpers';

/** How to play shows, after its base pages, one "unlocked rule" page per tip card already seen in a level (#183). */
const KEY = 'mix-and-splash/progress/v1';
const ALL_TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover'];
const evidence = 'docs/test-evidence/183-howto-tips';

async function openHowTo(page: Page, seenTips: string[]) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'it', unlocked: 1, completed: [], seenTips })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
  const gear = await mix<{ x: number; y: number }>(page, 'settingsButton');
  await tap(page, gear.x, gear.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { settingsOpen: boolean } }).__mix.settingsOpen);
  const buttons = await mix<Record<string, { x: number; y: number }>>(page, 'settingsButtons');
  await tap(page, buttons.howto!.x, buttons.howto!.y);
  await waitScene(page, 'howto');
}

async function goTo(page: Page, n: number) {
  await page.waitForFunction((k) => (window as unknown as { __mix: { page: number } }).__mix.page === k, n);
  await page.waitForTimeout(250); // the page slide settles
}

test('with no tip seen, How to play keeps exactly its base pages', async ({ page }) => {
  await openHowTo(page, []);
  expect(await mix(page, 'pages')).toBe(HOWTO_PAGES);
  expect(await mix(page, 'tip')).toBeNull();
  await page.screenshot({ path: `${evidence}/01-zero-regole-pagina-1.png` });
  for (let i = 1; i < HOWTO_PAGES; i++) {
    await page.keyboard.press('ArrowRight');
    await goTo(page, i);
    expect(await mix(page, 'tip')).toBeNull();
  }
  await page.screenshot({ path: `${evidence}/02-zero-regole-ultima-pagina.png` });
  // The last base page is still the end: one more step right does nothing, "Gioca" leaves.
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  expect(await mix(page, 'page')).toBe(HOWTO_PAGES - 1);
  const next = await mix<{ x: number; y: number }>(page, 'next');
  await tap(page, next.x, next.y);
  await waitScene(page, 'menu');
});

test('with every tip seen, the unlocked rules follow the base pages in card order, then "Gioca" leaves', async ({ page }) => {
  await openHowTo(page, ALL_TIPS);
  expect(await mix(page, 'pages')).toBe(HOWTO_PAGES + EXTRA_TIPS.length);
  await page.screenshot({ path: `${evidence}/03-tutte-regole-pagina-1.png` });
  for (let i = 0; i < EXTRA_TIPS.length; i++) {
    const n = HOWTO_PAGES + i;
    if (i === 0) {
      // Arrow keys through the base pages up to the first unlocked one, then the button for the rest.
      for (let k = 1; k <= n; k++) {
        await page.keyboard.press('ArrowRight');
        await goTo(page, k);
      }
    } else {
      const next = await mix<{ x: number; y: number }>(page, 'next');
      await tap(page, next.x, next.y);
      await goTo(page, n);
    }
    expect(await mix(page, 'tip')).toBe(EXTRA_TIPS[i]);
    await page.screenshot({ path: `${evidence}/${String(4 + i).padStart(2, '0')}-regola-${EXTRA_TIPS[i]}.png` });
  }
  const next = await mix<{ x: number; y: number }>(page, 'next');
  await tap(page, next.x, next.y);
  await waitScene(page, 'menu');
});

test('only the seen tips unlock a page: ice and queue seen gives exactly two extra pages', async ({ page }) => {
  await openHowTo(page, ['guide', 'queue', 'ice']);
  expect(await mix(page, 'pages')).toBe(HOWTO_PAGES + 2);
  await page.keyboard.press('ArrowLeft'); // nothing before the first page
  await page.waitForTimeout(200);
  expect(await mix(page, 'page')).toBe(0);
  for (let k = 1; k <= HOWTO_PAGES; k++) {
    await page.keyboard.press('ArrowRight');
    await goTo(page, k);
  }
  expect(await mix(page, 'tip')).toBe('ice');
  await page.keyboard.press('ArrowRight');
  await goTo(page, HOWTO_PAGES + 1);
  expect(await mix(page, 'tip')).toBe('queue');
});
