import type { StageSpec } from './types';
import stage01 from './stage-01';
import stage02 from './stage-02';

/** Stage files in play order. Add a new stage by creating stage-NN.ts and listing it here. */
export const STAGE_SPECS: StageSpec[] = [stage01, stage02];
