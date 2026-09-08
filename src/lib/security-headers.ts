/**
 * Security headers sent with every response.
 *
 * Cloudflare serves prerendered pages straight from its asset store without
 * invoking the Worker, so these headers have to be declared in two places:
 *
 *  - `public/_headers` covers static assets.
 *  - `src/middleware.ts` covers pages rendered on demand.
 *
 * This module is the single source of truth for both, and
 * `tests/unit/security-headers.test.ts` fails the build if `public/_headers`
 * ever drifts away from it.
 */

/**
 * Content Security Policy.
 *
 * The site ships no client-side JavaScript, so scripts are denied outright.
 * Blog images are served from GitHub's raw content hosts, which are therefore
 * the only permitted external origins.
 */
const contentSecurityPolicy = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "script-src 'none'",
  "object-src 'none'",
  "style-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "img-src 'self' https://raw.githubusercontent.com https://camo.githubusercontent.com https://user-images.githubusercontent.com",
].join('; ');

export const securityHeaders: Readonly<Record<string, string>> = Object.freeze({
  'Content-Security-Policy': contentSecurityPolicy,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': [
    'accelerometer=()',
    'autoplay=()',
    'browsing-topics=()',
    'camera=()',
    'display-capture=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'midi=()',
    'payment=()',
    'usb=()',
  ].join(', '),
});
