import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = join(root, 'screenshots');
mkdirSync(outDir, { recursive: true });

const PORT = Number(process.env.SHOT_PORT || 8377);
const BASE = process.env.SHOT_BASE || `http://127.0.0.1:${PORT}`;
const CHROME = process.env.CHROME_PATH || '/opt/hermes-browser/chromium-1208/chrome-linux64/chrome';
const VIEWPORT = { width: 1280, height: 800 };
const SAVE_KEY = 'gta6trophies.v2';

const EARNED = [
  'Just Like Paradise',
  'Paradise Lost',
  'T**s Ass Drug Money',
  'Vice City, Baby!',
  'Top Of The World, Ma',
  'Trust',
  'Break the Bank',
  'Family Matters',
  'DWNFALL',
  'Hi-Jacked',
  'Snow Storm',
  'You WAiNKer!',
  'Positive Mental Attitude',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function saveFor(settings) {
  return JSON.stringify({ saveVersion: 2, earned: EARNED, settings: settings || {} });
}

async function startServer() {
  if (process.env.SHOT_BASE) return null;
  const child = spawn(process.execPath, ['serve.ts', '--port', String(PORT)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start in time')), 8000);
    child.stdout.on('data', (buf) => {
      if (String(buf).includes('http://')) {
        clearTimeout(timer);
        resolveReady();
      }
    });
    child.stderr.on('data', (buf) => process.stderr.write(String(buf)));
    child.on('error', reject);
  });
  return child;
}

async function loadApp(page, hash, { spoiler = false } = {}) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });

  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(({ key, val }) => localStorage.setItem(key, val), {
    key: SAVE_KEY,
    val: saveFor({ spoiler }),
  });
  await page.goto(BASE + '/' + hash, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });

  await page.waitForSelector('.app', { timeout: 10000 });
  await page.waitForFunction(
    () => document.querySelector('.view-pane') && document.body.classList.contains('app-ready'),
    { timeout: 10000 },
  );
  await sleep(450);
  return errors;
}

const shots = [
  {
    file: '1-checklist-guide.jpg',
    hash: '#checklist',
    label: 'Checklist with guide panel open',
    async prepare(page) {
      await page.evaluate(() => {
        const cards = [...document.querySelectorAll('.trophy-card')];
        const target = cards.find((c) => !c.classList.contains('earned')) || cards[0];
        const btn = target && target.querySelector('.guide-btn');
        if (btn) btn.click();
      });
      await page.waitForSelector('.detail-pane', { timeout: 6000 });
      await sleep(400);
    },
  },
  { file: '2-roadmap.jpg', hash: '#roadmap', label: 'Platinum roadmap with named stages' },
  {
    file: '3-missables.jpg',
    hash: '#missables',
    label: 'Missables list with windows',
  },
  {
    file: '4-spoiler.jpg',
    hash: '#checklist',
    spoiler: true,
    label: 'Checklist with spoiler mode on',
  },
  {
    file: '5-planner.jpg',
    hash: '#planner',
    label: 'Planner with next-up sessions',
  },
];

const server = await startServer();
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  defaultViewport: VIEWPORT,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});

let anyErrors = false;
try {
  await sleep(300);
  for (const shot of shots) {
    const page = await browser.newPage();
    const errors = await loadApp(page, shot.hash, { spoiler: !!shot.spoiler });
    if (shot.prepare) await shot.prepare(page);

    const bootError = await page.evaluate(() => document.body.getAttribute('data-boot-error'));
    if (bootError) errors.push('boot error: ' + bootError);
    const renderError = await page.evaluate(() => {
      const host = document.querySelector('[data-render-error]');
      return host ? host.getAttribute('data-render-error') : null;
    });
    if (renderError) errors.push('render error: ' + renderError);

    const path = join(outDir, shot.file);
    await page.screenshot({ path, type: 'jpeg', quality: 86 });
    console.log(`saved ${shot.file} (${shot.label})`);
    if (errors.length) {
      anyErrors = true;
      console.error(`JS errors for ${shot.file}:`);
      for (const err of errors) console.error('  ' + err);
    } else {
      console.log(`  no JS errors for ${shot.file}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  if (server) server.kill('SIGTERM');
}

if (anyErrors) process.exit(1);
