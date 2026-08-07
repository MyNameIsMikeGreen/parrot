# Search engines and link previews

This page covers the parts of the site that only machines read: what search engines are told, and
what appears when someone pastes a link into a chat window. None of it is visible on screen, so it
is easy to break without noticing. [`tests/e2e/seo.spec.ts`](../tests/e2e/seo.spec.ts) exists to
catch that.

## The short version

Nothing here needs attention day to day. Publishing a post is enough: it appears in the sitemap and
gets its own description and structured data automatically, because both are derived from the post
itself.

## What each page sends

Every page carries a title, a description, a canonical address and Open Graph properties. These are
set in [`../src/layouts/BaseLayout.astro`](../src/layouts/BaseLayout.astro), which takes the
per-page parts as props.

| Property                  | Where it comes from                                     |
| ------------------------- | ------------------------------------------------------- |
| `<title>`                 | The page's own title, then the owner's name             |
| `<meta name=description>` | The page, or a blog post's opening words                |
| `<link rel=canonical>`    | The path, resolved against `site` in `astro.config.mjs` |
| `og:*`                    | The title, description and canonical address            |

The canonical address always uses the published domain, even when the site is running on
`localhost`. That is deliberate: it is the address search engines should record.

### Descriptions

A blog post describes itself with its own first paragraph, shortened to 155 characters at a word
boundary. This happens in [`../src/lib/markdown.ts`](../src/lib/markdown.ts) as part of rendering,
so a post never needs front matter to get a decent description.

Write a first paragraph that would make sense on its own in a list of search results and it will do
the right thing. A post with no prose at all falls back to a sentence built from its title.

## The sitemap

[`../src/pages/sitemap.xml.ts`](../src/pages/sitemap.xml.ts) serves `/sitemap.xml`, and
[`../public/robots.txt`](../public/robots.txt) points search engines at it.

It is built when it is requested, not when the site is built. It has to be: the list of posts lives
in the blog repository, so a file written at deploy time would be wrong the moment a post was
published. If GitHub cannot be reached, the sitemap still lists the pages that do not depend on it
rather than failing outright.

Two things it deliberately omits:

- **`<changefreq>` and `<priority>`.** Google
  [documents that it ignores both](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
- **`<lastmod>`.** The GitHub API used to list posts does not report when a file last changed, and
  Google only honours `lastmod` when it is verifiably accurate. A guessed value is worse than none.

## Structured data

[`../src/lib/structured-data.ts`](../src/lib/structured-data.ts) builds schema.org JSON-LD. Only
the types Google documents as useful are included:

| Type             | Where          | What it does                                                       |
| ---------------- | -------------- | ------------------------------------------------------------------ |
| `ProfilePage`    | Landing page   | Says whose site this is, and links the profiles that are also them |
| `BlogPosting`    | Each blog post | Titles the post and attributes it to its author                    |
| `BreadcrumbList` | Blog and posts | Produces the breadcrumb trail beneath a search result              |

`WebSite` and `Blog` are not included. Neither produces a documented search feature, and the one
that used to need `WebSite` markup (the sitelinks search box) has been retired.

### Two things to be careful of

**JSON-LD and the Content Security Policy.** The policy sets `script-src 'none'`, which looks like
it should block this. It does not. The HTML standard classifies a `<script>` with a non-JavaScript
type as a _data block_: it is never executed, so the policy's inline-script check is never reached.
The markup is still in the page for crawlers to read. There is an end-to-end test asserting both
halves of that, because it is the kind of thing somebody could "fix" by mistake.

**Escaping.** Post titles come from markdown written in another repository. Serialising them
straight into a `<script>` element would let a title containing `</script>` close the element early
and inject markup. `serialiseJsonLd` escapes angle brackets to their JSON `\u003c` form, which is
inert but parses back to the original text. Do not replace it with a bare `JSON.stringify`.

### `rel="me"` and `sameAs`

Links marked `profile: true` in [`../src/lib/site.ts`](../src/lib/site.ts) are published two ways:
as `rel="me"` on the link, and as schema.org `sameAs`. Both assert that the profile belongs to the
site's owner.

Only set it on a profile that really is theirs. It is not a synonym for "public" — a public link to
somebody else's site must not have it.

Private-network links get `rel="nofollow"` instead. A crawler cannot resolve those hostnames, so
there is no reason to send it looking.

## Pages that should not be indexed

Error pages return the right status code, which is what search engines actually act on. They also
carry `<meta name="robots" content="noindex, follow">` as a second line of defence, in case a page
that looks like ordinary content is mistaken for it. That covers the 404 page, a post that does not
exist, and the blog when GitHub cannot be reached.

Ordinary pages have no `robots` meta tag at all. Absence means "index this"; there is no need to say
so, and a test checks it stays absent.

## Known gap: no preview image

There is no `og:image`, so a shared link appears as text with no thumbnail.

Adding one means committing a raster image, because the social networks do not render SVG in
previews. The site otherwise contains no raster images at all, and the artwork is deliberately all
original line drawings. That trade was not worth making silently — if you want richer link
previews, add a 1200×630 PNG to `src/assets/`, reference it as an absolute URL from the layout, and
be aware you are reintroducing the only binary asset in the repository.

## Checking your work

The end-to-end suite covers all of the above:

```shell
npm run test:e2e -- seo
```

Against the live site, the useful external checks are Google's
[Rich Results Test](https://search.google.com/test/rich-results) for structured data and Google
Search Console for indexing and sitemap status.
