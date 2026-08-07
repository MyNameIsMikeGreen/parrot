import { defineConfig, devices } from '@playwright/test';

const port = 8788;
const stubPort = Number(process.env['STUB_GITHUB_PORT'] ?? 8790);
const baseURL = `http://127.0.0.1:${port}`;

/** Base URL of the stub that stands in for GitHub during these tests. */
export const stubGitHubURL = `http://127.0.0.1:${stubPort}`;

/**
 * End-to-end tests run against the real Cloudflare Worker via Wrangler, so they
 * cover routing, on-demand rendering, redirects and response headers exactly as
 * production serves them.
 *
 * Blog content comes from a local stub rather than GitHub, which keeps the suite
 * deterministic and free of API rate limits. `npm run test:integration` covers
 * the real GitHub integration separately.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
  webServer: [
    {
      command: 'node tests/e2e/stub-github.ts',
      url: `${stubGitHubURL}/__health`,
      reuseExistingServer: !process.env['CI'],
      env: { STUB_GITHUB_PORT: String(stubPort) },
      timeout: 30_000,
    },
    {
      // `BLOG_*` are public variables, so Astro inlines them at build time;
      // they must be set for the build, not just for the running Worker.
      command: `npm run build && npx wrangler dev --port ${port} --ip 127.0.0.1`,
      url: baseURL,
      reuseExistingServer: !process.env['CI'],
      env: {
        BLOG_API_BASE_URL: stubGitHubURL,
        BLOG_RAW_BASE_URL: stubGitHubURL,
      },
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
