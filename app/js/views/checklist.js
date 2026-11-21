import { el, button } from '../util.js';
import {
  isMaskedStory,
  KIND_CHIPS,
  GRADE_CHIPS,
  DIFFICULTY_CHIPS,
  STATUS_CHIPS,
  SORT_CHOICES,
  activeFilterCount,
  isDefaultFilters,
} from '../filters.js';
import { difficultyLabel, durationText, KIND_LABELS } from '../data.js';

/**
 * renderChecklist - the trophy list tab: header with counts, a missables
 * banner, the filter/search toolbar and the responsive trophy card grid.
 * All state arrives on the frozen context bag; all mutations call actions.
 */
export function renderChecklist(ctx) {
  const pane = el('section', 'view-pane checklist-pane');
  pane.appendChild(renderHeader(ctx));
  pane.appendChild(renderMissableBanner(ctx));
  pane.appendChild(renderControls(ctx));
  pane.appendChild(renderResultsMeta(ctx));
  pane.appendChild(renderCards(ctx));
  return pane;
}

function renderHeader(ctx) {
  const head = el('div', 'checklist-header');
  const titleWrap = el('div');
  titleWrap.appendChild(el('h2', '', 'Trophy Checklist'));
  titleWrap.appendChild(el('p', 'pane-sub', 'Every trophy in order. Tick one off as you earn it.'));

  const summary = ctx.summary;
  const sub = el('div', 'header-counts');
  sub.appendChild(el('span', 'count earned', summary.earned + ' earned'));
  sub.appendChild(el('span', 'count remaining', (summary.total - summary.earned) + ' remaining'));
  if (summary.missables.remaining) {
    sub.appendChild(el('span', 'count missable', summary.missables.remaining + ' missable'));
  }
  titleWrap.appendChild(sub);
  head.appendChild(titleWrap);

  head.appendChild(el('span', 'checklist-count',
    summary.earned + ' / ' + summary.total + ' earned'));
  return head;
}

function renderMissableBanner(ctx) {
  const open = ctx.missables.filter((t) => !ctx.store.isEarned(t.name));
  const banner = el('div', 'missable-banner' + (open.length ? '' : ' clear'));

  if (!open.length) {
    banner.appendChild(el('span', 'missable-banner-icon', 'OK'));
    banner.appendChild(el('span', '', 'No missable trophies left to worry about.'));
    return banner;
  }

  banner.appendChild(el('span', 'missable-banner-icon', '!'));
  const text = el('span', 'missable-banner-text');
  text.appendChild(el('strong', '', open.length + ' missable troph' + (open.length === 1 ? 'y' : 'ies')));
  text.appendChild(document.createTextNode(' can be permanently lost if you pass the window.'));
  banner.appendChild(text);

  const names = el('div', 'missable-banner-names');
  for (const t of open.slice(0, 3)) {
    names.appendChild(el('span', 'missable-banner-name', t.name));
  }
  if (open.length > 3) names.appendChild(el('span', 'missable-banner-more', '+' + (open.length - 3) + ' more'));
  banner.appendChild(names);

  banner.appendChild(button('chip-toggle miss jump-missables', 'Show only missables', () => {
    ctx.actions.jumpToMissables();
  }));
  return banner;
}

