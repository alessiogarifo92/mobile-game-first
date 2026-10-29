import { describe, expect, it } from 'vitest';
import type { Primary } from '../src/core/colors';
import { curveLevel } from '../src/core/curve';
import { generateLevel, placeSpecial } from '../src/core/generator';
import { buildLanes, paintNeeds, parseImage, parseLevel, parseOverlay, LevelError } from '../src/core/level';
import { tipOnLevelStart } from '../src/core/onboarding';
import { createRng } from '../src/core/rng';
import { applyHit, boardDone, cellDone, cloneBoard, createBoard, findTarget } from '../src/core/rules';
import { createGame, launchFromColumn, step } from '../src/core/sim';
import { levelWinRate, runLoop, solve } from '../src/core/solver';
import { BLUE, RED, YELLOW, level } from './helpers';

/** The debut level's image (level 201 in universe 3 is drawn in #101): a small, friendly 6x6 canvas. */
const DEBUT_IMAGE = ['RRYYRR', 'RYYYYR', 'BBRRBB', 'BBRRBB', 'RYYYYR', 'RRYYRR'];

describe('locks and keys: format', () => {
  it('reads keys and locks from the overlay and adds no hits to the paint need', () => {
    const l = level(['RRB'], [[[RED, 2]], [[BLUE, 1]]], { overlay: ['k.l'] });
    expect(l.keys).toEqual([true, false, false]);
    expect(l.locked).toEqual([false, false, true]);
    expect(paintNeeds(l.targets, l.ice)).toEqual({ 1: 2, 2: 0, 4: 1 });
  });

  it('levels without the mechanic have no keys and no locks', () => {
    const l = level(['RB'], [[[RED, 1]], [[BLUE, 1]]]);
    expect(l.keys).toEqual([false, false]);
    expect(l.locked).toEqual([false, false]);
    expect(parseOverlay(undefined, 2, [1, 4])).toMatchObject({ keys: [false, false], locked: [false, false] });
  });

  it('rejects locks without keys, keys without locks, and either on an empty cell', () => {
    expect(() => level(['RB'], [[[RED, 1]], [[BLUE, 1]]], { overlay: ['.l'] })).toThrow('no key');
    expect(() => level(['RB'], [[[RED, 1]], [[BLUE, 1]]], { overlay: ['k.'] })).toThrow('no locked');
    expect(() => level(['R.B'], [[[RED, 1]], [[BLUE, 1]]], { overlay: ['kl.'] })).toThrow('empty cell');
    expect(() => level(['R.B'], [[[RED, 1]], [[BLUE, 1]]], { overlay: ['.kl'] })).toThrow(LevelError);
  });

  it('counts stones as walls too: a key behind locks on two sides and stones on the other two is rejected (#95)', () => {
    const cols: [Primary, number][][] = [[[RED, 3]]];
    expect(() => level(['.R.', 'RR.', '...'], cols, { overlay: ['.l.', 'lks', '.s.'] })).toThrow('walled in');
    expect(() => level(['.R.', 'RR.', '...'], cols, { overlay: ['.l.', 'lk.', '.s.'] })).not.toThrow();
  });

  it('rejects a key walled in by locks on every lane, and accepts one reachable from a single side', () => {
    const image = ['RRR', 'RRR', 'RRR'];
    const columns: [Primary, number][][] = [[[RED, 9]]];
    expect(() => level(image, columns, { overlay: ['.l.', 'lkl', '.l.'] })).toThrow('walled in');
    // One side open: paint reaches the key from the bottom lane.
    expect(level(image, columns, { overlay: ['.l.', 'lkl', '...'] }).keys[4]).toBe(true);
  });
});

