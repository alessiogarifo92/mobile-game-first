import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import levelsJson from '../src/levels/levels.json' with { type: 'json' };
import { parseLevel, type Level, type LevelDef } from '../src/core/level';
import { tipOnLevelStart } from '../src/core/onboarding';
import { sanitize, type LevelRef } from '../src/core/progress';
import { SchemaError, validate, validateDef, type Schema } from '../scripts/playtest/jsonSchema';
import { SaveError, packLevels, planLevels, planStep, saveFor, saveStarts, startSaveOf, tipsMetBefore } from '../scripts/playtest/saves';
import { SCHEMA_VERSION, SessionRecorder, StuckWatch, TOP_BAR, onTarget, type MixSnapshot, type SessionHeader } from '../scripts/playtest/telemetry';
import { MAX_AGENTS, TurnError, parseTurnConfig, parseViewport, sessionId } from '../scripts/playtest/turn';

// The form's schema lives with the protocol of #67; these checks run once it is in the repo.
const SCHEMA_FILE = 'docs/playtest/scheda.schema.json';
const EXAMPLE_FILE = 'docs/playtest/scheda.esempio.json';
const schema = existsSync(SCHEMA_FILE) ? (JSON.parse(readFileSync(SCHEMA_FILE, 'utf8')) as Schema) : null;

const HEADER: SessionHeader = {
  sessionId: 'T01-A02', agent: { agentId: 'A02', profileId: 'P02' }, turn: 1,
  build: { commit: '6787174', version: '0.5.0', variant: 'normale' },
  device: { viewport: '412x915', language: 'en' },
  startSave: { unlocked: 95, completedThrough: 94, seenTips: ['guide'] },
  plan: { packs: ['U1-FINE'], levelIds: [95, 96, 97, 98, 99, 100] },
};
const T0 = Date.parse('2026-11-03T10:00:00Z');

const COL = { x: 100, y: 1000, w: 120, h: 300 };
const SLOT = { x: 100, y: 900, w: 80, h: 80 };
const play = (o: Partial<MixSnapshot> = {}): MixSnapshot => ({
  scene: 'play', levelId: 95, status: 'playing', overlay: null, tip: null, guide: null, tick: 0, moves: 0, refusals: 0,
  belt: { used: 0, capacity: 3 }, columns: [COL], slots: [SLOT, { ...SLOT, x: 200 }, { ...SLOT, x: 300 }], slotsUsed: 0, painted: 0, targets: 40,
  ice: 0, hidden: 0, locked: 0, covered: 0, stoneSplashes: 0, reveals: 0,
  jamButtons: { continue: { x: 360, y: 600 }, retry: { x: 360, y: 700 } }, tipButton: { x: 360, y: 900 }, ...o,
});
const menu = (o: Partial<MixSnapshot> = {}): MixSnapshot => ({ scene: 'menu', language: 'en', ...o });
const LEVEL_FEEDBACK = { understood: 4, perceivedDifficulty: 2, mood: 'divertito', notUnderstood: '', freeText: '' };
const SESSION_FEEDBACK = { fun: 4, wouldReturn: 4, stoppedBecause: 'plan done', freeText: '' };

