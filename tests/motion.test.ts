import { describe, expect, it } from 'vitest';
import { REDUCED_MOTION_QUERY, prefersReducedMotion } from '../src/core/motion';

describe('prefersReducedMotion', () => {
  it('follows the media query when there is one', () => {
    expect(prefersReducedMotion({ matches: true })).toBe(true);
    expect(prefersReducedMotion({ matches: false })).toBe(false);
  });

  it('reads a missing matchMedia as no preference', () => {
    expect(prefersReducedMotion(undefined)).toBe(false);
    expect(prefersReducedMotion(null)).toBe(false);
  });

  it('asks for the standard query', () => {
    expect(REDUCED_MOTION_QUERY).toBe('(prefers-reduced-motion: reduce)');
  });
});
