import { describe, expect, it } from 'vitest';
import { BROWN, GREEN, ORANGE, PURPLE, accepts, codeOf, isComplete, isPrimary, primariesOf } from '../src/core/colors';
import { checkCurve, curveLevel, type CurveLevel } from '../src/core/curve';
import { generateLevel, placeBrown } from '../src/core/generator';
import { HOWTO_PAGES } from '../src/core/howto';
import { DICTIONARIES } from '../src/core/i18n';
import { buildLanes, paintNeeds, parseLevel, type LevelDef } from '../src/core/level';
import { tipOnLevelStart } from '../src/core/onboarding';
import { createRng } from '../src/core/rng';
import { applyHit, cellDone, cloneBoard, createBoard, findTarget } from '../src/core/rules';
import { createGame, launchFromColumn, step } from '../src/core/sim';
import { levelWinRate, runLoop, solve } from '../src/core/solver';
import levels from '../src/levels/levels.json' with { type: 'json' };
import { BLUE, RED, YELLOW, level } from './helpers';

/** Brown (#94): red + yellow + blue, three hits in any order. */
describe('brown colour', () => {
  it('is the mix of all three primaries, with image code K', () => {
    expect(BROWN).toBe(RED | YELLOW | BLUE);
    expect(primariesOf(BROWN)).toEqual([RED, YELLOW, BLUE]);
    expect(isPrimary(BROWN)).toBe(false);
    expect(codeOf(BROWN)).toBe('K');
    expect([ORANGE, GREEN, PURPLE]).not.toContain(BROWN);
  });

  it('accepts each primary once, in any order, and is complete only with all three', () => {
    for (const order of [[RED, YELLOW, BLUE], [BLUE, RED, YELLOW], [YELLOW, BLUE, RED]] as const) {
      let paint = 0;
      order.forEach((p, k) => {
        expect(accepts(BROWN, paint, p)).toBe(true);
        paint |= p;
        expect(accepts(BROWN, paint, p)).toBe(false); // the same colour twice is refused
        expect(isComplete(BROWN, paint)).toBe(k === 2);
      });
    }
  });
});

describe('brown in a level', () => {
  it('parses K and counts one hit of each primary per brown pixel', () => {
    const l = level(['KR', 'K.'], [[[RED, 3]], [[YELLOW, 2]], [[BLUE, 2]]]);
    expect(l.targets).toEqual([BROWN, RED, BROWN, 0]);
    expect(paintNeeds(l.targets, l.ice)).toEqual({ 1: 3, 2: 2, 4: 2 });
  });

  it('rejects ammo that misses a brown pixel’s third colour, and ice on brown', () => {
    expect(() => level(['K'], [[[RED, 1]], [[YELLOW, 1]]])).toThrow('ammo for color 4 is 0 but the image needs 1');
    expect(() => level(['K'], [[[RED, 1]], [[YELLOW, 1]], [[BLUE, 1]]], { overlay: ['i'] })).toThrow('ice on a non-primary pixel');
  });

  it('hides like any other pixel', () => {
    const l = level(['RK'], [[[RED, 2]], [[YELLOW, 1]], [[BLUE, 1]]], { overlay: ['.h'] });
    expect(l.hidden).toEqual([false, true]);
  });
});

