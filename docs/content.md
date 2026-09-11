# Changing the site's content

Most day-to-day changes need no knowledge of Astro. This page lists the common ones and where to
make them.

For blog posts, see [`blog.md`](blog.md) — they live in a different repository entirely.

## Links on the landing page

Everything the landing page shows lives in [`../src/lib/site.ts`](../src/lib/site.ts).

To add a link, append to `outboundLinks`:

```ts
{
  name: 'Mastodon',
  description: 'Occasional posting',
  href: 'https://mastodon.social/@example',
  icon: 'mastodon.svg',
  profile: true,
},
```

Every link needs an `icon`, and TypeScript will not let you add one without.

Set `profile: true` only when the link is a profile belonging to the site's owner. Those links are
published as `rel="me"` and as schema.org `sameAs`, both of which assert "this is the same person",
so it is not a synonym for "public". Set `privateNetworkOnly: true` for anything that only answers
on the home network; it moves the link into its own section and tells crawlers not to follow it.
See [`seo.md`](seo.md#relme-and-sameas).

### Icons

An icon is an SVG in `src/assets/icons/`, named after the link that uses it. Icons are inlined into
the page rather than loaded as images, so they are drawn in `currentColor` and follow both themes
automatically. Draw them on a `0 0 48 48` canvas with `stroke="currentColor"` and no hard-coded
colours — copy an existing one as a starting point. They are decorative, because the card already
names the link in text.

Icons depict what a service _does_ rather than who makes it — a house for Home Assistant, a
steaming pot for Platypus's recipes, angle brackets for the code on GitHub. That keeps the set
visually consistent and, deliberately, means the project reproduces nobody's logo. See
[Using other people's logos](#using-other-peoples-logos).

Unit tests check all of this: every icon must follow the theme, sit on the shared canvas, and be
used by a link. Deleting a link means deleting its icon too.

### Using other people's logos

**Don't.** The project reproduces no company's logo, and the simplest way to keep it that way is to
draw an icon instead. This section records why, so the decision does not get quietly reversed.

Company logos are trademarks, and usually copyrighted artwork as well. An open-source licence on a
project's code, or a public-domain licence on a redrawn icon set such as Simple Icons, covers the
_artwork_ — it never grants trademark rights. So the licence is not the question to ask; the brand
guidelines are, and they tend to say some combination of:

- **Do not modify the mark.** No recolouring, restyling, stretching, or CSS filters. That rules out
  the common trick of inverting a dark logo to make it visible in dark mode.
- **Do not imply endorsement.** A small link tile on a personal site is fine; anything that reads as
  a partnership badge is not.
- **Take the asset from the vendor.** Several brands, LinkedIn among them, state explicitly that
  copies found elsewhere on the web are not approved for use regardless of who is hosting them.

Meeting all of that for a handful of link tiles is more trouble than it is worth, and even a
careful reading leaves room for argument. An icon of our own drawing has none of these questions,
and the card prints the service's name in text anyway, so nothing is lost:

| Service        | What we show                 | Instead of                                                         |
| -------------- | ---------------------------- | ------------------------------------------------------------------ |
| GitHub         | Our own angle-bracket icon   | The Invertocat, which is trademarked and copyright-registered      |
| LinkedIn       | Our own "profile card" icon  | The "in" bug, usable only from assets downloaded under their terms |
| Home Assistant | Our own house-and-dial icon  | Their logo, which is Creative Commons NonCommercial-ShareAlike     |
| Zigbee2MQTT    | Our own mesh icon            | Their logo; "Zigbee" is a Connectivity Standards Alliance mark     |
| Platypus       | Our own steaming-pot icon    | Nothing — it has no logo, only a styled wordmark on its own site   |
| Jellyfin       | Our own screen-and-play icon | Its logo, which is trademarked, like other server software (e.g. Plex) |

Using a company's **name** in text is different, and fine: you cannot say where a link goes without
naming its destination.

None of this is legal advice. When a brand's guidelines are unclear, draw an icon instead — it
takes ten minutes and the question disappears.

### Private services

Add `privateNetworkOnly: true` for a service that only works on the home network.

That one flag is all the grouping needs. The landing page renders two sections — "Around the web"
and "On my home network" — and sorts the links between them by that flag, so a visitor is never
left clicking something that was never going to load for them. Private cards also get a dashed
border, which keeps the distinction visible after the section heading has scrolled off a phone
screen.

The headings and their wording live in `linkSections` in the same file. Editing them changes the
page immediately; a section with no links in it is not rendered at all, so deleting the last
private service will not leave an empty heading behind.

Each private card additionally carries the words "Private network only", hidden from sight but
read out by screen readers. Somebody tabbing from link to link never hears the section heading, so
without it they would lose the warning entirely. Do not delete it in the name of tidiness.

### Removing and reordering

To remove a link, delete its entry. Delete its logo or icon from `src/assets/` too.

Reordering the array reorders the cards within their section.

`tests/e2e/landing-page.spec.ts` asserts on the specific links currently shown and which section
each one appears in, so removing one will fail a test — deliberately, so the removal is a
conscious act. Update the test alongside the change, including the expected card count.

`tests/unit/site.test.ts` additionally checks the whole list for consistency: every link needs a
name, description and valid address; every logo needs alt text; every referenced image must exist
on disk; anything pointing at the home network must be flagged private; and every link must land
in exactly one section.

## Name, role, and description

Also in `site.ts`:

```ts
export const site = {
  name: 'Mike Green',
  role: 'Software Engineer',
  description:
    'Mike Green, a (very-skilled... and modest) software engineer based in the UK.',
  foundedYear: 2020,
  sourceRepositoryUrl: 'https://github.com/MyNameIsMikeGreen/parrot',
};
```

`description` is what search engines and messaging apps show beneath the link, so keep it a
single readable sentence.

`foundedYear` drives the footer's copyright range, which extends to the current year on its own —
it never needs updating.

## Navigation

The `navigation` array in `site.ts` controls the links in the header. An entry needs a `label` and
an `href`. The current page is marked automatically.

Adding an entry here does not create the page; add a file under `src/pages/` for that.

## Wording on a page

| Page               | File                              |
| :----------------- | :-------------------------------- |
| Landing page       | `src/pages/index.astro`           |
| Blog listing       | `src/pages/blog/index.astro`      |
| An individual post | `src/pages/blog/[slug].astro`     |
| Page not found     | `src/pages/404.astro`             |
| Header             | `src/components/SiteHeader.astro` |
| Footer             | `src/components/SiteFooter.astro` |
| `<head>`, metadata | `src/layouts/BaseLayout.astro`    |

Text between the tags is ordinary HTML. The block between the `---` markers at the top of a file
is TypeScript that runs on the server before the page is sent.

## Appearance

All styling is in one file, [`../src/styles/global.css`](../src/styles/global.css). There is no
CSS framework and no build step beyond Astro's own.

Colours are defined once as custom properties at the top of the file, using `light-dark()` so
that each is declared for both light and dark mode in a single line:

```css
--colour-text: light-dark(#1a1d21, #e7e9ea);
```

The first value is used in light mode, the second in dark. The site follows the visitor's system
setting; there is no theme switcher, which is what keeps the site free of JavaScript.

Changing the palette therefore means editing these few properties rather than hunting through
rules.

The layout uses CSS Grid and `clamp()` for type sizing, so it adapts without media-query
breakpoints in most places.

### Keep it JavaScript-free

Anything achievable in CSS should be done in CSS. Adding client-side script would require
loosening the Content Security Policy — see [`security.md`](security.md) before considering it.

### Inline styles

Do not add `<style>` blocks or `style` attributes. The Content Security Policy forbids inline
styles, so they will be ignored in production, and an end-to-end test fails if any appear.

Astro's scoped `<style>` blocks inside components are fine: they are compiled into the external
stylesheet rather than inlined.

## Favicon

`public/favicon.svg` is a small hand-written SVG. Editing it in a text editor is entirely
reasonable — it is a rounded square and two letters.

Files in `public/` are copied to the site root untouched and are not optimised, unlike
`src/assets/`.

## robots.txt

`public/robots.txt` allows everything and points crawlers at `/sitemap.xml`. Edit it directly if
you want to exclude a path. The sitemap itself is built per request from the list of posts; see
[`seo.md`](seo.md) for that and for the rest of what search engines are told.

## After any change

```shell
npm run verify
```

Then check it looks right:

```shell
npm run dev
```

Look at the site at a narrow window width as well as a wide one, and in both light and dark mode
— your operating system's appearance setting switches it.
