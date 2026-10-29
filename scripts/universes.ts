import type { UniverseInfo } from '../src/core/universes';

/**
 * The universes of epic #87, one entry per universe that has stages (validateUniverses). A universe is a theme for a
 * run of STAGES_PER_UNIVERSE stages: which stages and levels it holds, and whether it is complete, come from the
 * stage files. npm run gen:levels writes this list to src/levels/universes.json for the game.
 */
export const UNIVERSE_SPECS: UniverseInfo[] = [
  { id: 1, key: 'atelier', color: 'R', maxCanvas: 14 },
  { id: 2, key: 'nature', color: 'G', maxCanvas: 14 },
];
