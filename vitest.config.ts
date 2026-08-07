import { defineConfig } from 'vitest/config';

/**
 * Unit tests only. They are fully offline and fast enough to run on every save.
 *
 * `tests/integration` talks to the real GitHub API and has its own config, and
 * `tests/e2e` is run by Playwright.
 */
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      // `site.ts` is plain data with no behaviour to cover.
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/site.ts'],
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
