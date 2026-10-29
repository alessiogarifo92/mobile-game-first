import { isUniverseUnlocked, universeLevels } from './universes';

/**
 * The mural of a universe (#92): one big picture split into MURAL_SIDE × MURAL_SIDE tiles, one per level. Tile N is
 * painted when level N of the universe is completed; the first tile is painted as soon as the universe opens, so the
 * player starts with a piece already done (endowed progress). Drawn in code from the paint colours, no assets.
 */
export const MURAL_SIDE = 10;
export const MURAL_TILES = MURAL_SIDE * MURAL_SIDE;
/** Cells per tile side: the picture is MURAL_CELLS × MURAL_CELLS cells. */
export const TILE_CELLS = 4;
export const MURAL_CELLS = MURAL_SIDE * TILE_CELLS;

/** Cell colours: the six paint codes of level images (`R Y B O G P`), plus `W` white and `K` ink. */
export type MuralColor = 'R' | 'Y' | 'B' | 'O' | 'G' | 'P' | 'W' | 'K';

/** Level ids and stages of the game. */
type LevelRef = { id: number; stage: number };

type Painter = (x: number, y: number) => MuralColor;

const N = MURAL_CELLS;
/** Small deterministic hash: stars, flowers and windows fall in the same cells on every device. */
const hash = (x: number, y: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) % 1000;
};
const inCircle = (x: number, y: number, cx: number, cy: number, r: number) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r;

/** 1 Atelier: the colour wheel of the six paints on a white canvas. */
const atelier: Painter = (x, y) => {
  const dx = x + 0.5 - N / 2, dy = y + 0.5 - N / 2;
  const r = Math.hypot(dx, dy);
  if (r > 18.5) return hash(x, y) % 9 === 0 ? (['R', 'Y', 'B'] as const)[hash(y, x) % 3]! : 'W';
  if (r > 17) return 'K';
  if (r < 5) return 'W';
  if (r < 6) return 'K';
  const sector = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * 6) % 6;
  return (['R', 'O', 'Y', 'G', 'B', 'P'] as const)[sector]!;
};

/** 2 Nature: sun, purple mountains, green hills with a tree and a meadow of flowers. */
const nature: Painter = (x, y) => {
  if (inCircle(x, y, 31, 8, 4)) return 'Y';
  if (inCircle(x, y, 31, 8, 5.5)) return 'O';
  if (y < 12 && (inCircle(x, y, 8, 7, 3) || inCircle(x, y, 12, 6, 3.5) || inCircle(x, y, 15, 8, 2.5))) return 'W';
  const hill = 26 + 2 * Math.sin(x / 5);
  if (inCircle(x, y, 9, 17, 4.5)) return 'G';
  if (x >= 8 && x <= 9 && y >= 20 && y < hill + 1) return 'K';
  if (y >= hill) return y > 31 && hash(x, y) % 11 === 0 ? (hash(y, x) % 2 ? 'R' : 'Y') : 'G';
  if (y > 13 + Math.abs(((x + 6) % 16) - 8) * 1.4) return 'P';
  return 'B';
};

/** 3 Travel: a sunset over a city skyline, with a hot-air balloon. */
const travel: Painter = (x, y) => {
  const heights = [12, 18, 9, 22, 15, 26, 11, 19, 14, 24];
  const block = Math.floor(x / 4);
  const top = N - 3 - heights[block]!;
  if (y >= N - 3) return 'K';
  if (y >= top) return x % 4 !== 0 && y % 3 === 1 && y > top && hash(x, y) % 3 !== 0 ? 'Y' : 'K';
  if (inCircle(x, y, 30, 9, 4.5)) return x === 30 || x === 29 ? 'Y' : 'R';
  if (x >= 29 && x <= 30 && y >= 15 && y <= 16) return 'K';
  if (inCircle(x, y, 12, 22, 7)) return 'Y';
  if (y < 8) return 'P';
  if (y < 16) return 'R';
  return 'O';
};

