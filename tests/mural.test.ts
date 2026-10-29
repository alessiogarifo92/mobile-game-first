import { describe, expect, it } from 'vitest';
import { MURAL_CELLS, MURAL_SIDE, MURAL_TILES, TILE_CELLS, muralArt, paintedTileNumbers, paintedTiles, tileCells } from '../src/core/mural';

const game = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, stage: Math.floor(i / 10) + 1 }));
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

describe('mural (#92)', () => {
  it('is a square of 100 tiles of 4×4 cells', () => {
    expect(MURAL_TILES).toBe(100);
    expect(MURAL_CELLS).toBe(MURAL_SIDE * TILE_CELLS);
  });

  it('draws a different picture for each of the five universes, in paint colours, white and ink only', () => {
    const arts = [1, 2, 3, 4, 5].map(muralArt);
    for (const art of arts) {
      expect(art).toHaveLength(MURAL_CELLS);
      for (const row of art) expect(row).toMatch(new RegExp(`^[RYBOGPWK]{${MURAL_CELLS}}$`));
      // A real picture, not a flat colour: several colours, none taking almost all of it.
      const counts = new Map<string, number>();
      for (const c of art.join('')) counts.set(c, (counts.get(c) ?? 0) + 1);
      expect(counts.size).toBeGreaterThanOrEqual(5);
      expect(Math.max(...counts.values())).toBeLessThan(MURAL_CELLS * MURAL_CELLS * 0.7);
    }
    expect(new Set(arts.map((a) => a.join(''))).size).toBe(5);
  });

  it('is the same picture every time, and reuses the pictures past universe 5', () => {
    expect(muralArt(2)).toBe(muralArt(2));
    expect(muralArt(6)).toEqual(muralArt(1));
    expect(muralArt(0)).toEqual(muralArt(1));
  });

  it('cuts a tile out of the picture, row by row', () => {
    const art = muralArt(3);
    expect(tileCells(3, 0)).toEqual(art.slice(0, 4).map((r) => [...r.slice(0, 4)]));
    expect(tileCells(3, 11)).toEqual(art.slice(4, 8).map((r) => [...r.slice(4, 8)]));
    expect(tileCells(3, 99)).toEqual(art.slice(36, 40).map((r) => [...r.slice(36, 40)]));
  });

  it('paints the tile of each completed level of the universe, plus the first one as a gift', () => {
    const levels = game(300);
    expect(paintedTileNumbers(paintedTiles(levels, [], 1))).toEqual([1]);
    expect(paintedTileNumbers(paintedTiles(levels, [1, 2, 5], 1))).toEqual([1, 2, 5]);
    expect(paintedTileNumbers(paintedTiles(levels, [2, 3], 1))).toEqual([1, 2, 3]);
    // Universe 2: level 101 is tile 1, level 150 tile 50.
    const done = [...range(1, 100), 102, 150];
    expect(paintedTileNumbers(paintedTiles(levels, done, 2))).toEqual([1, 2, 50]);
    // Completed levels of other universes paint nothing here.
    expect(paintedTileNumbers(paintedTiles(levels, done, 1))).toEqual(range(1, 100));
    expect(paintedTiles(levels, done, 2)).toHaveLength(MURAL_TILES);
  });

  it('leaves the mural of a closed universe empty, without even the gift tile', () => {
    const levels = game(300);
    expect(paintedTileNumbers(paintedTiles(levels, range(1, 99), 2))).toEqual([]);
    expect(paintedTileNumbers(paintedTiles(levels, [...range(1, 99), 101, 102], 2))).toEqual([]);
    expect(paintedTileNumbers(paintedTiles(levels, range(1, 100), 2))).toEqual([1]);
    expect(paintedTileNumbers(paintedTiles(levels, [], 9))).toEqual([]);
  });

  it('keeps the tiles of levels a universe does not have yet empty', () => {
    const levels = game(150); // universe 2 has 50 levels so far
    const painted = paintedTiles(levels, range(1, 150), 2);
    expect(paintedTileNumbers(painted)).toEqual(range(1, 50));
  });
});
