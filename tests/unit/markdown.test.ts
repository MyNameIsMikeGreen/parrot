import { describe, expect, it } from 'vitest';

import { readTitle, renderMarkdown } from '../../src/lib/markdown';

const baseUrl = 'https://raw.githubusercontent.com/owner/repo/master/posts/';

const render = (markdown: string) => renderMarkdown(markdown, { baseUrl });

describe('readTitle', () => {
  it('reads an ATX heading', () => {
    expect(readTitle('# My Post\n\nBody text.')).toBe('My Post');
  });

  it('reads a setext heading', () => {
    expect(readTitle('My Post\n=======\n\nBody text.')).toBe('My Post');
  });

  it('ignores headings below the top level', () => {
    expect(readTitle('## Section\n\nBody text.')).toBeNull();
  });

  it('returns null when the document has no heading', () => {
    expect(readTitle('Just some prose.')).toBeNull();
  });

  it('flattens inline formatting in the heading', () => {
    expect(readTitle('# A `code` and *emphasised* title')).toBe(
      'A code and emphasised title',
    );
  });

  it('ignores a top-level heading that is not the first thing in the post', () => {
    expect(readTitle('An intro paragraph.\n\n# Not The Title\n\nMore text.')).toBeNull();
  });

  it('looks past leading content that renders nothing', () => {
    expect(readTitle('<!-- a comment -->\n\n# My Post\n\nBody.')).toBe('My Post');
    expect(readTitle('[ref]: https://example.com\n\n# My Post\n\nBody.')).toBe('My Post');
  });
});

