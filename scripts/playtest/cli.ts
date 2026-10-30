/**
 * Runs one playtest turn (#68): the agents of a turn config, each in its own browser profile, controlled over HTTP
 * so an agent session can play with `curl` and read the screenshots it gets back. See scripts/playtest/README.md.
 *
 *   npm run playtest -- --config scripts/playtest/turn.example.json
 */
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer, type IncomingMessage } from 'node:http';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import levelsJson from '../../src/levels/levels.json' with { type: 'json' };
import { parseLevel, type LevelDef } from '../../src/core/level';
import { PlaytestAgent, type ActionResult } from './harness';
import type { Schema } from './jsonSchema';
import { planLevels, saveFor, startSaveOf } from './saves';
import type { EndReason, SessionHeader } from './telemetry';
import { parseTurnConfig, sessionId } from './turn';

const ROOT = resolve(import.meta.dirname, '../..');
const PREINSTALLED = '/opt/pw-browsers/chromium';
const SCHEMA = join(ROOT, 'docs/playtest/scheda.schema.json');
const END_REASONS: EndReason[] = ['piano-finito', 'soglia-abbandono', 'budget-azioni', 'bloccato-da-bug', 'errore-harness'];

const { values: args } = parseArgs({
  options: {
    config: { type: 'string' },
    port: { type: 'string', default: '9300' },
    game: { type: 'string' },
    out: { type: 'string' },
    'stuck-ms': { type: 'string', default: '10000' },
  },
});

function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

/** Builds the game once and serves it, unless --game points at one already running. */
async function serveGame(): Promise<{ url: string; proc: ChildProcess | null }> {
  if (args.game) return { url: args.game, proc: null };
  const port = 4180;
  execSync('npx vite build --outDir dist-playtest', { cwd: ROOT, stdio: 'inherit' });
  const proc = spawn('npx', ['vite', 'preview', '--outDir', 'dist-playtest', '--port', String(port), '--strictPort'], { cwd: ROOT, stdio: 'ignore', detached: true });
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 60; i++) {
    if (await fetch(url).then((r) => r.ok, () => false)) return { url, proc };
    await new Promise((r) => setTimeout(r, 500));
  }
  stop(proc);
  throw new Error('the game server did not start');
}

/** npx runs vite as a child: the whole process group goes. */
function stop(proc: ChildProcess): void {
  try {
    process.kill(-proc.pid!, 'SIGTERM');
  } catch {
    proc.kill();
  }
}

async function body(req: IncomingMessage): Promise<unknown> {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 1_000_000) throw new Error('body too large');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('the body must be JSON');
  }
}

async function act(agent: PlaytestAgent, action: string, q: URLSearchParams): Promise<ActionResult> {
  const num = (k: string, d?: number) => {
    const v = q.get(k);
    if (v === null && d !== undefined) return d;
    const n = Number(v);
    if (v === null || !Number.isFinite(n)) throw new Error(`parameter "${k}" must be a number`);
    return n;
  };
  switch (action) {
    case 'screenshot': return agent.screenshot();
    case 'tap': return agent.tap(num('x'), num('y'));
    case 'column': return agent.tapColumn(num('n'));
    case 'slot': return agent.tapSlot(num('n'));
    case 'taps': return agent.taps((q.get('seq') ?? '').split(',').filter(Boolean));
    case 'menu': return agent.openMenu();
    case 'restart': return agent.restart();
    case 'swipe': return agent.swipe(num('dy'));
    case 'wait': return agent.wait(num('ms', 1000));
    case 'idle': return agent.waitIdle();
    case 'skip': return agent.skip();
    default: throw new Error(`unknown action "${action}"`);
  }
}

