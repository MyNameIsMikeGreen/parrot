import { describe, expect, it } from 'vitest';

import {
  BLOG_CACHE_CONTROL,
  CACHE_TTL_SECONDS,
  STALE_WHILE_REVALIDATE_SECONDS,
} from '../../src/lib/cache';

describe('blog cache policy', () => {
  it('lets shared caches serve the page but never lets a browser hold it', () => {
    expect(BLOG_CACHE_CONTROL).toContain('public');
    expect(BLOG_CACHE_CONTROL).toContain('max-age=0');
  });

  it('builds the header from the configured lifetimes', () => {
    expect(BLOG_CACHE_CONTROL).toContain(`s-maxage=${CACHE_TTL_SECONDS}`);
    expect(BLOG_CACHE_CONTROL).toContain(
      `stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`,
    );
  });

  it('allows a stale copy to outlive a fresh one, so outages stay invisible', () => {
    expect(STALE_WHILE_REVALIDATE_SECONDS).toBeGreaterThan(CACHE_TTL_SECONDS);
  });

  it('keeps a new post appearing within a few minutes', () => {
    expect(CACHE_TTL_SECONDS).toBeGreaterThan(0);
    expect(CACHE_TTL_SECONDS).toBeLessThanOrEqual(600);
  });
});
