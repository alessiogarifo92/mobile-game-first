import { describe, expect, it } from 'vitest';
import debut from '../e2e/fixtures/film-debut.json' with { type: 'json' };
import { FILM_DEBUT } from '../e2e/fixtures/film-debut';
import { BLUE, BROWN, RED, YELLOW, isPrimary, type Primary } from '../src/core/colors';
import { blockerSignature, blockingCells, cloneGame, unlockColors } from '../src/core/blocked';
import { curveLevel } from '../src/core/curve';
import { FILM_DASHES_PER_SIDE, FILM_PEEL_MS, filmDashes, filmGlyph, peelFrame } from '../src/core/film';
import { generateLevel, placeSpecial } from '../src/core/generator';
import { DICTIONARIES, translate } from '../src/core/i18n';
import { buildLanes, paintNeeds, parseImage, parseLevel, parseOverlay, LevelError, type LevelDef, type ShooterSpec } from '../src/core/level';
import { tipOnLevelStart, tipsPresent } from '../src/core/onboarding';
import { createRng } from '../src/core/rng';
import { applyHit, boardDone, cellDone, createBoard, findTarget } from '../src/core/rules';
import { createGame, launchFromColumn, launchFromSlot, step } from '../src/core/sim';
import { levelWinRate, runLoop, solve, type Move } from '../src/core/solver';
import { cloneBoard } from '../src/core/rules';
import levels from '../src/levels/levels.json';
import { MURAL_PAINT, PAINT, THEME, blend, contrast } from '../src/game/theme';
import { level } from './helpers';

// One red pixel under a blue film: a blue shot tears the film off, then a red shot paints the pixel.
const filmed = () => level(['R'], [[[BLUE, 1]], [[RED, 1]]], { overlay: ['b'] });

describe('film: the rule', () => {
  it('takes only a shot of its own colour, and the pixel under it waits', () => {
    const l = filmed();
    const b = createBoard(l);
    expect(b.film).toEqual([BLUE]);
    expect(findTarget(l, b, [0], BLUE)).toBe(0);
    expect(findTarget(l, b, [0], RED)).toBe(-1); // the pixel's own colour does not get through the film
    expect(findTarget(l, b, [0], YELLOW)).toBe(-1);
    expect(cellDone(l, b, 0)).toBe(false);
  });

  it('the tearing shot removes the film, paints nothing and is not a completion', () => {
    const l = filmed();
    const b = createBoard(l);
    expect(applyHit(l, b, 0, BLUE)).toEqual({ brokeIce: false, tore: true, completed: false, revealed: [], unlocked: [] });
    expect(b.film).toEqual([0]);
    expect(b.paint).toEqual([0]);
    expect(findTarget(l, b, [0], BLUE)).toBe(-1); // blue has no use on a red pixel once the film is off
    expect(findTarget(l, b, [0], RED)).toBe(0);
    expect(applyHit(l, b, 0, RED)).toMatchObject({ tore: false, completed: true });
    expect(boardDone(l, b)).toBe(true);
  });

  it('a filmed pixel blocks the lane behind it for every colour but the film', () => {
    // Column of two: yellow behind a red pixel under a blue film (lane runs bottom to top).
    const l = level(['Y', 'R'], [[[BLUE, 1]], [[RED, 1]], [[YELLOW, 1]]], { overlay: ['.', 'b'] });
    const b = createBoard(l);
    const lane = [1, 0];
    expect(findTarget(l, b, lane, YELLOW)).toBe(-1);
    expect(findTarget(l, b, lane, BLUE)).toBe(1);
    applyHit(l, b, 1, BLUE);
    expect(findTarget(l, b, lane, YELLOW)).toBe(-1); // film off, pixel still unpainted
    applyHit(l, b, 1, RED);
    expect(findTarget(l, b, lane, YELLOW)).toBe(0);
  });

  it('a film over a secondary pixel: the colour not in it tears the film, then both primaries paint it', () => {
    const l = level(['O'], [[[BLUE, 1]], [[RED, 1]], [[YELLOW, 1]]], { overlay: ['b'] });
    const b = createBoard(l);
    expect(findTarget(l, b, [0], RED)).toBe(-1);
    applyHit(l, b, 0, BLUE);
    applyHit(l, b, 0, RED);
    expect(boardDone(l, b)).toBe(false);
    applyHit(l, b, 0, YELLOW);
    expect(boardDone(l, b)).toBe(true);
  });

  it('counts the extra shot in the ammo of the film colour, not of the pixel', () => {
    const l = filmed();
    expect(paintNeeds(l.targets, l.ice, l.film)).toEqual({ 1: 1, 2: 0, 4: 1 });
    expect(paintNeeds(l.targets, l.ice)).toEqual({ 1: 1, 2: 0, 4: 0 }); // film is optional, old callers keep working
    expect(() => level(['R'], [[[RED, 1]]], { overlay: ['b'] })).toThrow('ammo for color 4');
    expect(() => level(['R'], [[[RED, 1]], [[BLUE, 2]]], { overlay: ['b'] })).toThrow('ammo for color 4');
  });

  it('the simulation tears the film with the same shot the solver counts: it costs a unit of ammo', () => {
    const l = level(['R'], [[[BLUE, 1]], [[RED, 1]]], { overlay: ['b'] });
    const g = createGame(l);
    expect(launchFromColumn(g, 0)).toBe(true);
    for (let i = 0; i < 12 && g.belt.length + g.pending.length > 0; i++) step(g);
    expect(g.film).toEqual([0]);
    expect(g.paint).toEqual([0]);
    expect(g.status).toBe('playing');
    expect(launchFromColumn(g, 1)).toBe(true);
    for (let i = 0; i < 12 && g.status === 'playing'; i++) step(g);
    expect(g.status).toBe('won');
  });

  it('records the tear on the hit event, for the animation', () => {
    const l = level(['R'], [[[BLUE, 1]], [[RED, 1]]], { overlay: ['b'] });
    const g = createGame(l);
    launchFromColumn(g, 0);
    const events = [];
    for (let i = 0; i < 12; i++) {
      step(g);
      events.push(...g.events);
    }
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ color: BLUE, cell: 0, tore: true, completed: false, brokeIce: false });
  });
});