describe('onTarget', () => {
  it('accepts columns, slots and the top bar on a level in play', () => {
    expect(onTarget(play(), { x: 150, y: 1100 })).toBe(true);
    expect(onTarget(play(), { x: 240, y: 940 })).toBe(true);
    for (const r of TOP_BAR) expect(onTarget(play(), { x: r.x + r.w / 2, y: r.y + r.h / 2 })).toBe(true);
    expect(onTarget(play(), { x: 600, y: 500 })).toBe(false);
    expect(onTarget({ scene: 'play' }, { x: 150, y: 1100 })).toBe(false);
  });

  it('with a tip or the jam panel up, only their buttons count', () => {
    expect(onTarget(play({ tip: 'brown' }), { x: 360, y: 900 })).toBe(true);
    expect(onTarget(play({ tip: 'brown' }), { x: 150, y: 1100 })).toBe(false);
    expect(onTarget(play({ tip: 'brown', tipButton: undefined }), { x: 360, y: 900 })).toBe(false);
    expect(onTarget(play({ overlay: 'jam' }), { x: 360, y: 600 })).toBe(true);
    expect(onTarget(play({ overlay: 'jam' }), { x: 360, y: 700 })).toBe(true);
    expect(onTarget(play({ overlay: 'jam', jamButtons: { continue: null, retry: { x: 360, y: 700 } } }), { x: 360, y: 600 })).toBe(false);
    expect(onTarget(play({ overlay: 'jam', jamButtons: undefined }), { x: 360, y: 700 })).toBe(false);
    expect(onTarget(play({ overlay: 'jam' }), { x: 60, y: 64 })).toBe(false);
    expect(onTarget(play({ overlay: 'win' }), { x: 5, y: 5 })).toBe(true);
  });
});

