import { expect, test, type Locator, type Page } from '@playwright/test';
import { mix, shots, tap, waitScene } from './helpers';

/**
 * #259: on the APK the native prompt pushed its buttons off screen with a long code. The code now goes in an in-game
 * panel whose buttons stay on screen whatever is pasted, keyboard open included.
 */
const KEY = 'mix-and-splash/progress/v1';
// A real code from before #259 (the old, long format): 166 levels completed, English, classic skin.
const REAL_MS1 =
  'MS1.eyJ1bmxvY2tlZCI6MTY3LCJjb21wbGV0ZWQiOlsxLDIsMyw0LDUsNiw3LDgsOSwxMCwxMSwxMiwxMywxNCwxNSwxNiwxNywxOCwxOSwyMCwyMSwyMiwyMywyNCwyNSwyNiwyNywyOCwyOSwzMCwzMSwzMiwzMywzNCwzNSwzNiwzNywzOCwzOSw0MCw0MSw0Miw0Myw0NCw0NSw0Niw0Nyw0OCw0OSw1MCw1MSw1Miw1Myw1NCw1NSw1Niw1Nyw1OCw1OSw2MCw2MSw2Miw2Myw2NCw2NSw2Niw2Nyw2OCw2OSw3MCw3MSw3Miw3Myw3NCw3NSw3Niw3Nyw3OCw3OSw4MCw4MSw4Miw4Myw4NCw4NSw4Niw4Nyw4OCw4OSw5MCw5MSw5Miw5Myw5NCw5NSw5Niw5Nyw5OCw5OSwxMDAsMTAxLDEwMiwxMDMsMTA0LDEwNSwxMDYsMTA3LDEwOCwxMDksMTEwLDExMSwxMTIsMTEzLDExNCwxMTUsMTE2LDExNywxMTgsMTE5LDEyMCwxMjEsMTIyLDEyMywxMjQsMTI1LDEyNiwxMjcsMTI4LDEyOSwxMzAsMTMxLDEzMiwxMzMsMTM0LDEzNSwxMzYsMTM3LDEzOCwxMzksMTQwLDE0MSwxNDIsMTQzLDE0NCwxNDUsMTQ2LDE0NywxNDgsMTQ5LDE1MCwxNTEsMTUyLDE1MywxNTQsMTU1LDE1NiwxNTcsMTU4LDE1OSwxNjAsMTYxLDE2MiwxNjMsMTY0LDE2NSwxNjZdLCJzb3VuZCI6dHJ1ZSwibGFuZ3VhZ2UiOiJlbiIsInNlZW5UaXBzIjpbImd1aWRlIiwibWl4aW5nIiwic2xvdHMiLCJsZWZ0b3ZlciIsImJlbHQiLCJicm93biIsInF1ZXVlIiwiaWNlIiwiaGlkZGVuIiwic3RvbmUiLCJibG9ja2VkIl0sInNraW4iOiJjbGFzc2ljIn0.1wy6zfc';

type Buttons = Record<string, { x: number; y: number }>;
const saved = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY);

async function openData(page: Page) {
  await waitScene(page, 'menu');
  const gear = await mix<{ x: number; y: number }>(page, 'settingsButton');
  await tap(page, gear.x, gear.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { settingsOpen: boolean } }).__mix.settingsOpen);
  const b = await mix<Buttons>(page, 'settingsButtons');
  await tap(page, b.progress!.x, b.progress!.y);
  await waitScene(page, 'data');
}

/** The element lies whole inside the visible viewport, and the page itself has not scrolled. */
async function expectOnScreen(page: Page, el: Locator) {
  const box = (await el.boundingBox())!;
  const view = await page.evaluate(() => ({ w: window.visualViewport!.width, h: window.visualViewport!.height, scroll: window.scrollY }));
  expect(view.scroll).toBe(0);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(view.w);
  expect(box.y + box.height).toBeLessThanOrEqual(view.h);
}

/** Presses the element where it is now, with no scrolling first (a locator click would scroll it into view). */
async function press(page: Page, el: Locator) {
  const box = (await el.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test.use({ viewport: { width: 412, height: 915 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript((k) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem(k, JSON.stringify({ unlocked: 2, completed: [1], sound: false, language: 'en', seenTips: ['guide'], skin: 'classic' })); } }, KEY);
  await page.goto('/');
});

test('a 166-level code pasted at 412x915 leaves Import on screen and loads', async ({ page }) => {
  await openData(page);
  const paste = (await mix<Buttons>(page, 'buttons')).paste!;
  await tap(page, paste.x, paste.y);
  const panel = page.getByRole('dialog', { name: 'Paste your save code' });
  await expect(panel).toBeVisible();
  expect(await mix<string | null>(page, 'codePanel')).toBe('paste');
  const field = panel.getByRole('textbox');
  await expect(field).toBeFocused();
  await field.fill(REAL_MS1);
  // The long code scrolls inside the field instead of growing the panel.
  expect(await field.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true);
  const importButton = panel.getByRole('button', { name: 'Import' });
  await expectOnScreen(page, importButton);
  await expectOnScreen(page, panel.getByRole('button', { name: 'Cancel' }));
  if (shots) await page.screenshot({ path: `${shots}/259-paste-412x915.png` });
  await press(page, importButton);
  await expect(panel).toBeHidden();
  await page.waitForFunction(() => (window as unknown as { __mix: { message: string | null } }).__mix.message === 'Progress loaded');
  const progress = await saved(page);
  expect(progress.completed).toHaveLength(166);
  expect(progress).toMatchObject({ unlocked: 167, language: 'en', skin: 'classic' });
});

test('with the keyboard open the buttons stay on screen, and the panel survives the relayout', async ({ page }) => {
  await openData(page);
  const paste = (await mix<Buttons>(page, 'buttons')).paste!;
  await tap(page, paste.x, paste.y);
  const panel = page.getByRole('dialog', { name: 'Paste your save code' });
  await panel.getByRole('textbox').fill(REAL_MS1);
  // An Android keyboard leaves about 40% of the screen: the game is rebuilt for it, the panel stays.
  await page.setViewportSize({ width: 412, height: 380 });
  await page.waitForTimeout(600);
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('textbox')).toHaveValue(REAL_MS1);
  await expectOnScreen(page, panel.getByRole('button', { name: 'Import' }));
  await expectOnScreen(page, panel.getByRole('button', { name: 'Cancel' }));
  if (shots) await page.screenshot({ path: `${shots}/259-paste-keyboard.png` });
  // Cancel closes it and changes nothing.
  await press(page, panel.getByRole('button', { name: 'Cancel' }));
  await expect(panel).toBeHidden();
  expect(await mix<string | null>(page, 'codePanel')).toBeNull();
  expect((await saved(page)).completed).toEqual([1]);
});

test('without a clipboard the code is shown read-only in the same panel, Close on screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
  await openData(page);
  const copy = (await mix<Buttons>(page, 'buttons')).copy!;
  await tap(page, copy.x, copy.y);
  const panel = page.getByRole('dialog', { name: 'Copy this save code' });
  await expect(panel).toBeVisible();
  const field = panel.getByRole('textbox');
  await expect(field).toHaveJSProperty('readOnly', true);
  expect(await field.inputValue()).toMatch(/^MS2\./);
  // The whole code is selected, ready for the system's Copy.
  expect(await field.evaluate((e: HTMLTextAreaElement) => e.selectionEnd - e.selectionStart)).toBe((await field.inputValue()).length);
  const close = panel.getByRole('button', { name: 'Close' });
  await expectOnScreen(page, close);
  await press(page, close);
  await expect(panel).toBeHidden();
});
