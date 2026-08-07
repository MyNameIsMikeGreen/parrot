import { BlogUnavailableError, listPosts } from '../lib/blog';
import { blogOptions } from '../lib/blog-config';
import { BLOG_CACHE_CONTROL } from '../lib/cache';

import type { APIRoute } from 'astro';

/**
 * XML sitemap, built when the sitemap is requested.
 *
 * The set of blog URLs is only known by asking GitHub, so this cannot be a file
 * written at build time without the sitemap going stale every time a post is
 * published. `public/robots.txt` points search engines here.
 *
 * `changefreq` and `priority` are deliberately absent: Google documents that it
 * ignores both. `lastmod` is absent too, because the GitHub tree API does not
 * report when a file last changed, and Google only honours the value when it is
 * verifiably accurate.
 */
export const prerender = false;

/** Pages that exist regardless of whether the blog can be reached. */
const staticPaths = ['/', '/blog'];

export const GET: APIRoute = async ({ site, url }) => {
  const origin = site ?? new URL(url.origin);

  let postPaths: string[] = [];
  try {
    const posts = await listPosts(blogOptions());
    postPaths = posts.map((post) => `/blog/${post.slug}`);
  } catch (error) {
    if (!(error instanceof BlogUnavailableError)) {
      throw error;
    }
    // A sitemap listing only the pages we are sure about is more useful to a
    // crawler than an error, so the posts are simply left out this time.
    console.error('Could not list blog posts for the sitemap', error);
  }

  const locations = [...staticPaths, ...postPaths].map(
    (path) => new URL(path, origin).href,
  );

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locations.map((location) => `  <url>\n    <loc>${escapeXml(location)}</loc>\n  </url>`).join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': BLOG_CACHE_CONTROL,
    },
  });
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
