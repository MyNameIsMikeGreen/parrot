import { expect, test } from '@playwright/test';

/**
 * Roughly half of visitors arrive on a phone, so every page has to work at
 * narrow widths as well as wide ones.
 *
 * The most common way a page fails on a phone is a single wide element — a
 * table, a code block, a long URL — forcing the whole page to scroll sideways.
 * These tests set the viewport explicitly so they check the same widths
 * regardless of which browser project runs them.
 */

/** 320px is the narrowest width still in common use; 390px is a current iPhone. */
const narrowViewports = [
  { name: '320px', width: 320, height: 640 },
  { name: '390px', width: 390, height: 844 },
];

const pages = [
  { name: 'landing page', path: '/' },
  { name: 'blog listing', path: '/blog' },
  { name: 'blog post', path: '/blog/testing-is-simple' },
  { name: 'not found page', path: '/no-such-page' },
];

for (const viewport of narrowViewports) {
  test.describe(`at ${viewport.name}`, () => {
    for (const { name, path } of pages) {
      test(`the ${name} does not scroll sideways`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(path);

        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );

        expect(overflow).toBe(0);
      });
    }
  });
}

test.describe('wide content on a narrow screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/blog/testing-is-simple');
  });

  test('scrolls a wide table within its own container', async ({ page }) => {
    const container = page.locator('.table-scroll');
    await expect(container).toBeVisible();

    // The table is wider than its container, and the container absorbs it.
    const { scrolls, containedWithinPage } = await container.evaluate((element) => ({
      scrolls: element.scrollWidth > element.clientWidth,
      containedWithinPage: element.clientWidth <= document.documentElement.clientWidth,
    }));

    expect(scrolls).toBe(true);
    expect(containedWithinPage).toBe(true);
  });

  test('keeps the table a table for screen readers', async ({ page }) => {
    // The wrapper must not cost the table its semantics.
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Runner' })).toBeVisible();
  });

  test('scrolls a wide code block within its own container', async ({ page }) => {
    const contained = await page
      .locator('.post__body pre')
      .evaluate((element) => element.clientWidth <= document.documentElement.clientWidth);

    expect(contained).toBe(true);
  });

  test('wraps a long URL rather than stretching the page', async ({ page }) => {
    const contained = await page
      .locator('.post__body')
      .evaluate((element) => element.scrollWidth <= document.documentElement.clientWidth);

    expect(contained).toBe(true);
  });

  test('keeps images inside the screen', async ({ page }) => {
    const contained = await page
      .locator('.post__body img')
      .evaluate((element) => element.clientWidth <= document.documentElement.clientWidth);

    expect(contained).toBe(true);
  });
});

test.describe('mobile usability', () => {
  test('tells the browser to use the device width', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      /width=device-width/,
    );
  });

  test('stacks the link cards into one column on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const cards = page.locator('.link-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(1);

    const firstBox = await cards.first().boundingBox();
    const secondBox = await cards.nth(1).boundingBox();

    // Stacked, not side by side.
    expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height - 1);
  });

  test('gives navigation links a comfortable tap target', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    for (const link of await page.getByRole('navigation').getByRole('link').all()) {
      const box = await link.boundingBox();
      // Below roughly 24px a link becomes fiddly to tap accurately.
      expect(box!.height).toBeGreaterThanOrEqual(24);
    }
  });

  test('keeps body text legible without zooming', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/blog/testing-is-simple');

    const fontSize = await page
      .locator('.post__body p')
      .first()
      .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));

    expect(fontSize).toBeGreaterThanOrEqual(16);
  });
});
