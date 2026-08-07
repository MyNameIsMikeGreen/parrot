# Deployment

Parrot runs on [Cloudflare Workers](https://developers.cloudflare.com/workers/). Cloudflare
serves the two static pages straight from its edge network, and runs the Worker only for blog
pages, which have to be rendered when they are requested.

## How a change reaches production

1. Merge a change into `main`.
2. Cloudflare's **Workers Builds** notices the push, checks the repository out, runs the build,
   and deploys the result.
3. The new version is live worldwide within a couple of minutes.

There is nothing to run by hand. `npm run deploy` exists as an escape hatch, but the normal path
is a merge to `main`.

Because the deploy is automatic, CI is the safety net. Never merge a red build.

Dependency updates take this same path with little intervention: Dependabot raises the pull
request and GitHub merges it once CI passes. That pipeline, and the repository settings it
depends on, are described in [`dependencies.md`](dependencies.md).

## First-time setup

Skip this if the Worker already exists — which it does unless you are rebuilding the hosting
from scratch, or performing the migration described at the end of this document.

### 1. Create the Worker from the repository

1. Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com).
2. In the sidebar, go to **Compute → Workers & Pages**, and select **Create application**.
3. Choose to import an existing Git repository, authorise Cloudflare's GitHub app if prompted,
   and select `MyNameIsMikeGreen/parrot`.
4. Set the production branch to `main`.
5. Set the build settings:

   | Field          | Value                 |
   | :------------- | :-------------------- |
   | Build command  | `npx astro build`     |
   | Deploy command | `npx wrangler deploy` |

   `npx wrangler deploy` is Cloudflare's default and is usually pre-filled.

6. **The Worker's name must be exactly `parrot`**, matching the `name` field in
   [`wrangler.jsonc`](../wrangler.jsonc). A mismatch makes every build fail with a confusing
   error.

7. Deploy, and check the site works at the `parrot.<your-subdomain>.workers.dev` address
   Cloudflare gives you.

### 2. Attach the custom domain

Do this only once the `workers.dev` address is confirmed working.

1. Open the Worker, then **Settings → Domains & Routes → Add → Custom Domain**.
2. Enter `www.mikegreen.net` and confirm.

Cloudflare creates the DNS record and the TLS certificate itself, provided the domain's
nameservers already point at Cloudflare. It will refuse if a CNAME record for that hostname
already exists, which is exactly what happens if the domain is still attached to something else
— see [Migrating from Cloudflare Pages](#migrating-from-cloudflare-pages) below.

Repeat for the apex domain `mikegreen.net` if you want it to work without the `www`.

### 3. Set the GitHub token (optional)

```shell
npx wrangler secret put GITHUB_TOKEN
```

Paste the token when prompted. Cloudflare stores it encrypted and it never appears in this
repository. Secrets survive every later deploy, so this is a one-off.

Alternatively, use the dashboard: **Settings → Variables and Secrets → Add**, choose type
**Secret**.

See [`blog.md`](blog.md) for what the token is for and how to create one. The site works without
it.

## Deploying by hand

Only useful if Workers Builds is unavailable, or to verify a change before merging.

```shell
npx wrangler login   # first time only
npm run deploy
```

To check what would be deployed without deploying it:

```shell
npm run build
npx wrangler deploy --dry-run
```

## Preview deployments for branches

Off by default. To have every branch and pull request get its own URL, open the Worker and go to
**Settings → Build → Branch control**, and enable builds for non-production branches. Cloudflare
will then run `npx wrangler versions upload` on those branches, which creates a preview URL
without touching production, and comments the URL on the pull request.

## Rolling back

If a deployment breaks the site:

```shell
npx wrangler deployments list   # find the version you want
npx wrangler rollback           # or: npx wrangler rollback <VERSION_ID>
```

With no version given, `rollback` returns to the version immediately before the current one.

In the dashboard, the equivalent is the Worker's **Deployments** tab, then **Rollback** from the
menu beside a version.

Rolling back changes what is served immediately, but it does not change the repository. Follow
it with a revert commit, or the next merge to `main` will redeploy the broken version.

## Watching production

- **Logs and errors**: the Worker's **Observability** tab in the dashboard. Enabled by
  `observability` in [`wrangler.jsonc`](../wrangler.jsonc).
- **Live tail**: `npx wrangler tail parrot`.
- **Build history**: the Worker's **Builds** tab shows every Workers Builds run and its log.

Blog failures are logged with `console.error`, so a visitor reporting a 503 on `/blog` should be
visible there.

## Configuration reference

| File                | What it controls                                          |
| :------------------ | :-------------------------------------------------------- |
| `wrangler.jsonc`    | Worker name, runtime date, asset directory, observability |
| `astro.config.mjs`  | Build output, adapter, environment variable schema        |
| `public/_headers`   | Response headers for statically served files              |
| `src/middleware.ts` | Response headers for pages rendered by the Worker         |

`npm run build` writes a resolved copy of the Wrangler configuration to `dist/server/`, and
Wrangler uses that. It is generated output — always edit `wrangler.jsonc` in the project root.

### `compatibility_date`

This pins the behaviour of the Workers runtime, so Cloudflare cannot change how the site behaves
underneath you. Raising it opts into newer runtime behaviour; do it deliberately, and run
`npm run verify` afterwards.

## Migrating from Cloudflare Pages

The previous version of this site ran on Cloudflare Pages. Cloudflare now directs new work to
Workers, keeps its
[migration guide](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
current, and builds new features for Workers only. This project is already configured for
Workers; what remains is a one-off change in the Cloudflare dashboard.

There is no "migrate" button. The steps are manual.

The custom domain can only be attached to one thing at a time, so there is a short gap between
detaching it from Pages and attaching it to the Worker. Do it at a quiet time, and have both
dashboard tabs open before you start.

1. **Create and verify the Worker** using [First-time setup](#first-time-setup) above, but stop
   before attaching the custom domain. Confirm the site works fully at its `workers.dev`
   address: the landing page, `/blog`, an individual post, and a deliberately wrong URL.
2. **Set `GITHUB_TOKEN`** on the Worker if you were using one on Pages. Pages variables are not
   carried across.
3. **Detach the domain from Pages.** Open the Pages project, go to **Custom domains**, and
   remove `www.mikegreen.net`. Remove the CNAME record for it under the zone's **DNS** if it is
   left behind.
4. **Attach the domain to the Worker** immediately, as described above.
5. **Verify** `https://www.mikegreen.net`: the landing page, the blog listing, a post, a 404, and
   that the certificate is valid.
6. **Turn off the Pages project's Git integration** so it stops building on every push. Leave
   the project itself in place for a week or two as a fallback, then delete it.

If something goes wrong midway, the fastest recovery is to reattach the domain to the Pages
project, which is still deployed and working.
