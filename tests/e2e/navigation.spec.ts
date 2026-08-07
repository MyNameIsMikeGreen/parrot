import { expect, test } from '@playwright/test';

test.describe('navigation', () => {
  test('moves between the links page and the blog', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('navigation').getByRole('link', { name: 'Blog' }).click();
    await expect(page).toHaveURL('/blog');

    await page.getByRole('navigation').getByRole('link', { name: 'Links' }).click();
    await expect(page).toHaveURL('/');
  });

  test('returns to the links page from the site name', async ({ page }) => {
    await page.goto('/blog');

    await page.getByRole('banner').getByRole('link', { name: 'Mike Green' }).click();

    await expect(page).toHaveURL('/');
  });

  test('marks the links page as current', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('navigation').getByRole('link', { name: 'Links' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('offers a skip link for keyboard users', async ({ page }, testInfo) => {
    // WebKit only tabs to links when macOS full keyboard access is enabled, so
    // the keyboard journey is verified on Chromium alone.
    test.skip(
      testInfo.project.name !== 'chromium',
      'WebKit does not tab to links by default',
    );

    await page.goto('/');

    await page.keyboard.press('Tab');

    const skipLink = page.getByRole('link', { name: 'Skip to content' });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  test('recovers from a wrong address via the 404 page', async ({ page }) => {
    await page.goto('/no-such-page');

    await page.getByRole('link', { name: /home page/i }).click();

    await expect(page).toHaveURL('/');
  });
});

test.describe('page metadata', () => {
  const pages = [
    { path: '/', canonical: 'https://www.mikegreen.net/' },
    { path: '/blog', canonical: 'https://www.mikegreen.net/blog' },
  ];

  for (const { path, canonical } of pages) {
    test(`describes ${path} for search engines and link previews`, async ({ page }) => {
      await page.goto(path);

      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        canonical,
      );
      await expect(page.locator('meta[name="description"]')).not.toHaveAttribute(
        'content',
        '',
      );
      await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
    });
  }

  test('allows search engines to index the site', async ({ request }) => {
    const response = await request.get('/robots.txt');

    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('Allow: /');
  });
});
