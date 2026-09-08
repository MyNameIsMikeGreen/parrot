import { CACHE_TTL_SECONDS } from './cache';
import { readTitle, renderMarkdown } from './markdown';
import { site } from './site';
import { toSlug } from './slug';

/**
 * Reads blog posts from a GitHub repository at request time.
 *
 * Posts are fetched on demand rather than at build time so that publishing a
 * post to the blog repository makes it appear on the site immediately, with no
 * redeploy. Responses are cached at the Cloudflare edge to keep the site fast
 * and to stay well inside GitHub's rate limits.
 */

export interface BlogSource {
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;
  /** Directory within the repository that contains the markdown posts. */
  readonly directory: string;
  /** Base URL of the GitHub REST API. */
  readonly apiBaseUrl: string;
  /** Base URL that serves raw file contents. */
  readonly rawBaseUrl: string;
  /** Base URL of the site that hosts the repository for humans to browse. */
  readonly webBaseUrl: string;
}

export const defaultBlogSource: BlogSource = {
  owner: 'MyNameIsMikeGreen',
  repo: 'blog',
  branch: 'master',
  directory: 'posts',
  apiBaseUrl: 'https://api.github.com',
  rawBaseUrl: 'https://raw.githubusercontent.com',
  webBaseUrl: 'https://github.com',
};

/** Link to the repository's home page, for "posts are published from here". */
export function repositoryUrl(source: BlogSource = defaultBlogSource): string {
  return `${trimSlash(source.webBaseUrl)}/${source.owner}/${source.repo}`;
}

export interface BlogOptions {
  readonly source?: BlogSource;
  /**
   * Optional GitHub personal access token. Only needs `public_repo` scope, and
   * exists purely to raise the API rate limit.
   */
  readonly token?: string | undefined;
  /** Injection point for tests. Defaults to the global `fetch`. */
  readonly fetch?: typeof fetch;
  /** How long the edge may serve a cached GitHub response, in seconds. */
  readonly cacheTtlSeconds?: number;
}

export interface BlogPostSummary {
  /** Canonical, URL-safe identifier for the post. */
  readonly slug: string;
  /** Human-readable title, taken from the post's first heading. */
  readonly title: string;
  /** Path of the markdown file within the repository. */
  readonly path: string;
  /** Link to the post's source on github.com. */
  readonly sourceUrl: string;
}

export interface BlogPost extends BlogPostSummary {
  /** Sanitised HTML body, with the title heading removed. */
  readonly html: string;
  /** Plain-text opening of the post, used as its meta description. */
  readonly excerpt: string | null;
}

/** Thrown when the blog cannot be read, e.g. GitHub is down or rate limiting. */
export class BlogUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'BlogUnavailableError';
  }
}

const DEFAULT_CACHE_TTL_SECONDS = CACHE_TTL_SECONDS;

/**
 * Lists every published post.
 *
 * The GitHub tree API exposes no dates, so posts are returned in alphabetical
 * order by title, which at least gives the listing a stable order.
 */
