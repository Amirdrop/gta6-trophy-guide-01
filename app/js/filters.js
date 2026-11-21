/**
 * filters.js - search, chip filters and sorting for the checklist.
 *
 * A filter object is plain data, so it can be snapshotted, reset, hashed or
 * shared without surprises:
 *
 *   { query, kind, grade, difficulty, status, missable, favorite, sort, orderAsc }
 *
 * The engine is split into small pure pieces:
 *   - `searchText(trophy)`        everything a trophy can be searched by,
 *   - `predicates(filters, opts)` the ordered predicate list to satisfy,
 *   - `sortTrophies(list, ...)`   a stable, new-array sort,
 *   - `applyFilters(trophies, filters, options)` composes both.
 *
 * `options` bundles everything the engine needs besides the trophies:
 *
 *   { store, spoiler, hideEarned, orderIndex }
 *
 * `filterKey(filters)` yields a stable string so the app can memoize the
 * filtered array cheaply.
 */

import { GRADES, KINDS, KIND_LABELS, DIFFICULTY_BANDS, gradeLabel, difficultyLabel } from './data.js';
import { includesCI } from './util.js';

export const KIND_CHIPS = [
  { id: 'all', label: 'All' },
  ...KINDS.map((id) => ({ id, label: KIND_LABELS[id] })),
];

export const GRADE_CHIPS = [
  { id: 'all', label: 'All' },
  ...GRADES.map((grade) => ({ id: grade, label: gradeLabel(grade) })),
];

/** Difficulty facets: 'all' plus the named bands defined in data.js. */
export const DIFFICULTY_CHIPS = [
  { id: 'all', label: 'Any' },
  ...DIFFICULTY_BANDS.map((band) => ({ id: band.id, label: band.label })),
];

export const STATUS_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'earned', label: 'Earned' },
  { id: 'remaining', label: 'Remaining' },
  { id: 'missable', label: 'Missable' },
];

export const SORT_CHOICES = [
  { id: 'order', label: 'Roadmap order' },
  { id: 'name', label: 'Name' },
  { id: 'rarity', label: 'Rarity' },
  { id: 'time', label: 'Estimated time' },
  { id: 'difficulty', label: 'Difficulty' },
];

export const DEFAULT_FILTERS = Object.freeze({
  query: '',
  kind: 'all',
  grade: 'all',
  difficulty: 'all',
  status: 'all',
  missable: false,
  favorite: false,
  sort: 'order',
  orderAsc: true,
});

const VALID = {
  kind: new Set([...KINDS, 'all']),
  grade: new Set([...GRADES, 'all']),
  difficulty: new Set([...DIFFICULTY_BANDS.map((b) => b.id), 'all']),
  status: new Set(['all', 'earned', 'remaining', 'missable']),
  sort: new Set(SORT_CHOICES.map((choice) => choice.id)),
};

function coerce(key, value) {
  const fallback = DEFAULT_FILTERS[key];
  switch (key) {
    case 'query':
      return value == null ? '' : String(value);
    case 'missable':
    case 'favorite':
    case 'orderAsc':
      return typeof value === 'boolean' ? value : fallback;
    case 'kind':
    case 'grade':
    case 'difficulty':
    case 'status':
    case 'sort':
      return VALID[key].has(value) ? value : fallback;
    default:
      return fallback;
  }
}

/** Merge overrides onto the defaults, ignoring unknown keys and bad values. */
export function createFilters(overrides) {
  const next = { ...DEFAULT_FILTERS };
  if (overrides && typeof overrides === 'object') {
    for (const key of Object.keys(DEFAULT_FILTERS)) {
      if (overrides[key] !== undefined) next[key] = coerce(key, overrides[key]);
    }
  }
  return next;
}

export function isDefaultFilters(filters) {
  const f = createFilters(filters);
  return Object.keys(DEFAULT_FILTERS).every((key) => f[key] === DEFAULT_FILTERS[key]);
}

/** How many non-default filter facets are active (drives the Reset chip). */
export function activeFilterCount(filters) {
  const f = createFilters(filters);
  let count = 0;
  if (f.query.trim()) count += 1;
  if (f.kind !== 'all') count += 1;
  if (f.grade !== 'all') count += 1;
  if (f.difficulty !== 'all') count += 1;
  if (f.status !== 'all') count += 1;
  if (f.missable) count += 1;
  if (f.favorite) count += 1;
  if (f.sort !== 'order' || f.orderAsc === false) count += 1;
  return count;
}

/** Stable key describing the active filters, suitable for memoization. */
export function filterKey(filters) {
  const f = createFilters(filters);
  return [
    f.query.trim().toLowerCase(),
    f.kind,
    f.grade,
    f.difficulty,
    f.status,
    f.missable,
    f.favorite,
    f.sort,
    f.orderAsc,
  ].join('|');
}