describe('brown rules', () => {
  // Lane from the left: K first, then R behind it.
  const l = level(['KR'], [[[RED, 2]], [[YELLOW, 1]], [[BLUE, 1]]]);
  const lane = [0, 1];

  it('takes three hits, stays unfinished after two and blocks the lane until done', () => {
    const b = createBoard(l);
    expect(findTarget(l, b, lane, RED)).toBe(0);
    expect(applyHit(l, b, 0, RED)).toEqual({ brokeIce: false, completed: false, revealed: [] });
    expect(findTarget(l, b, lane, RED)).toBe(-1); // red already received: the brown pixel blocks the red behind it
    applyHit(l, b, 0, BLUE);
    expect(cellDone(l, b, 0)).toBe(false);
    expect(b.paint[0]).toBe(RED | BLUE);
    expect(findTarget(l, b, lane, YELLOW)).toBe(0);
    expect(applyHit(l, b, 0, YELLOW).completed).toBe(true);
    expect(findTarget(l, b, lane, RED)).toBe(1); // done: paint flies over it
  });

  it('completing a brown pixel reveals its hidden neighbour', () => {
    const h = level(['KB'], [[[RED, 1]], [[YELLOW, 1]], [[BLUE, 2]]], { overlay: ['.h'] });
    const b = createBoard(h);
    applyHit(h, b, 0, RED);
    applyHit(h, b, 0, YELLOW);
    expect(applyHit(h, b, 0, BLUE).revealed).toEqual([1]);
  });
});

describe('brown in the solver and the simulation', () => {
  const sample = parseLevel({
    id: 1, name: 'test', stage: 1, slots: 3, beltCapacity: 3,
    image: ['KRYK', 'OKGB', 'RBKR', 'YKRP'],
    columns: [[{ color: RED, ammo: 6 }, { color: YELLOW, ammo: 5 }], [{ color: BLUE, ammo: 5 }, { color: RED, ammo: 5 }], [{ color: YELLOW, ammo: 4 }, { color: BLUE, ammo: 4 }]],
  });

  it('an example brown level is proven solvable', () => {
    expect(paintNeeds(sample.targets)).toEqual({ 1: 11, 2: 9, 4: 9 });
    const result = solve(sample);
    expect(result.solvable).toBe(true);
    expect(levelWinRate(sample)).toBeGreaterThan(0);
  });

  it('any order works: one slot, one-bucket belt, a single column yellow → blue → red', () => {
    expect(solve(level(['K'], [[[YELLOW, 1], [BLUE, 1], [RED, 1]]], { slots: 1, beltCapacity: 1 })).solvable).toBe(true);
  });

  it('runLoop equals a lone shooter on the belt, with brown pixels', () => {
    const rng = createRng(11);
    const lanes = buildLanes(sample.width, sample.height);
    for (let trial = 0; trial < 30; trial++) {
      const g = createGame(sample);
      const board = createBoard(sample);
      for (let k = 0; k < 5; k++) {
        const col = Math.floor(rng() * sample.columns.length);
        const shooter = g.queues[col]?.[0];
        if (!shooter || !launchFromColumn(g, col)) continue;
        const left = runLoop(sample, lanes, board, shooter.color, shooter.ammo);
        while (g.belt.length + g.pending.length > 0 && g.status === 'playing') step(g);
        expect({ paint: g.paint, ice: g.ice, hidden: g.hidden }).toEqual(cloneBoard(board));
        expect(g.slots.find((s) => s?.id === shooter.id)?.ammo ?? 0).toBe(left);
        g.slots = g.slots.map(() => null);
      }
    }
  });
});

describe('placeBrown', () => {
  const image = ['RYBR', 'OGPB', 'RB.R', 'Y..K'];

  it('repaints exactly n pixels brown, never empty cells, deterministically', () => {
    for (let seed = 0; seed < 20; seed++) {
      const out = placeBrown(image, 3, createRng(seed));
      expect(out).toEqual(placeBrown(image, 3, createRng(seed)));
      const before = image.join(''), after = out.join('');
      expect(after.split('K')).toHaveLength(before.split('K').length + 3);
      [...after].forEach((c, i) => {
        if (before[i] === '.') expect(c).toBe('.');
        else if (c !== 'K') expect(c).toBe(before[i]);
      });
      expect(out.map((r) => r.length)).toEqual([4, 4, 4, 4]);
    }
  });

  it('throws when the picture has too few pixels left', () => {
    expect(() => placeBrown(['RK'], 2, createRng(1))).toThrow('not enough pixels for 2 brown');
  });

  it('special.brown makes the generator place brown pixels, solvable and reproducible', () => {
    const opts = { id: 1, name: 'test', image: ['ROY', 'GBP', 'YOR'], columns: 3, ammoChunk: 3, slots: 3, beltCapacity: 3, seed: 5, special: { brown: 2, ice: 1 } };
    const a = generateLevel(opts);
    expect(a).toEqual(generateLevel(opts));
    const parsed = parseLevel(a.def);
    expect(parsed.targets.filter((t) => t === BROWN)).toHaveLength(2);
    expect(parsed.ice.reduce((s, n) => s + n, 0)).toBe(1);
    expect(solve(parsed).solvable).toBe(true);
  });
});