describe('film: the level format', () => {
  const two = [[[RED, 1]], [[YELLOW, 1]], [[BLUE, 1]]] as [Primary, number][][];
  const base = (image: string[], overlay: string[], columns: [Primary, number][][]) => () => level(image, columns, { overlay });

  it('reads r, y and b as the colour that tears the film', () => {
    expect(parseOverlay(['by'], 2, [RED, RED]).film).toEqual([BLUE, YELLOW]);
    expect(parseOverlay(['r.'], 2, [BLUE, 0]).film).toEqual([RED, 0]);
    expect(parseOverlay(undefined, 2, [1, 4]).film).toEqual([0, 0]);
  });

  it('is rejected on a brown pixel: it holds every primary, no colour is left', () => {
    expect(base(['K'], ['b'], two)).toThrow(LevelError);
    expect(base(['K'], ['b'], two)).toThrow('film on a brown pixel');
  });

  it('is rejected on a pixel that holds its own colour, primary or secondary', () => {
    expect(base(['R'], ['r'], two)).toThrow('holds its colour');
    expect(base(['O'], ['y'], two)).toThrow('holds its colour');
    expect(base(['G'], ['b'], two)).toThrow('holds its colour');
    expect(base(['P'], ['r'], two)).toThrow('holds its colour');
  });

  it('is rejected on an empty cell', () => {
    expect(base(['R.'], ['.b'], two)).toThrow('empty cell');
  });

  it('shares its one overlay code with ice, locks, keys, hidden pixels and stones: it can never sit with them', () => {
    // A cell has a single overlay character, so "ice and film" cannot even be written: the later code replaces nothing,
    // and a film letter on a pixel the other overlays use is the one code that pixel has.
    const l = level(['RR'], [[[RED, 3]], [[BLUE, 1]]], { overlay: ['ib'] });
    expect(l.ice).toEqual([1, 0]);
    expect(l.film).toEqual([0, BLUE]);
    expect(() => level(['RR'], [[[RED, 3]], [[BLUE, 1]]], { overlay: ['ibb'] })).toThrow('overlay row 0');
  });

  it('parses a level where only the colour not in the pixel is allowed', () => {
    for (const [pixel, film] of [['R', 'y'], ['R', 'b'], ['Y', 'r'], ['Y', 'b'], ['B', 'r'], ['B', 'y'], ['O', 'b'], ['G', 'r'], ['P', 'y']] as const) {
      expect(() => parseOverlay([film], 1, parseImage([pixel]).targets)).not.toThrow();
    }
  });

  it('keeps the film on the parsed level and the board starts with it', () => {
    const l = level(['RR', 'BB'], [[[RED, 2]], [[BLUE, 3]], [[YELLOW, 1]]], { overlay: ['b.', '.y'] });
    expect(l.film).toEqual([BLUE, 0, 0, YELLOW]);
    expect(createBoard(l).film).toEqual([BLUE, 0, 0, YELLOW]);
    expect(cloneBoard(createBoard(l)).film).toEqual([BLUE, 0, 0, YELLOW]);
  });
});

