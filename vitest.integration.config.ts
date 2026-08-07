import { defineConfig } from 'vitest/config';

/**
 * Integration tests hit the real GitHub API, so they are kept out of the default
 * test run and given a longer timeout and a retry to absorb network wobbles.
 *
 * Run them with `npm run test:integration`.
 */
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    retry: 1,
    // Sequential, to stay inside GitHub's unauthenticated rate limit.
    fileParallelism: false,
  },
});
