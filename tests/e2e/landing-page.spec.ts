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

  test('links to the Media Server', async ({ page }) => {
    const card = page.getByRole('link', { name: /Media Server/ });

    await expect(card).toHaveAttribute('href', 'http://pi:8096');
    await expect(card).toContainText('Streaming Media');
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
      /Home Assistant/,
      /Zigbee2MQTT/,
      /Media Server/,
    ]);
  });

  test('warns about every private service, and only those', async ({ page }) => {
    // Announced to screen readers, because tabbing between links skips the
    // section heading that explains it visually.
    for (const name of [/Platypus/, /Home Assistant/, /Zigbee2MQTT/, /Media Server/]) {
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

test.describe('private hostname override', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('is collapsed by default, tucked under the private-network section', async ({
    page,
  }) => {
    const homeSection = page.getByRole('region', { name: 'On my home network' });
    const details = homeSection.locator('.hostname-override__details');

    await expect(details).toBeVisible();
    await expect(details).not.toHaveJSProperty('open', true);
    await expect(page.locator('#hostname-override-input')).toBeHidden();
  });

  test('explains itself through the info button without needing to expand anything', async ({
    page,
  }) => {
    const info = page.getByRole('button', { name: 'What does this do?' });

    await expect(info).toBeVisible();
    await expect(page.locator('#hostname-override-popover')).toContainText(
      /only devices on my home network can resolve/,
    );
  });

  test('expands to reveal the input when its summary is activated', async ({ page }) => {
    await page.locator('.hostname-override__summary').click();

    await expect(page.locator('#hostname-override-input')).toBeVisible();
  });

  test('remembers a custom host across reloads and rewrites private links to use it', async ({
    page,
  }) => {
    await page.locator('.hostname-override__summary').click();
    await page.locator('#hostname-override-input').fill('192.168.1.42');
    await expect(page.locator('#hostname-override-status')).toContainText('192.168.1.42');

    // The links' `href` attributes stay untouched until the moment of a click,
    // so every other visitor's copy of the page is unaffected.
    await expect(page.getByRole('link', { name: /Platypus/ })).toHaveAttribute(
      'href',
      'http://pi:8001',
    );

    let requestedUrl = '';
    await page.route('http://192.168.1.42:8001/', async (route) => {
      requestedUrl = route.request().url();
      await route.abort();
    });
    await page.getByRole('link', { name: /Platypus/ }).click();
    await expect.poll(() => requestedUrl).toBe('http://192.168.1.42:8001/');

    // Persisted, so a fresh visit remembers it without being asked again.
    await page.goto('/');
    await page.locator('.hostname-override__summary').click();
    await expect(page.locator('#hostname-override-input')).toHaveValue('192.168.1.42');
  });

  test('clearing the override restores the default host', async ({ page }) => {
    await page.locator('.hostname-override__summary').click();
    await page.locator('#hostname-override-input').fill('192.168.1.42');
    await page.locator('#hostname-override-clear').click();

    await expect(page.locator('#hostname-override-input')).toHaveValue('');

    await page.reload();
    await page.locator('.hostname-override__summary').click();
    await expect(page.locator('#hostname-override-input')).toHaveValue('');

    let requestedUrl = '';
    await page.route('http://pi:8001/', async (route) => {
      requestedUrl = route.request().url();
      await route.abort();
    });
    await page.getByRole('link', { name: /Platypus/ }).click();
    await expect.poll(() => requestedUrl).toBe('http://pi:8001/');
  });
});
