import type { GenerateOptions } from '../../src/core/generator';
import type { StageContent } from '../../src/core/stages';

/** One level in a stage file: everything the generator needs except the id, stage and boss flag. */
export type LevelSpec = Omit<GenerateOptions, 'id' | 'stage' | 'boss'>;

export type StageSpec = StageContent<LevelSpec>;
