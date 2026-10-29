import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { curveLevel } from '../src/core/curve';
import { generateLevel, placeSpecial } from '../src/core/generator';
import { HOWTO_PAGES } from '../src/core/howto';
import { DICTIONARIES } from '../src/core/i18n';
import { buildLanes, checkReachable, paintNeeds, parseImage, parseLevel, parseOverlay, walledIn, LevelError, type LevelDef } from '../src/core/level';
import { tipOnLevelStart } from '../src/core/onboarding';
import { createRng } from '../src/core/rng';
import { blockingStone, boardDone, cellDone, createBoard, findTarget } from '../src/core/rules';
import { createGame, launchFromColumn, step } from '../src/core/sim';
import { runLoop, solve } from '../src/core/solver';
import { BLUE, RED, YELLOW, level } from './helpers';

// Row: R, stone, R. Paint from the left stops on the stone, so the right pixel needs the right side of the belt.
const row = () => level(['R.R'], [[[RED, 2]]], { overlay: ['.s.'] });

describe('stone: level format', () => {
  it('is an overlay code on an empty cell, not a pixel, and needs no paint', () => {
    const l = row();
    expect(l.stone).toEqual([false, true, false]);
    expect(l.targets[1]).toBe(0);
    expect(paintNeeds(l.targets, l.ice)).toEqual({ 1: 2, 2: 0, 4: 0 });
    expect(level(['R'], [[[RED, 1]]]).stone).toEqual([false]);
  });

  it('is rejected on a pixel, with a clear message', () => {
    expect(() => level(['RR'], [[[RED, 2]]], { overlay: ['s.'] })).toThrow('stone on a pixel (0, 0)');
    expect(() => level(['RR'], [[[RED, 2]]], { overlay: ['s.'] })).toThrow(LevelError);
  });

  it('parseOverlay returns no stones without an overlay', () => {
    expect(parseOverlay(undefined, 2, [1, 0]).stone).toEqual([false, false]);
  });
});

describe('stone: every pixel stays reachable', () => {
  it('accepts a pixel reachable from at least one free lane', () => {
    // The centre column is walled from above and below, but its pixels are on the left and right edges.
    expect(() => level(['R.R'], [[[RED, 2]]], { overlay: ['.s.'] })).not.toThrow();
  });

  it('rejects a pixel walled in on all four sides before the solver runs', () => {
    const def: LevelDef = {
      id: 1, name: 'test', stage: 1, slots: 3, beltCapacity: 3,
      image: ['...', '.R.', '...'],
      overlay: ['.s.', 's.s', '.s.'],
      columns: [[{ color: RED, ammo: 1 }]],
    };
    expect(() => parseLevel(def)).toThrow('pixel (1, 1) is walled in: a stone blocks every lane to it');
    // Three stones are not enough: the open side still reaches it.
    expect(() => parseLevel({ ...def, overlay: ['.s.', 's.s', '...'] })).not.toThrow();
  });

  it('walledIn names the first unreachable pixel, -1 when every pixel can be painted', () => {
    const { width, height, targets } = parseImage(['...', '.R.', '...']);
    const stone = [false, true, false, true, false, true, false, true, false];
    expect(walledIn(width, height, targets, stone)).toBe(4);
    expect(walledIn(width, height, targets, targets.map(() => false))).toBe(-1);
    expect(() => checkReachable(width, height, targets, targets.map(() => false))).not.toThrow();
  });
});

describe('stone: rules', () => {
  it('stops paint: findTarget is blocked by a stone, before or after finished pixels', () => {
    const l = row();
    const b = createBoard(l);
    const leftToRight = [0, 1, 2];
    expect(findTarget(l, b, leftToRight, RED)).toBe(0);
    b.paint[0] = RED;
    expect(cellDone(l, b, 0)).toBe(true);
    expect(findTarget(l, b, leftToRight, RED)).toBe(-1); // flies over the done pixel, stops on the stone
    expect(findTarget(l, b, [2, 1, 0], RED)).toBe(2); // the other side reaches the pixel behind
  });

  it('a stone does not count for victory', () => {
    const l = row();
    const b = createBoard(l);
    b.paint[0] = RED;
    b.paint[2] = RED;
    expect(cellDone(l, b, 1)).toBe(true);
    expect(boardDone(l, b)).toBe(true);
  });

  it('blockingStone: only a shot that would hit a usable pixel behind the stone', () => {
    const l = level(['R.B'], [[[RED, 1]], [[BLUE, 1]]], { overlay: ['.s.'] });
    const b = createBoard(l);
    const leftToRight = [0, 1, 2];
    expect(blockingStone(l, b, leftToRight, BLUE)).toBe(-1); // stopped earlier by the unfinished red pixel
    b.paint[0] = RED;
    expect(blockingStone(l, b, leftToRight, BLUE)).toBe(1); // blue would reach the blue pixel: the stone stops it
    expect(blockingStone(l, b, leftToRight, YELLOW)).toBe(-1); // nothing for yellow behind it
    b.paint[2] = BLUE;
    expect(blockingStone(l, b, leftToRight, BLUE)).toBe(-1); // nothing left behind
    expect(blockingStone(l, b, [0], RED)).toBe(-1); // a lane with no stone
  });
});

