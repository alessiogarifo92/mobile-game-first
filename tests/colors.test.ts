import { describe, expect, it } from 'vitest';
import { BLUE, BROWN, GREEN, ORANGE, PURPLE, RED, YELLOW, accepts, codeOf, isComplete, isPrimary, missingPrimaries, primariesOf } from '../src/core/colors';

describe('colors', () => {
  it('secondaries are the mix of two primaries', () => {
    expect(ORANGE).toBe(RED | YELLOW);
    expect(GREEN).toBe(YELLOW | BLUE);
    expect(PURPLE).toBe(RED | BLUE);
    expect(primariesOf(PURPLE)).toEqual([RED, BLUE]);
  });

  it('a pixel accepts only primaries it needs and has not received', () => {
    expect(accepts(ORANGE, 0, RED)).toBe(true);
    expect(accepts(ORANGE, RED, YELLOW)).toBe(true);
    expect(accepts(ORANGE, RED, RED)).toBe(false); // same color twice
    expect(accepts(ORANGE, 0, BLUE)).toBe(false); // wrong color
    expect(accepts(0, 0, RED)).toBe(false); // no pixel
  });

  it('completion requires every primary of the target', () => {
    expect(isComplete(GREEN, YELLOW)).toBe(false);
    expect(isComplete(GREEN, GREEN)).toBe(true);
    expect(isComplete(0, 0)).toBe(true);
  });

  it('identifies primaries and codes', () => {
    expect(isPrimary(RED)).toBe(true);
    expect(isPrimary(ORANGE)).toBe(false);
    expect(codeOf(PURPLE)).toBe('P');
    expect(codeOf(BROWN)).toBe('K');
    expect(codeOf(8)).toBe('.');
  });
});

describe('missingPrimaries (#149)', () => {
  it('a started mixed pixel needs the other half of its mix', () => {
    expect(missingPrimaries(ORANGE, RED)).toEqual([YELLOW]);
    expect(missingPrimaries(GREEN, BLUE)).toEqual([YELLOW]);
    expect(missingPrimaries(PURPLE, BLUE)).toEqual([RED]);
  });

  it('a started brown pixel needs one or two primaries, in R, Y, B order', () => {
    expect(missingPrimaries(BROWN, RED)).toEqual([YELLOW, BLUE]);
    expect(missingPrimaries(BROWN, RED | BLUE)).toEqual([YELLOW]);
  });

  it('nothing to mark on a complete, untouched, primary or empty pixel', () => {
    expect(missingPrimaries(ORANGE, ORANGE)).toEqual([]);
    expect(missingPrimaries(BROWN, BROWN)).toEqual([]);
    expect(missingPrimaries(ORANGE, 0)).toEqual([]);
    expect(missingPrimaries(RED, 0)).toEqual([]);
    expect(missingPrimaries(0, 0)).toEqual([]);
  });
});
