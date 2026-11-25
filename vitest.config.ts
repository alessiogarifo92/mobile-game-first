import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // The pure part of the playtest harness (#68) and the release checks of the APK workflow are held to the same
      // bar as the rules.
      include: ['src/core/**', 'scripts/playtest/{telemetry,saves,turn,jsonSchema,aggregate}.ts', 'scripts/release/checks.ts'],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        lines: 97, functions: 97, branches: 95, statements: 97,
        // The difficulty label (#72) is what the map and the CI trust: every line and branch of it is tested.
        'src/core/difficulty.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        // What the player is shown of it (#73): the marks and the comfort rule are tested line by line.
        'src/core/difficultyMark.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
      },
    },
  },
});
