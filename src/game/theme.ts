import { BLUE, BROWN, GREEN, ORANGE, PURPLE, RED, YELLOW } from '../core/colors';

/** Design tokens of direction A "Gouache Studio" (docs/design/README.md). The only source of style. */
export const THEME = {
  bg: 0xfff6e9,
  bgCss: '#FFF6E9',
  paper: 0xfffdf8,
  emptyPixel: 0xf1e7d8,
  belt: 0xd9cbb4,
  beltDark: 0xc4b498,
  /** Hidden-pixel cover: dark enough for a white "?" to reach 4.5:1 contrast. */
  hidden: 0x756a55,
  ink: 0x2b2d42,
  inkCss: '#2B2D42',
  subCss: '#66637A',
  white: 0xffffff,
  ice: 0xcfe8f7,
  /** Stone block (#95): cool grey, apart from the warm hidden cover; bevel and speckles carry it without colour. */
  stone: 0xa3a6ad,
  stoneDark: 0x5f626b,
  /** Reward gold: the 'gold' skin, finished-universe skins. */
  gold: 0xffd166,
  font: 'ui-rounded, "Nunito", "Fredoka", system-ui, sans-serif',
  type: { xs: 24, sm: 28, md: 36, lg: 48, xl: 64 },
  space: { xs: 8, sm: 16, md: 24, lg: 32, xl: 48 },
  radius: { cell: 6, jar: 14, panel: 24 },
} as const;

export const PAINT: Record<number, number> = {
  [RED]: 0xe63946,
  [YELLOW]: 0xffb703,
  [BLUE]: 0x3a86ff,
  [ORANGE]: 0xfb8500,
  [GREEN]: 0x43aa8b,
  [PURPLE]: 0x8e5bd9,
  /** Warm gouache brown (#94): much darker than orange and warmer than purple, so the three never blur together. */
  [BROWN]: 0x8b5a3c,
};

/** Colour-blind support: every primary also has a shape. */
export const SYMBOL: Record<number, string> = { [RED]: '●', [YELLOW]: '▲', [BLUE]: '■' };

export function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * Colour pairs [main, accent] of the universe skins (#92): the universe's own colours (earned by finishing it) and the
 * ten stage variants. A variant only swaps the palette; every colour is a token above.
 */
export const SKIN_COLORS: { own: readonly [number, number]; variants: readonly (readonly [number, number])[] } = {
  own: [THEME.gold, THEME.ink],
  variants: [
    [THEME.white, THEME.gold],
    [PAINT[RED]!, THEME.white],
    [PAINT[YELLOW]!, THEME.ink],
    [PAINT[BLUE]!, THEME.white],
    [PAINT[ORANGE]!, THEME.white],
    [PAINT[GREEN]!, THEME.white],
    [PAINT[PURPLE]!, THEME.white],
    [THEME.ink, THEME.gold],
    [THEME.gold, PAINT[RED]!],
    [THEME.ice, PAINT[BLUE]!],
  ],
};

/** Mural cell codes (core/mural.ts) to colours: the six paints, white and ink. */
export const MURAL_PAINT: Record<string, number> = {
  R: PAINT[RED]!, Y: PAINT[YELLOW]!, B: PAINT[BLUE]!, O: PAINT[ORANGE]!, G: PAINT[GREEN]!, P: PAINT[PURPLE]!, W: THEME.white, K: THEME.ink,
};