/** 4 Sea and sky: a sun setting on the waves, an island with a palm and a sailing boat. */
const seaAndSky: Painter = (x, y) => {
  const horizon = 20;
  if (y < horizon) {
    if (inCircle(x, y, 20, 20, 6)) return 'R';
    if ((y === 5 && x > 4 && x < 13) || (y === 4 && x > 6 && x < 11) || (y === 9 && x > 26 && x < 36) || (y === 8 && x > 28 && x < 33)) return 'W';
    return y < 10 ? 'O' : 'Y';
  }
  // Sailing boat: a white sail, a red flag, an ink hull.
  if (y >= 22 && y <= 29 && x >= 28 && x <= 33 && x - 28 <= (y - 22)) return 'W';
  if (y >= 20 && y <= 21 && x >= 27 && x <= 28) return 'R';
  if (y >= 30 && y <= 31 && x >= 25 + (y - 30) && x <= 36 - (y - 30)) return 'K';
  // Island with a palm.
  if (y >= 29 && ((x + 0.5 - 9) / 8) ** 2 + ((y + 0.5 - 32) / 3) ** 2 <= 1) return 'O';
  if (x === 9 && y >= 22 && y < 30) return 'K';
  if (y >= 20 && y <= 22 && Math.abs(x - 9) <= 4 - Math.abs(y - 21) * 2 + 2) return 'G';
  return (y + Math.round(2 * Math.sin(x / 3))) % 5 === 0 ? 'W' : 'B';
};

/** 5 Cosmos: a ringed planet, a moon, a small green world and a comet among the stars. */
const cosmos: Painter = (x, y) => {
  const px = x + 0.5 - 14, py = y + 0.5 - 23;
  const ring = Math.abs((px / 15) ** 2 + (py / 4) ** 2 - 1) < 0.18;
  const planet = px * px + py * py <= 100;
  if (ring && (!planet || py > 0)) return 'O';
  if (planet) return Math.floor((y - 13) / 3) % 2 === 0 ? 'P' : 'B';
  if (inCircle(x, y, 32, 8, 4)) return inCircle(x, y, 33, 7, 1.2) ? 'O' : 'Y';
  if (inCircle(x, y, 32, 32, 3)) return 'G';
  if (inCircle(x, y, 7, 6, 1.6)) return 'R';
  if (y >= 7 && y <= 8 && x >= 8 && x <= 14 && Math.abs(y - 7 - (x - 8) / 6) < 1) return 'W';
  return hash(x, y) % 29 === 0 ? 'W' : 'K';
};

const PAINTERS: readonly Painter[] = [atelier, nature, travel, seaAndSky, cosmos];
const cache = new Map<number, readonly string[]>();

/**
 * The picture of a universe's mural: MURAL_CELLS rows of MURAL_CELLS colour codes. Each of the five planned universes
 * (epic #87) has its own; a universe past them reuses the pictures in order.
 */
export function muralArt(universe: number): readonly string[] {
  const index = (((Math.max(1, Math.floor(universe)) - 1) % PAINTERS.length) + PAINTERS.length) % PAINTERS.length;
  let art = cache.get(index);
  if (!art) {
    const paint = PAINTERS[index]!;
    art = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => paint(x, y)).join(''));
    cache.set(index, art);
  }
  return art;
}

/** Colours of one tile (0-based, row by row): TILE_CELLS rows of TILE_CELLS codes. */
export function tileCells(universe: number, tile: number): MuralColor[][] {
  const art = muralArt(universe);
  const tx = (tile % MURAL_SIDE) * TILE_CELLS, ty = Math.floor(tile / MURAL_SIDE) * TILE_CELLS;
  return Array.from({ length: TILE_CELLS }, (_, j) => [...art[ty + j]!.slice(tx, tx + TILE_CELLS)] as MuralColor[]);
}

/**
 * Which of the MURAL_TILES tiles are painted: tile i is level i+1 of the universe, painted once completed. A closed
 * universe has nothing painted; an open one always has its first tile (the gift piece). Tiles of levels the universe
 * does not have yet stay empty.
 */
export function paintedTiles(levels: readonly LevelRef[], completed: readonly number[], universe: number): boolean[] {
  const open = isUniverseUnlocked(levels, completed, universe);
  const ids = universeLevels(levels, universe);
  const done = new Set(completed);
  return Array.from({ length: MURAL_TILES }, (_, i) => open && (i === 0 || (ids[i] !== undefined && done.has(ids[i]))));
}


/** Numbers (1-based, as the player counts levels) of the painted tiles. */
export function paintedTileNumbers(tiles: readonly boolean[]): number[] {
  return tiles.flatMap((painted, i) => (painted ? [i + 1] : []));
}
