import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

/**
 * Covers the parts of the site that only search engines and social networks
 * read, which are easy to break without noticing because nothing on screen
 * changes when they do.
 */

/** The address the site is published at, regardless of where it is being served from. */
const productionOrigin = 'https://www.mikegreen.net';

const testingPost = {
  slug: 'testing-is-simple',
  title: 'Testing Is Simple',
  opening: 'Testing does not have to be complicated.',
};

/** Reads the JSON-LD documents embedded in the page. */
async function structuredData(page: Page): Promise<Record<string, unknown>[]> {
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();

  return blocks.flatMap((block) => {
    const parsed: unknown = JSON.parse(block);
    return (Array.isArray(parsed) ? parsed : [parsed]) as Record<string, unknown>[];
  });
}

function ofType(
  documents: Record<string, unknown>[],
  type: string,
): Record<string, unknown> | undefined {
  return documents.find((document) => document['@type'] === type);
}

const metaContent = (page: Page, selector: string) =>
  page.locator(selector).getAttribute('content');

test.describe('sitemap', () => {
  test('is published where robots.txt says it is', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    const declared = /^Sitemap:\s*(\S+)$/m.exec(await robots.text())?.[1];

    expect(declared, 'robots.txt should point at a sitemap').toBeTruthy();
    expect(declared).toBe(`${productionOrigin}/sitemap.xml`);

    // The declared address is the production one, so request the same path here.
    const sitemap = await request.get(new URL(declared!).pathname);
    expect(sitemap.status()).toBe(200);
    expect(sitemap.headers()['content-type']).toContain('xml');
  });

  test('lists the landing page, the blog and every post', async ({ request }) => {
    const body = await (await request.get('/sitemap.xml')).text();

    expect(body).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(body).toContain(`<loc>${productionOrigin}/</loc>`);
    expect(body).toContain(`<loc>${productionOrigin}/blog</loc>`);
    expect(body).toContain(`<loc>${productionOrigin}/blog/${testingPost.slug}</loc>`);
    expect(body).toContain(
      `<loc>${productionOrigin}/blog/connecting-to-dont-panic</loc>`,
    );
  });

  test('advertises published addresses rather than the server it runs on', async ({
    request,
  }) => {
    const body = await (await request.get('/sitemap.xml')).text();

    expect(body).not.toContain('127.0.0.1');
    expect(body).not.toContain('localhost');
  });

  test('omits the values Google documents as ignored', async ({ request }) => {
    const body = await (await request.get('/sitemap.xml')).text();

    expect(body).not.toContain('<changefreq>');
    expect(body).not.toContain('<priority>');
  });
});

test.describe('structured data', () => {
  test('describes the landing page as a profile of its owner', async ({ page }) => {
    await page.goto('/');
    const profile = ofType(await structuredData(page), 'ProfilePage');

    expect(profile).toBeDefined();
    const person = profile!['mainEntity'] as Record<string, unknown>;
    expect(person['name']).toBe('Mike Green');
    expect(person['sameAs']).toContain('https://github.com/MyNameIsMikeGreen');
  });

  test('never claims a private service as a public profile', async ({ page }) => {
    await page.goto('/');
    const profile = ofType(await structuredData(page), 'ProfilePage');
    const person = profile!['mainEntity'] as Record<string, unknown>;

    expect(JSON.stringify(person['sameAs'])).not.toContain('pi:');
  });

  test('describes a blog post and its place in the site', async ({ page }) => {
    await page.goto(`/blog/${testingPost.slug}`);
    const documents = await structuredData(page);

    const posting = ofType(documents, 'BlogPosting');
    expect(posting?.['headline']).toBe(testingPost.title);
    expect(posting?.['description']).toBe(testingPost.opening);
    expect(posting?.['mainEntityOfPage']).toBe(
      `${productionOrigin}/blog/${testingPost.slug}`,
    );

    const breadcrumbs = ofType(documents, 'BreadcrumbList');
    const trail = breadcrumbs?.['itemListElement'] as Record<string, unknown>[];
    expect(trail.map((crumb) => crumb['name'])).toEqual([
      'Home',
      'Blog',
      testingPost.title,
    ]);
  });

  test('publishes structured data no browser will execute', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');

    // A strict Content-Security-Policy is in force; the data block must survive
    // it, and must not be treated as code.
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
});

test.describe('page metadata', () => {
  test('gives each post a description taken from its own words', async ({ page }) => {
    await page.goto(`/blog/${testingPost.slug}`);

    expect(await metaContent(page, 'meta[name="description"]')).toBe(testingPost.opening);
  });

  test('points every page at its published address', async ({ page }) => {
    for (const path of ['/', '/blog', `/blog/${testingPost.slug}`]) {
      await page.goto(path);

      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBe(`${productionOrigin}${path}`);
      expect(await metaContent(page, 'meta[property="og:url"]')).toBe(canonical);
    }
  });

  test('describes a post as an article and other pages as a website', async ({
    page,
  }) => {
    await page.goto(`/blog/${testingPost.slug}`);
    expect(await metaContent(page, 'meta[property="og:type"]')).toBe('article');

    await page.goto('/');
    expect(await metaContent(page, 'meta[property="og:type"]')).toBe('website');
  });

  test('carries the properties link previews rely on', async ({ page }) => {
    await page.goto('/');

    expect(await metaContent(page, 'meta[property="og:site_name"]')).toBe('Mike Green');
    expect(await metaContent(page, 'meta[property="og:locale"]')).toBe('en_GB');
    expect(await metaContent(page, 'meta[property="og:title"]')).toBeTruthy();
    expect(await metaContent(page, 'meta[property="og:description"]')).toBeTruthy();
  });

  test('colours the browser chrome to match the page', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
  });
});

test.describe('indexing', () => {
  for (const path of ['/', '/blog', `/blog/${testingPost.slug}`]) {
    test(`invites search engines to index ${path}`, async ({ page }) => {
      await page.goto(path);

      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    });
  }

  for (const path of ['/no-such-page', '/blog/no-such-post']) {
    test(`keeps ${path} out of search results`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(404);
      expect(await metaContent(page, 'meta[name="robots"]')).toContain('noindex');
    });
  }

  test('keeps a post that could not be loaded out of search results', async ({
    page,
  }) => {
    // Serving a "temporarily unavailable" page under a real post's address is
    // exactly the sort of thin content that gets indexed by mistake.
    const response = await page.goto('/blog/unreadable-post');

    expect(response?.status()).toBe(503);
    expect(await metaContent(page, 'meta[name="robots"]')).toContain('noindex');
  });
});

test.describe('outbound links', () => {
  test('claims the owner’s own profiles with rel="me"', async ({ page }) => {
    await page.goto('/');

    for (const name of ['GitHub', 'LinkedIn']) {
      const rel = await page
        .locator('.link-card')
        .filter({ hasText: name })
        .getAttribute('rel');

      expect(rel).toContain('me');
    }
  });

  test('does not send crawlers after services they cannot reach', async ({ page }) => {
    await page.goto('/');

    const cards = page.locator('.link-card--private');
    await expect(cards).toHaveCount(3);

    for (const card of await cards.all()) {
      expect(await card.getAttribute('rel')).toContain('nofollow');
    }
  });

  test('keeps outbound links from leaking the referring page', async ({ page }) => {
    await page.goto('/');

    for (const card of await page.locator('.link-card').all()) {
      const rel = await card.getAttribute('rel');
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    }
  });
});
