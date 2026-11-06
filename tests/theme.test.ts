import { describe, expect, it } from 'vitest';
import { THEME, blend, contrast, luminance } from '../src/game/theme';

describe('contrast helpers', () => {
  it('match the WCAG reference values', () => {
    expect(luminance(0xffffff)).toBeCloseTo(1);
    expect(luminance(0x000000)).toBe(0);
    expect(contrast(0x000000, 0xffffff)).toBeCloseTo(21);
    expect(contrast(0xffffff, 0x000000)).toBeCloseTo(21);
    expect(contrast(0x777777, 0x777777)).toBe(1);
  });

  it('blend lays a colour over another at an opacity', () => {
    expect(blend(0xffffff, 0x000000, 1)).toBe(0xffffff);
    expect(blend(0xffffff, 0x000000, 0)).toBe(0x000000);
    expect(blend(0xff0000, 0x0000ff, 0.5)).toBe(0x800080);
  });
});

describe('board tokens stay legible (#176, P5)', () => {
  // The ice cover is THEME.ice at 60 % over an empty pixel (ui.drawIce, ICE_ALPHA).
  const cover = blend(THEME.ice, THEME.emptyPixel, 0.6);

  it('the old white cracks on ice were the problem: barely above 1:1', () => {
    expect(contrast(THEME.white, cover)).toBeLessThan(1.5);
  });

  it('ice rim and cracks reach 4:1 on the cover and 3:1 on the paper and on an empty pixel', () => {
    expect(contrast(THEME.iceDark, cover)).toBeGreaterThanOrEqual(4);
    expect(contrast(THEME.iceDark, THEME.paper)).toBeGreaterThanOrEqual(3);
    expect(contrast(THEME.iceDark, THEME.emptyPixel)).toBeGreaterThanOrEqual(3);
  });

  it('the stone keeps its outline: the dark bevel is at least 3:1 on the paper and on an empty pixel', () => {
    expect(contrast(THEME.stoneDark, THEME.paper)).toBeGreaterThanOrEqual(3);
    expect(contrast(THEME.stoneDark, THEME.emptyPixel)).toBeGreaterThanOrEqual(3);
  });
});
