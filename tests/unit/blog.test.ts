import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BlogUnavailableError,
  getPost,
  listPosts,
  repositoryUrl,
} from '../../src/lib/blog';

import type { BlogSource } from '../../src/lib/blog';

const source: BlogSource = {
  owner: 'test-owner',
  repo: 'test-repo',
  branch: 'main',
  directory: 'posts',
  apiBaseUrl: 'https://api.github.com',
  rawBaseUrl: 'https://raw.githubusercontent.com',
  webBaseUrl: 'https://github.com',
};

const treeUrl =
  'https://api.github.com/repos/test-owner/test-repo/git/trees/main?recursive=1';
const rawBase = 'https://raw.githubusercontent.com/test-owner/test-repo/main/posts/';

interface StubTree {
  path: string;
  type: string;
}

/**
 * Builds a `fetch` stand-in that serves a fake repository, so tests exercise the
 * real request/parse logic without touching the network.
 */
function stubGitHub(options: {
  tree?: StubTree[];
  files?: Record<string, string>;
  treeStatus?: number;
  fileStatus?: number;
}): typeof fetch {
  const tree = options.tree ?? [];
  const files = options.files ?? {};

  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url === treeUrl) {
      return new Response(JSON.stringify({ tree }), {
        status: options.treeStatus ?? 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.startsWith(rawBase)) {
      const name = decodeURIComponent(url.slice(rawBase.length));
      const body = files[name];
      if (body === undefined || options.fileStatus !== undefined) {
        return new Response('Not Found', { status: options.fileStatus ?? 404 });
      }
      return new Response(body, { status: 200 });
    }

    throw new Error(`Unexpected request to ${url}`);
  }) as unknown as typeof fetch;
}

const defaultTree: StubTree[] = [
  { path: 'README.md', type: 'blob' },
  { path: 'posts', type: 'tree' },
  { path: 'posts/First_Post.md', type: 'blob' },
  { path: 'posts/Another_Post.md', type: 'blob' },
  { path: 'posts/Diagram.png', type: 'blob' },
  { path: 'posts/drafts/Hidden.md', type: 'blob' },
];