describe('film: the solver', () => {
  // The hand-drawn example: two filmed pixels, each torn by a colour the picture has none of at that spot.
  const example: LevelDef = {
    id: 9001,
    name: 'film-example',
    stage: 1,
    image: ['RR', 'BB'],
    overlay: ['b.', '.y'],
    columns: [[{ color: RED, ammo: 2 }], [{ color: BLUE, ammo: 3 }], [{ color: YELLOW, ammo: 1 }]],
    slots: 2,
    beltCapacity: 3,
  };

  it('solves the example, and the moves win the real simulation', () => {
    const l = parseLevel(example);
    const result = solve(l);
    expect(result.solvable).toBe(true);
    expect(result.exhaustive).toBe(true);
    const g = createGame(l);
    for (const m of result.moves) {
      expect(m.from === 'column' ? launchFromColumn(g, m.index) : launchFromSlot(g, m.index)).toBe(true);
      do step(g); while ((g.belt.length || g.pending.length) && g.status === 'playing');
    }
    expect(g.status).toBe('won');
  });

  it('proves a level unsolvable when the film colour is stuck behind the buckets the film refuses', () => {
    // Two red pixels under blue films; one column holds red, red, blue, blue and there is a single waiting slot. Each red
    // bucket meets a film it cannot touch and comes back: the first parks, the second finds the slot taken and jams.
    const column: ShooterSpec[] = [{ color: RED, ammo: 1 }, { color: RED, ammo: 1 }, { color: BLUE, ammo: 1 }, { color: BLUE, ammo: 1 }];
    const stuck = parseLevel({ ...example, image: ['RR'], overlay: ['bb'], columns: [column], slots: 1 });
    expect(solve(stuck)).toMatchObject({ solvable: false, exhaustive: true });
    // The same buckets with a second slot are fine: both reds wait for the films to go.
    expect(solve(parseLevel({ ...example, image: ['RR'], overlay: ['bb'], columns: [column], slots: 2 })).solvable).toBe(true);
  });

  it('keeps the film in the memo key: the same paint with and without a film are different positions', () => {
    // Red under a blue film, then the same pixel without one: if the solver merged the two it would wrongly think the
    // red bucket could paint at once. Order of the buckets: red first, blue second.
    const withFilm = parseLevel({ ...example, image: ['R'], overlay: ['b'], columns: [[{ color: RED, ammo: 1 }], [{ color: BLUE, ammo: 1 }]], slots: 1 });
    const result = solve(withFilm);
    expect(result.solvable).toBe(true);
    // Blue (column 1) must launch before red (column 0) can paint under the film.
    expect(result.moves).toEqual([{ from: 'column', index: 1 }, { from: 'column', index: 0 }] satisfies Move[]);
    const g = createGame(withFilm);
    for (const m of result.moves) {
      if (m.from === 'column') launchFromColumn(g, m.index);
      else launchFromSlot(g, m.index);
      do step(g); while ((g.belt.length || g.pending.length) && g.status === 'playing');
    }
    expect(g.status).toBe('won');
  });

  it('runLoop equals a lone shooter on the belt with films on the board', () => {
    const l = parseLevel(example);
    const lanes = buildLanes(l.width, l.height);
    const rng = createRng(7);
    for (let trial = 0; trial < 40; trial++) {
      const board = createBoard(l);
      const g = createGame(l);
      for (let k = 0; k < 4; k++) {
        const color = ([RED, YELLOW, BLUE] as const)[Math.floor(rng() * 3)]!;
        const ammo = 1 + Math.floor(rng() * 3);
        const left = runLoop(l, lanes, board, color, ammo);
        if (boardDone(l, board)) break; // the game stops at the win with the bucket still riding
        g.pending.push({ id: 100 + k, color, ammo, pos: 0, traveled: 0 });
        while (g.belt.length + g.pending.length > 0 && g.status === 'playing') step(g);
        const back = g.slots.find((s) => s?.id === 100 + k);
        expect(back?.ammo ?? 0).toBe(left);
        g.slots = g.slots.map(() => null);
        expect({ paint: g.paint, film: g.film, ice: g.ice }).toEqual({ paint: board.paint, film: board.film, ice: board.ice });
      }
    }
  });

  it('levelWinRate is deterministic and a probability on a filmed level', () => {
    const l = parseLevel(example);
    const a = levelWinRate(l);
    expect(a).toBe(levelWinRate(l));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
  });
});