/** Whether a story trophy is masked by spoiler mode. Earned trophies always show. */
export function isMaskedStory(trophy, store, spoiler) {
  return !!spoiler && trophy.kind === 'story' && !store.isEarned(trophy.name);
}

/** Everything a trophy can be searched by, joined for a substring match. */
export function searchText(trophy) {
  return [
    trophy.name,
    trophy.description,
    trophy.guide,
    trophy.hint,
    trophy.area,
    trophy.kind,
    difficultyLabel(trophy.difficulty),
    ...(trophy.tags || []),
    ...(trophy.steps || []),
  ].join(' ');
}

/** Map a difficulty filter band id onto a { min, max } inclusive range, or null. */
function difficultyRange(bandId) {
  if (bandId === 'all') return null;
  const band = DIFFICULTY_BANDS.find((b) => b.id === bandId);
  if (!band) return null;
  return { min: band.min, max: band.max };
}

/** Build the ordered predicate list from a filter object plus engine options. */
export function predicates(filters, options = {}) {
  const { store, spoiler = false, hideEarned = false } = options;
  const f = createFilters(filters);
  const query = f.query.trim().toLowerCase();
  const list = [];

  if (hideEarned) list.push((t) => !store.isEarned(t.name));
  if (f.favorite) list.push((t) => typeof store.isFavorite === 'function' && store.isFavorite(t.name));

  // Masked story trophies expose no searchable text, so a query never matches them.
  if (query) list.push((t) => (isMaskedStory(t, store, spoiler) ? false : includesCI(searchText(t), query)));

  if (f.kind !== 'all') list.push((t) => t.kind === f.kind);
  if (f.grade !== 'all') list.push((t) => t.grade === f.grade);

  const range = difficultyRange(f.difficulty);
  if (range) list.push((t) => t.difficulty != null && t.difficulty >= range.min && t.difficulty <= range.max);

  if (f.missable || f.status === 'missable') list.push((t) => !!t.missable);

  if (f.status === 'earned') list.push((t) => store.isEarned(t.name));
  else if (f.status === 'remaining') list.push((t) => !store.isEarned(t.name));

  return list;
}

function matches(trophy, list) {
  for (const predicate of list) {
    if (!predicate(trophy)) return false;
  }
  return true;
}

/** Sort value for rarity: real percent, or a per-grade fallback when absent. */
function rarityValue(trophy) {
  if (trophy.rarityPercent != null && Number.isFinite(trophy.rarityPercent)) return trophy.rarityPercent;
  if (trophy.grade === 'platinum') return 1000; // always the rarest
  if (trophy.grade === 'gold') return 100;
  if (trophy.grade === 'silver') return 10;
  return 1;
}

function cmpOrder(a, b, orderIndex) {
  const ia = a.id ?? 0;
  const ib = b.id ?? 0;
  if (ia !== ib) return ia - ib;
  const oa = orderIndex && orderIndex.has(a.name) ? orderIndex.get(a.name) : 0;
  const ob = orderIndex && orderIndex.has(b.name) ? orderIndex.get(b.name) : 0;
  return oa - ob;
}

function compareNullable(av, bv, dir) {
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  return (av - bv) * dir;
}

/** Sort a trophy list, returning a new array. Falls back to roadmap order. */
export function sortTrophies(list, sort, asc, orderIndex) {
  const dir = asc === false ? -1 : 1;
  const out = [...list];
  const byOrder = (a, b) => cmpOrder(a, b, orderIndex);

  switch (sort) {
    case 'name':
      out.sort((a, b) => dir * (a.name || '').localeCompare(b.name || '') || byOrder(a, b));
      break;
    case 'rarity':
      out.sort((a, b) => dir * (rarityValue(a) - rarityValue(b)) || byOrder(a, b));
      break;
    case 'time':
      out.sort((a, b) => compareNullable(a.timeHours, b.timeHours, dir) || byOrder(a, b));
      break;
    case 'difficulty':
      out.sort((a, b) => dir * ((a.difficulty ?? 0) - (b.difficulty ?? 0)) || byOrder(a, b));
      break;
    case 'order':
    default:
      out.sort((a, b) => byOrder(a, b) * dir);
      break;
  }
  return out;
}

/**
 * Filter then sort a trophy list.
 *
 * @param {Array}  trophies    normalized trophies to run through the engine
 * @param {object} filters     plain filter data (see createFilters)
 * @param {object} options     { store, spoiler, hideEarned, orderIndex }
 */
export function applyFilters(trophies, filters, options = {}) {
  const { store, spoiler = false, hideEarned = false, orderIndex } = options;
  const f = createFilters(filters);
  const list = predicates(filters, { store, spoiler, hideEarned });
  const result = [];
  for (const trophy of trophies || []) {
    if (matches(trophy, list)) result.push(trophy);
  }
  return sortTrophies(result, f.sort, f.orderAsc, orderIndex);
}