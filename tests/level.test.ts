import { describe, expect, it } from 'vitest';
import { LevelError, buildLanes, paintNeeds, parseImage, parseLevel } from '../src/core/level';
import { BLUE, RED, YELLOW, level } from './helpers';

describe('parseImage', () => {
  it('parses codes into target masks', () => {
    const { width, height, targets } = parseImage(['R.', 'OP']);
    expect([width, height]).toEqual([2, 2]);
    expect(targets).toEqual([RED, 0, RED | YELLOW, RED | BLUE]);
  });

  it.each([
    [[], 'no rows'],
    [[''], 'rows are empty'],
    [['RR', 'R'], 'row 1 has length 1'],
    [['RX'], 'unknown color code "X"'],
    [['..'], 'no pixels'],
  ])('rejects invalid image %j', (image, message) => {
    expect(() => parseImage(image as string[])).toThrow(message);
  });
});

describe('parseLevel', () => {
  it('counts paint needs per primary', () => {
    expect(paintNeeds(parseImage(['OG', 'PB']).targets)).toEqual({ 1: 2, 2: 2, 4: 3 });
  });

  it('accepts a level whose ammo matches the image', () => {
    const l = level(['RO'], [[[RED, 2]], [[YELLOW, 1]]]);
    expect(l.width).toBe(2);
    expect(l.targets).toEqual([RED, RED | YELLOW]);
  });

  it('rejects ammo that does not match the needs', () => {
    expect(() => level(['RR'], [[[RED, 1]]])).toThrow(LevelError);
    expect(() => level(['R'], [[[RED, 1], [BLUE, 1]]])).toThrow('ammo for color 4');
  });

  it.each([
    [{ slots: 0 }, 'slots'],
    [{ beltCapacity: 0 }, 'beltCapacity'],
    [{ columns: [] }, 'no shooter columns'],
    [{ columns: [[{ color: 3, ammo: 1 }]] }, 'not a primary'],
    [{ columns: [[{ color: 1, ammo: 0 }]] }, 'positive integer'],
    [{ columns: [[{ color: 1, ammo: 1.5 }]] }, 'positive integer'],
  ])('rejects invalid settings %j', (patch, message) => {
    const def = { id: 1, name: 't', image: ['R'], columns: [[{ color: 1, ammo: 1 }]], slots: 1, beltCapacity: 1 };
    expect(() => parseLevel({ ...def, ...patch } as never)).toThrow(message);
  });
});

describe('buildLanes', () => {
  it('walks the perimeter: bottom, right, top, left, scanning inward', () => {
    // 2x2 grid, cells: 0 1 / 2 3
    expect(buildLanes(2, 2)).toEqual([
      [2, 0], [3, 1], // bottom side, looking up
      [3, 2], [1, 0], // right side, bottom→top, looking left
      [1, 3], [0, 2], // top side, right→left, looking down
      [0, 1], [2, 3], // left side, top→bottom, looking right
    ]);
  });

  it('has 2W+2H lanes', () => {
    expect(buildLanes(5, 3)).toHaveLength(16);
  });
});