describe('stone: simulation and solver', () => {
  it('a bucket from one side is stopped, the other side paints the pixel behind, and the stone splashes', () => {
    // Two pixels in a column, stone between: the bottom lane only reaches the bottom pixel. The first bucket paints
    // it; the second, from the bottom lane, flies over it and stops on the stone, then paints the top from a row lane.
    const l = level(['R', '.', 'R'], [[[RED, 1], [RED, 1]]], { overlay: ['.', 's', '.'] });
    const g = createGame(l);
    const splashes: number[] = [];
    let hits = 0;
    while (g.status === 'playing' && g.tick < 200) {
      if (g.belt.length + g.pending.length === 0) launchFromColumn(g, 0);
      step(g);
      hits += g.events.length;
      splashes.push(...g.stoneHits.map((e) => e.cell));
    }
    expect(g.status).toBe('won');
    expect(hits).toBe(2);
    expect(splashes.every((c) => c === 1)).toBe(true);
    expect(splashes.length).toBeGreaterThan(0);
    // Each step clears the previous splashes.
    expect(g.stoneHits).toEqual([]);
  });

  it('runLoop applies the same rule as the game', () => {
    const l = row();
    const b = createBoard(l);
    expect(runLoop(l, buildLanes(l.width, l.height), b, RED, 2)).toBe(0);
    expect(boardDone(l, b)).toBe(true);
  });

  it('the solver proves a stone level solvable, and the solution wins in the game', () => {
    const l = level(['RYR', 'B.B', 'RYR'], [[[RED, 2], [YELLOW, 2]], [[BLUE, 2], [RED, 2]]], { overlay: ['...', '.s.', '...'], slots: 2 });
    const result = solve(l);
    expect(result.solvable).toBe(true);
    const g = createGame(l);
    for (const move of result.moves) {
      expect(move.from === 'column' ? launchFromColumn(g, move.index) : false).toBe(true);
      while (g.belt.length + g.pending.length > 0 && g.status === 'playing') step(g);
    }
    expect(g.status).toBe('won');
  });
});

describe('stone: generator', () => {
  const image = ['RRRR', 'R..R', 'RRRR', '....'];

  it('places stones on empty cells next to the figure, deterministically, never walling a pixel in', () => {
    const a = placeSpecial(image, { stone: 3 }, createRng(5));
    expect(a).toEqual(placeSpecial(image, { stone: 3 }, createRng(5)));
    const { width, height, targets } = parseImage(image);
    const { stone } = parseOverlay(a, width, targets);
    expect(stone.filter(Boolean)).toHaveLength(3);
    stone.forEach((s, c) => s && expect(targets[c]).toBe(0));
    expect(walledIn(width, height, targets, stone)).toBe(-1);
  });

  it('keeps ice and hidden draws unchanged when stones are added', () => {
    const plain = placeSpecial(image, { ice: 2, hidden: 1 }, createRng(9));
    const withStones = placeSpecial(image, { ice: 2, hidden: 1, stone: 2 }, createRng(9));
    expect(withStones.map((r) => r.replace(/s/g, '.'))).toEqual(plain);
  });

  it('skips a cell that would wall a pixel in', () => {
    // The lone pixel has four empty neighbours: only three may become stones.
    expect(() => placeSpecial(['...', '.R.', '...'], { stone: 3 }, createRng(1))).not.toThrow();
    expect(() => placeSpecial(['...', '.R.', '...'], { stone: 4 }, createRng(1))).toThrow('not enough empty cells next to the figure for 4 stones');
  });

  it('throws when the figure leaves no empty cell for a stone', () => {
    expect(() => placeSpecial(['RR', 'RR'], { stone: 1 }, createRng(1))).toThrow('not enough empty cells');
  });

  it('generates a solvable stone level via special', () => {
    const opts = { id: 141, name: 'test', image, columns: 2, ammoChunk: 4, slots: 2, beltCapacity: 2, seed: 141, special: { stone: 3 } };
    const out = generateLevel(opts);
    expect(out).toEqual(generateLevel(opts));
    const l = parseLevel(out.def);
    expect(l.stone.filter(Boolean)).toHaveLength(3);
    expect(solve(l).solvable).toBe(true);
  });
});

describe('stone: onboarding and curve', () => {
  const l = level(['R.R'], [[[RED, 2]]], { id: 141, overlay: ['.s.'] });

  it('shows the stone tip once, at the first level with stones', () => {
    expect(tipOnLevelStart(l, [])).toBe('stone');
    expect(tipOnLevelStart(l, ['stone'])).toBeNull();
    expect(tipOnLevelStart(level(['RR'], [[[RED, 2]]]), [])).toBeNull();
  });

  it('is a feature for the curve rules, so its first level counts as a debut', () => {
    expect(curveLevel(l, 1).features).toContain('stone');
  });

  it('has its own "How to play" page', () => {
    expect(HOWTO_PAGES).toBeGreaterThanOrEqual(5);
    expect(DICTIONARIES.it['howto.5.title']).toBe('Pietre');
  });
});

describe('stone: e2e debut fixture', () => {
  it('is a valid, solvable level with stones', () => {
    const fixture = JSON.parse(readFileSync(new URL('../e2e/fixtures/stone-debut.json', import.meta.url), 'utf8'));
    const l = parseLevel({ id: 141, name: 'test', stage: 15, ...fixture });
    expect(l.stone.some(Boolean)).toBe(true);
    expect(solve(l).solvable).toBe(true);
  });
});
