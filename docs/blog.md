# Publishing blog posts

Blog posts are **not** part of this repository. They live in
<https://github.com/MyNameIsMikeGreen/blog>, in the `posts` directory on the `master` branch.

Parrot reads them when a visitor asks for a page. Publishing a post therefore means nothing more
than committing a markdown file to that repository — Parrot itself never needs redeploying.

## Publishing a post

1. Add a `.md` file to the `posts` directory of the blog repository.
2. Give it a filename you would be happy to see in a URL. Words separated by underscores work
   well, for example `Why_I_Stopped_Using_Docker.md`.
3. Start the file with a top-level heading. That heading becomes the post's title everywhere:

   ```markdown
   # Why I Stopped Using Docker

   The first paragraph goes here.
   ```

4. Commit and push to `master`.

The post appears on the site within five minutes — the delay is Cloudflare's cache, described
below. To see it sooner, use a browser's hard refresh or an incognito window.

## How a filename becomes a URL

The filename is lowercased, apostrophes are dropped, and every other run of non-alphanumeric
characters becomes a single hyphen.

| Filename                        | URL                                |
| :------------------------------ | :--------------------------------- |
| `Why_I_Stopped_Using_Docker.md` | `/blog/why-i-stopped-using-docker` |
| `Don't_Overthink_It.md`         | `/blog/dont-overthink-it`          |
| `Testing 101.md`                | `/blog/testing-101`                |

The same conversion is applied to whatever a visitor types, so a link to `/blog/Testing 101` or
to the older `/blog/Testing_101` style still resolves. Non-canonical addresses redirect
permanently to the canonical one, which keeps old bookmarks and search results working.

Two posts whose filenames reduce to the same slug would collide. The integration test suite
checks for that, so CI will tell you.

## Titles

The title comes from the heading at the very start of the post, and that heading is then removed
from the body so the page has exactly one `<h1>`. Both markdown styles work:

```markdown
# A Title
```

```markdown
A Title
=======
```

The heading must come first. A `#` heading further down the post is treated as ordinary body
content, not as the title — otherwise a heading could be silently torn out of the middle of your
writing. If a post has no leading heading, the file name is used as the title instead.

Any remaining headings in the post are shifted down so the shallowest becomes an `<h2>`. Their
relative nesting is preserved, so you can write a post using `#` throughout and it will still
produce a correctly structured page.

If a post has no heading at all, the filename is used as the title, with underscores replaced by
spaces.

## Your first paragraph

The opening paragraph of a post becomes its description in search results and in the preview shown
when the link is shared, shortened to about 155 characters at a word boundary. Nothing needs to be
declared for that to happen.

It is worth writing the first paragraph so it reads sensibly on its own, out of context and
possibly cut short. A post that opens by saying what it is about will look better in a list of
search results than one that opens with "So the other day...".

A post with no prose falls back to a description built from its title. See [`seo.md`](seo.md).

## What is rendered

Posts are [GitHub Flavoured Markdown](https://github.github.com/gfm/): headings, lists, links,
images, tables, task lists, strikethrough, fenced code blocks, and footnotes.

**Raw HTML inside a post is ignored.** It is discarded during rendering and stripped again by a
sanitiser afterwards. This is deliberate: it is what stops the blog repository from being able
to inject scripts into the website. Write markdown, not HTML.

Only `http`, `https`, and `mailto` links survive. Anything else — `javascript:`, `data:` — is
removed.

### Images

Put images in the `posts` directory alongside the markdown and reference them relatively:

```markdown
![A diagram of the setup](Setup_Diagram.png)
```

Relative paths are rewritten to point at GitHub's raw content host, which serves them through a
CDN. Images hosted anywhere other than GitHub will be blocked by the site's Content Security
Policy and will not display; see [`security.md`](security.md) if you need to change that.

### Links between posts

Link to another post by its filename and the link will be rewritten to GitHub, where the reader
will see the markdown source. If you would rather send them to the rendered page, link to the
site URL instead:

```markdown
[Read the other post](https://www.mikegreen.net/blog/dont-overthink-it)
```

## Editing and removing posts

Editing a post updates the site within five minutes. Renaming a file changes the post's URL, and
the old URL will start returning "Post not found" — so rename only if you are willing to break
existing links.

Deleting a file removes the post from the site.

## What is and is not listed

Only `.md` files directly inside `posts` are listed. That means:

- `posts/My_Post.md` — listed
- `posts/drafts/My_Draft.md` — **not** listed, because it is in a subdirectory
- `posts/Diagram.png` — not listed, because it is not markdown
- `README.md` at the repository root — not listed, because it is not in `posts`

A `drafts` subdirectory is therefore a perfectly good place to keep unfinished writing.

Posts are listed alphabetically by title. The GitHub API used here does not expose dates, so
alphabetical order is simply the one ordering that stays stable.

## Caching

A rendered blog page is cached at Cloudflare's edge for five minutes, and may be served for up
to an hour afterwards while a fresh copy is fetched in the background. This keeps the site fast,
keeps GitHub's rate limit comfortably out of reach, and means a brief GitHub outage is usually
invisible to visitors.

The trade-off is that a new post takes up to five minutes to appear. If that ever becomes
annoying, both lifetimes are defined in one place — [`../src/lib/cache.ts`](../src/lib/cache.ts).

## When the blog cannot be read

If GitHub is unreachable, the site says so plainly and returns HTTP 503 rather than showing a
broken page or a stack trace. Visitors can still use the rest of the site.

A single unreadable post does not take down the listing: the post is still listed, using its
filename as the title, and only that post's own page reports the problem.

## Rate limits and `GITHUB_TOKEN`

Listing posts uses GitHub's API, which allows 60 requests per hour from a given IP address when
unauthenticated. Cloudflare's cache means the live site makes far fewer requests than that, so
the site works perfectly well without a token.

A token becomes worth setting if you see intermittent 503s, or if you run the integration tests
repeatedly.

### Creating one

1. Go to <https://github.com/settings/personal-access-tokens>.
2. Create a **fine-grained** token.
3. Give it **no** repository access and **no** permissions at all. Reading a public repository
   needs none — the token exists only to identify the request. A token with no permissions
   cannot do any damage if it leaks.
4. Set an expiry, and put a reminder in your calendar to rotate it.

### Using it in production

```shell
npx wrangler secret put GITHUB_TOKEN
```

The value is stored encrypted by Cloudflare. It is never written to this repository.

### Using it locally

Copy `.dev.vars.example` to `.dev.vars` and put the token in there. `.dev.vars` is git-ignored.

For the integration tests, export it instead:

```shell
GITHUB_TOKEN=github_pat_... npm run test:integration
```

## Pointing at a different blog repository

The repository, branch, and directory are set in `defaultBlogSource` in
[`../src/lib/blog.ts`](../src/lib/blog.ts):

```ts
export const defaultBlogSource: BlogSource = {
  owner: 'MyNameIsMikeGreen',
  repo: 'blog',
  branch: 'master',
  directory: 'posts',
  ...
};
```

Change those values, update the expectations in `tests/integration/github.test.ts`, and run
`npm run verify`.