async function main(): Promise<void> {
  if (!args.config) throw new Error('usage: npm run playtest -- --config <turn.json> [--port 9300] [--game URL] [--out DIR]');
  const turn = parseTurnConfig(JSON.parse(readFileSync(args.config, 'utf8')));
  const levels = (levelsJson as LevelDef[]).map(parseLevel);
  const schema = existsSync(SCHEMA) ? (JSON.parse(readFileSync(SCHEMA, 'utf8')) as Schema) : null;
  if (!schema) console.warn(`warning: ${SCHEMA} not found, forms are written without schema validation`);
  const out = resolve(args.out ?? join(ROOT, 'playtest-runs', `T${String(turn.turn).padStart(2, '0')}-${new Date().toISOString().replace(/[:.]/g, '-')}`));
  mkdirSync(out, { recursive: true });

  const commit = git('rev-parse --short=12 HEAD');
  if (!/^[0-9a-f]{7,40}$/.test(commit)) throw new Error('cannot read the git commit of the build');
  if (git('status --porcelain')) console.warn('warning: the working tree has uncommitted changes; the form records the commit only');
  const version = (JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string }).version;
  const game = await serveGame();
  const executablePath = process.env.PLAYTEST_CHROMIUM ?? (existsSync(PREINSTALLED) ? PREINSTALLED : undefined);
  const browser = await chromium.launch({ executablePath });

  const agents = new Map<string, PlaytestAgent>();
  for (const a of turn.agents) {
    const plan = planLevels(levels, a.packs);
    const header: SessionHeader = {
      sessionId: sessionId(turn.turn, a.agentId),
      agent: { agentId: a.agentId, profileId: a.profileId, ...(a.model ? { model: a.model } : {}) },
      turn: turn.turn,
      build: { commit, version, ...(turn.tag ? { tag: turn.tag } : {}), variant: turn.variant },
      device: { viewport: `${a.viewport.width}x${a.viewport.height}`, language: a.language },
      startSave: startSaveOf(saveFor(levels, plan[0]!, a.language)),
      plan: { packs: a.packs, levelIds: plan },
    };
    agents.set(a.agentId, await PlaytestAgent.start(browser, { header, levels, gameUrl: game.url, outDir: out, maxAttempts: a.maxAttempts, schema, stuckMs: Number(args['stuck-ms']) }));
  }

  let finishing = false;
  const finish = async () => {
    if (finishing) return;
    finishing = true;
    // Sessions still open when the turn is stopped keep their draft form (errore-harness).
    await Promise.all([...agents.values()].map((a) => a.close()));
    await browser.close();
    if (game.proc) stop(game.proc);
    server.close();
    console.log(`turn over: forms in ${out}`);
  };
  const ended = new Set<string>();

  const port = Number(args.port);
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    const [id, action] = url.pathname.split('/').filter(Boolean);
    const reply = (code: number, payload: unknown) => {
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(`${JSON.stringify(payload)}\n`);
    };
    const agent = id ? agents.get(id) : undefined;
    if (!agent || !action) return reply(404, { ok: false, error: `use /<agent>/<action>; agents: ${[...agents.keys()].join(', ')}` });
    if (ended.has(id!)) return reply(409, { ok: false, error: 'this session has ended' });
    const handle = async (): Promise<[number, unknown]> => {
      switch (action) {
        case 'feedback': {
          const level = Number(url.searchParams.get('level'));
          const errors = agent.levelFeedback(level, await body(req));
          return errors.length ? [400, { ok: false, errors }] : [200, { ok: true }];
        }
        case 'session-feedback': {
          const errors = agent.sessionFeedback(await body(req));
          return errors.length ? [400, { ok: false, errors }] : [200, { ok: true }];
        }
        case 'bug': {
          const r = agent.bug(await body(req));
          return r.errors.length ? [400, { ok: false, errors: r.errors }] : [200, { ok: true, id: r.id }];
        }
        case 'missing': return [200, { ok: true, levelsWithoutFeedback: agent.recorder.missingFeedback(), sessionFeedback: agent.recorder.sessionFeedback !== undefined }];
        case 'end': {
          const reason = url.searchParams.get('reason') as EndReason | null;
          if (reason !== null && !END_REASONS.includes(reason)) return [400, { ok: false, error: `reason must be one of ${END_REASONS.join(', ')}` }];
          const r = await agent.end(reason ?? undefined, url.searchParams.get('force') === '1');
          if (!r.file) return [400, { ok: false, error: 'the form is not valid yet: fix it, or end with force=1 (it then stays out of the report)', errors: r.errors }];
          ended.add(id!);
          if (ended.size === agents.size) setTimeout(() => void finish(), 100);
          return [200, { ok: true, form: r.file, validated: r.validated, errors: r.errors }];
        }
        default: return [200, { ok: true, ...(await act(agent, action, url.searchParams)) }];
      }
    };
    handle().then(([code, payload]) => reply(code, payload), (e: Error) => reply(400, { ok: false, error: e.message }));
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`playtest turn ${turn.turn}: ${turn.agents.length} agents on http://127.0.0.1:${port}/<agent>/<action>, output in ${out}`);
    for (const a of agents.values()) console.log(`  ${a.sessionId}`);
  });
  process.on('SIGINT', () => void finish().then(() => process.exit(0)));
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
