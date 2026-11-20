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

/**
 * #229: `summary` is the centre of a two-line slot (the name and moves line wraps to two lines on a narrow phone, in
 * Italian above all), `stage` the centre of the stage message's own two-line slot below it, so the two never overlap.
 */
const PLAIN: WinPanelLayout = {
  height: 812, picture: 140, pictureSize: 240, summary: 430, stage: 512, card: null, hint: null, progress: 590, next: 652, second: 752,
};

const WITH_REWARD: WinPanelLayout = {
  height: 986,
  picture: 126,
  pictureSize: 180,
  summary: 354,
  stage: 438,
  card: { top: 494, height: 200, jars: 554, jarSize: 84, use: 644 },
  hint: 708,
  progress: 768,
  next: 838,
  second: 932,
};

export function winPanelLayout(withReward: boolean): WinPanelLayout {
  return withReward ? WITH_REWARD : PLAIN;
}

/** The panel's top on a screen `screenHeight` logical units tall: centred. */
export function winPanelTop(layout: WinPanelLayout, screenHeight: number): number {
  return (screenHeight - layout.height) / 2;
}