describe('brown onboarding, how-to and curve', () => {
  const brown = level(['KO'], [[[RED, 2]], [[YELLOW, 2]], [[BLUE, 1]]], { id: 101 });

  it('shows the brown tip once, the first time a level has brown, after the mixing tip', () => {
    expect(tipOnLevelStart(brown, [])).toBe('mixing');
    expect(tipOnLevelStart(brown, ['mixing'])).toBe('brown');
    expect(tipOnLevelStart(brown, ['mixing', 'brown'])).toBeNull();
    const iced = level(['KR'], [[[RED, 3]], [[YELLOW, 1]], [[BLUE, 1]]], { overlay: ['.i'] });
    expect(tipOnLevelStart(iced, ['mixing'])).toBe('brown'); // one tip per level start: ice waits
    expect(tipOnLevelStart(iced, ['mixing', 'brown'])).toBe('ice');
    expect(tipOnLevelStart(level(['O'], [[[RED, 1]], [[YELLOW, 1]]]), ['mixing'])).toBeNull();
  });

  it('has tip and how-to texts in every language, with a fourth how-to page', () => {
    expect(HOWTO_PAGES).toBe(4);
    for (const dict of Object.values(DICTIONARIES) as Record<string, string>[]) {
      for (const key of ['tip.brown.title', 'tip.brown.body', 'howto.4.title', 'howto.4.body']) expect(dict[key]).toBeTruthy();
    }
  });

  it('counts brown as a mixed pixel and as a mechanic of its own', () => {
    expect(curveLevel(brown, 0.98)).toMatchObject({ secondaryShare: 1, features: ['mix', 'brown'] });
  });

  it('lets the brown debut be very easy, but not the brown level after it', () => {
    const at = (id: number, features: string[]): CurveLevel => ({
      id, stage: 11, boss: false, winRate: 0.98, shooters: 7, secondaryShare: 0.5, beltCapacity: 2, slots: 3, features,
    });
    const earlier = [{ ...at(50, ['mix']), stage: 5 }, { ...at(51, ['mix']), stage: 5 }];
    // #51 repeats a known mechanic and is flagged; #101 debuts brown and is allowed.
    expect(checkCurve([...earlier, at(101, ['mix', 'brown'])]).filter((v) => v.rule === 1).map((v) => v.key)).toEqual(['r1 #51']);
    expect(checkCurve([at(101, ['mix', 'brown']), at(102, ['mix', 'brown'])]).filter((v) => v.rule === 1).map((v) => v.key)).toEqual(['r1 #102']);
  });
});

describe('brown debut level', () => {
  const defs = levels as LevelDef[];
  const firstBrown = defs.find((d) => d.image.some((row) => row.includes('K')))!;

  it('is level 101, the first level of universe 2, very easy and proven solvable', () => {
    expect(firstBrown.id).toBe(101);
    expect(firstBrown.stage).toBe(11);
    const parsed = parseLevel(firstBrown);
    expect(solve(parsed).solvable).toBe(true);
    expect(levelWinRate(parsed)).toBeGreaterThanOrEqual(0.95);
    expect(tipOnLevelStart(parsed, ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt'])).toBe('brown');
  });
});
