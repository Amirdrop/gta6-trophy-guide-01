import { el } from '../util.js';
import { GRADES, countByGrade } from '../data.js';

const TABS = [
  { id: 'checklist', label: 'Checklist' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'missables', label: 'Missables' },
  { id: 'planner', label: 'Planner' },
  { id: 'settings', label: 'Settings' },
];

export function renderShell(trophies, store, activeTab, onTab) {
  const header = el('header', 'site-header');

  const title = el('h1', 'site-title', 'Leonida Ledger — GTA 6 Trophy Guide');
  header.appendChild(title);

  const sub = el('p', 'site-subtitle', 'An offline guide and tracker for every Grand Theft Auto VI trophy.');
  const srcs = el('p', 'site-sources', 'Sources: Exophase & PSNProfiles · guides are our own words from the official descriptions');
  header.appendChild(sub);
  header.appendChild(srcs);

  const nav = el('nav', 'nav-tabs');
  for (const t of TABS) {
    const btn = el('button', '', t.label);
    btn.type = 'button';
    btn.title = t.label;
    if (t.id === activeTab) btn.classList.add('active');
    btn.addEventListener('click', () => onTab(t.id));
    nav.appendChild(btn);
  }
  header.appendChild(nav);

  const progress = el('section', 'progress-panel');

  const total = trophies.length || 1;
  const earned = store.earnedSize();
  const pct = Math.round((earned / total) * 100);

  const count = el('div', 'earned-count');
  count.appendChild(el('span', '', String(earned)));
  count.appendChild(el('span', 'accent', ' / ' + total));
  progress.appendChild(count);

  progress.appendChild(el('p', 'earned-label', 'Trophies earned · ' + pct + '% complete'));

  const bar = el('div', 'progress-bar');
  const fill = el('div', 'progress-bar-fill');
  fill.style.width = pct + '%';
  bar.appendChild(fill);
  progress.appendChild(bar);

  const counters = el('div', 'grade-counters');
  for (const g of GRADES) {
    const n = countByGrade(trophies, g);
    if (n === 0) continue;
    const label = g.charAt(0).toUpperCase() + g.slice(1);
    const item = el('span', 'grade-counter');
    item.appendChild(el('span', 'grade-dot ' + g));
    item.appendChild(el('span', '', label));
    item.appendChild(el('b', '', String(n)));
    counters.appendChild(item);
  }
  progress.appendChild(counters);

  header.appendChild(progress);

  return header;
}