export async function listPosts(options: BlogOptions = {}): Promise<BlogPostSummary[]> {
  const source = options.source ?? defaultBlogSource;
  const paths = await listPostPaths(source, options);

  const posts = await Promise.all(
    paths.map(async (path) => {
      // A post that cannot be read still gets listed, using its filename as the
      // title, so one bad file never takes the whole index down.
      const markdown = await fetchRawFile(path, source, options).catch(() => null);
      return buildSummary(path, markdown === null ? null : readTitle(markdown), source);
    }),
  );

  return posts.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Lists every published post's slug, without fetching any post's body.
 *
 * `listPosts` fetches every post's raw markdown so it can read a title, which
 * is wasted work for a caller that only needs paths — the sitemap being the
 * only one. Using this instead halves the requests a sitemap crawl makes to
 * GitHub and avoids downloading content nobody reads.
 */
export async function listPostSlugs(options: BlogOptions = {}): Promise<string[]> {
  const source = options.source ?? defaultBlogSource;
  const paths = await listPostPaths(source, options);
  return paths.map((path) => toSlug(fileStem(path))).sort();
}

/**
 * Fetches and renders a single post.
 *
 * Returns `null` when no post matches, so callers can respond with a 404 rather
 * than an error page.
 */
export async function getPost(
  slug: string,
  options: BlogOptions = {},
): Promise<BlogPost | null> {
  const source = options.source ?? defaultBlogSource;
  const normalisedSlug = toSlug(slug);

  const paths = await listPostPaths(source, options);
  const path = paths.find((candidate) => toSlug(fileStem(candidate)) === normalisedSlug);
  if (path === undefined) {
    return null;
  }

  const markdown = await fetchRawFile(path, source, options);
  const { title, html, excerpt } = await renderMarkdown(markdown, {
    baseUrl: rawBaseUrl(source),
  });

  return { ...buildSummary(path, title, source), html, excerpt };
}

async function listPostPaths(
  source: BlogSource,
  options: BlogOptions,
): Promise<string[]> {
  const url = `${trimSlash(source.apiBaseUrl)}/repos/${source.owner}/${source.repo}/git/trees/${source.branch}?recursive=1`;
  const response = await cachedFetch(url, options, {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  });

  if (!response.ok) {
    throw new BlogUnavailableError(
      `GitHub returned ${response.status} when listing blog posts`,
    );
  }

  const body = (await response.json()) as { tree?: unknown };
  if (!Array.isArray(body.tree)) {
    throw new BlogUnavailableError('GitHub returned an unexpected tree listing');
  }

  return body.tree
    .filter((entry): entry is { path: string; type: string } =>
      isPostEntry(entry, source.directory),
    )
    .map((entry) => entry.path);
}

async function fetchRawFile(
  path: string,
  source: BlogSource,
  options: BlogOptions,
): Promise<string> {
  const url = new URL(encodePath(relativeTo(path, source.directory)), rawBaseUrl(source));
  const response = await cachedFetch(url.toString(), options);

  if (!response.ok) {
    throw new BlogUnavailableError(
      `GitHub returned ${response.status} when fetching ${path}`,
    );
  }

  return response.text();
}

async function cachedFetch(
  url: string,
  options: BlogOptions,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const cacheTtl = options.cacheTtlSeconds ?? DEFAULT_CACHE_TTL_SECONDS;

  const headers: Record<string, string> = {
    // GitHub asks that API clients identify themselves.
    'User-Agent': `parrot (+${site.sourceRepositoryUrl})`,
    ...extraHeaders,
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  try {
    return await fetchImpl(url, {
      headers,
      // Honoured by the Cloudflare Workers runtime and ignored elsewhere.
      cf: { cacheTtl, cacheEverything: true },
    } as RequestInit);
  } catch (cause) {
    throw new BlogUnavailableError(`Could not reach GitHub at ${url}`, { cause });
  }
}

function isPostEntry(entry: unknown, directory: string): boolean {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }
  const { path, type } = entry as { path?: unknown; type?: unknown };
  return (
    type === 'blob' &&
    typeof path === 'string' &&
    path.startsWith(`${directory}/`) &&
    path.endsWith('.md') &&
    // Only top-level files in the directory, matching the blog's flat layout.
    path.split('/').length === directory.split('/').length + 1
  );
}

function buildSummary(
  path: string,
  title: string | null,
  source: BlogSource,
): BlogPostSummary {
  const stem = fileStem(path);
  return {
    slug: toSlug(stem),
    // Fall back to the filename when a post has no heading of its own.
    title: title ?? stem.replace(/_/g, ' '),
    path,
    sourceUrl: `${repositoryUrl(source)}/blob/${source.branch}/${encodePath(path)}`,
  };
}

function rawBaseUrl(source: BlogSource): string {
  return `${trimSlash(source.rawBaseUrl)}/${source.owner}/${source.repo}/${source.branch}/${source.directory}/`;
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function relativeTo(path: string, directory: string): string {
  return path.startsWith(`${directory}/`) ? path.slice(directory.length + 1) : path;
}

function fileStem(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/i, '');
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}