describe('SessionRecorder', () => {
  it('records a won attempt with every field of the form', () => {
    const r = new SessionRecorder(HEADER, T0);
    r.observe(menu(), T0);
    r.observe(play({ tip: 'brown' }), T0 + 1000);
    r.tap(play({ tip: 'brown' }), play({ tick: 1 }), { x: 360, y: 900 }, T0 + 3500);
    r.tap(play({ tick: 1 }), play({ tick: 2 }), { x: 600, y: 500 }, T0 + 4000);
    r.tap(play({ tick: 2 }), play({ tick: 3, moves: 1, belt: { used: 1, capacity: 3 } }), { x: 150, y: 1100 }, T0 + 5000);
    r.screenshot('0003.png');
    r.consoleError('oops', T0 + 5500);
    r.observe(play({ tick: 30, moves: 2, refusals: 1, slotsUsed: 2, belt: { used: 3, capacity: 3 }, painted: 20, ice: 1, stoneSplashes: 2, reveals: 1 }), T0 + 6000);
    r.observe(play({ tick: 50, moves: 3, refusals: 1, status: 'won', overlay: 'win', painted: 40 }), T0 + 9000);
    r.tap(play({ tick: 50, moves: 3, status: 'won', overlay: 'win' }), menu(), { x: 360, y: 700 }, T0 + 9500); // after the win: not in the attempt
    r.screenshot('0004.png');
    const s = r.scheda(T0 + 10_000, 'piano-finito');
    expect(s.levels).toEqual([{ levelId: 95, result: 'vinto', attempts: [{
      attempt: 1, outcome: 'vinto', durationMs: 8000, timeToFirstTapMs: 2500, ticks: 50, taps: 3, offTargetTaps: 1, launches: 3,
      refusals: 1, jams: 0, extraSlotUsed: false, maxSlotsUsed: 2, slotCount: 3, maxBeltUsed: 3, beltCapacity: 3, painted: 40, targets: 40,
      remaining: { ice: 0, hidden: 0, locked: 0, covered: 0 }, stoneSplashes: 2, reveals: 1, tipsShown: ['brown'], tipDismissMs: 2500,
      consoleErrors: 1, screenshots: ['0003.png'],
    }] }]);
    expect(s).toMatchObject({ schemaVersion: SCHEMA_VERSION, sessionId: 'T01-A02', startedAt: '2026-11-03T10:00:00.000Z', endedAt: '2026-11-03T10:00:10.000Z', endReason: 'piano-finito', bugs: [] });
    expect(s.session.telemetry).toEqual({ durationMs: 10_000, actions: 4, screens: { menu: 2, play: 1 }, languageChanges: 0, uncaughtErrors: [], stuckScreens: [] });
    expect(r.missingFeedback()).toEqual([95]);
  });

  it('tells a jam retry, a restart, an exit and the budget apart, and counts +1 slot', () => {
    const r = new SessionRecorder(HEADER, T0);
    r.observe(play({ tick: 10 }), T0);
    r.observe(play({ tick: 20, overlay: 'jam', status: 'jammed' }), T0 + 100);
    r.observe(play({ tick: 20, overlay: 'jam', status: 'jammed' }), T0 + 150);
    r.observe(play({ tick: 20, slots: [SLOT, SLOT, SLOT, SLOT] }), T0 + 200); // +1 slot
    r.observe(play({ tick: 30, overlay: 'jam', slots: [SLOT, SLOT, SLOT, SLOT] }), T0 + 300);
    r.observe(play({ tick: 0 }), T0 + 400); // Riprova on the jam panel
    r.observe(play({ tick: 9 }), T0 + 500);
    r.observe(play({ tick: 0 }), T0 + 600); // ⟲ mid-attempt
    r.observe(play({ tick: 5 }), T0 + 700);
    r.observe(menu(), T0 + 800); // ◀
    r.observe(play({ tick: 0 }), T0 + 900);
    r.endForBudget(T0 + 950);
    r.observe(play({ tick: 3 }), T0 + 960); // the closed attempt ignores later samples
    r.observe(play({ tick: 0 }), T0 + 1000);
    r.observe(play({ levelId: 96 }), T0 + 1100); // straight to another level
    const runs = r.scheda(T0 + 1200, 'errore-harness').levels;
    expect(runs[0]!.attempts.map((a) => [a.attempt, a.outcome])).toEqual([[1, 'ingorgo'], [2, 'riprova'], [3, 'uscita'], [4, 'budget'], [5, 'uscita']]);
    expect(runs[0]!.attempts[0]).toMatchObject({ jams: 2, extraSlotUsed: true, slotCount: 3, tipDismissMs: null, timeToFirstTapMs: null });
    expect(runs[0]!.result).toBe('abbandonato');
    // An attempt still open when the form is written counts as an exit, with its time so far.
    expect(runs[1]!.attempts[0]).toMatchObject({ outcome: 'uscita', durationMs: 100 });
    expect(r.playing).toEqual({ levelId: 96, attempt: 1, actions: 0 });
  });

  it('counts scene entries, language changes, actions and logs', () => {
    const r = new SessionRecorder(HEADER, T0);
    r.observe(menu({ language: 'it' }), T0);
    r.observe(menu({ language: 'en' }), T0 + 1);
    r.observe({ scene: 'howto' }, T0 + 2);
    r.observe(menu({ language: 'en' }), T0 + 3);
    r.action();
    r.tap(menu(), menu(), { x: 1, y: 1 }, T0 + 4);
    r.consoleError('outside a level', T0 + 5);
    r.observe(play({ levelId: 97 }), T0 + 6);
    r.action();
    r.uncaughtError('boom', T0 + 7, '0001-uncaught.png');
    r.stuckScreen('frozen', T0 + 8);
    r.observe(play({ levelId: 97, tick: 0, moves: 0 }), T0 + 9);
    r.observe(play({ levelId: 98 }), T0 + 10); // next level without leaving the play scene
    const t = r.scheda(T0 + 20, 'soglia-abbandono').session.telemetry;
    expect(t.screens).toEqual({ menu: 2, howto: 1, play: 2 });
    expect(t.languageChanges).toBe(1);
    expect(t.actions).toBe(3);
    expect(t.uncaughtErrors).toEqual([
      { at: '2026-11-03T10:00:00.005Z', message: 'console: outside a level' },
      { at: '2026-11-03T10:00:00.007Z', levelId: 97, message: 'boom', screenshot: '0001-uncaught.png' },
    ]);
    expect(t.stuckScreens).toEqual([{ at: '2026-11-03T10:00:00.008Z', levelId: 97, message: 'frozen' }]);
  });

  it('keeps an open tip time and skips, drops and stores the agent parts', () => {
    const r = new SessionRecorder(HEADER, T0);
    r.observe(play({ guide: 'tap', tip: 'mixing' }), T0);
    expect(r.scheda(T0 + 700, 'errore-harness').levels[0]!.attempts[0]).toMatchObject({ tipsShown: ['mixing', 'guide'], tipDismissMs: 700 });
    r.observe(play({ tick: 2 }), T0 + 1000);
    r.observe(play({ tick: 3, tip: 'slots' }), T0 + 1100);
    r.endForBudget(T0 + 1300);
    expect(r.scheda(T0 + 2000, 'errore-harness').levels[0]!.attempts[0]!.tipDismissMs).toBe(1200);
    r.observe(play({ tick: 0 }), T0 + 2100); // attempt 2, no action yet: dropped
    r.discardOpen();
    expect(r.levelState(95)).toEqual({ attempts: 1, won: false, skipped: false });
    r.observe(play({ tick: 0 }), T0 + 2200);
    r.action();
    r.discardOpen(); // has an action: kept
    r.skip(95, T0 + 2300);
    r.discardOpen(); // nothing open
    expect(r.levelState(95)).toEqual({ attempts: 2, won: false, skipped: true });
    r.setLevelFeedback(95, LEVEL_FEEDBACK);
    r.sessionFeedback = SESSION_FEEDBACK;
    r.bugs.push({ id: 'x' });
    const s = r.scheda(T0 + 3000, 'piano-finito');
    expect(s.levels[0]).toMatchObject({ result: 'saltato', feedback: LEVEL_FEEDBACK });
    expect(s.levels[0]!.attempts.map((a) => a.outcome)).toEqual(['budget', 'uscita']);
    expect(s.session.feedback).toEqual(SESSION_FEEDBACK);
    expect(s.bugs).toEqual([{ id: 'x' }]);
    expect(r.missingFeedback()).toEqual([]);
    expect(r.lastLevel).toBe(95);
    expect(new SessionRecorder(HEADER, T0).lastLevel).toBeNull();
  });

  it('copes with sparse snapshots (fields a scene does not publish)', () => {
    const r = new SessionRecorder(HEADER, T0);
    r.observe({ scene: 'play', levelId: 5 }, T0);
    r.observe({ scene: 'play', levelId: 5 }, T0 + 10);
    r.tap({ scene: 'play', levelId: 5 }, { scene: 'play', levelId: 5, status: 'won' }, { x: 0, y: 0 }, T0 + 20);
    expect(r.playing).toBeNull();
    r.observe({ scene: 'play', levelId: 5, tip: 'ice' }, T0 + 30); // after the win: ignored
    const [a] = r.scheda(T0 + 40, 'errore-harness').levels[0]!.attempts;
    expect(a).toMatchObject({ outcome: 'vinto', ticks: 0, launches: 0, slotCount: 1, beltCapacity: 1, targets: 1, painted: 0, offTargetTaps: 1, tipsShown: [] });
  });

  it.skipIf(!schema)('writes a form the schema of #67 accepts', () => {
    const r = new SessionRecorder(HEADER, T0);
    r.observe(play({ tip: 'brown' }), T0);
    r.tap(play({ tip: 'brown' }), play({ tick: 1 }), { x: 360, y: 900 }, T0 + 100);
    r.observe(play({ tick: 9, overlay: 'win', status: 'won', painted: 40 }), T0 + 200);
    r.consoleError('late', T0 + 300);
    r.setLevelFeedback(95, LEVEL_FEEDBACK);
    r.sessionFeedback = SESSION_FEEDBACK;
    const form = JSON.parse(JSON.stringify(r.scheda(T0 + 400, 'piano-finito')));
    expect(validate(schema!, form)).toEqual([]);
    // Without the agent's parts the same form is refused, naming what is missing.
    const bare = JSON.parse(JSON.stringify(new SessionRecorder(HEADER, T0).scheda(T0, 'piano-finito')));
    bare.levels = form.levels.map((l: { feedback?: unknown }) => ({ ...l, feedback: undefined }));
    delete bare.levels[0].feedback;
    expect(validate(schema!, bare)).toEqual(['$.levels[0]: missing "feedback"', '$.session: missing "feedback"']);
  });
});

