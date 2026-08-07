import { BLOG_API_BASE_URL, BLOG_RAW_BASE_URL, GITHUB_TOKEN } from 'astro:env/server';

import { defaultBlogSource } from './blog';

import type { BlogOptions } from './blog';

/**
 * Builds the blog client options from the Worker's environment.
 *
 * Kept apart from `blog.ts` so that module stays free of Astro-specific imports
 * and can be unit tested directly.
 */
export function blogOptions(): BlogOptions {
  return {
    source: {
      ...defaultBlogSource,
      apiBaseUrl: BLOG_API_BASE_URL,
      rawBaseUrl: BLOG_RAW_BASE_URL,
    },
    token: GITHUB_TOKEN,
  };
}
