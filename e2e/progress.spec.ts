import { expect, test, type Page } from '@playwright/test';
import { defaultProgress } from '../src/core/progress';
import { exportSaveCode } from '../src/core/saveCode';
import { mix, shots, tap, waitScene } from './helpers';

const KEY = 'mix-and-splash/progress/v1';
const ADVANCED = { ...defaultProgress(), unlocked: 6, completed: [1, 2, 3, 4, 5], language: 'it' as const, sound: false };

type Buttons = Record<string, { x: number; y: number }>;

async function openData(page: Page) {
  await waitScene(page, 'menu');
  const gear = await mix<{ x: number; y: number }>(page, 'settingsButton');
  await tap(page, gear.x, gear.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { settingsOpen: boolean } }).__mix.settingsOpen);
  const b = await mix<Buttons>(page, 'settingsButtons');
  await tap(page, b.progress!.x, b.progress!.y);
  await waitScene(page, 'data');
}

const saved = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY);

test.beforeEach(async ({ page }) => {
  // Seed once: the init script would otherwise overwrite the storage on every navigation.
  await page.addInitScript((k) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem(k, JSON.stringify({ unlocked: 2, completed: [1], sound: false, language: 'en', seenTips: ['guide'], skin: 'classic' })); } }, KEY);
  await page.goto('/');
});

test('a save code can be loaded; an invalid one is rejected; an older one asks first', async ({ page }) => {
  await openData(page);
  if (shots) await page.screenshot({ path: `${shots}/16-backup.png` });

  // Invalid code: message, nothing changes.
  page.once('dialog', (d) => d.accept('MS1.garbage.zzz'));
  await tap(page, (await mix<{ paste: { x: number; y: number } }>(page, 'buttons')).paste.x, (await mix<{ paste: { x: number; y: number } }>(page, 'buttons')).paste.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { message: string | null } }).__mix.message === 'That code is not valid');
  expect((await saved(page)).completed).toEqual([1]);

  // Cancelled prompt: nothing happens.
  page.once('dialog', (d) => d.dismiss());
  const paste = (await mix<Record<string, { x: number; y: number }>>(page, 'buttons')).paste!;
  await tap(page, paste.x, paste.y);
  expect((await saved(page)).completed).toEqual([1]);

  // A more advanced code loads straight away (language included) and persists.
  page.once('dialog', (d) => d.accept(exportSaveCode(ADVANCED)));
  await tap(page, paste.x, paste.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { message: string | null } }).__mix.message === 'Progressi caricati');
  expect(await saved(page)).toMatchObject({ unlocked: 6, completed: [1, 2, 3, 4, 5], language: 'it' });

  // An older code is behind the current progress: it asks, and Cancel keeps the progress.
  const older = exportSaveCode({ ...defaultProgress(), language: 'it' });
  page.once('dialog', (d) => d.accept(older));
  await tap(page, paste.x, paste.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { overlay: boolean } }).__mix.overlay);
  let b = await mix<Buttons>(page, 'buttons');
  await tap(page, b.cancel!.x, b.cancel!.y);
  await page.waitForFunction(() => !(window as unknown as { __mix: { overlay: boolean } }).__mix.overlay);
  expect((await saved(page)).completed).toEqual([1, 2, 3, 4, 5]);

  // …and Replace takes it.
  page.once('dialog', (d) => d.accept(older));
  await tap(page, paste.x, paste.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { overlay: boolean } }).__mix.overlay);
  b = await mix<Buttons>(page, 'buttons');
  await tap(page, b.confirm!.x, b.confirm!.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { message: string | null } }).__mix.message === 'Progressi caricati');
  expect((await saved(page)).completed).toEqual([]);
});

test('the copy button offers the code when the clipboard is not available, and the code restores the save', async ({ page }) => {
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
  await openData(page);
  const copy = (await mix<Buttons>(page, 'buttons')).copy!;
  const shown = new Promise<string>((resolve) => page.once('dialog', (d) => { const code = d.defaultValue(); void d.dismiss(); resolve(code); }));
  await tap(page, copy.x, copy.y);
  const code = await shown;
  expect(code).toMatch(/^MS1\./);
  // The code carries the current progress: loading it after a reset brings it back.
  const b = await mix<Buttons>(page, 'buttons');
  await tap(page, b.reset!.x, b.reset!.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { overlay: boolean } }).__mix.overlay);
  const c = await mix<Buttons>(page, 'buttons');
  await tap(page, c.confirm!.x, c.confirm!.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { message: string | null } }).__mix.message === 'Progress erased');
  expect(await saved(page)).toMatchObject({ unlocked: 1, completed: [], language: 'en', sound: false });
  page.once('dialog', (d) => d.accept(code));
  const paste = (await mix<Buttons>(page, 'buttons')).paste!;
  await tap(page, paste.x, paste.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { message: string | null } }).__mix.message === 'Progress loaded');
  expect(await saved(page)).toMatchObject({ unlocked: 2, completed: [1], seenTips: ['guide'] });
});

test('reset needs a confirmation; cancelling keeps the progress, confirming erases it but keeps language and sound', async ({ page }) => {
  await openData(page);
  let b = await mix<Buttons>(page, 'buttons');
  await tap(page, b.reset!.x, b.reset!.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { overlay: boolean } }).__mix.overlay);
  if (shots) await page.screenshot({ path: `${shots}/17-reset-conferma.png` });
  b = await mix<Buttons>(page, 'buttons');
  await tap(page, b.cancel!.x, b.cancel!.y);
  await page.waitForFunction(() => !(window as unknown as { __mix: { overlay: boolean } }).__mix.overlay);
  expect((await saved(page)).completed).toEqual([1]);

  b = await mix<Buttons>(page, 'buttons');
  await tap(page, b.reset!.x, b.reset!.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { overlay: boolean } }).__mix.overlay);
  b = await mix<Buttons>(page, 'buttons');
  await tap(page, b.confirm!.x, b.confirm!.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { message: string | null } }).__mix.message === 'Progress erased');
  expect(await saved(page)).toMatchObject({ unlocked: 1, completed: [], seenTips: [] });

  // Back to the map: only level 1 is open, and the reset survives a reload.
  await tap(page, 60, 64);
  await waitScene(page, 'menu');
  await page.reload();
  await waitScene(page, 'menu');
  const nodes = await mix<{ id: number; unlocked: boolean }[]>(page, 'nodes');
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual([1]);
});
