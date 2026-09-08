import { expect, test } from '@playwright/test';

import { securityHeaders } from '../../src/lib/security-headers';

/**
 * The site must protect visitors identically whether a page is served straight
 * from Cloudflare's asset store or rendered on demand by the Worker, which are
 * two different code paths.
 */
const staticPage = '/';
const renderedPage = '/blog';

for (const path of [staticPage, renderedPage]) {
  test.describe(`security headers on ${path}`, () => {
    for (const [name, value] of Object.entries(securityHeaders)) {
      test(`sets ${name}`, async ({ request }) => {
        const response = await request.get(path);

        expect(response.headers()[name.toLowerCase()]).toBe(value);
      });
    }
  });
}

test.describe('client-side attack surface', () => {
  for (const path of [staticPage, renderedPage, '/no-such-page']) {
    test(`ships no JavaScript on ${path}`, async ({ page }) => {
      await page.goto(path);

      // `application/ld+json` is structured data for search engines, not code:
      // the HTML standard classifies it as a data block and never executes it.
      // Everything else must be absent.
      await expect(page.locator('script:not([type="application/ld+json"])')).toHaveCount(
        0,
      );
      await expect(page.locator('script[src]')).toHaveCount(0);
    });

    test(`uses no inline styles on ${path}`, async ({ page }) => {
      await page.goto(path);

      // Inline styles would force the CSP to allow `style-src 'unsafe-inline'`.
      await expect(page.locator('style')).toHaveCount(0);
      await expect(page.locator('[style]')).toHaveCount(0);
    });
  }

  test('strips dangerous markup from blog post content', async ({ page }) => {
    // This post deliberately contains a `<script>`, an `onerror` handler and a
    // `javascript:` link, none of which must survive sanitisation.
    await page.goto('/blog/connecting-to-dont-panic');

    await expect(page.locator('.post__body')).toBeVisible();
    await expect(page.locator('.post__body script')).toHaveCount(0);
    await expect(page.locator('.post__body iframe')).toHaveCount(0);
    await expect(page.locator('.post__body [onerror]')).toHaveCount(0);
    await expect(page.locator('.post__body a[href^="javascript:"]')).toHaveCount(0);
    expect(await page.evaluate(() => 'pwned' in window)).toBe(false);
  });
});

test.describe('caching', () => {
  test('lets Cloudflare cache rendered blog pages briefly', async ({ request }) => {
    const response = await request.get('/blog');

    expect(response.headers()['cache-control']).toContain('s-maxage=');
  });

  test('caches fingerprinted assets immutably', async ({ page, request }) => {
    await page.goto('/');
    const asset = await page.locator('link[rel="stylesheet"]').getAttribute('href');

    const response = await request.get(asset ?? '');

    expect(response.headers()['cache-control']).toContain('immutable');
  });
});
