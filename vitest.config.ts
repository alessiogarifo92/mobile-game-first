import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // The pure part of the playtest harness (#68) is held to the same bar as the rules.
      include: ['src/core/**', 'scripts/playtest/{telemetry,saves,turn,jsonSchema}.ts'],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: { lines: 97, functions: 97, branches: 95, statements: 97 },
    },
  },
});
