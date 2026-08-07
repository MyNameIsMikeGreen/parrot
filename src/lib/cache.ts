/**
 * How long blog content may be cached.
 *
 * Blog pages are rendered per request, so caching is what keeps the site fast
 * and keeps GitHub's rate limit out of reach. The same freshness window has to
 * be applied in two places — on the responses this site sends, and on the
 * requests it makes to GitHub — so it is defined once here.
 *
 * These are deployment-independent product decisions rather than environment
 * configuration, so they belong in version control where they are typed,
 * reviewed and testable. See `docs/architecture.md`.
 */

/** How long a cached copy is considered fresh. */
export const CACHE_TTL_SECONDS = 300;

/**
 * How long a stale copy may still be served while a fresh one is fetched in the
 * background. Keeps short GitHub outages invisible to visitors.
 */
export const STALE_WHILE_REVALIDATE_SECONDS = 3600;

/**
 * `Cache-Control` for blog responses.
 *
 * `max-age=0` keeps browsers honest so a visitor's own refresh is never stale,
 * while `s-maxage` lets Cloudflare serve everyone else from the edge.
 */
export const BLOG_CACHE_CONTROL = [
  'public',
  'max-age=0',
  `s-maxage=${CACHE_TTL_SECONDS}`,
  `stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`,
].join(', ');
