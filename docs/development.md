# Development

Everything you need to work on Parrot day to day.

## Prerequisites

- **Node.js** at the version pinned in [`.nvmrc`](../.nvmrc). With
  [nvm](https://github.com/nvm-sh/nvm) installed, `nvm use` in the project root selects it, and
  `nvm install` fetches it the first time.
- **npm**, which ships with Node.

Install dependencies with `npm ci`. This installs the exact versions recorded in
`package-lock.json`, which is what CI and Cloudflare do too. Use `npm install` only when you are
deliberately adding or upgrading a dependency.

## Commands

| Command                    | What it does                                                               |
| :------------------------- | :------------------------------------------------------------------------- |
| `npm run dev`              | Development server on <http://localhost:4321> with live reload — see below |
| `npm run build`            | Builds the production site into `dist/`                                    |
| `npm run preview`          | Serves the last build in the real Cloudflare runtime, port 8787            |
| `npm run check`            | Type-checks TypeScript and `.astro` components                             |
| `npm run format`           | Reformats the whole project with Prettier                                  |
| `npm run format:check`     | Reports formatting problems without changing files                         |
| `npm test`                 | Unit tests                                                                 |
| `npm run test:watch`       | Unit tests, re-run as you edit                                             |
| `npm run test:coverage`    | Unit tests with a coverage report and minimum thresholds                   |
| `npm run test:integration` | Tests against the real GitHub API                                          |
| `npm run test:e2e`         | Browser tests against a real build                                         |
| `npm run verify`           | Everything CI runs, in one command                                         |
| `npm run deploy`           | Builds and deploys manually (normally unnecessary)                         |

Run `npm run verify` before pushing. It is the same set of checks CI runs, so a green result
locally means a green result on GitHub.

### `npm run dev` versus `npm run preview`

`astro dev` renders every page on demand rather than reproducing Cloudflare's split between
prerendered static assets and on-demand rendering, so it goes through the same
[`src/middleware.ts`](../src/middleware.ts) as production. The middleware deliberately skips the
security headers - including the CSP - while running under `astro dev`: the dev server's live
reload injects each page's styles as an inline `<style>` block and relies on inline scripts and
`eval`, none of which the production `style-src 'self'` / `script-src 'self'` policy allows.
Applying the real CSP in dev would just serve every page with no CSS and a broken dev toolbar, for
no security benefit, since the dev server is never the thing the CSP is protecting.

`npm run preview` runs the built site inside `workerd`, the same runtime Cloudflare uses in
production, serving the real fingerprinted CSS files and the full security headers - so it is the
way to check how a change actually looks under production-like conditions, or to change routing,
response headers, caching, or anything in `src/middleware.ts`. It does not reload automatically, so
rebuild with `npm run build` after each change.

For everyday work, prefer `npm run dev`: it is faster, reloads automatically, and now renders fully
styled. Reach for `npm run preview` when you need to verify headers, caching, or CSP behaviour
itself.

## Project layout

```text
parrot/
├── docs/                    This documentation
├── public/                  Files copied to the site root untouched
│   ├── _headers             Security headers for statically served files
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── assets/icons/        Hand-drawn SVGs, inlined into the link cards
│   ├── components/          Reusable pieces of markup
│   ├── layouts/             The page shell shared by every page
│   ├── lib/                 Plain TypeScript: the site's actual logic
│   │   ├── blog.ts          Reading posts from GitHub
│   │   ├── blog-config.ts   Turning environment variables into blog settings
│   │   ├── cache.ts         How long blog content may be cached
│   │   ├── markdown.ts      Rendering and sanitising markdown
│   │   ├── security-headers.ts
│   │   ├── site.ts          Site name, navigation, and outbound links
│   │   ├── slug.ts          Turning a filename into a URL
│   │   └── structured-data.ts  schema.org JSON-LD for search engines
│   ├── pages/               One file per URL, plus sitemap.xml.ts
│   ├── styles/              The single global stylesheet
│   └── middleware.ts        Adds security headers to rendered responses
└── tests/
    ├── unit/                Fast, offline tests of src/lib
    ├── integration/         Tests against the real GitHub API
    └── e2e/                 Browser tests against a real build
```

Anything under `src/pages` becomes a URL. `src/pages/index.astro` is `/`,
`src/pages/blog/index.astro` is `/blog`, and `src/pages/blog/[slug].astro` matches any single
segment beneath `/blog`.

Logic lives in `src/lib` rather than inside `.astro` files, because plain TypeScript is far
easier to unit test.

## Testing

Parrot has three test suites, each answering a different question.

### Unit tests — "does this function behave correctly?"

Written with [Vitest](https://vitest.dev), these cover `src/lib`: slug generation, markdown
rendering and sanitising, the GitHub client, and the security headers. They stub out the network
entirely, so they run in about a second and never fail because of something outside the project.

```shell
npm test
npm run test:coverage   # also enforces the coverage thresholds
```

Coverage must stay above 90% of lines, functions, and statements, and 85% of branches. The
thresholds are set in [`vitest.config.ts`](../vitest.config.ts).

### End-to-end tests — "does the site work?"

Written with [Playwright](https://playwright.dev), these build the site and run it in the real
Cloudflare runtime, then drive it in Chromium and in mobile Safari. They cover navigation, the
landing page, blog listing and post pages, redirects, 404s, error handling, security headers,
the absence of JavaScript, and the metadata that only search engines and link previews read.

```shell
npm run test:e2e
npx playwright test --ui       # step through them interactively
npx playwright test --project chromium blog.spec.ts
```

Blog content in these tests comes from a small stub server
([`tests/e2e/stub-github.ts`](../tests/e2e/stub-github.ts)) rather than GitHub. That keeps the
suite deterministic — the assertions do not change when a post is published — and avoids
GitHub's rate limit, which parallel test runs would otherwise exhaust. Playwright starts and
stops the stub for you.

The stub is pointed at using `BLOG_API_BASE_URL` and `BLOG_RAW_BASE_URL`, which
[`playwright.config.ts`](../playwright.config.ts) sets for the build step. They must be set for
the **build**, not just for the running server, because Astro substitutes public environment
variables into the code at build time.

### Integration tests — "is GitHub still behaving as we expect?"

Because the end-to-end tests use a stub, something has to check the real thing. These Vitest
tests read the actual blog repository and assert on shape rather than content, so they will not
break when a post is published.

```shell
npm run test:integration
```

They are excluded from `npm test` and from `npm run verify` so that a network outage never
blocks local work. CI runs them separately.

If you hit `403` rate-limit errors, set a token first — see [`blog.md`](blog.md).

### What to write when you change something

- Changed something in `src/lib`? Add a unit test.
- Changed a page, a URL, a header, or anything a visitor can see? Add an end-to-end test.
- Changed how GitHub is called? Check the integration tests still make sense.

## Formatting

Prettier owns formatting; there is no separate linter and no style debate. Run `npm run format`
before committing, or set your editor to format on save.

Configuration lives in [`.prettierrc.json`](../.prettierrc.json), and
[`.editorconfig`](../.editorconfig) makes editors match it for indentation and line endings.

## Environment variables

| Variable            | Required | Purpose                                                    |
| :------------------ | :------- | :--------------------------------------------------------- |
| `GITHUB_TOKEN`      | No       | Raises the GitHub API rate limit from 60 to 5,000 per hour |
| `BLOG_API_BASE_URL` | No       | Where to list posts from. Defaults to the GitHub API       |
| `BLOG_RAW_BASE_URL` | No       | Where to read post contents from. Defaults to GitHub raw   |

The `BLOG_*` variables exist for testing. You should not need to change them.

They are declared in [`astro.config.mjs`](../astro.config.mjs), which validates them at build
time and gives them types, so a typo fails the build rather than the site.

For local development, copy [`.dev.vars.example`](../.dev.vars.example) to `.dev.vars` and fill
it in. `.dev.vars` is git-ignored and must never be committed. Production values are set with
`npx wrangler secret put`, described in [`deployment.md`](deployment.md).

## IntelliJ IDEA setup

IntelliJ IDEA Ultimate has everything built in. Community Edition works, but without the Astro
plugin you will not get highlighting inside `.astro` files.

1. **Open the project** with _File → Open_ and select the `parrot` folder. Do not import it as
   any particular project type; IDEA will detect Node.
2. **Install the Astro plugin** from _Settings → Plugins → Marketplace_. Search for "Astro".
3. **Point IDEA at the right Node version.** _Settings → Languages & Frameworks → Node.js_, and
   set the interpreter to the version in `.nvmrc`. If you use nvm, IDEA lists the installed
   versions from `~/.nvm/versions/node`.
4. **Use the project's TypeScript.** _Settings → Languages & Frameworks → TypeScript_, and set
   the TypeScript package to `<project>/node_modules/typescript`. This keeps IDEA's errors
   identical to `npm run check`.
5. **Format with Prettier.** _Settings → Languages & Frameworks → JavaScript → Prettier_. Choose
   the automatic Prettier package, and tick _On save_ and _On code reformat action_.
6. **Enable EditorConfig** at _Settings → Editor → Code Style_ — tick "Enable EditorConfig
   support". It is usually on already.

### Running things from the IDE

The npm scripts appear in the _npm_ tool window (_View → Tool Windows → npm_); double-click any
of them to run it.

Vitest and Playwright are both recognised natively. A green arrow appears in the gutter next to
every `it(...)` and `test(...)`, letting you run or debug a single test. Playwright tests need
the site built first, which the run configuration handles automatically.

To debug the site itself, run `npm run dev`, then attach with _Run → Attach to Process_, or
create a "JavaScript Debug" configuration pointing at <http://localhost:4321>.

### Things to ignore

`.idea/` is git-ignored, so your IDE settings are yours alone. IDEA may warn about unresolved
imports such as `astro:env/server` and `astro:assets` — these are generated into `.astro/` when
you run `npm run dev` or `npm run build`, so build once and the warnings disappear.

## Upgrading dependencies

Dependabot opens pull requests weekly: one grouped request for minor and patch updates, and a
separate request for each major update. It waits a few days after a release before proposing it,
so a bad or compromised publish has time to be withdrawn.

For a grouped minor or patch update, a green CI run is enough. For a major update, read the
release notes first — particularly for Astro, `@astrojs/cloudflare`, and Wrangler, which move
together.

To upgrade by hand:

```shell
npm outdated                    # see what has moved
npx @astrojs/upgrade            # Astro and its integrations, with codemods
npm update                      # everything else, within its version range
npm run verify
```
