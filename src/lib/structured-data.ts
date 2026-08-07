import { outboundLinks, site } from './site';

/**
 * schema.org structured data, expressed as JSON-LD.
 *
 * Google reads this to work out who the site belongs to and how its pages
 * relate to one another. Only the types Google documents as useful are built
 * here: `ProfilePage` for the landing page, `BlogPosting` for a post, and
 * `BreadcrumbList`, which is the one of the three that produces a visible
 * breadcrumb trail in search results.
 */

/** A JSON-LD document, ready to be serialised into the page. */
export type JsonLd = Record<string, unknown>;

/** URLs of the owner's profiles elsewhere, for schema.org's `sameAs`. */
export function profileUrls(): string[] {
  return outboundLinks.filter((link) => link.profile).map((link) => link.href);
}

function absolute(path: string, origin: URL | string): string {
  return new URL(path, origin).href;
}

function person(origin: URL | string): JsonLd {
  return {
    '@type': 'Person',
    name: site.name,
    jobTitle: site.role,
    url: absolute('/', origin),
    sameAs: profileUrls(),
  };
}

/**
 * The landing page: an "about me" page, which is one of the uses Google
 * documents `ProfilePage` for.
 */
export function profilePageSchema(origin: URL | string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: person(origin),
  };
}

/** Longest `headline` Google accepts on an Article before it stops being valid. */
const HEADLINE_MAX_LENGTH = 110;

export function blogPostingSchema(
  post: { title: string; excerpt: string | null },
  pageUrl: string,
  origin: URL | string,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: headline(post.title),
    ...(post.excerpt ? { description: post.excerpt } : {}),
    inLanguage: 'en-GB',
    mainEntityOfPage: pageUrl,
    url: pageUrl,
    // Pointing the author at the landing page ties a post to the ProfilePage
    // there, which is the association Google's documentation recommends.
    author: {
      '@type': 'Person',
      name: site.name,
      url: absolute('/', origin),
    },
  };
}

/**
 * Fits a post's title to the length Google accepts for a headline.
 *
 * An over-long headline invalidates the whole item rather than being trimmed by
 * Google, so a very long title is cut at a word boundary here. The page still
 * shows the full title; only the machine-readable copy is shortened.
 */
function headline(title: string): string {
  if (title.length <= HEADLINE_MAX_LENGTH) {
    return title;
  }

  const clipped = title.slice(0, HEADLINE_MAX_LENGTH - 1);
  const lastSpace = clipped.lastIndexOf(' ');

  return `${lastSpace > HEADLINE_MAX_LENGTH / 2 ? clipped.slice(0, lastSpace) : clipped}\u2026`;
}

/** A trail of pages leading to the current one, e.g. Home > Blog > Post. */
export function breadcrumbSchema(
  trail: readonly { name: string; path: string }[],
  origin: URL | string,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.path, origin),
    })),
  };
}

/**
 * Serialises JSON-LD for embedding in a `<script type="application/ld+json">`.
 *
 * Post titles come from markdown written elsewhere, so `<` is escaped to stop a
 * title containing `</script>` from closing the element early and injecting
 * markup into the page. The escapes are ordinary JSON string escapes, so the
 * result still parses as the same document.
 */
export function serialiseJsonLd(documents: readonly JsonLd[]): string {
  return JSON.stringify(documents.length === 1 ? documents[0] : documents)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
