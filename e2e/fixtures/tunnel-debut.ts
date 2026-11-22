import type { GenerateOptions } from '../../src/core/generator';

/**
 * Debut of the blind lanes (#99), the way level 341 will introduce it: a small heart and a tunnel over six lanes of the
 * belt, in the "very easy" band so the level teaches without punishing. `tunnel-debut.json` is this spec's output, checked
 * by tests/tunnel.test.ts and served by the e2e build `--mode tunnel-debut` (vite.config.ts) until universe 4 ships.
 */
export const TUNNEL_DEBUT: GenerateOptions = {
  id: 341,
  name: 'heart',
  stage: 35,
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
  seed: 341,
  special: { tunnel: 6 },
  winRate: [0.9, 1],
};