const defaultFiles = {
  'First_Post.md': '# First Post\n\nHello from the first post.',
  'Another_Post.md': 'Another Post\n============\n\nHello again.',
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('listPosts', () => {
  it('lists only top-level markdown files in the posts directory', async () => {
    const posts = await listPosts({
      source,
      fetch: stubGitHub({ tree: defaultTree, files: defaultFiles }),
    });

    expect(posts.map((post) => post.path)).toEqual([
      'posts/Another_Post.md',
      'posts/First_Post.md',
    ]);
  });

  it('uses the post heading as the title and derives a slug from the filename', async () => {
    const posts = await listPosts({
      source,
      fetch: stubGitHub({ tree: defaultTree, files: defaultFiles }),
    });

    expect(posts).toEqual([
      {
        slug: 'another-post',
        title: 'Another Post',
        path: 'posts/Another_Post.md',
        sourceUrl:
          'https://github.com/test-owner/test-repo/blob/main/posts/Another_Post.md',
      },
      {
        slug: 'first-post',
        title: 'First Post',
        path: 'posts/First_Post.md',
        sourceUrl:
          'https://github.com/test-owner/test-repo/blob/main/posts/First_Post.md',
      },
    ]);
  });

  it('falls back to the filename when a post has no heading', async () => {
    const posts = await listPosts({
      source,
      fetch: stubGitHub({
        tree: [{ path: 'posts/No_Heading_Here.md', type: 'blob' }],
        files: { 'No_Heading_Here.md': 'Just prose.' },
      }),
    });

    expect(posts[0]?.title).toBe('No Heading Here');
  });

  it('still lists a post whose contents cannot be fetched', async () => {
    const posts = await listPosts({
      source,
      fetch: stubGitHub({
        tree: [{ path: 'posts/Unreadable_Post.md', type: 'blob' }],
        files: {},
      }),
    });

    expect(posts).toHaveLength(1);
    expect(posts[0]?.title).toBe('Unreadable Post');
  });

  it('returns an empty list when the repository has no posts', async () => {
    const posts = await listPosts({
      source,
      fetch: stubGitHub({ tree: [{ path: 'README.md', type: 'blob' }] }),
    });

    expect(posts).toEqual([]);
  });

  it('sends an Authorization header when a token is supplied', async () => {
    const fetchSpy = stubGitHub({ tree: [] });

    await listPosts({ source, fetch: fetchSpy, token: 'example-token-not-a-credential' });

    const [, init] = vi.mocked(fetchSpy).mock.calls[0] ?? [];
    expect((init?.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer example-token-not-a-credential',
    );
  });

  it('omits the Authorization header when no token is supplied', async () => {
    const fetchSpy = stubGitHub({ tree: [] });

    await listPosts({ source, fetch: fetchSpy });

    const [, init] = vi.mocked(fetchSpy).mock.calls[0] ?? [];
    expect(init?.headers as Record<string, string>).not.toHaveProperty('Authorization');
  });

  it('reports the blog as unavailable when GitHub rate limits the request', async () => {
    await expect(
      listPosts({ source, fetch: stubGitHub({ treeStatus: 403 }) }),
    ).rejects.toBeInstanceOf(BlogUnavailableError);
  });

  it('reports the blog as unavailable when GitHub is unreachable', async () => {
    const failing = vi.fn(async () => {
      throw new TypeError('network error');
    }) as unknown as typeof fetch;

    await expect(listPosts({ source, fetch: failing })).rejects.toBeInstanceOf(
      BlogUnavailableError,
    );
  });

  it('reports the blog as unavailable when GitHub returns an unexpected shape', async () => {
    const malformed = vi.fn(
      async () => new Response(JSON.stringify({ message: 'nope' }), { status: 200 }),
    ) as unknown as typeof fetch;

    await expect(listPosts({ source, fetch: malformed })).rejects.toBeInstanceOf(
      BlogUnavailableError,
    );
  });
});

describe('getPost', () => {
  it('renders a post found by its canonical slug', async () => {
    const post = await getPost('first-post', {
      source,
      fetch: stubGitHub({ tree: defaultTree, files: defaultFiles }),
    });

    expect(post?.title).toBe('First Post');
    expect(post?.html).toContain('Hello from the first post.');
    expect(post?.html).not.toContain('<h1>');
  });

  it('resolves legacy filename-style slugs to the same post', async () => {
    const post = await getPost('First_Post', {
      source,
      fetch: stubGitHub({ tree: defaultTree, files: defaultFiles }),
    });

    expect(post?.slug).toBe('first-post');
  });

  it('returns null when no post matches', async () => {
    const post = await getPost('does-not-exist', {
      source,
      fetch: stubGitHub({ tree: defaultTree, files: defaultFiles }),
    });

    expect(post).toBeNull();
  });

  it('rewrites relative images to GitHub raw URLs', async () => {
    const post = await getPost('first-post', {
      source,
      fetch: stubGitHub({
        tree: [{ path: 'posts/First_Post.md', type: 'blob' }],
        files: { 'First_Post.md': '# First Post\n\n![Diagram](Diagram.png)' },
      }),
    });

    expect(post?.html).toContain(`src="${rawBase}Diagram.png"`);
  });

  it('sanitises malicious content in a post', async () => {
    const post = await getPost('first-post', {
      source,
      fetch: stubGitHub({
        tree: [{ path: 'posts/First_Post.md', type: 'blob' }],
        files: {
          'First_Post.md':
            '# First Post\n\n<script>alert("xss")</script>\n\n[Bad](javascript:alert(1))',
        },
      }),
    });

    expect(post?.html).not.toContain('<script');
    expect(post?.html).not.toContain('javascript:');
  });

  it('encodes awkward characters in filenames when fetching', async () => {
    const post = await getPost('dont-overthink-it', {
      source,
      fetch: stubGitHub({
        tree: [{ path: "posts/Don't_Overthink_It.md", type: 'blob' }],
        files: { "Don't_Overthink_It.md": "# Don't Overthink It\n\nBody." },
      }),
    });

    expect(post?.title).toBe("Don't Overthink It");
    expect(post?.sourceUrl).toBe(
      "https://github.com/test-owner/test-repo/blob/main/posts/Don't_Overthink_It.md",
    );
  });

  it('percent-encodes spaces in filenames when fetching', async () => {
    const fetchSpy = stubGitHub({
      tree: [{ path: 'posts/A Spaced Name.md', type: 'blob' }],
      files: { 'A Spaced Name.md': '# A Spaced Name\n\nBody.' },
    });

    const post = await getPost('a-spaced-name', { source, fetch: fetchSpy });

    expect(post?.title).toBe('A Spaced Name');
    expect(vi.mocked(fetchSpy).mock.calls.map(([url]) => String(url))).toContain(
      `${rawBase}A%20Spaced%20Name.md`,
    );
  });

  it('reports the blog as unavailable when the post body cannot be fetched', async () => {
    await expect(
      getPost('first-post', {
        source,
        fetch: stubGitHub({ tree: defaultTree, fileStatus: 500 }),
      }),
    ).rejects.toBeInstanceOf(BlogUnavailableError);
  });
});

describe('repositoryUrl', () => {
  it('links to the configured repository', () => {
    expect(repositoryUrl(source)).toBe('https://github.com/test-owner/test-repo');
  });

  it('honours a configured host rather than assuming github.com', () => {
    expect(repositoryUrl({ ...source, webBaseUrl: 'https://git.example.com/' })).toBe(
      'https://git.example.com/test-owner/test-repo',
    );
  });

  it('defaults to the real blog repository', () => {
    expect(repositoryUrl()).toBe('https://github.com/MyNameIsMikeGreen/blog');
  });
});
