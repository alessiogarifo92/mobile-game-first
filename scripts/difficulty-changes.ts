/**
 * What each level makes harder than the one before (#77), as the game announces it. `▶` marks the level where a player
 * going in order is told. Quick and offline, unlike difficulty-report.ts, which prints the same lines among its tables.
 *   npx tsx scripts/difficulty-changes.ts
 */
import levelsJson from '../src/levels/levels.json' with { type: 'json' };
import { changeReport } from '../src/core/difficulty';
import type { LevelDef } from '../src/core/level';

console.log(changeReport(levelsJson as LevelDef[]).join('\n'));
