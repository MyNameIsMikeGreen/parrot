import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { SKIP, visit } from 'unist-util-visit';

import type { Root } from 'mdast';
import type { Options as SanitiseSchema } from 'rehype-sanitize';
import type { Plugin } from 'unified';

export interface RenderOptions {
  /**
   * Absolute URL that relative links and images in the markdown are resolved
   * against, e.g. the raw content directory of the source repository.
   */
  readonly baseUrl: string;
}

export interface RenderedMarkdown {
  /** Text of the document's first top-level heading, if it had one. */
  readonly title: string | null;
  /** Sanitised HTML, safe to inject into the page. */
  readonly html: string;
  /**
   * Plain-text opening of the post, for use as its meta description. `null`
   * when the post has no prose to summarise.
   */
  readonly excerpt: string | null;
}

/** Longest meta description Google is likely to show in full. */
const EXCERPT_MAX_LENGTH = 155;

/**
 * Only these URL schemes may appear in rendered links and images. Anything else
 * (`javascript:`, `data:`, `vbscript:`, ...) is stripped by the sanitiser.
 */
const ALLOWED_PROTOCOLS = ['http', 'https', 'mailto'];

/**
 * The sanitisation schema, derived from the GitHub schema that `rehype-sanitize`
 * ships by default. It is applied as defence in depth: raw HTML embedded in
 * markdown is already discarded before this point because `remark-rehype` is
 * deliberately not configured with `allowDangerousHtml`.
 */
const schema: SanitiseSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: ALLOWED_PROTOCOLS,
    src: ALLOWED_PROTOCOLS,
    cite: ALLOWED_PROTOCOLS,
    longDesc: ALLOWED_PROTOCOLS,
  },
  attributes: {
    ...defaultSchema.attributes,
    // Open outbound links safely; `rel` is added by `hardenLinks` below.
    a: [...(defaultSchema.attributes?.a ?? []), 'rel', 'target'],
  },
};

/**
 * Finds the document's leading top-level heading, if it has one.
 *
 * Only a heading at the very start of the document is treated as the title. A
 * `#` heading further down is ordinary body content, and promoting it would
 * silently retitle the post and tear the heading out of the middle of the text.
 *
 * Nodes that render nothing are skipped first, so a post opening with an HTML
 * comment or a link reference definition still gets its title recognised.
 */
function findTitleHeadingIndex(tree: Root): number {
  const index = tree.children.findIndex(
    (node) => node.type !== 'html' && node.type !== 'definition',
  );
  if (index === -1) {
    return -1;
  }

  const node = tree.children[index];
  return node?.type === 'heading' && node.depth === 1 ? index : -1;
}

/**
 * Records the leading top-level heading as the document title and removes it
 * from the tree, so the page can render it as the sole `<h1>` without
 * duplication.
 */
const extractTitle: Plugin<[], Root> = () => (tree, file) => {
  const index = findTitleHeadingIndex(tree);
  if (index === -1) {
    return;
  }

  const [heading] = tree.children.splice(index, 1);
  file.data.title = heading === undefined ? null : toPlainText(heading).trim() || null;
};

/**
 * Records the first paragraph as a plain-text summary of the post.
 *
 * Search engines show this beneath the title, so it is taken from the post's
 * own opening words rather than generated from a template, which would give
 * every post the same description.
 *
 * Runs before the tree is converted to HTML so that markdown syntax, links and
 * emphasis are already reduced to their text.
 */
const extractExcerpt: Plugin<[], Root> = () => (tree, file) => {
  const paragraph = tree.children.find((node) => node.type === 'paragraph');
  if (paragraph === undefined) {
    return;
  }

  const text = collapseWhitespace(toPlainText(paragraph));
  file.data.excerpt = text === '' ? null : truncate(text, EXCERPT_MAX_LENGTH);
};

/**
 * Shortens text to fit a limit, breaking at a word boundary and marking the cut
 * with an ellipsis so it does not read as though the sentence simply stops.
 */
