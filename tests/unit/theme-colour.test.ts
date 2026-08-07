import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * The `theme-color` meta tags colour the browser's own chrome on mobile, so
 * they have to match the page behind them. The values are written twice, once
 * in the stylesheet and once in the layout, because a meta tag cannot read a
 * CSS custom property. These tests fail if the two ever drift apart.
 */

const layoutFile = fileURLToPath(
  new URL('../../src/layouts/BaseLayout.astro', import.meta.url),
);
const stylesheetFile = fileURLToPath(
  new URL('../../src/styles/global.css', import.meta.url),
);

async function themeColour(scheme: 'light' | 'dark'): Promise<string> {
  const layout = await readFile(layoutFile, 'utf8');
  const pattern = new RegExp(
    `content="(#[0-9a-f]{3,8})"\\s+media="\\(prefers-color-scheme: ${scheme}\\)"`,
    'i',
  );
  const match = layout.match(pattern);

  expect(match, `no ${scheme} theme-color meta tag in the layout`).not.toBeNull();
  return match![1]!.toLowerCase();
}

async function backgroundColours(): Promise<{ light: string; dark: string }> {
  const stylesheet = await readFile(stylesheetFile, 'utf8');
  const match = stylesheet.match(
    /--colour-background:\s*light-dark\(\s*(#[0-9a-f]{3,8})\s*,\s*(#[0-9a-f]{3,8})\s*\)/i,
  );

  expect(match, 'no --colour-background declaration in the stylesheet').not.toBeNull();
  return { light: match![1]!.toLowerCase(), dark: match![2]!.toLowerCase() };
}

describe('theme colour', () => {
  it('matches the page background in light mode', async () => {
    expect(await themeColour('light')).toBe((await backgroundColours()).light);
  });

  it('matches the page background in dark mode', async () => {
    expect(await themeColour('dark')).toBe((await backgroundColours()).dark);
  });
});
