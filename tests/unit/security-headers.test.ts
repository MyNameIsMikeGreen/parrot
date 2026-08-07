import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { securityHeaders } from '../../src/lib/security-headers';

const headersFile = fileURLToPath(new URL('../../public/_headers', import.meta.url));

/**
 * Parses a Cloudflare `_headers` file into the headers declared for a rule.
 */
function parseRule(contents: string, rule: string): Record<string, string> {
  const lines = contents.split('\n');
  const start = lines.findIndex((line) => line.trim() === rule);
  expect(start, `expected a "${rule}" rule in public/_headers`).toBeGreaterThan(-1);

  const headers: Record<string, string> = {};
  for (const line of lines.slice(start + 1)) {
    // Indented lines belong to the rule; anything else ends it.
    if (!/^\s+\S/.test(line)) {
      break;
    }
    const separator = line.indexOf(':');
    headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return headers;
}

describe('security headers', () => {
  it('declares the same headers for static assets as for rendered pages', async () => {
    const contents = await readFile(headersFile, 'utf8');

    expect(parseRule(contents, '/*')).toEqual({ ...securityHeaders });
  });

  it('denies scripts, framing and every default source', () => {
    const csp = securityHeaders['Content-Security-Policy'] ?? '';

    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("form-action 'none'");
  });

  it('allows images only from this origin and GitHub content hosts', () => {
    const csp = securityHeaders['Content-Security-Policy'] ?? '';
    const imgSrc = csp
      .split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('img-src'));

    expect(imgSrc).toBe(
      "img-src 'self' https://raw.githubusercontent.com https://camo.githubusercontent.com https://user-images.githubusercontent.com",
    );
  });

  it('does not permit inline styles or scripts', () => {
    const csp = securityHeaders['Content-Security-Policy'] ?? '';

    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
  });

  it('enforces HTTPS for at least a year, including subdomains', () => {
    expect(securityHeaders['Strict-Transport-Security']).toBe(
      'max-age=31536000; includeSubDomains',
    );
  });
});
