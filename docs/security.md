# Security

Parrot is a public website that renders content from a separate repository. That makes its
security story short but specific, and this document is the place to check before changing
anything that touches it.

## The one-line summary

The site executes **no JavaScript in the browser**, and treats everything it reads from GitHub as
untrusted text.

## Threat model

Parrot has no accounts, no forms, no database, no cookies, and no user data. There is nothing to
steal and nothing to log into. What is left worth protecting is:

| Concern                                       | How it is addressed                                         |
| :-------------------------------------------- | :---------------------------------------------------------- |
| Malicious content in a blog post              | Markdown is sanitised server-side; scripts cannot execute   |
| A supply-chain attack via npm                 | Locked versions, reviewed install scripts, delayed upgrades |
| Someone framing or impersonating the site     | `X-Frame-Options`, `frame-ancestors`, HSTS                  |
| Leaking a visitor's browsing to third parties | No third-party requests at all                              |
| Leaking the GitHub token                      | Stored as a Cloudflare secret, never in the repository      |

## No client-side JavaScript

Astro renders to HTML on the server. Nothing in this project sends JavaScript to the browser,
which is what makes `script-src 'none'` possible — and a policy of `script-src 'none'` neutralises
essentially every cross-site scripting attack, regardless of any mistake made elsewhere.

**Adding client-side JavaScript would mean weakening the Content Security Policy.** Before doing
so, check whether the same result can be achieved with CSS. Modern CSS covers a lot: the site
already handles dark mode, responsive layout, and focus styling without a line of script.

If script genuinely becomes necessary, prefer a nonce or hash over `'unsafe-inline'`, and update
the tests in `tests/e2e/security.spec.ts` that currently assert there is none.

