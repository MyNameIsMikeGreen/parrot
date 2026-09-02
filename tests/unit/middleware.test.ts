import { afterEach, describe, expect, it, vi } from 'vitest';

import { securityHeaders } from '../../src/lib/security-headers';
import { onRequest } from '../../src/middleware';

import type { APIContext, MiddlewareNext } from 'astro';

/**
 * `onRequest` takes its context from Astro at runtime; tests only need a
 * `next` that returns a bare response, since headers are all it inspects.
 * The handler always returns a `Response` in this codebase, never `void`.
 */
async function runMiddleware(next: MiddlewareNext): Promise<Response> {
  return (await onRequest({} as APIContext, next)) as Response;
}

describe('security header middleware', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('applies every security header outside dev mode', async () => {
    vi.stubEnv('DEV', false);

    const response = await runMiddleware(() => Promise.resolve(new Response('ok')));

    for (const [name, value] of Object.entries(securityHeaders)) {
      expect(response.headers.get(name)).toBe(value);
    }
  });

  it('skips every security header under astro dev', async () => {
    vi.stubEnv('DEV', true);

    const response = await runMiddleware(() => Promise.resolve(new Response('ok')));

    for (const name of Object.keys(securityHeaders)) {
      expect(response.headers.get(name)).toBeNull();
    }
  });
});
