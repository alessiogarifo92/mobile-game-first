/**
 * Buttons of the win and jam panels ignore taps for a short while after the panel appears (#161): the buttons sit above
 * the slot row, so a tap meant for a slot, or one still in flight when the level ends, must not press them.
 */
export const PANEL_ARM_MS = 450;

/** True once a panel shown at `shownAt` accepts taps at `now` (both in ms). */
export function panelArmed(now: number, shownAt: number, armMs: number = PANEL_ARM_MS): boolean {
  return now - shownAt >= armMs;
}

/** #151: the jam panel says "+1 slot" works once per attempt, and once it is spent explains why only "Retry" is left. */
export function jamHintKey(extraSlotUsed: boolean): 'jam.once' | 'jam.used' {
  return extraSlotUsed ? 'jam.used' : 'jam.once';
}