The one `<script>` element in the page is a `type="application/ld+json"` block of structured data
for search engines. The HTML standard classifies that as a _data block_ rather than code: it is
never executed, and `script-src 'none'` neither blocks it nor is weakened by it. The security tests
allow that one type and no other. Its contents are escaped so that text from a blog post cannot
close the element and inject markup; see [`seo.md`](seo.md#structured-data).

## Content Security Policy

Defined once in [`../src/lib/security-headers.ts`](../src/lib/security-headers.ts).

```
default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';
script-src 'none'; object-src 'none'; style-src 'self'; font-src 'self';
connect-src 'self'; manifest-src 'self';
img-src 'self' https://raw.githubusercontent.com https://camo.githubusercontent.com
        https://user-images.githubusercontent.com
```

`default-src 'none'` denies everything, and each source is then allowed back deliberately. The
image hosts are GitHub's, because blog posts embed images from the blog repository. An image
hosted anywhere else will be blocked — that is intended, and is the reason
[`blog.md`](blog.md) tells authors to keep images in the blog repository.

Two deliberate absences:

- **No `'unsafe-inline'` for styles.** `build.inlineStylesheets: 'never'` in
  [`../astro.config.mjs`](../astro.config.mjs) stops Astro from inlining small stylesheets, which
  it would otherwise do by default. Removing that setting silently breaks the site's styling in
  production.
- **No `upgrade-insecure-requests`.** The landing page links to a service on a private network
  over plain HTTP. Upgrading it would break the link.

### Other headers

| Header                         | Value                                 | Why                                                   |
| :----------------------------- | :------------------------------------ | :---------------------------------------------------- |
| `Strict-Transport-Security`    | `max-age=31536000; includeSubDomains` | Browsers refuse plain HTTP for a year after a visit   |
| `X-Content-Type-Options`       | `nosniff`                             | Stops a file being treated as a type it is not        |
| `X-Frame-Options`              | `DENY`                                | Older browsers' equivalent of `frame-ancestors`       |
| `Referrer-Policy`              | `strict-origin-when-cross-origin`     | Outbound links do not reveal which page you came from |
| `Cross-Origin-Opener-Policy`   | `same-origin`                         | Isolates the page from windows that open it           |
| `Cross-Origin-Resource-Policy` | `same-origin`                         | Stops other sites embedding this site's resources     |
| `Permissions-Policy`           | Everything denied                     | The site needs no camera, location, or other hardware |

HSTS deliberately omits `preload`. Preloading is effectively irreversible once a domain is
submitted to the browser vendors' list, and this site does not need it.

### Why the headers are declared twice

Cloudflare serves prerendered pages from its asset store without ever invoking the Worker, so
middleware cannot add headers to them. Rendered pages, conversely, do not pass through the asset
layer.

- [`../public/_headers`](../public/_headers) covers statically served files.
- [`../src/middleware.ts`](../src/middleware.ts) covers pages rendered on demand.

Both read from the same module, and `tests/unit/security-headers.test.ts` fails if `_headers`
drifts out of step with it. **Change `security-headers.ts` first**, then run the test, which will
tell you exactly what `_headers` should contain.

## Treating blog content as untrusted

Anything published to the blog repository ends up inside the website's HTML. If that content
could inject markup, the blog repository would effectively have write access to the site. Two
independent measures prevent that, in [`../src/lib/markdown.ts`](../src/lib/markdown.ts):

1. **Raw HTML is discarded.** `remark-rehype` is deliberately not given `allowDangerousHtml`, so
   HTML written inside a markdown post is dropped rather than parsed.
2. **The result is sanitised anyway.** `rehype-sanitize` runs over the generated tree using
   GitHub's schema, tightened so that only `http`, `https`, and `mailto` URLs survive. A
   `javascript:` link, a `data:` image, or an `onerror` attribute is removed.

The second step is redundant while the first holds. It is there so that a future change to the
rendering pipeline cannot quietly open a hole.

Outbound links in posts get `rel="noopener noreferrer"`, so a linked page cannot reach back
through `window.opener`.

`tests/e2e/security.spec.ts` publishes a post containing a `<script>` tag, an `onerror` handler,
and a `javascript:` link, and asserts that none of them survive.

### `set:html`

`src/pages/blog/[slug].astro` uses Astro's `set:html`, which inserts HTML without escaping it.
That is safe **only** because the value comes from the sanitiser above. Do not use `set:html`
anywhere else without applying the same sanitisation.

## Configuration and secrets

Two things are read from the environment, and nothing else is:

| Variable                                 | Kind   | Why it is not in the code                      |
| :--------------------------------------- | :----- | :--------------------------------------------- |
| `GITHUB_TOKEN`                           | Secret | It is a credential and must never be committed |
| `BLOG_API_BASE_URL`, `BLOG_RAW_BASE_URL` | Public | They differ between a test run and production  |

Everything else — the owner's name, the outbound links, the blog repository, the cache
lifetimes, the security headers, the site's own URL — is deliberately held in version control
rather than in environment variables. These values are identical in every environment and are
part of what the product _is_, not how it is deployed. Keeping them in TypeScript means they are
type-checked, reviewed in pull requests, covered by tests, and visible to anyone reading the
code, none of which is true of a value typed into a dashboard.

The test that distinguishes them is simple: **would this value legitimately differ between two
deployments of this site, or is it a credential?** If neither, it belongs in the code.

There are no other credentials. There is no database, no API key, no session secret, and no
third-party service.

### Where each value lives

| What                                 | Where                                    |
| :----------------------------------- | :--------------------------------------- |
| Name, role, links, source repository | `src/lib/site.ts`                        |
| Blog repository and GitHub hosts     | `defaultBlogSource` in `src/lib/blog.ts` |
| Cache lifetimes                      | `src/lib/cache.ts`                       |
| Security headers and CSP             | `src/lib/security-headers.ts`            |
| The site's own URL                   | `astro.config.mjs`                       |
| Worker name and runtime date         | `wrangler.jsonc`                         |

Each appears exactly once. Where a value is needed in two places — the cache lifetime, the
security headers — it is imported rather than repeated, and a test fails if the two ever
disagree.

## Secrets

Nothing secret is committed, and nothing secret needs to be. The only credential the site can use
is `GITHUB_TOKEN`, which is optional and, if created as recommended in [`blog.md`](blog.md), has
no permissions at all — it exists solely to raise a rate limit.

- **Production**: `npx wrangler secret put GITHUB_TOKEN`, stored encrypted by Cloudflare.
- **Local**: `.dev.vars`, which is git-ignored. `.dev.vars.example` shows the shape but holds no
  value.
- `.gitignore` blocks `.env*` and `.dev.vars*`, allowing only the `.example` files through.

`astro.config.mjs` declares `GITHUB_TOKEN` as a **server, secret** variable, which means Astro
will not allow it to reach the browser even by accident.

If a token ever does leak, revoke it at
<https://github.com/settings/personal-access-tokens> and issue a new one. Nothing else needs to
change.

## Supply chain

Third-party code is the largest realistic risk to a site like this, so dependencies are kept few
and deliberate. The site's runtime dependencies are Astro, its Cloudflare adapter, and the
unified markdown toolchain — no UI framework, no component library, no analytics.

- **`npm ci`, not `npm install`**, in CI and on Cloudflare. It installs exactly what
  `package-lock.json` records.
- **Install scripts are reviewed.** `allowScripts` in `package.json` lists the specific package
  versions permitted to run code during installation. npm reports any package whose install
  script has not been reviewed. Approve one with `npm approve-scripts <package>` — and read what
  it does first.
- **Upgrades are delayed.** Dependabot waits several days after a release before proposing it,
  giving a compromised or broken publish time to be withdrawn.
- **CodeQL** scans the repository. Use GitHub's default setup — Settings → Code security → Code
  scanning → enable **CodeQL analysis** with default configuration. For a TypeScript project it
  needs no workflow file and keeps its queries up to date on its own.

## Runtime isolation

`compatibility_flags: ["global_fetch_strictly_public"]` in
[`../wrangler.jsonc`](../wrangler.jsonc) stops the Worker's `fetch` from reaching Cloudflare's
internal network or other Workers on the account. Requests leave for the public internet like any
other client's. The Worker only ever talks to GitHub, so it costs nothing and removes a class of
server-side request forgery.

The Worker also has no bindings beyond its own static assets: no KV, no database, no queues.
There is nothing for a compromised request to reach.

## Availability

GitHub being unreachable degrades rather than breaks the site. The landing page is static and
unaffected; blog pages return a plain explanation with HTTP 503; and Cloudflare's cache
(five minutes fresh, one hour stale-while-revalidate) means short outages are usually invisible.

A single unreadable post does not take down the listing.

## Checklist for changes

Before merging anything that touches security:

- [ ] Does the site still ship zero JavaScript? `npm run test:e2e` checks.
- [ ] Did `security-headers.ts` change without `public/_headers`? `npm test` checks.
- [ ] Does any new external resource need a CSP entry — and is it genuinely necessary?
- [ ] Is any new use of `set:html` fed by sanitised content?
- [ ] Is there any secret, token, or password in the diff?
- [ ] Does a new dependency actually earn its place?

## Reporting a problem

Security problems should be reported privately through GitHub's
[security advisories](https://github.com/MyNameIsMikeGreen/parrot/security/advisories) rather
than as a public issue.