function renderControls(ctx) {
  const toolbar = el('div', 'chipbar');

  toolbar.appendChild(renderChipGroup('Category', 'kind', KIND_CHIPS, ctx));
  toolbar.appendChild(renderChipGroup('Status', 'status', STATUS_CHIPS, ctx));
  toolbar.appendChild(renderChipGroup('Grade', 'grade', GRADE_CHIPS, ctx));
  toolbar.appendChild(renderChipGroup('Difficulty', 'difficulty', DIFFICULTY_CHIPS, ctx));

  const fav = button(
    'chip-toggle fav' + (ctx.filters.favorite ? ' active' : ''),
    ctx.store.favoriteCount() ? 'Starred (' + ctx.store.favoriteCount() + ')' : 'Starred',
    () => ctx.actions.setFilters({ favorite: !ctx.filters.favorite }),
  );
  fav.setAttribute('aria-pressed', String(!!ctx.filters.favorite));
  fav.title = 'Show only trophies you have starred';
  toolbar.appendChild(fav);

  const miss = button(
    'chip-toggle missable' + (ctx.filters.missable ? ' active' : ''),
    'Missable only',
    () => ctx.actions.setFilters({ missable: !ctx.filters.missable }),
  );
  miss.setAttribute('aria-pressed', String(!!ctx.filters.missable));
  toolbar.appendChild(miss);

  const end = el('div', 'toolbar-end');

  const searchWrap = el('label', 'search-wrap');
  searchWrap.setAttribute('aria-label', 'Search trophies');
  searchWrap.appendChild(el('span', 'search-icon', '/'));
  const search = el('input', 'search-box');
  search.type = 'search';
  search.placeholder = 'Search trophies';
  search.setAttribute('aria-label', 'Search trophies');
  search.value = ctx.filters.query || '';
  search.addEventListener('input', () => ctx.actions.setFilters({ query: search.value }));
  searchWrap.appendChild(search);
  end.appendChild(searchWrap);

  const sortWrap = el('label', 'sort-control');
  sortWrap.appendChild(el('span', 'sort-label', 'Sort'));
  const select = document.createElement('select');
  select.className = 'sort-select';
  select.setAttribute('aria-label', 'Sort trophies');
  for (const choice of SORT_CHOICES) {
    const opt = document.createElement('option');
    opt.value = choice.id;
    opt.textContent = choice.label;
    select.appendChild(opt);
  }
  select.value = ctx.filters.sort;
  select.addEventListener('change', () => ctx.actions.setFilters({ sort: select.value }));
  sortWrap.appendChild(select);

  const dir = button('chip-toggle sort-dir', ctx.filters.orderAsc ? 'Asc' : 'Desc', () =>
    ctx.actions.setFilters({ orderAsc: !ctx.filters.orderAsc }),
  );
  dir.title = 'Toggle sort direction';
  dir.setAttribute('aria-label', 'Sort direction: ' + (ctx.filters.orderAsc ? 'ascending' : 'descending'));
  sortWrap.appendChild(dir);
  end.appendChild(sortWrap);

  const active = activeFilterCount(ctx.filters);
  if (!isDefaultFilters(ctx.filters)) {
    const reset = button('chip-toggle reset-filters', 'Reset' + (active ? ' (' + active + ')' : ''), () =>
      ctx.actions.resetFilters(),
    );
    reset.setAttribute('aria-label', 'Reset filters');
    end.appendChild(reset);
  }

  toolbar.appendChild(end);
  return toolbar;
}

function renderChipGroup(label, key, chips, ctx) {
  const group = el('div', 'chipgroup');
  group.appendChild(el('span', 'chipbar-label', label));
  for (const chip of chips) {
    const active = ctx.filters[key] === chip.id;
    const node = button('chip-toggle' + (chip.id === 'all' ? ' all' : '') + (active ? ' active' : ''), chip.label, () =>
      ctx.actions.setFilters({ [key]: chip.id }),
    );
    node.setAttribute('aria-pressed', String(active));
    group.appendChild(node);
  }
  return group;
}

function renderResultsMeta(ctx) {
  const results = ctx.visible;
  const meta = el('div', 'results-meta');
  meta.appendChild(document.createTextNode('Showing '));
  meta.appendChild(el('strong', '', String(results.length)));
  meta.appendChild(document.createTextNode(' of ' + ctx.trophies.length + ' trophies'));
  if (ctx.spoiler && ctx.trophies.some((t) => isMaskedStory(t, ctx.store, ctx.spoiler))) {
    meta.appendChild(el('span', 'spoiler-note', 'Spoilers hidden'));
  }
  return meta;
}

function renderCards(ctx) {
  const results = ctx.visible;
  const grid = el('div', 'checklist-grid');

  if (!results.length) {
    const empty = el('div', 'empty');
    empty.appendChild(el('h3', '', 'No trophies match'));
    empty.appendChild(el('p', '', 'Try clearing a filter or resetting the search.'));
    empty.appendChild(button('btn', 'Reset filters', () => ctx.actions.resetFilters()));
    grid.appendChild(empty);
    return grid;
  }

  for (const trophy of results) grid.appendChild(renderCard(ctx, trophy));
  return grid;
}

