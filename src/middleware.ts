import { securityHeaders } from './lib/security-headers';

import type { MiddlewareHandler } from 'astro';

/**
 * Applies the site's security headers to every response rendered on demand.
 *
 * Prerendered pages are served directly by Cloudflare and never reach this
 * middleware; they are covered by `public/_headers` instead.
 *
 * `astro dev` never sees these headers. Its live-reload machinery injects
 * page styles as inline `<style>` tags and relies on inline scripts and
 * `eval`, none of which the production CSP allows — applying it here would
 * leave every page unstyled for no security benefit, since the dev server
 * isn't the thing being protected. Use `npm run build && npm run preview`
 * (see `docs/development.md`) to check the site under the real headers.
 */
export const onRequest: MiddlewareHandler = async (_context, next) => {
  const response = await next();

  if (import.meta.env.DEV) {
    return response;
  }

  for (const [name, value] of Object.entries(securityHeaders)) {
    response.headers.set(name, value);
  }

  return response;
};