describe('locks and keys: rules', () => {
  // Bottom-left red key, red lock on its right; a blue pixel behind the lock in the same row.
  const l = level(['RRB'], [[[RED, 2]], [[BLUE, 1]]], { overlay: ['kl.'] });
  const lanes = buildLanes(l.width, l.height);
  // Right side lane of row 0 travels right → left: cells 2, 1, 0.
  const rowFromRight = lanes.find((lane) => lane.join() === '2,1,0')!;
  const rowFromLeft = lanes.find((lane) => lane.join() === '0,1,2')!;

  it('a locked pixel blocks its lane and is not done while locked, even if it could take the paint', () => {
    const b = createBoard(l);
    expect(cellDone(l, b, 1)).toBe(false);
    applyHit(l, b, 2, BLUE);
    expect(findTarget(l, b, rowFromRight, RED)).toBe(-1); // stops at the padlock, never reaches the key behind it
    expect(findTarget(l, b, rowFromLeft, RED)).toBe(0); // the key is reachable from the other side
  });

  it('completing the last key opens every lock in the same hit, then the pixel plays normally', () => {
    const b = createBoard(l);
    expect(applyHit(l, b, 0, RED)).toEqual({ brokeIce: false, completed: true, revealed: [], unlocked: [1] });
    expect(b.locked).toEqual([false, false, false]);
    expect(findTarget(l, b, rowFromLeft, RED)).toBe(1);
    expect(applyHit(l, b, 1, RED)).toMatchObject({ completed: true, unlocked: [] });
    applyHit(l, b, 2, BLUE);
    expect(boardDone(l, b)).toBe(true);
  });

  it('all keys are needed: the first of two keys opens nothing', () => {
    const two = level(['RRRR'], [[[RED, 4]]], { overlay: ['k.lk'] });
    const b = createBoard(two);
    expect(applyHit(two, b, 0, RED).unlocked).toEqual([]);
    expect(b.locked[2]).toBe(true);
    expect(applyHit(two, b, 3, RED).unlocked).toEqual([2]);
  });

  it('a key that is a secondary colour counts only once fully mixed', () => {
    const mixed = level(['OR'], [[[RED, 2]], [[YELLOW, 1]]], { overlay: ['kl'] });
    const b = createBoard(mixed);
    expect(applyHit(mixed, b, 0, RED)).toMatchObject({ completed: false, unlocked: [] });
    expect(applyHit(mixed, b, 0, YELLOW)).toMatchObject({ completed: true, unlocked: [1] });
  });

  it('a hit on a pixel that is not a key never opens locks, and cloneBoard copies the locks', () => {
    const plain = level(['RRB'], [[[RED, 2]], [[BLUE, 1]]], { overlay: ['kl.'] });
    const b = createBoard(plain);
    expect(applyHit(plain, b, 2, BLUE).unlocked).toEqual([]);
    const copy = cloneBoard(b);
    copy.locked[1] = false;
    expect(b.locked[1]).toBe(true);
  });
});

describe('locks and keys: simulation and solver', () => {
  const l = parseLevel({
    id: 201, name: 'test', stage: 21, slots: 3, beltCapacity: 3,
    image: ['RYBR', 'OGPB', 'RBYR', 'YRRB'],
    overlay: ['k..l', '.l..', '..l.', 'l..k'],
    columns: [[{ color: RED, ammo: 6 }, { color: YELLOW, ammo: 2 }], [{ color: BLUE, ammo: 6 }, { color: RED, ammo: 2 }], [{ color: YELLOW, ammo: 3 }]],
  });

  it('runLoop equals a lone shooter on the belt, locks included', () => {
    const rng = createRng(7);
    for (let trial = 0; trial < 30; trial++) {
      const g = createGame(l);
      const board = createBoard(l);
      const lanes = buildLanes(l.width, l.height);
      for (let k = 0; k < 5; k++) {
        const col = Math.floor(rng() * l.columns.length);
        const shooter = g.queues[col]?.[0];
        if (!shooter || !launchFromColumn(g, col)) continue;
        const left = runLoop(l, lanes, board, shooter.color, shooter.ammo);
        while (g.belt.length + g.pending.length > 0 && g.status === 'playing') step(g);
        expect({ paint: g.paint, ice: g.ice, hidden: g.hidden, locked: g.locked }).toEqual(cloneBoard(board));
        expect(g.slots.find((s) => s?.id === shooter.id)?.ammo ?? 0).toBe(left);
        g.slots = g.slots.map(() => null);
      }
    }
  });

  it('reports the opening as a hit event for the animation', () => {
    const g = createGame(level(['RR'], [[[RED, 2]]], { overlay: ['kl'] }));
    launchFromColumn(g, 0);
    const events = [];
    for (let i = 0; i < 12 && g.status === 'playing'; i++) {
      step(g);
      events.push(...g.events);
    }
    expect(events.map((e) => [e.cell, e.unlocked])).toEqual([[0, [1]], [1, []]]);
    expect(g.status).toBe('won');
  });

  it('the solver keeps locks in its memo key: same paint, different locks are different states', () => {
    // Red key at the far end of a red row, red lock in front: the first red loop must open the lock before
    // the second can paint it. Without locks in the key, the two states would merge and the search would go wrong.
    const row = level(['RRB'], [[[RED, 1], [RED, 1]], [[BLUE, 1]]], { overlay: ['kl.'], slots: 1 });
    const result = solve(row);
    expect(result.solvable).toBe(true);
    const g = createGame(row);
    for (const move of result.moves) {
      expect(move.from).toBe('column');
      launchFromColumn(g, move.index);
      while (g.belt.length + g.pending.length > 0 && g.status === 'playing') step(g);
    }
    expect(g.status).toBe('won');
  });

  it('a level whose locks hold blue buckets until the slots jam is unsolvable', () => {
    // One column: blue, blue, then the red that opens the locks. With one slot the second blue has nowhere to wait.
    const image = ['BBRR'];
    const columns: [Primary, number][][] = [[[BLUE, 1], [BLUE, 1], [RED, 2]]];
    expect(solve(level(image, columns, { slots: 1 })).solvable).toBe(true);
    expect(solve(level(image, columns, { slots: 1, overlay: ['llk.'] }))).toMatchObject({ solvable: false, exhaustive: true });
  });
});

