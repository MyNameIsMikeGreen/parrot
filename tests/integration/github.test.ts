import { describe, expect, it } from 'vitest';

import { getPost, listPosts } from '../../src/lib/blog';

/**
 * These tests talk to the real GitHub API and the real blog repository, so they
 * are excluded from `npm test` and run separately via `npm run test:integration`.
 *
 * Their job is to catch changes at GitHub's end — a moved endpoint, a changed
 * response shape, a renamed branch — that the stubbed unit and end-to-end tests
 * cannot see. They assert on shape rather than on content, so publishing or
 * editing a post never breaks the build.
 *
 * GitHub allows 60 unauthenticated API requests per hour per IP. Set
 * `GITHUB_TOKEN` in the environment to raise that limit.
 */

const options = { token: process.env['GITHUB_TOKEN'] };

describe('the live blog repository', () => {
  it('publishes at least one post', async () => {
    const posts = await listPosts(options);

    expect(posts.length).toBeGreaterThan(0);
  });

  it('gives every post a usable title, slug and source link', async () => {
    const posts = await listPosts(options);

    for (const post of posts) {
      expect(post.title.trim()).not.toBe('');
      expect(post.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(post.path).toMatch(/^posts\/.+\.md$/);
      expect(post.sourceUrl).toContain(
        'https://github.com/MyNameIsMikeGreen/blog/blob/master/posts/',
      );
    }
  });

  it('gives every post a unique slug', async () => {
    const posts = await listPosts(options);
    const slugs = posts.map((post) => post.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('renders the first post as sanitised HTML', async () => {
    const [summary] = await listPosts(options);
    expect(summary).toBeDefined();

    const post = await getPost(summary!.slug, options);

    expect(post).not.toBeNull();
    expect(post!.title).toBe(summary!.title);
    expect(post!.html).not.toBe('');
    expect(post!.html).not.toContain('<script');
    // The title becomes the page's `<h1>`, so it must not repeat in the body.
    expect(post!.html).not.toContain('<h1');
  });

  it('has no post at a made-up address', async () => {
    await expect(getPost('this-post-does-not-exist', options)).resolves.toBeNull();
  });
});
