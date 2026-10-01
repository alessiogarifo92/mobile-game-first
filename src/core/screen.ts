import { VIEW } from './layout';

/** Tallest game the layouts are designed for (about 9:21 phones and a bit beyond). */
export const MAX_SCREEN_HEIGHT = 1900;

/**
 * Logical height of the game for a window of the given size: 720 wide, as tall as the window's aspect ratio asks,
 * never below the 1280 the content is designed for. Shorter screens (tablets) are fitted by scaling, not squeezed.
 */
export function screenHeight(windowWidth: number, windowHeight: number): number {
  const aspect = windowHeight / Math.max(1, windowWidth);
  return Math.round(Math.min(MAX_SCREEN_HEIGHT, Math.max(VIEW.height, VIEW.width * aspect)));
}
