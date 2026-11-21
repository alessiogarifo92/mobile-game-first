import type { GenerateOptions } from '../../src/core/generator';

/**
 * Debut of the coloured film (#98), the way level 301 will introduce it: a small heart, two pixels under a film, in
 * the "very easy" band so the level teaches without punishing. `film-debut.json` is this spec's output, checked by
 * tests/film.test.ts and served by the e2e build `--mode film-debut` (vite.config.ts) until universe 4 ships.
 */
export const FILM_DEBUT: GenerateOptions = {
  id: 301,
  name: 'heart',
  stage: 31,
  image: [
    '.RR..RR.',
    'RRRRRRRR',
    'RRRYYRRR',
    '.RRRRRR.',
    '..RRRR..',
    '...BB...',
    '...BB...',
    '..BBBB..',
  ],
  columns: 3,
  ammoChunk: 4,
  slots: 3,
  beltCapacity: 3,
  seed: 301,
  special: { film: 2 },
  winRate: [0.95, 1],
};
