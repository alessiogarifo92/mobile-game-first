import { describe, expect, it } from 'vitest';
import { PANEL_ARM_MS, panelArmed } from '../src/core/panelInput';

describe('panel input arming (#161)', () => {
  it('ignores taps right after the panel appears', () => {
    expect(panelArmed(1000, 1000)).toBe(false);
    expect(panelArmed(1000 + PANEL_ARM_MS - 1, 1000)).toBe(false);
  });
  it('accepts taps once the delay has passed', () => {
    expect(panelArmed(1000 + PANEL_ARM_MS, 1000)).toBe(true);
    expect(panelArmed(5000, 1000)).toBe(true);
  });
  it('is between 300 and 500 ms', () => {
    expect(PANEL_ARM_MS).toBeGreaterThanOrEqual(300);
    expect(PANEL_ARM_MS).toBeLessThanOrEqual(500);
  });
  it('honours a custom delay', () => {
    expect(panelArmed(150, 0, 100)).toBe(true);
    expect(panelArmed(50, 0, 100)).toBe(false);
  });
});
