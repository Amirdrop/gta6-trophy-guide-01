import { el } from '../util.js';
import {
  applyFilters,
  isMaskedStory,
  describeKind,
  KIND_CHIPS,
  GRADE_CHIPS,
  STATUS_CHIPS,
  SORT_CHOICES,
} from '../filters.js';

export function renderChecklist(ctx) {
  const list = el('section', 'view-pane checklist-pane');

  list.appendChild(renderHeader(ctx));
  list.appendChild(renderProgressSummary(ctx));
  list.appendChild(renderControls(ctx));
  list.appendChild(renderCards(ctx));

  return list;
}

function renderHeader(ctx) {
  const head = el('div', 'checklist-header');
  const h2 = el('h2', '', 'Trophy Checklist');
  head.appendChild(h2);
  const count = el('span', 'checklist-count', ctx.trophies.length + ' trophies');
  head.appendChild(count);
  return head;
}

function renderProgressSummary(ctx) {
  const panel = el('div', 'progress-summary');
  const total = ctx.trophies.length || 1;
  const earned = ctx.store.earnedSize();
  const pct = Math.round((earned / total) * 100);

  const bar = el('div', 'progress-summary-bar');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuenow', String(pct));
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.setAttribute('aria-label', pct + '% platinum progress');
  const fill = el('div', 'progress-summary-fill');
  fill.style.width = pct + '%';
  bar.appendChild(fill);
  panel.appendChild(bar);

  const label = el('div', 'progress-summary-label');
  label.appendChild(el('span', '', earned + ' / ' + total + ' unlocked'));
  label.appendChild(el('span', 'progress-summary-pct', pct + '% platinum progress'));
  panel.appendChild(label);

  return panel;
}

function renderControls(ctx) {
  const toolbar = el('div', 'chipbar');

  toolbar.appendChild(renderChipGroup('Category', 'kind', KIND_CHIPS, ctx.filters, ctx));
  toolbar.appendChild(renderChipGroup('Status', 'status', STATUS_CHIPS, ctx.filters, ctx));
  toolbar.appendChild(renderChipGroup('Grade', 'grade', GRADE_CHIPS, ctx.filters, ctx));

  const miss = el('button', 'chip-toggle miss', 'Missable');
  miss.type = 'button';
  if (ctx.filters.missable) miss.classList.add('active');
  miss.addEventListener('click', () => ctx.onFilter({ ...ctx.filters, missable: !ctx.filters.missable }));
  toolbar.appendChild(miss);

  const spoil = el('button', 'chip-toggle spoil', 'Spoiler');
  spoil.type = 'button';
  if (ctx.spoiler) spoil.classList.add('active');
  spoil.addEventListener('click', () => ctx.onSpoiler(!ctx.spoiler));
  toolbar.appendChild(spoil);

  const sortWrap = el('label', 'sort-control', 'Sort');
  const select = document.createElement('select');
  select.className = 'sort-select';
  for (const s of SORT_CHOICES) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
    select.appendChild(opt);
  }
  select.value = ctx.filters.sort || 'order';
  select.addEventListener('change', () => ctx.onFilter({ ...ctx.filters, sort: select.value }));
  sortWrap.appendChild(select);
  toolbar.appendChild(sortWrap);

  const search = el('input', 'search-box');
  search.type = 'text';
  search.placeholder = 'Search trophies...';
  search.value = ctx.filters.query || '';
  search.addEventListener('input', () => ctx.onFilter({ ...ctx.filters, query: search.value }));
  toolbar.appendChild(search);

  return toolbar;
}

function renderChipGroup(label, key, chips, filters, ctx) {
  const group = el('div', 'chipgroup');
  group.appendChild(el('span', 'chipbar-label', label));
  for (const c of chips) {
    const b = el('button', 'chip-toggle' + (c.id === 'all' ? ' all' : ''), c.label);
    b.type = 'button';
    if (filters[key] === c.id) b.classList.add('active');
    b.addEventListener('click', () => ctx.onFilter({ ...filters, [key]: c.id }));
    group.appendChild(b);
  }
  return group;
}

function renderCards(ctx) {
  const cards = el('div', 'checklist-grid');
  const filtered = applyFilters(ctx.trophies, ctx.filters, ctx.store, ctx.spoiler);

  if (filtered.length === 0) {
    cards.appendChild(el('div', 'empty', 'No trophies match your filters.'));
    return cards;
  }

  for (const t of filtered) {
    cards.appendChild(renderCard(ctx, t));
  }
  return cards;
}

function renderCard(ctx, t) {
  const masked = isMaskedStory(t, ctx.store, ctx.spoiler);
  const card = el('article', 'trophy-card');
  if (ctx.store.isEarned(t.name)) card.classList.add('earned');

  const top = el('div', 'trophy-top');
  const badge = el('span', 'grade-badge ' + t.grade, t.grade);
  top.appendChild(badge);
  if (ctx.store.isEarned(t.name)) {
    top.appendChild(el('span', 'earn-chip', 'Earned'));
  }

  const check = el('label', 'earn-check');
  check.title = 'Mark as earned';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = ctx.store.isEarned(t.name);
  cb.addEventListener('change', () => ctx.onToggle(t.name));
  check.appendChild(cb);
  top.appendChild(check);

  card.appendChild(top);

  if (masked) {
    card.appendChild(el('h3', 'trophy-name masked', 'Hidden — story spoiler'));
    card.appendChild(el('p', 'trophy-desc masked', 'The name and description are hidden until you earn this story trophy. Toggle Spoiler mode in Settings or via the chip to reveal them.'));
  } else {
    const name = el('button', 'trophy-name', t.name);
    name.type = 'button';
    name.addEventListener('click', () => ctx.onSelect(t));
    card.appendChild(name);
    card.appendChild(el('p', 'trophy-desc clamp', t.description));

    const chips = el('div', 'chips');
    if (t.missable) chips.appendChild(el('span', 'chip missable', 'Missable'));
    if (t.hidden) chips.appendChild(el('span', 'chip hidden', 'Hidden'));
    if (t.count) chips.appendChild(el('span', 'chip count', '0 / ' + t.count.target + ' ' + t.count.label));
    if (t.kind && t.kind !== 'normal') chips.appendChild(el('span', 'chip', describeKind(t.kind)));
    if (t.points != null) chips.appendChild(el('span', 'chip points', t.points + ' pts'));
    if (chips.childNodes.length) card.appendChild(chips);

    card.appendChild(difficultyDots(t.difficulty));

    const guide = el('button', 'guide-btn', 'Guide');
    guide.type = 'button';
    guide.addEventListener('click', () => ctx.onSelect(t));
    card.appendChild(guide);
  }

  return card;
}

export function difficultyDots(n) {
  const wrap = el('div', 'diff-dots');
  const dots = el('div', 'diff-dots-row');
  const v = n == null ? 0 : Math.max(0, Math.min(5, Math.round(n)));
  for (let i = 1; i <= 5; i++) {
    dots.appendChild(el('span', 'diff-dot' + (i <= v ? ' on' : '')));
  }
  wrap.appendChild(dots);
  wrap.title = 'Difficulty ' + v + ' / 5';
  return wrap;
}