describe('locks and keys: generator, onboarding, curve', () => {
  it('places keys and locks deterministically, never walling a key in', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const overlay = placeSpecial(DEBUT_IMAGE, { key: 2, lock: 4 }, createRng(seed));
      expect(overlay).toEqual(placeSpecial(DEBUT_IMAGE, { key: 2, lock: 4 }, createRng(seed)));
      const flat = overlay.join('');
      expect([...flat].filter((c) => c === 'k')).toHaveLength(2);
      expect([...flat].filter((c) => c === 'l')).toHaveLength(4);
      expect(() => parseOverlay(overlay, 6, parseImage(DEBUT_IMAGE).targets)).not.toThrow();
    }
  });

  it('skips a lock that would wall the only key in', () => {
    // A plus shape: the centre key is reachable only through its four arms. Ask for four locks: the generator
    // must leave one arm open, so it runs out of room instead of building an impossible level.
    const plus = ['.R.', 'RRR', '.R.'];
    const tries = Array.from({ length: 20 }, (_, s) => {
      try {
        return placeSpecial(plus, { key: 1, lock: 4 }, createRng(s));
      } catch (e) {
        return (e as Error).message;
      }
    });
    for (const t of tries) {
      if (typeof t === 'string') expect(t).toContain('room');
      else expect(() => parseOverlay(t, 3, [0, 1, 0, 1, 1, 1, 0, 1, 0])).not.toThrow();
    }
    expect(tries.some((t) => typeof t === 'string')).toBe(true);
  });

  it('refuses keys without locks, and too many of either', () => {
    expect(() => placeSpecial(DEBUT_IMAGE, { key: 1 }, createRng(1))).toThrow('together');
    expect(() => placeSpecial(DEBUT_IMAGE, { lock: 1 }, createRng(1))).toThrow('together');
    expect(() => placeSpecial(['RR'], { key: 3, lock: 1 }, createRng(1))).toThrow('keys');
    expect(() => placeSpecial(['RR'], { key: 1, lock: 2 }, createRng(1))).toThrow('locks');
  });

  it('generates a solvable, very easy debut level, the same every time', () => {
    const opts = {
      id: 201, name: 'debut', stage: 21, image: DEBUT_IMAGE, columns: 3, ammoChunk: 6, slots: 3, beltCapacity: 3, seed: 20100,
      special: { key: 2, lock: 4 }, winRate: [0.95, 1] as [number, number],
    };
    const a = generateLevel(opts);
    expect(a).toEqual(generateLevel(opts));
    const l = parseLevel(a.def);
    expect(l.locked.filter(Boolean)).toHaveLength(4);
    expect(l.keys.filter(Boolean)).toHaveLength(2);
    expect(solve(l).solvable).toBe(true);
    expect(levelWinRate(l)).toBeGreaterThanOrEqual(0.95);
  });

  it('explains locks once, the first time a level has them', () => {
    const l = level(['RRB'], [[[RED, 2]], [[BLUE, 1]]], { id: 201, overlay: ['kl.'] });
    expect(tipOnLevelStart(l, [])).toBe('lock');
    expect(tipOnLevelStart(l, ['lock'])).toBeNull();
    expect(tipOnLevelStart(level(['RB'], [[[RED, 1]], [[BLUE, 1]]]), [])).toBeNull();
  });

  it('marks the lock as a feature of the level, so its debut is recognised', () => {
    const l = level(['RRB'], [[[RED, 2]], [[BLUE, 1]]], { overlay: ['kl.'] });
    expect(curveLevel(l, 1).features).toEqual(['lock']);
  });
});
