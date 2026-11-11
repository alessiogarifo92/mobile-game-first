import { expect, test } from '@playwright/test';
import { mix, openLevel, shots, waitScene } from './helpers';

type Hint = { levelId: number; x: number; y: number; animated: boolean } | null;

// #190: on the very first launch the map points at the open level; once a level was opened the pointer is gone.
test.use({ viewport: { width: 360, height: 640 } });

test('first launch points at level 1; the pointer is gone after opening it', async ({ page }) => {
  await page.goto('/');
  await waitScene(page, 'menu');
  const hint = await mix<Hint>(page, 'mapHint');
  expect(hint).toMatchObject({ levelId: 1, animated: true });
  const node = (await mix<{ id: number; x: number; y: number }[]>(page, 'nodes')).find((n) => n.id === 1)!;
  expect(hint!.x).toBe(node.x);
  expect(hint!.y).toBeLessThan(node.y); // drawn above the node, pointing down at it
  if (shots) await page.screenshot({ path: `${shots}/190-01-primo-avvio.png` });

  await openLevel(page, 1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mix-and-splash/progress/v1')!).seenTips)).toContain('map');

  // Back to the map without finishing the level: no pointer, and none after a reload either.
  await page.reload();
  await waitScene(page, 'menu');
  expect(await mix<Hint>(page, 'mapHint')).toBeNull();
  if (shots) await page.screenshot({ path: `${shots}/190-02-dopo-primo-livello.png` });
});

test('with reduced motion the pointer is still there, but does not move', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await waitScene(page, 'menu');
  expect(await mix<Hint>(page, 'mapHint')).toMatchObject({ levelId: 1, animated: false });
  if (shots) await page.screenshot({ path: `${shots}/190-03-movimento-ridotto.png` });
});

test('a save that already played never sees the pointer', async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('mix-and-splash/progress/v1', JSON.stringify({ unlocked: 1, completed: [], sound: false, language: 'en', seenTips: ['guide'] })); } });
  await page.goto('/');
  await waitScene(page, 'menu');
  expect(await mix<Hint>(page, 'mapHint')).toBeNull();
});

test('with the pointer on screen, scrolling up and tapping another open level (10) still opens it', async ({ page }) => {
  // The case of e2e/feedback-176 but with the pointer drawn: every level open, nothing completed, no tip seen yet.
  await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('mix-and-splash/progress/v1', JSON.stringify({ unlocked: 20, completed: [], sound: false, language: 'it', seenTips: [] })); } });
  await page.goto('/');
  await waitScene(page, 'menu');
  expect(await mix<Hint>(page, 'mapHint')).toMatchObject({ levelId: 1 });
  await openLevel(page, 10);
  expect(await mix<number>(page, 'levelId')).toBe(10);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mix-and-splash/progress/v1')!).seenTips)).toContain('map');
});
