import { expect, test } from '@playwright/test';

/**
 * Exercises the blog end to end against a stub repository (see
 * `tests/e2e/stub-github.ts`), covering fetching, slugging, sanitising,
 * rendering, routing and failure handling.
 */

const testingPost = {
  title: 'Testing Is Simple',
  slug: 'testing-is-simple',
};

const awkwardlyNamedPost = {
  title: "Connecting To Don't Panic",
  slug: 'connecting-to-dont-panic',
};

test.describe('blog listing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog');
  });

  test('lists every published post', async ({ page }) => {
    await expect(page).toHaveTitle('Blog | Mike Green');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Blog');

    await expect(page.locator('.post-list__item')).toHaveCount(3);
  });

  test('titles posts using their heading rather than their filename', async ({
    page,
  }) => {
    await expect(
      page.getByRole('link', { name: testingPost.title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: awkwardlyNamedPost.title, exact: true }),
    ).toBeVisible();
  });

  test('links to each post using a lowercase slug', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: testingPost.title, exact: true }),
    ).toHaveAttribute('href', `/blog/${testingPost.slug}`);
    await expect(
      page.getByRole('link', { name: awkwardlyNamedPost.title, exact: true }),
    ).toHaveAttribute('href', `/blog/${awkwardlyNamedPost.slug}`);
  });

  test('ignores files that are not top-level posts', async ({ page }) => {
    await expect(page.locator('.post-list')).not.toContainText('README');
    await expect(page.locator('.post-list')).not.toContainText('Not Published');
    await expect(page.locator('.post-list')).not.toContainText('Overview');
  });

  test('marks the blog as the current page in the navigation', async ({ page }) => {
    await expect(
      page.getByRole('navigation').getByRole('link', { name: 'Blog' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('still lists a post whose contents cannot be read', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: 'Unreadable Post', exact: true }),
    ).toHaveAttribute('href', '/blog/unreadable-post');
  });
});

test.describe('unavailable blog', () => {
  test('explains the problem instead of showing a broken page', async ({ page }) => {
    const response = await page.goto('/blog/unreadable-post');

    expect(response?.status()).toBe(503);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Post unavailable');
    await expect(page.locator('main')).toContainText('try again');
  });
});

test.describe('blog post', () => {
  test('opens a post from the listing', async ({ page }) => {
    await page.goto('/blog');
    await page.getByRole('link', { name: testingPost.title, exact: true }).click();

    await expect(page).toHaveURL(`/blog/${testingPost.slug}`);
    await expect(page).toHaveTitle(`${testingPost.title} | Mike Green`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(testingPost.title);
  });

  test('renders the markdown body as HTML', async ({ page }) => {
    await page.goto(`/blog/${testingPost.slug}`);

    await expect(page.locator('.post__body')).toContainText(
      'Testing does not have to be complicated.',
    );
    await expect(page.locator('.post__body pre')).toContainText('npm test');
  });

  test('renders a post whose title uses setext heading syntax', async ({ page }) => {
    await page.goto(`/blog/${awkwardlyNamedPost.slug}`);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      awkwardlyNamedPost.title,
    );
    await expect(page.locator('.post__body code')).toHaveText('stunnel');
  });

  test('promotes the post title to the only top-level heading', async ({ page }) => {
    await page.goto(`/blog/${testingPost.slug}`);

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(
      'Define The Boundary',
    );
    await expect(page.getByRole('heading', { level: 3 })).toHaveText('A Detail');
  });

  test('rewrites relative images to the source repository', async ({ page }) => {
    await page.goto(`/blog/${testingPost.slug}`);

    await expect(page.locator('.post__body img')).toHaveAttribute(
      'src',
      /\/posts\/Overview\.png$/,
    );
  });

  test('rewrites relative links to the source repository', async ({ page }) => {
    await page.goto(`/blog/${awkwardlyNamedPost.slug}`);

    await expect(page.getByRole('link', { name: 'Related' })).toHaveAttribute(
      'href',
      /\/posts\/Testing_Is_Simple\.md$/,
    );
  });

  test('links back to the post source on GitHub', async ({ page }) => {
    await page.goto(`/blog/${testingPost.slug}`);

    await expect(
      page.getByRole('link', { name: /source of this post/i }),
    ).toHaveAttribute(
      'href',
      'https://github.com/MyNameIsMikeGreen/blog/blob/master/posts/Testing_Is_Simple.md',
    );
  });
});

test.describe('blog URLs', () => {
  test('redirects legacy filename-style URLs to the canonical slug', async ({ page }) => {
    const response = await page.goto('/blog/Testing_Is_Simple');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(`/blog/${testingPost.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(testingPost.title);
  });

  test('redirects legacy URLs containing punctuation', async ({ page }) => {
    await page.goto("/blog/Connecting_To_Don't_Panic");

    await expect(page).toHaveURL(`/blog/${awkwardlyNamedPost.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      awkwardlyNamedPost.title,
    );
  });

  test('returns 404 for a post that does not exist', async ({ page }) => {
    const response = await page.goto('/blog/definitely-not-a-real-post');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Post not found');
    await expect(page.getByRole('link', { name: /browse all posts/i })).toBeVisible();
  });

  test('returns 404 for an unknown page', async ({ page }) => {
    const response = await page.goto('/no-such-page');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  });
});
