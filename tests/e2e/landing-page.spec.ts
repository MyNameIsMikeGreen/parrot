import { expect, test } from '@playwright/test';

test.describe('landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('introduces the site owner', async ({ page }) => {
    await expect(page).toHaveTitle('Mike Green | Software Engineer | UK');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mike Green');
    await expect(page.getByRole('banner').getByText('Software Engineer')).toBeVisible();
  });

  test('links to GitHub', async ({ page }) => {
    const card = page.getByRole('link', { name: /GitHub/ }).first();

    await expect(card).toHaveAttribute('href', 'https://github.com/MyNameIsMikeGreen');
    await expect(card.locator('.link-card__icon svg')).toBeVisible();
    await expect(card).toContainText('Software Projects');
  });

  test('links to LinkedIn', async ({ page }) => {
    const card = page.getByRole('link', { name: /LinkedIn/ });

    await expect(card).toHaveAttribute(
      'href',
      'https://uk.linkedin.com/in/MyNameIsMikeGreen',
    );
    await expect(card.locator('.link-card__icon svg')).toBeVisible();
    await expect(card).toContainText('Networking');
  });

  test('links to Platypus', async ({ page }) => {
    const card = page.getByRole('link', { name: /Platypus/ });

    await expect(card).toHaveAttribute('href', 'http://pi:8001');
    await expect(card).toContainText('Recipes');
    await expect(card.locator('.link-card__icon svg')).toBeVisible();
  });

  test('links to Jellyfin', async ({ page }) => {
    const card = page.getByRole('link', { name: /Jellyfin/ });

    await expect(card).toHaveAttribute('href', 'http://pi:8096');
    await expect(card).toContainText('Streaming Media');
    await expect(card.locator('.link-card__icon svg')).toBeVisible();
  });

  test('links to Home Assistant', async ({ page }) => {
    const card = page.getByRole('link', { name: /Home Assistant/ });

    await expect(card).toHaveAttribute('href', 'http://pi:8123');
    await expect(card).toContainText('Home Automation');
    await expect(card.locator('.link-card__icon svg')).toBeVisible();
  });

  test('links to Zigbee2MQTT', async ({ page }) => {
    const card = page.getByRole('link', { name: /Zigbee2MQTT/ });

    await expect(card).toHaveAttribute('href', 'http://pi:8080');
    await expect(card).toContainText('Zigbee Devices');
    await expect(card.locator('.link-card__icon svg')).toBeVisible();
  });

  test('separates what a visitor can open from what only works at home', async ({
    page,
  }) => {
    const publicSection = page.getByRole('region', { name: 'Around the web' });
    const homeSection = page.getByRole('region', { name: 'On my home network' });

    await expect(publicSection).toBeVisible();
    await expect(publicSection).toContainText('Public profiles');
    await expect(homeSection).toBeVisible();
    await expect(homeSection).toContainText('Private projects');

    await expect(publicSection.getByRole('link')).toHaveText([/GitHub/, /LinkedIn/]);
    await expect(homeSection.getByRole('link')).toHaveText([
      /Platypus/,
      /Jellyfin/,
      /Home Assistant/,
      /Zigbee2MQTT/,
    ]);
  });

  test('warns about every private service, and only those', async ({ page }) => {
    // Announced to screen readers, because tabbing between links skips the
    // section heading that explains it visually.
    for (const name of [/Platypus/, /Jellyfin/, /Home Assistant/, /Zigbee2MQTT/]) {
      await expect(page.getByRole('link', { name })).toContainText(
        'Private network only',
      );
    }

    for (const name of [/GitHub/, /LinkedIn/]) {
      await expect(page.getByRole('link', { name }).first()).not.toContainText(
        'Private network only',
      );
    }

    await expect(page.locator('.link-card--private')).toHaveCount(4);
  });

  test('gives every link a name, a description and some artwork', async ({ page }) => {
    const cards = page.locator('.link-card');
    await expect(cards).toHaveCount(6);

    for (const card of await cards.all()) {
      await expect(card.locator('.link-card__name')).not.toBeEmpty();
      await expect(card.locator('.link-card__description')).not.toBeEmpty();
      // Inlined line art, never an empty space.
      await expect(card.locator('.link-card__icon svg')).toHaveCount(1);
    }
  });

  test('does not mention the decommissioned Pelican service', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Pelican');
  });

  test('shows a copyright notice covering the current year', async ({ page }) => {
    const year = new Date().getFullYear();

    await expect(page.getByRole('contentinfo')).toContainText(
      `© Copyright 2020-${year} Mike Green`,
    );
  });

  test('links to its own source code', async ({ page }) => {
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: /source code/i }),
    ).toHaveAttribute('href', 'https://github.com/MyNameIsMikeGreen/parrot');
  });

  test('opens outbound links without leaking the referrer window', async ({ page }) => {
    for (const link of await page.locator('.link-card').all()) {
      await expect(link).toHaveAttribute('rel', /noopener/);
      await expect(link).toHaveAttribute('rel', /noreferrer/);
    }
  });
});
