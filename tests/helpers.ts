import { RED, YELLOW, BLUE, type Primary } from '../src/core/colors';
import { parseLevel, type Level, type LevelDef } from '../src/core/level';

export { RED, YELLOW, BLUE };

export function level(image: string[], columns: [Primary, number][][], extra: Partial<LevelDef> = {}): Level {
  return parseLevel({
    id: 1,
    name: 'test',
    stage: 1,
    image,
    columns: columns.map((c) => c.map(([color, ammo]) => ({ color, ammo }))),
    slots: 3,
    beltCapacity: 3,
    ...extra,
  });
}
