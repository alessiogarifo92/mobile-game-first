/**
 * Where the win panel puts each part, as offsets from the panel's top (#153). Without a stage reward the panel keeps
 * its earlier layout; with one, the picture shrinks and a card shows the new bucket style on three jars, with a
 * "use it now" button, between the stage line and the universe progress. Shared by the scene and its published state,
 * so tests tap what is drawn.
 */
export interface WinPanelLayout {
  height: number;
  /** Top of the painted picture and the side of the square it fits in. */
  picture: number;
  pictureSize: number;
  summary: number;
  stage: number;
  /** The reward card: its top and height, the centre line of its jars, their size, and its "use it now" button. */
  card: { top: number; height: number; jars: number; jarSize: number; use: number } | null;
  /** Where the album hint hangs from (null: it hangs under the stage line, as before #153). */
  hint: number | null;
  progress: number;
  next: number;
  second: number;
}

const PLAIN: WinPanelLayout = {
  height: 760, picture: 140, pictureSize: 240, summary: 412, stage: 460, card: null, hint: null, progress: 538, next: 600, second: 700,
};

const WITH_REWARD: WinPanelLayout = {
  height: 940,
  picture: 126,
  pictureSize: 180,
  summary: 338,
  stage: 392,
  card: { top: 448, height: 200, jars: 508, jarSize: 84, use: 598 },
  hint: 662,
  progress: 722,
  next: 792,
  second: 886,
};

export function winPanelLayout(withReward: boolean): WinPanelLayout {
  return withReward ? WITH_REWARD : PLAIN;
}

/** The panel's top on a screen `screenHeight` logical units tall: centred. */
export function winPanelTop(layout: WinPanelLayout, screenHeight: number): number {
  return (screenHeight - layout.height) / 2;
}
