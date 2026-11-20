/**
 * Leonida Ledger — local static server.
 *
 * Serves the GTA 6 trophy guide app/ directory over HTTP so the module
 * scripts and JSON data load correctly from the browser. Uses only the
 * Node standard library; no build step or dependencies required.
 *
 *   node main.ts                 # serves app/ on http://localhost:8080
 *   node main.ts --port 9000     # override the port
 *   PORT=9000 node main.ts       # or use the PORT env var (yields to --port)
 */
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const SHOTS = resolve(fileURLToPath(new URL('./screenshots', import.meta.url)));
const HOST = '127.0.0.1';
const DEFAULT_PORT = 8080;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function resolvePort(): number {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--port');
  const fallback = Number(process.env.PORT) || DEFAULT_PORT;
  const requested = idx === -1 ? fallback : Number(args[idx + 1]);
  return Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : fallback;
}

function sendFile(file: string, response: import('node:http').ServerResponse): void {
  const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
  response.writeHead(200, { 'Content-Type': type, 'Content-Length': statSync(file).size });
  createReadStream(file).pipe(response);
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }

  // /screenshots/* maps to the top-level screenshots/ dir; everything else into app/.
  let base = ROOT;
  let rel = pathname;
  if (pathname === '/screenshots') {
    base = SHOTS;
    rel = '/';
  } else if (pathname.startsWith('/screenshots/')) {
    base = SHOTS;
    rel = pathname.slice('/screenshots'.length);
  }

  if (rel === '/') rel = '/index.html';
  else if (rel.endsWith('/')) rel += 'index.html';

  const file = resolve(join(base, normalize(rel)));
  if (file !== base && !file.startsWith(base + sep)) {
    response.writeHead(403).end('forbidden');
    return;
  }

  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    sendFile(file, response);
  } catch {
    response.writeHead(404).end('not found');
  }
});

server.listen(resolvePort(), HOST, () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : resolvePort();
  console.log(`Leonida Ledger serving app/ at http://${HOST}:${port}`);
});
