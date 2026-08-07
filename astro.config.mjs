// @ts-check
import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.mikegreen.net',
  adapter: cloudflare({
    // Optimise images at build time into static files rather than through the
    // paid Cloudflare Images binding at request time.
    imageService: 'compile',
  }),
  output: 'static',
  trailingSlash: 'never',
  // The site has no logged-in users and stores nothing per visitor. Without
  // this, the Cloudflare adapter provisions a KV namespace for sessions that
  // would never be read.
  session: false,
  build: {
    // Keep every stylesheet in its own file. Inlined `<style>` blocks would
    // force the Content Security Policy to allow `style-src 'unsafe-inline'`.
    inlineStylesheets: 'never',
  },
  env: {
    schema: {
      // Optional. Raises the GitHub API rate limit from 60 to 5,000 requests per
      // hour. Set with `npx wrangler secret put GITHUB_TOKEN`; never commit it.
      GITHUB_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      // Where blog posts are read from. These are read when the site is built,
      // and are overridden by the end-to-end tests so they can run against a
      // local stub instead of the real GitHub.
      BLOG_API_BASE_URL: envField.string({
        context: 'server',
        access: 'public',
        default: 'https://api.github.com',
      }),
      BLOG_RAW_BASE_URL: envField.string({
        context: 'server',
        access: 'public',
        default: 'https://raw.githubusercontent.com',
      }),
    },
  },
});
