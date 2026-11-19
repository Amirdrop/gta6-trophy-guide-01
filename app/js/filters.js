import { NORMAL_KIND, KIND_LABELS } from './data.js';

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

export function createFilters() {
  return {
    kind: 'all',
    grade: 'all',
    missable: false,
    query: '',
  };
}

export function applyFilters(trophies, filters, store, spoiler) {
  const query = (filters.query || '').trim().toLowerCase();
  return trophies.filter((t) => {
    if (filters.kind !== 'all' && t.kind !== filters.kind) return false;
    if (filters.grade !== 'all' && t.grade !== filters.grade) return false;
    if (filters.missable && !t.missable) return false;

    if (spoiler && t.kind === 'story' && !store.isEarned(t.name)) {
      return true;
    }

    if (query) {
      const hay = `${t.name} ${t.description} ${t.guide || ''}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }

    return true;
  });
}

export function isMasked(t, store, spoiler) {
  return !!spoiler && t.kind === 'story' && !store.isEarned(t.name);
}

export function describeKind(kind) {
  if (KIND_LABELS[kind]) return KIND_LABELS[kind];
  if (!kind) return 'Normal';
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

export function kindLabel(kind) {
  const chip = KIND_CHIPS.find((c) => c.id === kind);
  return chip ? chip.label : describeKind(kind);
}