describe('film: lanes that cannot open', () => {
  it('names the filmed pixel as the blocker and the colour that opens it', () => {
    const l = level(['Y', 'R'], [[[BLUE, 1]], [[RED, 1]], [[YELLOW, 1]]], { overlay: ['.', 'b'] });
    const g = createGame(l);
    // A yellow bucket facing the column: the red pixel under a blue film stands in front of the yellow one.
    expect(blockingCells(l, g, g.lanes, YELLOW)).toContain(1);
    expect(unlockColors(l, g, 1)).toEqual([BLUE]); // not red: the film must go first
    applyHit(l, g, 1, BLUE);
    expect(unlockColors(l, g, 1)).toEqual([RED]);
  });

  it('copies the film when a game is cloned and fingerprints it, so the circles go once the film is torn', () => {
    const l = level(['R'], [[[BLUE, 1]], [[RED, 1]]], { overlay: ['b'] });
    const g = createGame(l);
    const copy = cloneGame(g);
    const before = blockerSignature(g, [0]);
    applyHit(l, g, 0, BLUE);
    expect(copy.film).toEqual([BLUE]); // the copy did not follow
    expect(blockerSignature(g, [0])).not.toBe(before);
  });
});

describe('film: the generator', () => {
  const image = ['RRRR', 'RYYR', 'BBBB', 'BKKB'];
  const placed = (special: Parameters<typeof placeSpecial>[1], seed = 1) => placeSpecial(image, special, createRng(seed));

  it('is deterministic: the same seed gives the same films', () => {
    expect(placed({ film: 3 })).toEqual(placed({ film: 3 }));
    expect(placed({ film: 3 }, 2)).toEqual(placed({ film: 3 }, 2));
  });

  it('places exactly the films asked for, each of a colour the pixel does not hold, never on brown or empty', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const overlay = placed({ film: 5 }, seed);
      const { targets, width } = parseImage(image);
      const { film } = parseOverlay(overlay, width, targets);
      expect(film.filter((f) => f !== 0)).toHaveLength(5);
      film.forEach((f, i) => {
        if (f === 0) return;
        expect(isPrimary(f)).toBe(true);
        expect(targets[i]! & f).toBe(0);
        expect(targets[i]).not.toBe(BROWN);
      });
    }
  });

  it('shares the pixels fairly with the other mechanics: a film never lands on ice, a lock, a key or a hidden pixel', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const overlay = placed({ ice: 2, hidden: 2, key: 1, lock: 1, film: 3 }, seed);
      const { targets, width } = parseImage(image);
      const parsed = parseOverlay(overlay, width, targets);
      expect(parsed.film.filter((f) => f !== 0)).toHaveLength(3);
      parsed.film.forEach((f, i) => {
        if (f !== 0) expect([parsed.ice[i], parsed.hidden[i], parsed.locked[i], parsed.keys[i]]).toEqual([0, false, false, false]);
      });
    }
  });

  it('does not move the other mechanics: a level without films keeps its overlay draw for draw', () => {
    for (const special of [{ ice: 2 }, { ice: 2, hidden: 1 }, { key: 1, lock: 1 }]) {
      const without = placed(special, 3);
      expect(placed({ ...special, film: 0 }, 3)).toEqual(without);
      // With films added, every non-film cell is what it was.
      const withFilms = placed({ ...special, film: 2 }, 3);
      without.forEach((row, y) => [...row].forEach((ch, x) => {
        const f = withFilms[y]![x]!;
        if (!'ryb'.includes(f)) expect(f).toBe(ch);
      }));
    }
  });

  it('refuses to place more films than there are plain pixels', () => {
    expect(() => placed({ film: 99 })).toThrow('not enough plain pixels for 99 films');
  });

  it('counts the extra shots when it deals the buckets: the generated level is solvable and the ammo balances', () => {
    const { def, winRate } = generateLevel({ ...FILM_DEBUT, id: 5000, winRate: undefined, special: { film: 3 } });
    const l = parseLevel(def);
    expect(l.film.filter((f) => f !== 0)).toHaveLength(3);
    expect(solve(l).solvable).toBe(true);
    expect(winRate).toBeGreaterThanOrEqual(0);
    expect(def.columns.flat().reduce((n, s) => n + s.ammo, 0)).toBe(l.targets.filter((t) => t !== 0).reduce((n, t) => n + [RED, YELLOW, BLUE].filter((p) => t & p).length, 0) + 3);
  });

  it('generates the debut level deterministically: two films, very easy and solvable', () => {
    const a = generateLevel(FILM_DEBUT);
    expect(a).toEqual(generateLevel(FILM_DEBUT));
    expect(a.def).toEqual(debut);
    const l = parseLevel(a.def);
    expect(l.film.filter((f) => f !== 0)).toHaveLength(2);
    expect(a.winRate).toBeGreaterThanOrEqual(0.95);
    expect(solve(l).solvable).toBe(true);
  });

  it('no level before 301 uses a film, and 301 is the first that does (stage 31, #236)', () => {
    const withFilm = (levels as LevelDef[]).filter((def) => def.overlay?.some((row) => /[ryb]/.test(row)));
    expect(withFilm.length).toBeGreaterThan(0);
    expect(withFilm[0]!.id).toBe(301);
  });
});

