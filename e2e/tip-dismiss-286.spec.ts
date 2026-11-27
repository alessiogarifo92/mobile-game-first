import { expect, test, type Page } from '@playwright/test';
import { PANEL_ARM_WAIT, checkOnScreen, mix, openLevel, tap, waitScene, waitSim, type Rect } from './helpers';

/**
 * #286: on a 360x640 phone the "Why it came back" card of level 422 is shrunk to fit under the belt, and its "Got it"
 * button with it: the touch target fell to 35 CSS px and a tap on the line just above it (y≈581 of 640, as the
 * playtest agent did) hit the shade, so the card never closed. Now the button keeps a 44 px target and the band at the
 * card's foot (from just above the last text line down) closes it too; the rest of the card, which lies over the
 * columns, still swallows taps. Same options as the playtest harness (touch, isMobile, DPR 2).
 * With EVIDENCE set, screenshots go to docs/test-evidence/286-tip-ok-hitzone/.
 */
const KEY = 'mix-and-splash/progress/v1';
const evidence = process.env.EVIDENCE;
const SEEN = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'film', 'tunnel', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'iceFilm', 'iceTunnel', 'hiddenFilm', 'hiddenTunnel', 'allPairs'];
/** CSS px to logical units on a 360 px wide phone. */
const CSS = 720 / 360;

test.use({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

async function openCard(page: Page) {
  const save = { unlocked: 422, completed: Array.from({ length: 421 }, (_, i) => i + 1), sound: false, language: 'it', seenTips: SEEN };
  await page.addInitScript(([k, v]) => localStorage.setItem(k!, v!), [KEY, JSON.stringify(save)]);
  await page.goto('/');
  await waitScene(page, 'menu');
  await openLevel(page, 422);
  await waitSim(page, () => (window as unknown as { __mix: { tip: string | null } }).__mix.tip !== null);
  expect(await mix<string>(page, 'tip')).toBe('leftover');
  const box = await mix<{ y: number; h: number }>(page, 'tipBox');
  const belt = await mix<Rect>(page, 'beltRect');
  // The case of the bug: the card is shrunk to sit under the belt.
  expect(box.y).toBeGreaterThanOrEqual(belt.y + belt.h);
  return { button: await mix<{ x: number; y: number }>(page, 'tipButton'), box };
}

const closed = (page: Page) => page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === null, null, { timeout: 3000 });

test('a tap 21 CSS px above the button centre closes the shrunk card at once (44 px target)', async ({ page }) => {
  const { button } = await openCard(page);
  if (evidence) await page.screenshot({ path: 'docs/test-evidence/286-tip-ok-hitzone/01-scheda-422-360x640.png' });
  await checkOnScreen(page, 'leftover card 360x640');
  await tap(page, button.x, button.y - 21 * CSS);
  await closed(page);
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).seenTips as string[], KEY)).toContain('leftover');
});

test('a tap where the playtest agent tapped (29 CSS px above the centre, on the last text line) closes the card', async ({ page }) => {
  const { button } = await openCard(page);
  await tap(page, button.x, button.y - 29 * CSS);
  await closed(page);
  if (evidence) await page.screenshot({ path: 'docs/test-evidence/286-tip-ok-hitzone/02-scheda-chiusa-360x640.png' });
});

test('a tap on the card above the band (title, picture) does nothing: the card is read first', async ({ page }) => {
  const { button, box } = await openCard(page);
  await page.waitForTimeout(PANEL_ARM_WAIT);
  await tap(page, button.x - 200, box.y + 80);
  await page.waitForTimeout(300);
  expect(await mix<string | null>(page, 'tip')).toBe('leftover');
});

test('a launch tap on a column under a card that opens at level start does not close it (level 10)', async ({ page }) => {
  const seen = [...SEEN.filter((t) => t !== 'leftover')];
  await page.addInitScript(([k, v]) => localStorage.setItem(k!, v!), [KEY, JSON.stringify({ unlocked: 10, completed: Array.from({ length: 9 }, (_, i) => i + 1), sound: false, language: 'it', seenTips: seen })]);
  await page.goto('/');
  await waitScene(page, 'menu');
  await openLevel(page, 10);
  await waitSim(page, () => (window as unknown as { __mix: { tip: string | null } }).__mix.tip !== null);
  expect(await mix<string>(page, 'tip')).toBe('leftover');
  // Well after the card opened, as on a slow phone (#286 CI): the tap the player meant for a column.
  await page.waitForTimeout(PANEL_ARM_WAIT + 500);
  const columns = await mix<Rect[]>(page, 'columns');
  await tap(page, columns[0]!.x + columns[0]!.w / 2, columns[0]!.y + 40);
  await page.waitForTimeout(300);
  expect(await mix<string | null>(page, 'tip')).toBe('leftover');
});

test('a tap on the shade outside the card still does nothing', async ({ page }) => {
  const { box } = await openCard(page);
  await page.waitForTimeout(PANEL_ARM_WAIT);
  await tap(page, 360, box.y - 40);
  await page.waitForTimeout(300);
  expect(await mix<string | null>(page, 'tip')).toBe('leftover');
});