describe('StuckWatch', () => {
  it('fires once when a level in play does not tick for the limit after a tap', () => {
    const w = new StuckWatch(1000);
    expect(w.feed(play({ tick: 7 }), 0)).toBe(false); // not armed
    w.tapped(play({ tick: 7 }), 0);
    expect(w.feed(play({ tick: 7 }), 999)).toBe(false);
    expect(w.feed(play({ tick: 7 }), 1000)).toBe(true);
    expect(w.feed(play({ tick: 7 }), 5000)).toBe(false);
  });

  it('is disarmed by a tick, a tip, a panel, another scene or a missing page', () => {
    for (const next of [play({ tick: 8 }), play({ tick: 7, tip: 'slots' }), play({ tick: 7, overlay: 'jam' }), menu(), null]) {
      const w = new StuckWatch(10);
      w.tapped(play({ tick: 7 }), 0);
      expect(w.feed(next, 100)).toBe(false);
      expect(w.feed(play({ tick: 7 }), 200)).toBe(false);
    }
    const w = new StuckWatch();
    w.tapped(null, 0);
    expect(w.feed(null, 20_000)).toBe(false);
  });
});

describe('jsonSchema', () => {
  const root: Schema = {
    type: 'object', additionalProperties: false, required: ['n', 'tags'],
    properties: {
      n: { type: 'integer', minimum: 1, maximum: 5 },
      s: { type: ['string', 'null'], pattern: '^A[0-9]$', minLength: 2 },
      at: { type: 'string', format: 'date-time' },
      tags: { type: 'array', items: { $ref: '#/$defs/tag' }, minItems: 1, uniqueItems: true },
      v: { const: 1 },
      x: { type: 'number' }, b: { type: 'boolean' },
      free: { type: 'object', additionalProperties: { type: 'integer' } },
      any: { description: 'anything' },
    },
    $defs: { tag: { enum: ['a', 'b'] } },
  };

  it('accepts a valid value', () => {
    expect(validate(root, { n: 3, s: 'A1', at: '2026-11-03T10:00:00Z', tags: ['a', 'b'], v: 1, x: 1.5, b: true, free: { k: 2 }, any: [1] })).toEqual([]);
    expect(validate(root, { n: 1, s: null, tags: ['a'], at: '2026-11-03T10:00:00.123+01:00' })).toEqual([]);
  });

  it('names each problem with its path', () => {
    expect(validate(root, { n: 9, s: 'B1', at: 'yesterday', tags: ['a', 'a', 'c'], v: 2, x: 'no', b: 1, free: { k: 'x' }, extra: 1 })).toEqual([
      '$.n: must be ≤ 5',
      '$.s: must match ^A[0-9]$',
      '$.at: must be an ISO date-time',
      '$.tags: must not repeat items',
      '$.tags[2]: must be one of "a", "b"',
      '$.v: must be 1',
      '$.x: must be number',
      '$.b: must be boolean',
      '$.free.k: must be integer',
      '$: unexpected "extra"',
    ]);
    expect(validate(root, { n: 0, s: 'A', tags: [] })).toEqual(['$.n: must be ≥ 1', '$.s: must match ^A[0-9]$', '$.s: must have at least 2 characters', '$.tags: must have at least 1 items']);
    expect(validate(root, [])).toEqual(['$: must be object']);
    expect(validate(root, {})).toEqual(['$: missing "n"', '$: missing "tags"']);
    expect(validateDef(root, 'tag', 'z')).toEqual(['tag: must be one of "a", "b"']);
  });

  it('refuses a schema it cannot judge', () => {
    expect(() => validate({ oneOf: [] }, 1)).toThrow(SchemaError);
    expect(() => validate({ type: 'tuple' }, 1)).toThrow(SchemaError);
    expect(() => validate({ $ref: '#/$defs/none' }, 1)).toThrow(SchemaError);
    expect(() => validate({ type: 'string', format: 'email' }, 'a')).toThrow(SchemaError);
  });

  it.skipIf(!schema || !existsSync(EXAMPLE_FILE))('accepts the example form of #67', () => {
    expect(validate(schema!, JSON.parse(readFileSync(EXAMPLE_FILE, 'utf8')))).toEqual([]);
  });
});

