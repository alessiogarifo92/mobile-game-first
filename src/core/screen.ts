import { VIEW } from './layout';

/**
 * Tallest game: 720 x 1700 is about 9:21. Taller screens get side bars instead of a stretched layout, so controls
 * never end up far from the content and a measurement error cannot push them off the visible area.
 */
export const MAX_SCREEN_HEIGHT = 1700;

/**
 * Logical height of the game for a window of the given size: 720 wide, as tall as the window's aspect ratio asks,
 * never below the 1280 the content is designed for. Shorter screens (tablets) are fitted by scaling, not squeezed.
 */
export function screenHeight(windowWidth: number, windowHeight: number): number {
  const aspect = windowHeight / Math.max(1, windowWidth);
  return Math.round(Math.min(MAX_SCREEN_HEIGHT, Math.max(VIEW.height, VIEW.width * aspect)));
}
