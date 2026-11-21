/**
 * views/shell.js - the site header: brand row, progress summary panel and
 * the nav tabs. Everything reads from the frozen context bag; every click
 * goes back through actions.
 */
import { el, button } from '../util.js';
import { GRADES } from '../data.js';
import { isMaskedStory } from '../filters.js';

const TABS = [
  { id: 'checklist', label: 'Checklist', key: '1' },
  { id: 'roadmap', label: 'Roadmap', key: '2' },
  { id: 'missables', label: 'Missables', key: '3' },
  { id: 'planner', label: 'Planner', key: '4' },
  { id: 'settings', label: 'Settings', key: '5' },
];

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function tabBadge(id, summary) {
  if (id === 'missables') return summary.missables.remaining || null;
  if (id === 'roadmap') return summary.stageCount ? summary.completeStages + '/' + summary.stageCount : null;
  if (id === 'planner') return summary.total - summary.earned || null;
  return null;
}

function statChip(label, value, tone) {
  const chip = el('span', 'stat-chip' + (tone ? ' ' + tone : ''));
  chip.appendChild(el('b', '', String(value)));
  chip.appendChild(document.createTextNode(' ' + label));
  return chip;
}

function renderSummaryStats(summary) {
  const wrap = el('div', 'summary-stats');
  wrap.appendChild(statChip('remaining', summary.total - summary.earned, 'good'));
  wrap.appendChild(statChip('stages left', summary.stageCount - summary.completeStages, ''));
  if (summary.missables.total) {
    wrap.appendChild(statChip('missables left', summary.missables.remaining, summary.missables.remaining ? 'danger' : 'good'));
  }
  if (summary.hours.remaining > 0) {
    wrap.appendChild(statChip('time left', '~' + summary.hours.remainingText, 'time'));
  }
  return wrap;
}

/** "Next up" pill: the first unearned trophy in roadmap order, masked-safe. */
function renderNextUpPill(ctx) {
  const summary = ctx.summary;
  if (summary.isComplete || !summary.nextTrophy) return null;
  const next = summary.nextTrophy;
  const masked = isMaskedStory(next, ctx.store, ctx.spoiler) && !ctx.isRevealed(next.name);
  const open = button('meta-pill next', 'Next up: ' + (masked ? 'Hidden story trophy' : next.name), () =>
    ctx.actions.select(next),
  );
  open.setAttribute('aria-label', 'Open guide for ' + (masked ? 'the next story trophy' : next.name));
  return open;
}

function renderProgress(ctx) {
  const { model, summary, spoiler } = ctx;

  const panel = el('section', 'progress-panel');
  panel.setAttribute('aria-label', 'Platinum progress summary');

  const ring = el('div', 'progress-ring');
  ring.style.setProperty('--pct', String(summary.percent));
  const ringInner = el('div', 'progress-ring-inner');
  ringInner.appendChild(el('strong', 'progress-ring-num', summary.percent + '%'));
  ringInner.appendChild(el('span', 'progress-ring-sub', 'platinum'));
  ring.appendChild(ringInner);
  panel.appendChild(ring);

  const body = el('div', 'progress-body');
  const head = el('div', 'progress-head');
  const count = el('div', 'earned-count');
  count.appendChild(el('span', '', String(summary.earned)));
  count.appendChild(el('span', 'accent', ' / ' + summary.total));
  head.appendChild(count);
  head.appendChild(el('span', 'earned-label', 'trophies earned'));
  body.appendChild(head);

  const bar = el('div', 'progress-bar');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuenow', String(summary.percent));
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.setAttribute('aria-label', summary.percent + '% platinum progress');
  const fill = el('div', 'progress-bar-fill');
  fill.style.width = summary.percent + '%';
  bar.appendChild(fill);
  body.appendChild(bar);

  const counters = el('div', 'grade-counters');
  for (const g of GRADES) {
    const got = summary.grades[g] || 0;
    const total = model.gradeCounts[g] || 0;
    if (!total) continue;
    const item = el('span', 'grade-counter');
    item.appendChild(el('span', 'grade-dot ' + g));
    item.appendChild(el('span', '', gradeLabel(g)));
    item.appendChild(el('b', '', got + '/' + total));
    counters.appendChild(item);
  }
  body.appendChild(counters);

  const meta = el('div', 'progress-meta');
  if (summary.missables.total) {
    const m = el('span', 'meta-pill missable' + (summary.missables.remaining === 0 ? ' done' : ''));
    m.textContent = summary.missables.remaining ? summary.missables.remaining + ' missables left' : 'All missables secured';
    meta.appendChild(m);
  }
  const nextUp = renderNextUpPill(ctx);
  if (nextUp) meta.appendChild(nextUp);
  if (spoiler) {
    meta.appendChild(el('span', 'meta-pill spoiler', 'Spoiler mode on'));
  }
  if (summary.isComplete) {
    meta.appendChild(el('span', 'meta-pill done', 'Platinum earned'));
  } else if (summary.hours.remaining > 0) {
    meta.appendChild(el('span', 'meta-pill time', '~' + summary.hours.remainingText + ' left'));
  }
  body.appendChild(meta);
  body.appendChild(renderSummaryStats(summary));

  panel.appendChild(body);
  return panel;
}

/** Render the full site header from the context bag. */
export function renderShell(ctx) {
  const { model, summary, tab: activeTab, spoiler } = ctx;
  const header = el('header', 'site-header');

  const titleRow = el('div', 'site-title-row');
  const brand = el('div', 'brand');
  brand.appendChild(el('span', 'brand-kicker', 'Leonida Ledger'));
  brand.appendChild(el('h1', 'site-title', 'GTA 6 Trophy Guide'));
  brand.appendChild(el('span', 'brand-count', model.trophies.length + ' trophies  \u00b7  1 platinum'));
  titleRow.appendChild(brand);

  const actions = el('div', 'header-actions');
  const spoilerBtn = button(
    'toggle-pill spoiler-pill' + (spoiler ? ' active' : ''),
    spoiler ? 'Spoilers hidden' : 'Spoilers visible',
    () => ctx.actions.setSpoiler(!spoiler),
  );
  spoilerBtn.setAttribute('aria-pressed', String(!!spoiler));
  spoilerBtn.title = 'Toggle spoiler mode (S)';
  actions.appendChild(spoilerBtn);

  const helpBtn = button('toggle-pill help-pill', '?', () => ctx.actions.toggleHelp(true));
  helpBtn.setAttribute('aria-label', 'Show keyboard shortcuts');
  helpBtn.title = 'Keyboard shortcuts (?)';
  actions.appendChild(helpBtn);

  actions.appendChild(el('span', 'kbd-hint', '1-5 tabs  \u00b7  S spoilers  \u00b7  / search  \u00b7  ? help'));
  titleRow.appendChild(actions);
  header.appendChild(titleRow);

  header.appendChild(renderProgress(ctx));

  const nav = el('nav', 'nav-tabs');
  nav.setAttribute('aria-label', 'Guide sections');
  for (const t of TABS) {
    const tabButton = button('tab' + (t.id === activeTab ? ' active' : ''), '', () => ctx.actions.setTab(t.id));
    tabButton.setAttribute('aria-current', t.id === activeTab ? 'page' : 'false');
    tabButton.title = t.label + ' (press ' + t.key + ')';
    tabButton.appendChild(el('span', 'tab-label', t.label));
    const badge = tabBadge(t.id, summary);
    if (badge != null) tabButton.appendChild(el('span', 'tab-badge', String(badge)));
    nav.appendChild(tabButton);
  }
  header.appendChild(nav);

  return header;
}