function truncate(text: string, limit: number): string {
  if (text.length <= limit) {
    return text;
  }

  const clipped = text.slice(0, limit - 1);
  const lastSpace = clipped.lastIndexOf(' ');
  // Fall back to a hard cut for text with no spaces to break on.
  const body = lastSpace > limit / 2 ? clipped.slice(0, lastSpace) : clipped;

  return `${body.replace(/[,;:.!?]+$/, '')}\u2026`;
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Shifts the document's headings so the shallowest becomes `<h2>`.
 *
 * The page renders the post title as its only `<h1>`, so leaving body headings
 * at depth 1 would produce several top-level headings. Relative nesting is
 * preserved, which keeps the document outline meaningful for screen readers.
 */
const normaliseHeadingDepths: Plugin<[], Root> = () => (tree) => {
  const depths: number[] = [];
  visit(tree, 'heading', (node) => {
    depths.push(node.depth);
  });
  if (depths.length === 0) {
    return;
  }

  const shift = 2 - Math.min(...depths);
  if (shift === 0) {
    return;
  }

  visit(tree, 'heading', (node) => {
    node.depth = Math.min(6, Math.max(1, node.depth + shift)) as typeof node.depth;
  });
};

/**
 * Resolves relative link and image targets against `baseUrl`. Markdown in the
 * blog repository refers to sibling files (e.g. `Overview.png`), which would
 * otherwise 404 once served from this site's own origin.
 */
const resolveRelativeUrls =
  (baseUrl: string): Plugin<[], Root> =>
  () =>
  (tree) => {
    visit(tree, (node) => {
      if (node.type === 'image' || node.type === 'definition') {
        node.url = resolveUrl(node.url, baseUrl);
      } else if (node.type === 'link') {
        node.url = resolveUrl(node.url, baseUrl);
      }
    });
  };

/**
 * Prevents reverse tabnabbing and referrer leakage on links that leave the site.
 */
const hardenLinks: Plugin<[], import('hast').Root> = () => (tree) => {
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'a') {
      return;
    }
    const href = node.properties?.['href'];
    if (typeof href === 'string' && /^https?:/i.test(href)) {
      node.properties = {
        ...node.properties,
        rel: ['noopener', 'noreferrer'],
        target: '_blank',
      };
    }
  });
};

/**
 * Wraps tables in a scrollable container.
 *
 * A table with several columns cannot shrink below the width of its contents,
 * so on a narrow screen it would otherwise push the whole page sideways. The
 * wrapper confines that scrolling to the table itself.
 *
 * This runs *after* sanitisation, which is safe because it only introduces a
 * fixed wrapper element and never copies anything from the source document.
 * Running it before would require allowing `div` and its class through the
 * sanitiser, which is a bigger concession than it is worth.
 */
const wrapTables: Plugin<[], import('hast').Root> = () => (tree) => {
  visit(tree, 'element', (node, index, parent) => {
    if (node.tagName !== 'table' || parent === undefined || index === undefined) {
      return;
    }
    parent.children[index] = {
      type: 'element',
      tagName: 'div',
      properties: { className: ['table-scroll'] },
      children: [node],
    };
    // Skip past the node just wrapped, rather than revisiting it.
    return [SKIP, index + 1];
  });
};

/**
 * Renders untrusted markdown into sanitised HTML.
 *
 * Raw HTML is discarded rather than passed through, and the resulting tree is
 * sanitised again before serialisation, so a compromised or careless source
 * document cannot inject scripts, iframes or event handlers into the page.
 */
export async function renderMarkdown(
  markdown: string,
  options: RenderOptions,
): Promise<RenderedMarkdown> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(extractTitle)
    .use(extractExcerpt)
    .use(normaliseHeadingDepths)
    .use(resolveRelativeUrls(options.baseUrl))
    // `allowDangerousHtml` is intentionally omitted: raw HTML nodes are dropped.
    .use(remarkRehype)
    .use(hardenLinks)
    .use(rehypeSanitize, schema)
    // Presentation only, and deliberately after the sanitiser. See above.
    .use(wrapTables)
    .use(rehypeStringify)
    .process(markdown);

  return {
    title: (file.data.title as string | undefined) ?? null,
    excerpt: (file.data.excerpt as string | undefined) ?? null,
    html: String(file),
  };
}

/**
 * Reads the title of a markdown document without rendering its body.
 *
 * Used by the blog listing, which needs titles but not HTML.
 */
export function readTitle(markdown: string): string | null {
  const tree = unified().use(remarkParse).parse(markdown) as Root;
  const index = findTitleHeadingIndex(tree);
  if (index === -1) {
    return null;
  }
  const heading = tree.children[index];
  return heading === undefined ? null : toPlainText(heading).trim() || null;
}

function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    // Leave unparseable targets alone; the sanitiser removes anything unsafe.
    return url;
  }
}

function toPlainText(node: unknown): string {
  if (typeof node !== 'object' || node === null) {
    return '';
  }
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map(toPlainText).join('');
  }
  return '';
}
