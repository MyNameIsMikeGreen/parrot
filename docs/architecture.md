# Architecture

This document records what Parrot is built from and, more usefully, why. It is the place to read
before changing something structural, and the place to update afterwards.

## What the site has to do

- Show a handful of links to profiles and self-hosted services.
- Show a blog whose posts live in a **different** repository, and which must appear **without
  redeploying this one**.
- Stay safe on the public internet.
- Stay maintainable by someone who does not work with these technologies daily.
- Cost nothing to run.

## Shape

```
Visitor
   │
   ▼
Cloudflare edge ──── / and /404 ─────────► static HTML, served directly
   │
   └──────────────── /blog, /blog/… ─────► Worker
                                             │
                                             ▼
                                      GitHub (blog repository)
```

Two pages are built once and served as files. Blog pages run code per request, because that is
the only way a new post can appear without a redeploy. Everything else about them — layout,
styling, security headers — is identical.

## Decisions

### Astro, rather than a single-page application

The previous version was a Create React App single-page application. A visitor downloaded a
JavaScript bundle, which then drew the page and fetched the blog from the browser.

Astro renders on the server and sends HTML. For a site that is mostly text and links, this is
better in every dimension that matters here:

- **Security.** No client-side JavaScript means `script-src 'none'` is achievable, which
  eliminates cross-site scripting as a practical concern. See [`security.md`](security.md).
- **Speed.** There is no bundle to download, parse, and execute before anything appears.
- **Robustness.** The site works in any browser, and cannot break because of a JavaScript error.
- **Simplicity.** A page is a file containing HTML. That is a much shorter path to understanding
  than a component tree with routing and state.
- **Findability.** A crawler was previously served an empty `<div>` and had to run JavaScript to
  see anything. Now the words are in the HTML.

