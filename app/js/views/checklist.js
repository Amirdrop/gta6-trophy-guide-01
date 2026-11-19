import { el } from '../util.js';
import { applyFilters, isMasked, describeKind, KIND_CHIPS, GRADE_CHIPS } from '../filters.js';

export function renderChecklist(ctx) {
  const list = el('section', 'view-pane checklist-pane');

  const h2 = el('h2', '', 'Trophy Checklist');
  list.appendChild(h2);

  list.appendChild(renderChipBar(ctx));

  const cards = el('div', 'checklist-grid');
  const filtered = applyFilters(ctx.trophies, ctx.filters, ctx.store, ctx.spoiler);

  if (filtered.length === 0) {
    cards.appendChild(el('div', 'empty', 'No trophies match your filters.'));
  }

  for (const t of filtered) {
    const masked = isMasked(t, ctx.store, ctx.spoiler);
    const card = el('article', 'trophy-card');
    if (ctx.store.isEarned(t.name)) {
      card.classList.add('earned');
      card.appendChild(el('span', 'earn-chip', 'Earned'));
    }

    const top = el('div', 'trophy-top');
    const badge = el('span', 'grade-badge ' + t.grade, t.grade);
    top.appendChild(badge);

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
      card.appendChild(el('p', 'trophy-desc masked', 'Earn this trophy to reveal the details.'));
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
      if (chips.childNodes.length) card.appendChild(chips);

      card.appendChild(difficultyDots(t.difficulty));

      const guide = el('button', 'guide-btn', 'Guide');
      guide.type = 'button';
      guide.addEventListener('click', () => ctx.onSelect(t));
      card.appendChild(guide);
    }
    cards.appendChild(card);
  }

  list.appendChild(cards);
  return list;
}

function renderChipBar(ctx) {
  const toolbar = el('div', 'chipbar');
  toolbar.appendChild(el('span', 'chipbar-label', 'Kind'));

  for (const k of KIND_CHIPS) {
    const b = el('button', 'chip-toggle', k.label);
    b.type = 'button';
    b.dataset.chip = 'kind';
    b.dataset.value = k.id;
    if (ctx.filters.kind === k.id) b.classList.add('active');
    b.addEventListener('click', () => ctx.onFilter({ ...ctx.filters, kind: k.id }));
    toolbar.appendChild(b);
  }

  const miss = el('button', 'chip-toggle miss', 'Missable');
  miss.type = 'button';
  miss.dataset.chip = 'missable';
  if (ctx.filters.missable) miss.classList.add('active');
  miss.addEventListener('click', () => ctx.onFilter({ ...ctx.filters, missable: !ctx.filters.missable }));
  toolbar.appendChild(miss);

  const spoil = el('button', 'chip-toggle spoil', 'Spoiler');
  spoil.type = 'button';
  spoil.dataset.chip = 'spoiler';
  if (ctx.spoiler) spoil.classList.add('active');
  spoil.addEventListener('click', () => ctx.onSpoiler(!ctx.spoiler));
  toolbar.appendChild(spoil);

  const gbar = el('div', 'chipbar gradebar');
  gbar.appendChild(el('span', 'chipbar-label', 'Grade'));
  for (const g of GRADE_CHIPS) {
    const b = el('button', 'chip-toggle ' + g.id, g.label);
    b.type = 'button';
    b.dataset.chip = 'grade';
    b.dataset.value = g.id;
    if (ctx.filters.grade === g.id) b.classList.add('active');
    b.addEventListener('click', () => ctx.onFilter({ ...ctx.filters, grade: g.id }));
    gbar.appendChild(b);
  }
  toolbar.appendChild(gbar);

  const search = el('input', 'search-box');
  search.type = 'text';
  search.placeholder = 'Search trophies...';
  search.value = ctx.filters.query || '';
  search.addEventListener('input', () => ctx.onFilter({ ...ctx.filters, query: search.value }));
  toolbar.appendChild(search);

  return toolbar;
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