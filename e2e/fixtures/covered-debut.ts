import type { GenerateOptions } from '../../src/core/generator';

/**
 * Debut of covered buckets (#97), the way level 241 will introduce them: a small balloon, a quarter of the buckets
 * covered and none at the front, in the "very easy" band. `covered-debut.json` is this spec's output, checked by
 * tests/covered.test.ts and served by the e2e build `--mode covered-debut` (vite.config.ts) until universe 3 ships.
 */
export const COVERED_DEBUT: GenerateOptions = {
  id: 241,
  name: 'balloon',
  stage: 25,
  image: [
    '..RRRR..',
    '.RRRRRR.',
    '.RRYYRR.',
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
  seed: 241,
  special: { covered: 0.25 },
  winRate: [0.95, 1],
};