describe('film: onboarding and texts', () => {
  const debutLevel = parseLevel(debut as LevelDef);

  it('is a mechanic of the level the first time it is on the board', () => {
    expect(tipsPresent(debutLevel)).toContain('film');
    expect(tipsPresent(level(['R'], [[[RED, 1]]]))).not.toContain('film');
  });

  it('shows the card once at the debut, after the ones the player has not seen yet, and never again', () => {
    const seen = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'queue', 'leftover'];
    expect(tipOnLevelStart(debutLevel, seen)).toBe('film');
    expect(tipOnLevelStart(debutLevel, [...seen, 'film'])).toBeNull();
  });

  it('counts as a feature of the level for the difficulty curve, so the debut level is its debut', () => {
    expect(curveLevel(debutLevel, 1).features).toContain('film');
    expect(curveLevel(level(['R'], [[[RED, 1]]]), 1).features).not.toContain('film');
  });

  it('has a card in both languages, written, distinct and short enough for the card', () => {
    for (const lang of ['en', 'it'] as const) {
      const dict = DICTIONARIES[lang] as Record<string, string>;
      expect(dict['tip.film.title']!.trim().length).toBeGreaterThan(0);
      expect(dict['tip.film.body']!.trim().length).toBeGreaterThan(0);
      expect(dict['tip.film.body']!.split('\n').every((line) => line.length <= 56)).toBe(true);
    }
    expect(translate('en', 'tip.film.title')).not.toBe(translate('it', 'tip.film.title'));
    expect(translate('en', 'tip.film.body')).toContain('●');
    expect(translate('it', 'tip.film.body')).toContain('▲');
  });
});