function renderCard(ctx, t) {
  const earned = ctx.store.isEarned(t.name);
  const revealed = ctx.isRevealed(t.name);
  const masked = isMaskedStory(t, ctx.store, ctx.spoiler) && !revealed;

  const card = el('article', 'trophy-card grade-' + t.grade + (earned ? ' earned' : '') + (t.missable ? ' is-missable' : ''));
  card.dataset.id = String(t.id);
  card.dataset.name = t.name;
  card.appendChild(el('div', 'trophy-accent'));

  const top = el('div', 'trophy-top');
  top.appendChild(el('span', 'grade-badge ' + t.grade, t.grade));
  if (t.missable && !earned) top.appendChild(el('span', 'chip missable', 'Missable'));
  if (earned) top.appendChild(el('span', 'earn-chip', 'Earned'));
  top.appendChild(renderStar(ctx, t));
  top.appendChild(renderCheck(ctx, t, earned));
  card.appendChild(top);

  if (masked) {
    const hidden = el('div', 'trophy-hidden');
    hidden.appendChild(el('h3', 'trophy-name masked', 'Hidden story trophy'));
    hidden.appendChild(el('p', 'trophy-desc', 'Turn off spoiler mode to reveal the name, description and guide.'));
    card.appendChild(hidden);

    const reveal = button('guide-btn reveal-btn', 'Reveal', () => ctx.actions.revealTrophy(t.name));
    reveal.setAttribute('aria-label', 'Reveal ' + t.name);
    card.appendChild(reveal);
    return card;
  }

  const nameBtn = el('button', 'trophy-name', t.name);
  nameBtn.type = 'button';
  nameBtn.setAttribute('aria-label', 'Open guide for ' + t.name);
  nameBtn.addEventListener('click', () => ctx.actions.select(t));
  card.appendChild(nameBtn);

  if (t.description) card.appendChild(el('p', 'trophy-desc clamp', t.description));

  const chips = renderChips(t);
  if (chips) card.appendChild(chips);

  card.appendChild(renderCardMeta(t));

  const guide = button('guide-btn', 'Guide', () => ctx.actions.select(t));
  guide.setAttribute('aria-label', 'Open guide for ' + t.name);
  card.appendChild(guide);

  return card;
}

function renderCheck(ctx, t, earned) {
  const wrap = el('label', 'earn-check');
  wrap.title = earned ? 'Unmark as earned' : 'Mark as earned';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = earned;
  cb.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
  cb.addEventListener('change', () => ctx.actions.toggle(t.name));
  wrap.appendChild(cb);
  return wrap;
}

/** Star toggle that feeds the "Starred" quick filter. */
function renderStar(ctx, t) {
  const starred = ctx.store.isFavorite(t.name);
  const node = button('star-toggle' + (starred ? ' active' : ''), starred ? '\u2605' : '\u2606', () =>
    ctx.actions.toggleFavorite(t.name),
  );
  node.setAttribute('aria-label', starred ? 'Unstar ' + t.name : 'Star ' + t.name);
  node.title = starred ? 'Remove star (F)' : 'Star this trophy (F)';
  return node;
}

function renderChips(t) {
  const chips = el('div', 'chips');
  if (t.hidden) chips.appendChild(el('span', 'chip hidden', 'Hidden'));
  if (t.count) chips.appendChild(el('span', 'chip count', '0 / ' + t.count.target + ' ' + t.count.label));
  if (t.kind) chips.appendChild(el('span', 'chip kind', KIND_LABELS[t.kind] || t.kind));
  if (t.stage != null) chips.appendChild(el('span', 'chip chip-stage', 'Stage ' + t.stage));
  for (const tag of t.tags || []) chips.appendChild(el('span', 'chip tag', tag));
  return chips.childNodes.length ? chips : null;
}

function renderCardMeta(t) {
  const meta = el('div', 'card-meta');
  meta.appendChild(difficultyDots(t.difficulty, true));
  meta.appendChild(el('span', t.difficulty != null ? 'meta-diff' : 'meta-diff muted',
    t.difficulty != null ? difficultyLabel(t.difficulty) : 'Difficulty unknown'));

  const time = durationText(t);
  if (time && time !== '-') {
    const timeEl = el('span', 'meta-time', time);
    timeEl.title = 'Estimated time to earn';
    meta.appendChild(timeEl);
  }
  return meta;
}

/** Five-dot difficulty meter, shared by cards, rows and the detail pane. */
export function difficultyDots(n, compact) {
  const wrap = el('span', 'diff-dots' + (compact ? ' compact' : ''));
  const value = n == null ? 0 : Math.max(0, Math.min(5, Math.round(n)));
  for (let i = 1; i <= 5; i++) wrap.appendChild(el('span', 'diff-dot' + (i <= value ? ' on' : '')));
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', 'Difficulty ' + value + ' of 5');
  wrap.title = 'Difficulty ' + value + ' / 5';
  return wrap;
}
