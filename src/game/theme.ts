import { BLUE, GREEN, ORANGE, PURPLE, RED, YELLOW } from '../core/colors';

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
};

/** Colour-blind support: every primary also has a shape. */
export const SYMBOL: Record<number, string> = { [RED]: '●', [YELLOW]: '▲', [BLUE]: '■' };

export function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
