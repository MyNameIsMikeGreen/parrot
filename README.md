# Parrot

Parrot is the website behind [www.mikegreen.net](https://www.mikegreen.net). It is a small
personal site with two pages: a set of links to Mike Green's profiles and projects, and a blog
whose posts are read live from a separate GitHub repository.

The site ships **no client-side JavaScript**. Pages are HTML and CSS, blog content is fetched
and sanitised on the server, and the whole thing runs on Cloudflare's edge network.

## Quick start

Prerequisites: [Node.js](https://nodejs.org) at the version in [`.nvmrc`](.nvmrc). If you use
[nvm](https://github.com/nvm-sh/nvm), run `nvm use` in the project root to switch to it.

```shell
npm ci
npm run dev
```

Open <http://localhost:4321>. Editing a file updates the browser automatically.

To see the site exactly as Cloudflare will serve it, including security headers and on-demand
rendering, use the preview instead:

```shell
npm run build
npm run preview
```

## Documentation

- [`docs/development.md`](docs/development.md): everyday commands, project layout, tests, and
  IntelliJ IDEA setup
- [`docs/blog.md`](docs/blog.md): how to publish, edit, and remove blog posts
- [`docs/content.md`](docs/content.md): changing the links, wording, and look of the site
- [`docs/deployment.md`](docs/deployment.md): how the site reaches production, and the one-off
  migration from Cloudflare Pages
- [`docs/dependencies.md`](docs/dependencies.md): the automated update pipeline, and the settings
  that make it safe
- [`docs/architecture.md`](docs/architecture.md): the design decisions and why they were made
- [`docs/security.md`](docs/security.md): the security posture and the rules that protect it
- [`docs/seo.md`](docs/seo.md): what search engines are told, and how link previews are built
- [`docs/troubleshooting.md`](docs/troubleshooting.md): what to do when something looks wrong

## Technology

[Astro](https://astro.build) 7 and TypeScript, deployed to
[Cloudflare Workers](https://developers.cloudflare.com/workers/) with
[Wrangler](https://developers.cloudflare.com/workers/wrangler/). Markdown is rendered with
[unified](https://unifiedjs.com) and sanitised with
[rehype-sanitize](https://github.com/rehypejs/rehype-sanitize). Tests use
[Vitest](https://vitest.dev) and [Playwright](https://playwright.dev). Formatting is handled by
[Prettier](https://prettier.io).
