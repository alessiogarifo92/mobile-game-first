import type { GenerateOptions } from '../../src/core/generator';
import type { StageContent } from '../../src/core/stages';

/** Notes for the curve rules (src/core/curve.ts): they never change the generated level, so they are not hashed. */
export interface CurveNote {
  /** Why this boss may stay easier than the rest of its stage (rule 2). */
  easyBoss?: string;
}

/** One level in a stage file: everything the generator needs except the id, stage and boss flag. */
export type LevelSpec = Omit<GenerateOptions, 'id' | 'stage' | 'boss'> & { curve?: CurveNote };

export type StageSpec = StageContent<LevelSpec>;
