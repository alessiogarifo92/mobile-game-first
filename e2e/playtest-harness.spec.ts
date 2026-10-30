import { expect, test } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import levels from '../src/levels/levels.json' with { type: 'json' };
import { parseLevel, type LevelDef } from '../src/core/level';
import { solve } from '../src/core/solver';
import { PlaytestAgent } from '../scripts/playtest/harness';
import type { Schema } from '../scripts/playtest/jsonSchema';
import { planLevels, saveFor, startSaveOf } from '../scripts/playtest/saves';
import type { Scheda } from '../scripts/playtest/telemetry';
import { mix } from './helpers';

const SCHEMA_FILE = 'docs/playtest/scheda.schema.json';

// The harness of #68, driven the way an agent drives it: taps on screen points and columns, then its feedback.
test('playtest harness: an agent plays level 1 to a win and the form records it', async ({ browser, baseURL }) => {
  const outDir = mkdtempSync(join(tmpdir(), 'playtest-'));
  const parsed = (levels as LevelDef[]).map(parseLevel);
  const plan = planLevels(parsed, ['U1-ONB']);
  const agent = await PlaytestAgent.start(browser, {
    header: {
      sessionId: 'T01-A01', agent: { agentId: 'A01', profileId: 'P01' }, turn: 1,
      build: { commit: '0000000', version: 'test', variant: 'normale' },
      device: { viewport: '360x640', language: 'en' },
      startSave: startSaveOf(saveFor(parsed, 1, 'en')),
      plan: { packs: ['U1-ONB'], levelIds: plan },
    },
    levels: parsed,
    gameUrl: baseURL!,
    outDir,
    maxAttempts: 4,
    schema: existsSync(SCHEMA_FILE) ? (JSON.parse(readFileSync(SCHEMA_FILE, 'utf8')) as Schema) : null,
    pollMs: 100,
  });
  const { page } = agent;
  // The test plays the agent's role: it finds level 1 on the map, then follows the solver's moves.
  const node = (await mix<{ id: number; x: number; y: number }[]>(page, 'nodes')).find((n) => n.id === 1)!;
  const box = (await page.locator('canvas').boundingBox())!;
  const k = box.width / 720;
  const scroll = await mix<number>(page, 'scrollY');
  const opened = await agent.tap(box.x + node.x * k, box.y + (node.y - scroll) * k, 800);
  expect(readFileSync(opened.screenshot!).subarray(1, 4).toString()).toBe('PNG');
  expect(await mix(page, 'scene')).toBe('play');

  // A tap on an empty spot of the board is off target.
  await agent.tap(box.x + 20 * k, box.y + 700 * k);
  expect(await agent.tapColumn(9)).toMatchObject({ notes: ['there is no column 9 on screen'] });

  for (const move of solve(parsed[0]!).moves) {
    if (move.from === 'column') await agent.tapColumn(move.index + 1);
    else await agent.tapSlot(move.index + 1);
    await agent.waitIdle();
    // A tip card may come up when a bucket returns: close it with its button, as a player would.
    if (await mix(page, 'tip')) {
      const b = await mix<{ x: number; y: number }>(page, 'tipButton');
      await agent.tap(box.x + b.x * k, box.y + b.y * k);
      await agent.waitIdle();
    }
  }
  await expect.poll(() => mix(page, 'overlay')).toBe('win');
  await agent.screenshot();

  // Ending without the agent's feedback is refused while the schema is there to check it.
  const early = await agent.end();
  if (early.validated) expect(early.errors).toEqual(expect.arrayContaining(['$.levels[0]: missing "feedback"']));
  expect(agent.levelFeedback(1, { understood: 5, perceivedDifficulty: 1, mood: 'divertito', notUnderstood: '', freeText: 'easy' })).toEqual([]);
  expect(agent.sessionFeedback({ fun: 4, wouldReturn: 4, stoppedBecause: 'smoke test', freeText: '' })).toEqual([]);
  expect(agent.levelFeedback(2, { understood: 5, perceivedDifficulty: 1, mood: 'divertito', notUnderstood: '', freeText: '' })).toEqual(['level 2 has not been played in this session']);

  const end = await agent.end('soglia-abbandono');
  expect(end.errors).toEqual([]);
  expect(end.file).toBe(join(outDir, 'T01-A01.json'));
  const form = JSON.parse(readFileSync(end.file!, 'utf8')) as Scheda;
  const moves = solve(parsed[0]!).moves.length;
  expect(form.levels).toHaveLength(1);
  expect(form.levels[0]).toMatchObject({ levelId: 1, result: 'vinto' });
  expect(form.levels[0]!.attempts).toEqual([expect.objectContaining({
    attempt: 1, outcome: 'vinto', launches: moves, taps: moves + 1, offTargetTaps: 1, tipsShown: expect.arrayContaining(['guide']), consoleErrors: 0,
  })]);
  expect(form.levels[0]!.attempts[0]!.painted).toBe(form.levels[0]!.attempts[0]!.targets);
  expect(form.session.telemetry).toMatchObject({ uncaughtErrors: [], stuckScreens: [], actions: moves + 2 });
  expect(form.endReason).toBe('soglia-abbandono');
  for (const shot of form.levels[0]!.attempts[0]!.screenshots) expect(existsSync(join(outDir, 'T01-A01', shot))).toBe(true);
});
