import type { Band } from './difficulty';

/**
 * What the player is shown about a level's difficulty (#73, direction A "Pochi segni", docs/design/73-difficolta-ui.md).
 * Only the exceptions carry a mark: a boss ("★ Boss", whatever its band: 24 of 27 bosses are hard, so two marks would
 * repeat each other) and a hard level (◆). Easy and normal levels show nothing, so "Easy" is never read on a level that was lost.
 * The band itself comes from `difficulty.json` through `levelDifficulty`; nothing here recomputes it.
 */
export type LevelMark = 'boss' | 'hard';

export function levelMark(band: Band | undefined, boss: boolean): LevelMark | null {
  if (boss) return 'boss';
  return band === 'hard' ? 'hard' : null;
}

/** Band of each level id from what `gen:levels` stored; a level that was never measured has none and shows no mark. */
export function bandsById(levels: readonly { id: number; band: Band }[]): ReadonlyMap<number, Band> {
  return new Map(levels.map((l) => [l.id, l.band]));
}

/**
 * The jam panel's line of comfort: only on a hard level, and only once the free hint is offered (three defeats in a row,
 * `hintOffered` in progress.ts), so it rests on the counter the save already has and needs no new field.
 */
export function comfortOffered(band: Band | undefined, hintOffered: boolean): boolean {
  return band === 'hard' && hintOffered;
}
