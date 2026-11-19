import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const APP_VERSION = '1.1';

// Packaging step for the make.fun build: this validates the app/ tree against hard
// size limits, copies it (plus any screenshots) into the output directory, and emits
// a dossier.json so the runtime can present the guide. It is not run in the browser.
const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const SCREENSHOT_MAX = 4;
const SCREENSHOT_MAX_BYTES = 262144;
const APP_MAX_FILES = 993;
const APP_MAX_BYTES = 50331648;
const INDEX_MAX_BYTES = 1 << 20;

function walk(dir: string): { files: string[]; dirs: string[] } {
  const files: string[] = [];
  const dirs: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      dirs.push(p);
      const sub = walk(p);
      dirs.push(...sub.dirs);
      files.push(...sub.files);
    } else {
      files.push(p);
    }
  }
  return { files, dirs };
}

function fail(msg: string): never {
  console.error(`main.ts: ${msg}`);
  process.exit(1);
}

const appHere = join(here, 'app');
if (!existsSync(appHere)) fail('no app/ directory beside this file');

const appTree = walk(appHere);
const appEntries = appTree.files.length + appTree.dirs.length;
if (appEntries > APP_MAX_FILES) fail(`app/ has ${appEntries} files and directories, over the cap of ${APP_MAX_FILES}`);

let appBytes = 0;
for (const f of appTree.files) {
  const st = statSync(f);
  if (st.size > 0) appBytes += st.size;
}
if (appBytes > APP_MAX_BYTES) fail(`app/ is ${appBytes} bytes, over the cap of ${APP_MAX_BYTES}`);

const indexPath = join(appHere, 'index.html');
if (!existsSync(indexPath)) fail('app/index.html is missing');
if (statSync(indexPath).size > INDEX_MAX_BYTES) fail(`app/index.html is ${statSync(indexPath).size} bytes, over the cap of ${INDEX_MAX_BYTES}`);

const shotsHere = join(here, 'screenshots');
let shotBytes = 0;
if (existsSync(shotsHere)) {
  const shots = readdirSync(shotsHere).filter((n) => !n.startsWith('.'));
  if (shots.length > SCREENSHOT_MAX) fail(`${shots.length} screenshots found, over the cap of ${SCREENSHOT_MAX}`);
  for (const s of shots) {
    const b = statSync(join(shotsHere, s)).size;
    if (b > SCREENSHOT_MAX_BYTES) fail(`screenshot ${s} is ${b} bytes, over the cap of ${SCREENSHOT_MAX_BYTES}`);
    shotBytes += b;
  }
}

mkdirSync(out, { recursive: true });
cpSync(appHere, join(out, 'app'), { recursive: true });
if (existsSync(shotsHere)) cpSync(shotsHere, join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: SCREENSHOT_MAX, max_bytes: SCREENSHOT_MAX_BYTES },
  app_max_files: APP_MAX_FILES,
  app_max_bytes: APP_MAX_BYTES,
});
writeFileSync(join(out, 'dossier.json'), dossier);

console.log(`copied ${appTree.files.length} files (${appBytes} bytes app) and ${existsSync(shotsHere) ? readdirSync(shotsHere).filter((n) => !n.startsWith('.')).length : 0} screenshots (${shotBytes} bytes) to ${out}`);
if (existsSync(shotsHere)) {
  for (const s of readdirSync(shotsHere).filter((n) => !n.startsWith('.')).sort()) {
    console.log(`screenshot ${s} ${statSync(join(shotsHere, s)).size} bytes`);
  }
}
console.log(`dossier.json: ${dossier.byteLength} bytes`);