import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = join(root, 'screenshots');
mkdirSync(outDir, { recursive: true });

const BASE = process.env.SHOT_BASE || 'http://127.0.0.1:8377';
const CHROME = process.env.CHROME_PATH || '/opt/hermes-browser/chromium-1208/chrome-linux64/chrome';
const VIEWPORT = { width: 1280, height: 800 };

const SAVE_KEY = 'gta6trophies.v1';

const DEMO = [
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
  'Cunning Stunts',
];

// 13 of the 55 trophies earned (~24%).
const EARNED = DEMO.slice(0, 13);

function saveFor(settings) {
  return JSON.stringify({
    saveVersion: 1,
    earned: EARNED,
    settings: settings || {},
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadApp(page, hash, { spoiler = false } = {}) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  // Establish origin first, then seed localStorage, then hard-reload the target
  // hash so boot() re-runs and picks up the seeded save (a plain goto to the same
  // path only changing the hash is same-document and would not re-run boot).
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(({ key, val }) => {
    localStorage.setItem(key, val);
  }, { key: SAVE_KEY, val: saveFor({ spoiler }) });
  await page.goto(BASE + '/' + hash, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });

  // Wait for the app shell and data-driven content to render.
  await page.waitForSelector('.app', { timeout: 8000 });
  await page.waitForFunction(() => document.querySelectorAll('.trophy-card, .stage, .missable-card').length > 0, { timeout: 8000 });

  await sleep(400); // let progress bars / layout settle
  return errors;
}

const shots = [
  { file: '1-checklist-guide.jpg', hash: '#checklist', openGuide: true, label: 'Checklist with guide panel open' },
  { file: '2-roadmap.jpg', hash: '#roadmap', openGuide: false, label: 'Roadmap with stages & progress' },
  { file: '3-missables.jpg', hash: '#missables', openGuide: false, label: 'Missables list' },
  { file: '4-spoiler.jpg', hash: '#checklist', openGuide: true, spoiler: true, label: 'Checklist, spoiler mode ON, guide open' },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  defaultViewport: VIEWPORT,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});

let allErrors = false;
try {
  for (const s of shots) {
    const page = await browser.newPage();
    const errors = await loadApp(page, s.hash, { spoiler: !!s.spoiler });

    if (s.openGuide) {
      // Open a guide panel by clicking the first visible Guide button on the checklist.
      const clicked = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('.guide-btn')];
        const btn = btns.find((b) => b.offsetParent !== null);
        if (!btn) return false;
        btn.click();
        return true;
      });
      if (!clicked) errors.push('no guide button found to open');
      await page.waitForSelector('.detail-pane', { timeout: 6000 });
      await sleep(400);
    }

    const path = join(outDir, s.file);
    await page.screenshot({ path, type: 'jpeg', quality: 85 });
    console.log(`saved ${s.file} (${s.label})`);

    if (errors.length) {
      allErrors = true;
      console.error(`JS errors for ${s.file}:`);
      for (const e of errors) console.error('  ' + e);
    } else {
      console.log(`  no JS errors for ${s.file}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}

if (allErrors) process.exit(1);