describe('renderMarkdown', () => {
  it('extracts the title and removes it from the body', async () => {
    const { title, html } = await render('# My Post\n\nSome body text.');

    expect(title).toBe('My Post');
    expect(html).not.toContain('My Post');
    expect(html).toContain('<p>Some body text.</p>');
  });

  it('leaves a mid-document top-level heading in the body', async () => {
    const { title, html } = await render(
      'An intro paragraph.\n\n# Not The Title\n\nMore text.',
    );

    expect(title).toBeNull();
    expect(html).toContain('<p>An intro paragraph.</p>');
    expect(html).toContain('Not The Title');
  });

  it('falls back to a null title when there is no heading', async () => {
    const { title, html } = await render('Some body text.');

    expect(title).toBeNull();
    expect(html).toContain('Some body text.');
  });

  it('renders remaining headings starting at level two', async () => {
    const { html } = await render('# Title\n\n# Section\n\n## Subsection');

    expect(html).toContain('<h2>Section</h2>');
    expect(html).toContain('<h3>Subsection</h3>');
    expect(html).not.toContain('<h1>');
  });

  it('does not shift headings that already start at level two', async () => {
    const { html } = await render('# Title\n\n## Section\n\n### Subsection');

    expect(html).toContain('<h2>Section</h2>');
    expect(html).toContain('<h3>Subsection</h3>');
  });

  it('resolves relative image sources against the base URL', async () => {
    const { html } = await render('# Title\n\n![Diagram](Overview.png)');

    expect(html).toContain(`src="${baseUrl}Overview.png"`);
  });

  it('leaves absolute image sources alone', async () => {
    const { html } = await render('# Title\n\n![Remote](https://example.com/a.png)');

    expect(html).toContain('src="https://example.com/a.png"');
  });

  it('resolves relative links and marks outbound links as safe', async () => {
    const { html } = await render('# Title\n\n[Other post](Other_Post.md)');

    expect(html).toContain(`href="${baseUrl}Other_Post.md"`);
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it('renders GitHub flavoured markdown tables', async () => {
    const { html } = await render('# Title\n\n| A | B |\n| - | - |\n| 1 | 2 |\n');

    expect(html).toContain('<table>');
    expect(html).toContain('<td>1</td>');
  });

  it('wraps tables so a wide one cannot widen the page on a phone', async () => {
    const { html } = await render('# Title\n\n| A | B |\n| - | - |\n| 1 | 2 |\n');

    expect(html).toContain('<div class="table-scroll"><table>');
    expect(html).toContain('</table></div>');
  });

  it('wraps every table in a document', async () => {
    const { html } = await render(
      '# Title\n\n| A |\n| - |\n| 1 |\n\nBetween.\n\n| B |\n| - |\n| 2 |\n',
    );

    expect(html.match(/class="table-scroll"/g)).toHaveLength(2);
  });

  it('leaves a document without tables untouched', async () => {
    const { html } = await render('# Title\n\nJust a paragraph.\n');

    expect(html).not.toContain('table-scroll');
  });

  it('renders fenced code blocks', async () => {
    const { html } = await render('# Title\n\n```\nnpm run build\n```\n');

    expect(html).toContain('<pre><code>npm run build');
  });
});

describe('renderMarkdown sanitisation', () => {
  it('drops embedded script tags', async () => {
    const { html } = await render(
      '# Title\n\n<script>alert("xss")</script>\n\nSafe text.',
    );

    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(');
    expect(html).toContain('Safe text.');
  });

  it('drops inline event handlers', async () => {
    const { html } = await render('# Title\n\n<img src="x" onerror="alert(1)">\n');

    expect(html).not.toContain('onerror');
    expect(html).not.toContain('alert(1)');
  });

  it('drops iframes and objects', async () => {
    const { html } = await render(
      '# Title\n\n<iframe src="https://evil.example"></iframe>\n<object data="x"></object>\n',
    );

    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<object');
  });

  it('strips javascript: URLs from links', async () => {
    const { html } = await render('# Title\n\n[Click](javascript:alert(1))');

    expect(html).not.toContain('javascript:');
  });

  it('strips data: URLs from images', async () => {
    const { html } = await render(
      '# Title\n\n![x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
    );

    expect(html).not.toContain('data:text/html');
  });

  it('strips style attributes that could be used to overlay the page', async () => {
    const { html } = await render(
      '# Title\n\n<div style="position:fixed;inset:0">Overlay</div>',
    );

    expect(html).not.toContain('position:fixed');
  });

  it('escapes HTML entities in text content', async () => {
    const { html } = await render('# Title\n\nA < B and C > D');

    expect(html).toContain('&#x3C;');
    expect(html).not.toContain('<p>A < B');
  });
});

describe('excerpt', () => {
  it('summarises a post with its opening paragraph', async () => {
    const { excerpt } = await render('# Title\n\nThe first paragraph.\n\nThe second.');

    expect(excerpt).toBe('The first paragraph.');
  });

  it('flattens links and emphasis into plain text', async () => {
    const { excerpt } = await render(
      '# Title\n\nSee [the docs](https://example.com) for *more* detail.',
    );

    expect(excerpt).toBe('See the docs for more detail.');
  });

  it('collapses line breaks within the paragraph', async () => {
    const { excerpt } = await render('# Title\n\nOne line\nand another.');

    expect(excerpt).toBe('One line and another.');
  });

  it('skips leading content that is not prose', async () => {
    const { excerpt } = await render('# Title\n\n- A list item\n\nThe real opening.');

    expect(excerpt).toBe('The real opening.');
  });

  it('shortens a long opening at a word boundary', async () => {
    const word = 'alpha ';
    const { excerpt } = await render(`# Title\n\n${word.repeat(60)}`);

    expect(excerpt).not.toBeNull();
    expect(excerpt!.length).toBeLessThanOrEqual(155);
    expect(excerpt).toMatch(/alpha\u2026$/);
  });

  it('leaves a short opening untouched', async () => {
    const { excerpt } = await render('# Title\n\nShort and sweet.');

    expect(excerpt).toBe('Short and sweet.');
  });

  it('returns null for a post with no prose', async () => {
    const { excerpt } = await render('# Title Only');

    expect(excerpt).toBeNull();
  });
});