Create React App itself was [deprecated in
2025](https://react.dev/blog/2025/02/14/sunsetting-create-react-app), so staying put was not an
option regardless.

Astro was chosen over Next.js because Next.js is a larger framework built around React, and the
site does not need React. Astro's per-route choice between static and on-demand rendering happens
to match this site's split exactly.

### Cloudflare Workers, rather than Pages

The site already ran on Cloudflare Pages with automatic deploys from `main`, which worked well.
But Cloudflare now directs new work to Workers, ships new features there, and maintains a
[migration guide](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/).
`@astrojs/cloudflare` v14 targets Workers.

Workers keeps everything that mattered about the previous arrangement — push to `main`, site
updates, no invoice — and adds per-request rendering, which the blog needs.

The migration is a one-off dashboard exercise, written up in
[`deployment.md`](deployment.md).

### Static pages, rendered blog

`output: 'static'` with `export const prerender = false` on the two blog routes and the sitemap.

The landing page and the 404 page never change between deploys, so they are built once. Blog
pages must reflect the blog repository as it is now, so they are rendered when requested. The
sitemap lists those pages, so it has to be rendered too, or it would go stale the moment a post
was published. If GitHub cannot be reached it still lists the pages that do not depend on it,
because a partial sitemap is more useful to a crawler than an error.

This is the smallest amount of server-side rendering that satisfies the requirement. Most
requests never invoke the Worker at all.

### Fetching posts at request time

The alternative — building posts into the site — would be faster and simpler, but would require a
deploy for every post. That was ruled out explicitly: publishing must be nothing more than
committing a markdown file.

A repository dispatch webhook could trigger a rebuild on every push to the blog, but that means
another moving part, another token, and a coupling between two repositories that only shows up
when it breaks.

Fetching at request time keeps the two repositories independent. The cost is a dependency on
GitHub being reachable, which is mitigated by caching and handled explicitly when it fails.

### Two GitHub endpoints

Listing posts uses the [Git Trees
API](https://docs.github.com/en/rest/git/trees), which returns the whole repository listing in one
request. Post bodies come from `raw.githubusercontent.com`, which is a CDN and is not subject to
the API's rate limit.

The API allows 60 requests per hour per IP address when unauthenticated. With five-minute edge
caching, the live site uses a small fraction of that. `GITHUB_TOKEN` raises it to 5,000 if ever
needed, and is optional.

### Caching

Blog responses carry `s-maxage=300, stale-while-revalidate=3600`, and the GitHub requests behind
them are cached at the edge for the same five minutes. Both lifetimes come from
[`../src/lib/cache.ts`](../src/lib/cache.ts), so the response header and the upstream request
cannot drift apart.

Five minutes is a deliberate compromise: short enough that publishing feels immediate, long
enough that traffic spikes and rate limits are non-issues. `stale-while-revalidate` means a
GitHub outage is usually invisible, because Cloudflare keeps serving the last good copy while it
retries.

### Markdown with unified

Markdown is processed by [unified](https://unifiedjs.com) — remark to parse, rehype to produce
HTML — rather than by a single-function library such as `marked`.

The pipeline is more code, but every step is inspectable and testable, and the security-critical
step is a well-maintained plugin rather than a regular expression. The transformations are:

| Step                     | What it does                                                     |
| :----------------------- | :--------------------------------------------------------------- |
| `remark-gfm`             | GitHub's markdown extensions: tables, task lists, strikethrough  |
| `extractTitle`           | Takes the first `<h1>` as the title and removes it from the body |
| `normaliseHeadingDepths` | Shifts remaining headings so the shallowest becomes `<h2>`       |
| `resolveRelativeUrls`    | Points relative images and links at the blog repository          |
| `hardenLinks`            | Adds `rel="noopener noreferrer"` to outbound links               |
| `rehype-sanitize`        | Removes anything dangerous that survived                         |

Raw HTML is dropped before sanitisation, because `remark-rehype` is deliberately not given
`allowDangerousHtml`. Sanitising afterwards as well is defence in depth.

`normaliseHeadingDepths` exists because posts were written with `#` for every heading. Shifting
them preserves the author's intent while producing a document with one `<h1>` and a sensible
outline for screen readers.

### Slugs

URLs are lowercase and hyphenated: `/blog/dont-overthink-it`, where the previous site used
`/blog/Don't_Overthink_It`.

`toSlug()` is applied both to a post's filename and to whatever a visitor asks for. Matching in
slug space means old URLs, mistyped URLs, and correct URLs all resolve through one code path, and
anything non-canonical redirects permanently to the canonical form. There is no list of legacy
redirects to maintain.

### Logic outside the templates

`src/lib` holds plain TypeScript with no Astro imports. `.astro` files call into it and render the
result.

This is what makes the site properly testable: the interesting behaviour — slugs, markdown,
GitHub, headers — is exercised by fast unit tests, while the browser tests are left to check that
it is wired up correctly.

### Security headers in two places

Cloudflare serves prerendered pages without invoking the Worker, so middleware cannot reach them.
Static files use `public/_headers`; rendered pages use `src/middleware.ts`.

Both derive from one module, and a unit test fails if they drift apart. It is duplication, but it
is duplication that cannot silently rot.

### Testing at three levels

- **Unit** (Vitest) — the logic in `src/lib`, offline and fast.
- **End-to-end** (Playwright) — the built site in the real Cloudflare runtime, against a stubbed
  GitHub so results are deterministic.
- **Integration** (Vitest) — the real GitHub API, to catch changes at their end.

Stubbing GitHub in the end-to-end tests was not the first approach. Running them against the real
API worked until parallel runs exhausted the rate limit, and would have meant assertions changing
whenever a post was published. A stub fixed both, and the integration suite covers what the stub
cannot.

### Images optimised at build time

`imageService: 'compile'` handles any raster image during the build. The adapter's default routes
images through Cloudflare Images, which is a paid product, at request time. Build-time
optimisation costs nothing and produces fewer moving parts. The site currently ships no raster
images at all, so this setting is insurance rather than something in daily use.

### Nothing may overflow the viewport horizontally

The site is read on phones as often as on desktops, so a page that scrolls sideways is treated as
a bug rather than a cosmetic flaw. The layout is fluid, and the three things that classically
break narrow screens are each contained: `pre` and the table wrapper scroll internally, images are
capped at `max-width: 100%`, and `.post__body` sets `overflow-wrap: break-word` so a long
unbroken URL wraps instead of stretching the page.

Blog content is the hard case, because it is written elsewhere and cannot be adjusted to fit. A
wide markdown table cannot shrink below its content width, so the `wrapTables` plugin in
`src/lib/markdown.ts` puts each table inside a `div.table-scroll` that scrolls on its own.

The obvious CSS-only alternative — making the table `display: block` — was rejected because it
strips the element of its table semantics and screen readers stop announcing rows and columns. A
test asserts the table is still exposed with its column headers intact.

`tests/e2e/mobile.spec.ts` enforces the no-horizontal-overflow rule at 320px and 390px across
every page, so a future style change cannot quietly reintroduce it.

## What was left behind

The original site had four link cards. **Pelican** has been decommissioned, so it is gone
everywhere, and the site now carries five: GitHub, LinkedIn, Platypus, Home Assistant and
Zigbee2MQTT.

The original bundled brand logos as images with no record of where they came from. Those are gone,
and so is every raster image: each card is now a hand-drawn SVG icon depicting what the service
does. No company's logo is reproduced anywhere in the project, which removes a class of licensing
and trademark questions entirely rather than answering them. See
[`content.md`](content.md#using-other-peoples-logos) for the reasoning.

The original also loaded a webfont from Google Cloud Storage. The rewrite uses the visitor's own
system font stack instead, which is faster, avoids a third-party request on every page load, and
lets the Content Security Policy forbid external fonts entirely.

Class-based React components, the client-side router, and the browser-side GitHub fetching all
disappeared with the framework.

The original test suite asserted on React component internals — which components rendered, what
state they held. Those tests are not reproduced, because they described the implementation rather
than the product; the new suite asserts on what a visitor experiences, so it will survive the next
rewrite.

## If you are changing something structural

- New page: add a file under `src/pages/`, and a `navigation` entry in `src/lib/site.ts` if it
  should be linked.
- New logic: put it in `src/lib`, with unit tests.
- Anything a visitor can see: add an end-to-end test.
- Anything touching headers, CSP, or sanitisation: read [`security.md`](security.md) first.
- Update this document if a decision here stops being true.
