import { readdirSync } from 'node:fs';
import type { StageSpec } from './types';

/** `stage-NN.ts` files next to this one, in play order. Add a stage by creating the next stage-NN.ts: nothing else lists it. */
const files = readdirSync(new URL('.', import.meta.url))
  .map((file) => ({ file, n: /^stage-(\d+)\.ts$/.exec(file)?.[1] }))
  .filter((f): f is { file: string; n: string } => f.n !== undefined)
  .sort((a, b) => Number(a.n) - Number(b.n));

/** Stage files in play order (validateStages checks that their numbers run 1..n). */
export const STAGE_SPECS: StageSpec[] = await Promise.all(
  files.map(async ({ file }) => ((await import(`./${file}`)) as { default: StageSpec }).default),
);
