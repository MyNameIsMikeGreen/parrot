import { describe, expect, it } from 'vitest';

import { outboundLinks, site } from '../../src/lib/site';
import {
  blogPostingSchema,
  breadcrumbSchema,
  profilePageSchema,
  profileUrls,
  serialiseJsonLd,
} from '../../src/lib/structured-data';

const origin = 'https://www.mikegreen.net';

describe('profileUrls', () => {
  it('lists the owner’s profiles elsewhere on the web', () => {
    expect(profileUrls()).toContain('https://github.com/MyNameIsMikeGreen');
    expect(profileUrls()).toContain('https://uk.linkedin.com/in/MyNameIsMikeGreen');
  });

  it('never claims a private service as a profile', () => {
    const privateHrefs = outboundLinks
      .filter((link) => link.privateNetworkOnly)
      .map((link) => link.href);

    for (const href of privateHrefs) {
      expect(profileUrls()).not.toContain(href);
    }
  });
});

describe('profilePageSchema', () => {
  const schema = profilePageSchema(origin);
  const person = schema['mainEntity'] as Record<string, unknown>;

  it('describes the landing page as a profile of its owner', () => {
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('ProfilePage');
    expect(person['@type']).toBe('Person');
  });

  it('names the owner, which is the one property Google requires', () => {
    expect(person['name']).toBe(site.name);
  });

  it('points at the profiles that belong to the same person', () => {
    expect(person['sameAs']).toEqual(profileUrls());
  });

  it('uses absolute URLs, as structured data requires', () => {
    expect(person['url']).toBe('https://www.mikegreen.net/');
  });
});

describe('blogPostingSchema', () => {
  const post = { title: 'A Post', excerpt: 'The opening words.' };
  const url = 'https://www.mikegreen.net/blog/a-post';

  it('describes the page as a blog posting', () => {
    const schema = blogPostingSchema(post, url, origin);

    expect(schema['@type']).toBe('BlogPosting');
    expect(schema['headline']).toBe('A Post');
    expect(schema['description']).toBe('The opening words.');
    expect(schema['mainEntityOfPage']).toBe(url);
  });

  it('attributes the post to the owner’s profile page', () => {
    const author = blogPostingSchema(post, url, origin)['author'] as Record<
      string,
      unknown
    >;

    expect(author['@type']).toBe('Person');
    expect(author['name']).toBe(site.name);
    expect(author['url']).toBe('https://www.mikegreen.net/');
  });

  it('omits the description rather than inventing one', () => {
    const schema = blogPostingSchema({ title: 'A Post', excerpt: null }, url, origin);

    expect(schema).not.toHaveProperty('description');
  });

  it('keeps the headline within the length Google accepts', () => {
    const title = `${'Extremely Long Title '.repeat(10)}End`;
    const schema = blogPostingSchema({ title, excerpt: null }, url, origin);

    const written = schema['headline'] as string;
    expect(title.length).toBeGreaterThan(110);
    expect(written.length).toBeLessThanOrEqual(110);
    expect(written).toMatch(/\u2026$/);
    expect(written).not.toMatch(/\s\u2026$/);
  });

  it('leaves a title of an ordinary length alone', () => {
    const title = 'How to Connect to an Encrypted Redis Instance Using redis-cli';
    const schema = blogPostingSchema({ title, excerpt: null }, url, origin);

    expect(schema['headline']).toBe(title);
  });
});

describe('breadcrumbSchema', () => {
  const schema = breadcrumbSchema(
    [
      { name: 'Home', path: '/' },
      { name: 'Blog', path: '/blog' },
    ],
    origin,
  );

  it('numbers the trail from one, as Google requires', () => {
    const items = schema['itemListElement'] as Record<string, unknown>[];

    expect(items.map((item) => item['position'])).toEqual([1, 2]);
  });

  it('gives every crumb the name and absolute URL Google requires', () => {
    const items = schema['itemListElement'] as Record<string, unknown>[];

    expect(items[0]).toMatchObject({ name: 'Home', item: 'https://www.mikegreen.net/' });
    expect(items[1]).toMatchObject({
      name: 'Blog',
      item: 'https://www.mikegreen.net/blog',
    });
  });
});

describe('serialiseJsonLd', () => {
  it('emits a single document on its own, not wrapped in an array', () => {
    expect(serialiseJsonLd([{ '@type': 'Person' }])).toBe('{"@type":"Person"}');
  });

  it('emits several documents as an array', () => {
    expect(serialiseJsonLd([{ a: 1 }, { b: 2 }])).toBe('[{"a":1},{"b":2}]');
  });

  // Post titles come from markdown written outside this repository, so a title
  // must not be able to close the script element and inject markup.
  it('escapes angle brackets so a title cannot end the script element', () => {
    const output = serialiseJsonLd([{ headline: 'Breaking </script><img src=x>' }]);

    expect(output).not.toContain('</script>');
    expect(output).not.toContain('<');
    expect(output).not.toContain('>');
  });

  it('still parses back to the original values once escaped', () => {
    const headline = 'Angle < brackets > and & ampersands </script>';
    const parsed = JSON.parse(serialiseJsonLd([{ headline }])) as {
      headline: string;
    };

    expect(parsed.headline).toBe(headline);
  });

  it('escapes line separators that would break the surrounding markup', () => {
    const output = serialiseJsonLd([{ headline: 'a\u2028b\u2029c' }]);

    expect(output).not.toContain('\u2028');
    expect(output).not.toContain('\u2029');
  });
});
