import { securityHeaders } from './lib/security-headers';

import type { MiddlewareHandler } from 'astro';

/**
 * Applies the site's security headers to every response rendered on demand.
 *
 * Prerendered pages are served directly by Cloudflare and never reach this
 * middleware; they are covered by `public/_headers` instead.
 */
export const onRequest: MiddlewareHandler = async (_context, next) => {
  const response = await next();

  for (const [name, value] of Object.entries(securityHeaders)) {
    response.headers.set(name, value);
  }

  return response;
};
