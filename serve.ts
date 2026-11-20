/**
 * Leonida Ledger — alternative local static server.
 *
 * A minimal, standard-library-only static server for local development. It serves
 * the app/ directory (the guide itself) plus the top-level screenshots/ folder
 * under /screenshots/* so captured preview images are also viewable locally.
 *
 * This is the server to pair with scripts/shoot.mjs, whose default target is
 * http://127.0.0.1:8377. Run it on that port (or point SHOT_BASE elsewhere):
 *
 *   node serve.ts --port 8377
 *
 * Port precedence: --port flag, then the PORT env var, then 8080.
 */
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = resolve(fileURLToPath(new URL('./app', import.meta.url)));
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
};

function resolvePort(): number {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--port');
  const fallback = Number(process.env.PORT) || DEFAULT_PORT;
  const requested = idx === -1 ? fallback : Number(args[idx + 1]);
  return Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : fallback;
}

const server = createServer((request, response) => {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }

  // /screenshots/* maps to the top-level screenshots/ dir; everything else into app/.
  let base = APP;
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
    const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': type, 'Content-Length': stats.size });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end('not found');
  }
});

server.listen(resolvePort(), HOST, () => {
  console.log(`Leonida Ledger dev server: http://${HOST}:${resolvePort()} (app/ · screenshots under /screenshots/*)`);
});
