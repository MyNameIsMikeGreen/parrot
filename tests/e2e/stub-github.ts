import { createServer } from 'node:http';

/**
 * A stand-in for GitHub, used by the end-to-end tests.
 *
 * Running the site against a stub keeps the tests deterministic and immune to
 * GitHub's rate limits, while still exercising the real HTTP code paths inside
 * the Worker.
 *
 * Routes:
 *   GET /__health                              readiness probe for Playwright
 *   GET /repos/:owner/:repo/git/trees/:branch  the repository listing
 *   GET /:owner/:repo/:branch/posts/:file      raw file contents
 */

const port = Number(process.env['STUB_GITHUB_PORT'] ?? 8790);

/** Markdown fixtures, keyed by filename. */
const posts: Record<string, string> = {
  'Testing_Is_Simple.md': [
    '# Testing Is Simple',
    '',
    'Testing does not have to be complicated.',
    '',
    '# Define The Boundary',
    '',
    '![Diagram](Overview.png)',
    '',
    '## A Detail',
    '',
    '```',
    'npm test',
    '```',
    '',
    // Deliberately wide, to prove a table cannot push the page sideways.
    '| Runner | Purpose | Speed | Scope | Notes |',
    '| --- | --- | --- | --- | --- |',
    '| Vitest | Unit tests of the library code | Very fast | One function | Runs offline |',
    '| Playwright | Whole site in a real browser | Slower | Whole page | Builds first |',
    '',
    // Deliberately unbreakable, to prove long strings wrap.
    'See https://example.com/a/deliberately/long/path/that/should/not/overflow/the/page/on/a/narrow/screen/at/all',
  ].join('\n'),
  "Connecting_To_Don't_Panic.md": [
    "Connecting To Don't Panic",
    '=========================',
    '',
    'Use `stunnel` to tunnel the connection.',
    '',
    '<script>window.pwned = true;</script>',
    '',
    '<img src="x" onerror="window.pwned = true">',
    '',
    '[Unsafe](javascript:alert(1))',
    '',
    '[Related](Testing_Is_Simple.md)',
  ].join('\n'),
};

/**
 * Listed in the repository but never served successfully, so the site's
 * handling of an upstream failure can be tested without global state.
 */
const unreadablePost = 'Unreadable_Post.md';

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);

  if (url.pathname === '/__health') {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('healthy');
    return;
  }

  if (url.pathname.includes('/git/trees/')) {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        tree: [
          { path: 'README.md', type: 'blob' },
          { path: 'posts', type: 'tree' },
          { path: 'posts/Overview.png', type: 'blob' },
          { path: 'posts/drafts/Not_Published.md', type: 'blob' },
          { path: `posts/${unreadablePost}`, type: 'blob' },
          ...Object.keys(posts).map((name) => ({
            path: `posts/${name}`,
            type: 'blob',
          })),
        ],
      }),
    );
    return;
  }

  const filename = decodeURIComponent(url.pathname.split('/').pop() ?? '');

  if (filename === unreadablePost) {
    response.writeHead(503, { 'Content-Type': 'text/plain' });
    response.end('Service Unavailable');
    return;
  }

  const body = posts[filename];
  if (body === undefined) {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not Found');
    return;
  }

  response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(body);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Stub GitHub listening on http://127.0.0.1:${port}`);
});
