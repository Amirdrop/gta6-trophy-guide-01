import { GRADE_ORDER } from './data.js';
import { includesCI } from './util.js';

export const KIND_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'story', label: 'Story' },
  { id: 'missions', label: 'Missions' },
  { id: 'strangers', label: 'Strangers' },
  { id: 'activities', label: 'Activities' },
  { id: 'collectibles', label: 'Collectibles' },
  { id: 'world', label: 'World' },
  { id: 'crime', label: 'Crime' },
  { id: 'completion', label: 'Completion' },
];

export const GRADE_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'platinum', label: 'Platinum' },
  { id: 'gold', label: 'Gold' },
  { id: 'silver', label: 'Silver' },
  { id: 'bronze', label: 'Bronze' },
];

export const STATUS_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'earned', label: 'Earned' },
  { id: 'remaining', label: 'Remaining' },
];

export const SORT_CHOICES = [
  { id: 'order', label: 'Order' },
  { id: 'name', label: 'Name' },
  { id: 'rarity', label: 'Rarity' },
  { id: 'time', label: 'Estimated time' },
];

export function createFilters() {
  return {
    query: '',
    kind: 'all',
    grade: 'all',
    status: 'all',
    missable: false,
    sort: 'order',
    orderAsc: true,
  };
}

/**
 * Apply every active filter to a trophy list and return the results in the
 * requested sort order. Filters combine additively (AND): a trophy must pass
 * search, category, grade, status and missable constraints to be included.
 */
export function applyFilters(trophies, filters, store, spoiler) {
  const f = filters || {};
  const query = (f.query || '').trim().toLowerCase();

  let list = trophies.filter((t) => {
    if (f.kind && f.kind !== 'all' && normalizeKind(t) !== f.kind) return false;
    if (f.grade && f.grade !== 'all' && t.grade !== f.grade) return false;

    if (f.status === 'earned' && !store.isEarned(t.name)) return false;
    if (f.status === 'remaining' && store.isEarned(t.name)) return false;

    if (f.missable && !t.missable) return false;

    if (isMaskedStory(t, store, spoiler)) {
      return !query || includesCI(t.name + ' ' + t.description + ' ' + (t.guide || ''), query);
    }

    if (query && !includesCI(t.name + ' ' + t.description + ' ' + (t.guide || ''), query)) {
      return false;
    }

    return true;
  });

  list = sortTrophies(list, f.sort, f.orderAsc);
  return list;
}

export function sortTrophies(list, sort, asc) {
  const dir = asc === false ? -1 : 1;
  const out = [...list];
  switch (sort) {
    case 'name':
      out.sort((a, b) => (a.name || '').localeCompare(b.name || '') * dir || orderKey(a) - orderKey(b));
      break;
    case 'rarity': {
      out.sort((a, b) => {
        const ra = rarityValue(a);
        const rb = rarityValue(b);
        const c = (ra - rb) * dir || orderKey(a) - orderKey(b);
        return c;
      });
      break;
    }
    case 'time': {
      out.sort((a, b) => {
        const ta = timeValue(a);
        const tb = timeValue(b);
        if (ta == null && tb == null) return orderKey(a) - orderKey(b);
        if (ta == null) return 1;
        if (tb == null) return -1;
        return (ta - tb) * dir || orderKey(a) - orderKey(b);
      });
      break;
    }
    case 'order':
    default: {
      out.sort((a, b) => (orderKey(a) - orderKey(b)) * dir);
      break;
    }
  }
  return out;
}

function orderKey(t) {
  return (t.stage == null ? 99 : t.stage) * 10000 + (t.id == null ? 0 : t.id);
}

function rarityValue(t) {
  const n = Number(t.rarity);
  return Number.isFinite(n) ? n : (t.grade === 'platinum' ? 0 : 0);
}

function timeValue(t) {
  if (t.timeEstimate == null) return null;
  const n = Number(t.timeEstimate);
  return Number.isFinite(n) ? n : null;
}

export function isMaskedStory(t, store, spoiler) {
  return !!spoiler && normalizeKind(t) === 'story' && !store.isEarned(t.name);
}

function normalizeKind(t) {
  if (!t) return 'normal';
  if (t.kind === 'normal') return 'normal';
  const k = KIND_CHIPS.find((c) => c.id !== 'all' && c.id === t.kind);
  return k ? t.kind : 'normal';
}

export function describeKind(kind) {
  if (!kind || kind === 'normal') return 'Normal';
  const chip = KIND_CHIPS.find((c) => c.id !== 'all' && c.id === kind);
  if (chip) return chip.label;
  return String(kind).charAt(0).toUpperCase() + String(kind).slice(1);
}

export function kindLabel(kind) {
  return describeKind(kind);
}