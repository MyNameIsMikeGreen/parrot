# Troubleshooting

Symptoms, likely causes, and what to do.

## The site

### The whole site is down

Check <https://www.cloudflarestatus.com>. If Cloudflare is healthy, open the Worker in the
dashboard and look at its **Deployments** tab — the most likely cause is a deployment that should
not have gone out.

```shell
npx wrangler rollback
```

Then find out why CI let it through, and follow up with a revert commit. A rollback changes what
is served but not what is in the repository, so the next merge to `main` would otherwise redeploy
the same problem.

### A change was merged but the site has not changed

Open the Worker's **Builds** tab. Either the build is still running, or it failed. The build log
gives the reason; it is almost always a check that also fails locally under `npm run verify`.

If the build succeeded and the page still looks stale, it is the browser or the edge cache. Try a
hard refresh, or an incognito window.

### The landing page works but `/blog` returns 503

The Worker cannot reach GitHub. Check <https://www.githubstatus.com> first.

If GitHub is fine, look at the Worker's **Observability** tab, or run:

```shell
npx wrangler tail parrot
```

Blog failures are logged with the status GitHub returned. A `403` means the API rate limit has
been hit — set a token, as described in [`blog.md`](blog.md).

Cloudflare's `stale-while-revalidate` normally hides brief outages, so a visible 503 means either
a sustained problem or a page nobody had requested recently.

### Everything is unstyled

The stylesheet is being blocked by the Content Security Policy. Open the browser's console and
look for a CSP violation.

The usual cause is Astro inlining a stylesheet, which happens if `build.inlineStylesheets` in
`astro.config.mjs` is not `'never'`. The end-to-end tests check for this, so it should not reach
production.

## Blog posts

### A new post is not showing

Work through in order:

1. Is the file in `posts/` at the **top level**, not in a subdirectory?
2. Does its name end in `.md`?
3. Is it committed and pushed to the `master` branch of the blog repository?
4. Has five minutes passed? That is the cache lifetime.

Try an incognito window to rule out your own browser cache.

### A post shows the wrong title

The title is the post's first top-level heading. If the post has none, the filename is used
instead. Add a `# Heading` as the first line.

### A post shows twice in the outline, or the title appears in the body

The title heading is removed from the body only if it is the **first** top-level heading. A post
beginning with prose, then a heading, keeps that heading in the body. Move it to the top.

### An image is not displaying

- Is the image committed to the blog repository, in `posts/` alongside the markdown?
- Is it referenced relatively — `![Alt](Diagram.png)` — rather than by a full URL?
- If it is hosted somewhere other than GitHub, the Content Security Policy is blocking it. That
  is intended; move the image into the blog repository. See [`security.md`](security.md).

Check the browser console: a CSP violation says so explicitly.

### HTML in a post is being ignored

That is deliberate and cannot be worked around from the blog repository. Raw HTML is stripped so
that a blog post cannot inject markup into the site. Use markdown.

### A post's URL changed and old links now 404

Renaming a file renames the post. There is no redirect for a renamed post — only for the old
underscored URL style. Either rename it back, or accept the broken links.

## Local development

### `npm ci` fails complaining about the Node version

`.npmrc` sets `engine-strict`, so an unsupported Node version fails rather than half-working.

```shell
nvm install
nvm use
```

Both read the version from `.nvmrc`.

### npm warns about unreviewed install scripts

A dependency wants to run code during installation and has not been approved. Look at what the
package is, and if it is legitimate:

```shell
npm approve-scripts <package>
```

This records the approval in `package.json`. Commit that change. See
[`security.md`](security.md).

### `npm run check` reports errors about `astro:env` or `astro:assets`

Those modules are generated into `.astro/` during a build. Run `npm run build` once, or start
`npm run dev`, and they will resolve. The same applies to red underlines in IntelliJ IDEA.

### The dev server shows the site but headers are missing

`npm run dev` runs in Node, not in Cloudflare's runtime, and does not apply the security headers.

```shell
npm run build
npm run preview
```

`npm run preview` runs the built site in `workerd`, exactly as production does.

### A change is not appearing under `npm run preview`

`preview` serves the last build. Run `npm run build` again.

## Tests

### Playwright fails with `EADDRINUSE`

A server from an earlier run is still holding port 8788 or 8790.

```shell
lsof -ti tcp:8788
lsof -ti tcp:8790
kill <the pid>
```

### Playwright tests fail after changing something visible

Read the failure — it may be correct. If you removed a link from the landing page, the test
asserting that link exists is supposed to fail.

To see what happened:

```shell
npx playwright test --ui
npx playwright show-report
```

### Blog end-to-end tests fail with unexpected content

They run against a stub, not GitHub. If they show real blog posts, the environment variables did
not reach the build.

`BLOG_API_BASE_URL` and `BLOG_RAW_BASE_URL` are public variables, which Astro substitutes into
the code **at build time**. They must be set for `npm run build`, not merely for the running
server. `playwright.config.ts` does this; check it has not been changed.

Delete `dist/` and let the suite rebuild if you suspect a stale build.

### Integration tests fail with 403

GitHub's rate limit. Wait an hour, or use a token:

```shell
GITHUB_TOKEN=github_pat_... npm run test:integration
```

### Integration tests fail but nothing changed here

That is what they are for: something changed at GitHub's end, or the blog repository moved. Check
the repository still exists, is public, and still has a `master` branch with a `posts` directory.

### Unit tests fail on `security-headers`

`src/lib/security-headers.ts` and `public/_headers` have drifted apart. The test output shows the
difference; copy the expected value into `public/_headers`.

## Deployment

### Workers Builds fails with a name mismatch

The Worker's name in the dashboard must match `name` in `wrangler.jsonc` exactly. It is `parrot`.

### `wrangler deploy` says it is not authenticated

```shell
npx wrangler login
```

### The custom domain will not attach

Cloudflare refuses a hostname that already has a CNAME record or is attached elsewhere. If the
old Cloudflare Pages project still holds it, detach it there first — see
[`deployment.md`](deployment.md).

### A secret disappeared

It did not. Secrets belong to the Worker rather than to the deployed code, and survive every
deploy. Confirm with:

```shell
npx wrangler secret list
```

If it is genuinely missing, set it again with `npx wrangler secret put GITHUB_TOKEN`.

## Still stuck

- Worker logs: `npx wrangler tail parrot`, or the Observability tab.
- Build logs: the Worker's Builds tab.
- [Astro documentation](https://docs.astro.build)
- [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