describe('saves and plans', () => {
  const levels = (levelsJson as LevelDef[]).map(parseLevel);
  const fake: LevelRef[] = [...Array.from({ length: 100 }, (_, i) => ({ id: i + 1, stage: Math.floor(i / 10) + 1 })), { id: 101, stage: 11 }, { id: 102, stage: 11 }];

  it('expands packs into levels, in order', () => {
    expect(packLevels(fake, 'U1-ONB')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(packLevels(fake, 'U1-FINE')).toEqual([95, 96, 97, 98, 99, 100]);
    expect(packLevels(fake, 'S11')).toEqual([101, 102]);
    expect(planLevels(fake, ['U1-FINE', 'S11', 'S03'])).toEqual([95, 96, 97, 98, 99, 100, 101, 102, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
  });

  it.each([['bogus'], ['S1'], ['S15']])('rejects pack %s', (p) => {
    expect(() => packLevels(fake, p)).toThrow(SaveError);
  });

  it('rejects an empty or repeating plan', () => {
    expect(() => planLevels(fake, [])).toThrow(SaveError);
    expect(() => planLevels(fake, ['S01', 'U1-ONB'])).toThrow(/repeats/);
  });

  it('starts a new save at the first level and at each jump of the plan', () => {
    expect(saveStarts([95, 96, 101, 102, 141, 142])).toEqual([95, 101, 141]);
  });

  it('a save from level 1 keeps the onboarding', () => {
    expect(saveFor(levels, 1, 'it')).toEqual({ unlocked: 1, completed: [], sound: false, language: 'it', seenTips: [], skin: 'classic' });
  });

  it('a later save has seen the tips of the levels before it, and none of those still to come', () => {
    expect(tipsMetBefore(levels, 2)).toEqual(['guide', 'blocked', 'slots', 'belt']);
    const firstMixing = levels.find((l) => tipOnLevelStart(l, []) === 'mixing')!.id;
    expect(tipsMetBefore(levels, firstMixing)).not.toContain('mixing');
    expect(tipsMetBefore(levels, firstMixing + 1)).toContain('mixing');
    const save = saveFor(levels, 50, 'en', true);
    expect(save).toMatchObject({ unlocked: 50, sound: true, language: 'en', seenTips: tipsMetBefore(levels, 50) });
    expect(save.completed).toEqual(Array.from({ length: 49 }, (_, i) => i + 1));
    expect(sanitize(JSON.parse(JSON.stringify(save)), levels)).toEqual(save); // the game accepts it unchanged
    expect(startSaveOf(save)).toEqual({ unlocked: 50, completedThrough: 49, seenTips: save.seenTips });
  });

  it('the save of universe 2 matches the protocol of #67 (universe 1 tips, brown still to come)', () => {
    const start = packLevels(levels, 'S11')[0]!;
    const save = saveFor(levels, start, 'it');
    expect(save.completed).toHaveLength(start - 1);
    expect([...save.seenTips].sort()).toEqual(['belt', 'blocked', 'guide', 'hidden', 'ice', 'mixing', 'slots']);
  });

  it('rejects an unknown language or level and a level the game would not open', () => {
    expect(() => saveFor(levels, 1, 'xx')).toThrow(/language/);
    expect(() => saveFor(levels, 9999, 'en')).toThrow(/no level/);
    // Universe 2 listed before universe 1: nothing before its first level opens it.
    const broken: Level[] = [{ ...levels[0]!, stage: 11 }, { ...levels[1]!, stage: 1 }];
    expect(() => saveFor(broken, 1, 'en')).toThrow(/not reachable/);
  });

  describe('planStep', () => {
    const plan = [99, 100, 101, 141, 142];
    const st = (attempts: number, won = false, skipped = false) => ({ attempts, won, skipped });

    it('waits while nothing is decided', () => {
      expect(planStep(plan, null, st(0), 3)).toEqual({ kind: 'none' });
      expect(planStep(plan, 99, st(2), 3)).toEqual({ kind: 'none' });
      expect(planStep(plan, 99, st(5), null)).toEqual({ kind: 'none' });
      expect(planStep(plan, 99, st(1, true), 3)).toEqual({ kind: 'none' }); // the game opens 100 itself
      expect(planStep(plan, 7, st(1, true), 3)).toEqual({ kind: 'none' }); // off the plan
    });

    it('skips at the attempt limit and jumps to the next pack', () => {
      expect(planStep(plan, 99, st(3), 3)).toEqual({ kind: 'load', levelId: 100, skipped: 99 });
      expect(planStep(plan, 101, st(1, true), 3)).toEqual({ kind: 'load', levelId: 141, skipped: null });
      expect(planStep(plan, 101, st(3, false, true), 3)).toEqual({ kind: 'none' }); // already skipped
    });

    it('ends with the last planned level', () => {
      expect(planStep(plan, 142, st(1, true), 3)).toEqual({ kind: 'done', skipped: null });
      expect(planStep(plan, 142, st(3), 3)).toEqual({ kind: 'done', skipped: 142 });
    });
  });
});

describe('turn config', () => {
  const agent = { agentId: 'A01', profileId: 'P01', viewport: '360x640', language: 'it', packs: ['U1-FINE', 'S11'], maxAttempts: 4 };

  it('reads a turn', () => {
    expect(parseTurnConfig({ turn: 1, tag: 'playtest-u2-1', agents: [agent, { ...agent, agentId: 'A02', model: 'm', viewport: '412x915', maxAttempts: undefined }] })).toEqual({
      turn: 1, tag: 'playtest-u2-1', variant: 'normale', agents: [
        { agentId: 'A01', profileId: 'P01', viewport: { width: 360, height: 640 }, language: 'it', packs: ['U1-FINE', 'S11'], maxAttempts: 4 },
        { agentId: 'A02', profileId: 'P01', model: 'm', viewport: { width: 412, height: 915 }, language: 'it', packs: ['U1-FINE', 'S11'], maxAttempts: null },
      ],
    });
    expect(parseTurnConfig({ turn: 2, variant: 'senza-copertura', agents: [agent] }).variant).toBe('senza-copertura');
    expect(sessionId(3, 'A07')).toBe('T03-A07');
  });

  it.each([
    ['not an object', []],
    ['a bad turn', { turn: 0, agents: [agent] }],
    ['a bad variant', { turn: 1, variant: 'b', agents: [agent] }],
    ['no agents', { turn: 1, agents: [] }],
    ['too many agents', { turn: 1, agents: Array.from({ length: MAX_AGENTS + 1 }, (_, i) => ({ ...agent, agentId: `A${10 + i}` })) }],
    ['an agent that is not an object', { turn: 1, agents: [3] }],
    ['a bad agent id', { turn: 1, agents: [{ ...agent, agentId: 'a1' }] }],
    ['a bad profile', { turn: 1, agents: [{ ...agent, profileId: undefined }] }],
    ['a bad language', { turn: 1, agents: [{ ...agent, language: 'fr' }] }],
    ['a bad pack', { turn: 1, agents: [{ ...agent, packs: ['X1'] }] }],
    ['no packs', { turn: 1, agents: [{ ...agent, packs: [] }] }],
    ['a bad attempt limit', { turn: 1, agents: [{ ...agent, maxAttempts: 0 }] }],
    ['an empty model', { turn: 1, agents: [{ ...agent, model: '' }] }],
    ['a duplicate agent', { turn: 1, agents: [agent, agent] }],
  ])('rejects %s', (_, config) => {
    expect(() => parseTurnConfig(config)).toThrow(TurnError);
  });

  it('accepts only the two phone viewports of the protocol', () => {
    expect(parseViewport('412x915')).toEqual({ width: 412, height: 915 });
    expect(() => parseViewport('300x640')).toThrow(TurnError);
  });
});
