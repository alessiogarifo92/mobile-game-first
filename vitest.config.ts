import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**'],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: { lines: 97, functions: 97, branches: 95, statements: 97 },
    },
  },
});