describe('film: geometry of the drawing', () => {
  const [x, y, w, h] = [10, 20, 48, 48];

  it('draws a dashed border: dashes and gaps of the same length, three per side, inside the pixel', () => {
    const dashes = filmDashes(x, y, w, h, 2);
    expect(dashes).toHaveLength(4 * FILM_DASHES_PER_SIDE);
    const lengths = dashes.map(([a, b, c, d]) => Math.hypot(c - a, d - b));
    for (const len of lengths) expect(len).toBeCloseTo(lengths[0]!, 6);
    for (const [a, b, c, d] of dashes) for (const [px, py] of [[a, b], [c, d]] as const) {
      expect(px).toBeGreaterThanOrEqual(x + 2 - 1e-9);
      expect(px).toBeLessThanOrEqual(x + w - 2 + 1e-9);
      expect(py).toBeGreaterThanOrEqual(y + 2 - 1e-9);
      expect(py).toBeLessThanOrEqual(y + h - 2 + 1e-9);
    }
    // The gap between two dashes of a side equals a dash.
    const [d0, d1] = dashes;
    expect(d1![0] - d0![2]).toBeCloseTo(lengths[0]!, 6);
    // It reaches all four corners: the border is closed up to the dash that ends in each.
    expect(dashes[0]![0]).toBeCloseTo(x + 2, 6);
    expect(dashes[FILM_DASHES_PER_SIDE - 1]![2]).toBeCloseTo(x + w - 2, 6);
  });

  it('gives each primary its own shape, centred and inside the disc', () => {
    expect(filmGlyph(RED, 30, 40, 10)).toEqual({ kind: 'circle', x: 30, y: 40, r: 10 });
    const tri = filmGlyph(YELLOW, 30, 40, 10);
    expect(tri.kind).toBe('triangle');
    if (tri.kind === 'triangle') {
      expect(tri.points).toHaveLength(3);
      for (const [px, py] of tri.points) expect(Math.hypot(px - 30, py - 40)).toBeLessThanOrEqual(10 + 1e-9);
      expect(tri.points[0]![1]).toBeLessThan(40); // points up
    }
    const sq = filmGlyph(BLUE, 30, 40, 10);
    expect(sq.kind).toBe('square');
    if (sq.kind === 'square') {
      expect(sq.x + sq.size / 2).toBeCloseTo(30, 6);
      expect(sq.y + sq.size / 2).toBeCloseTo(40, 6);
      expect(Math.hypot(sq.size / 2, sq.size / 2)).toBeLessThanOrEqual(10 + 1e-9);
    }
    expect(() => filmGlyph(3 as Primary, 0, 0, 1)).toThrow('primary');
  });

  it('tears off in about a third of a second: starts stuck on, ends gone, and only fades with reduced motion', () => {
    expect(FILM_PEEL_MS).toBeGreaterThan(200);
    expect(FILM_PEEL_MS).toBeLessThan(600);
    expect(peelFrame(0)).toEqual({ dx: 0, dy: 0, angle: 0, scale: 1, alpha: 1 });
    expect(peelFrame(1).alpha).toBe(0);
    expect(peelFrame(-3)).toEqual(peelFrame(0));
    expect(peelFrame(9)).toEqual(peelFrame(1));
    expect(peelFrame(0.5).dy).toBeLessThan(0); // it lifts up
    let last = 2;
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const f = peelFrame(t);
      expect(f.alpha).toBeLessThanOrEqual(last + 1e-9);
      last = f.alpha;
    }
    for (const t of [0.25, 0.5, 0.9]) {
      const f = peelFrame(t, true);
      expect([f.dx, f.dy, f.angle, f.scale]).toEqual([0, 0, 0, 1]);
      expect(f.alpha).toBeLessThan(1);
    }
  });

  it('keeps the dashes and the glyph readable on every veil: 3:1 against the paper and against the veil over an empty pixel', () => {
    for (const color of [RED, YELLOW, BLUE]) {
      const veil = blend(PAINT[color]!, THEME.emptyPixel, 0.55);
      expect(contrast(THEME.ink, veil)).toBeGreaterThanOrEqual(3);
      expect(contrast(THEME.ink, THEME.white)).toBeGreaterThanOrEqual(3);
      expect(MURAL_PAINT.K).toBe(THEME.ink); // the ink the dashes use is the game's one ink
    }
  });
});
