const GRADES = ['platinum', 'gold', 'silver', 'bronze'];
const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const KINDS = ['story', 'missions', 'strangers', 'activities', 'collectibles', 'world', 'crime', 'completion'];
const KIND_LABELS = {
  story: 'Story',
  missions: 'Missions',
  strangers: 'Strangers',
  activities: 'Activities',
  collectibles: 'Collectibles',
  world: 'World',
  crime: 'Crime',
  completion: 'Completion',
};
const NORMAL_KIND = 'normal';

export { GRADES, GRADE_ORDER, KINDS, KIND_LABELS, NORMAL_KIND };

/**
 * Normalize a raw trophies payload into a sorted, validated array of
 * trophy records. Invalid entries are dropped; ordering is by stage
 * (platinum first) then id.
 *
 * @param {Array|Object} raw Raw trophies array, or an object with a
 *   `trophies` array.
 * @returns {Array<Object>} Normalized, sorted trophy records.
 */
export function normalizeTrophies(raw) {
  const list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.trophies) ? raw.trophies : []);
  if (!list.length) {
    throw new Error('Invalid trophy data: expected an array or an object with a "trophies" array.');
  }
  return list
    .map(normalizeOne)
    .filter((t) => t != null)
    .sort((a, b) => (a.stage ?? 99) - (b.stage ?? 99) || a.id - b.id);
}

export function normalizeOne(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = raw.id != null ? raw.id : fallbackId(raw);
  const grade = normalizeGrade(raw.grade);
  const kind = normalizeKind(raw.kind, grade);
  const missable = !!(raw.missable || raw.kind === 'missable');
  const hidden = !!(raw.hidden);
  const stage = normalizeStage(raw.stage, grade);

  const steps = normalizeSteps(raw.steps);
  const sources = normalizeSources(raw.sources);
  const count = normalizeCount(raw.count);
  const difficulty = normalizeDifficulty(raw.difficulty);

  return {
    id,
    name: raw.name || 'Untitled Trophy',
    description: raw.description || '',
    guide: raw.guide || '',
    grade,
    kind,
    missable,
    hidden,
    stage,
    steps,
    sources,
    source_note: raw.source_note || raw.sourceNote || null,
    count,
    difficulty,
    missableNote: raw.missableNote || raw.missable_note || null,
    guideSteps: steps,
  };
}

export function normalizeGrade(grade) {
  if (typeof grade !== 'string') return 'bronze';
  const g = grade.toLowerCase().trim();
  return GRADES.includes(g) ? g : 'bronze';
}

export function normalizeKind(kind, grade) {
  if (typeof kind === 'string') {
    const k = kind.toLowerCase().trim();
    if (KINDS.includes(k)) return k;
    if (grade === 'platinum') return 'story';
    return NORMAL_KIND;
  }
  if (grade === 'platinum') return 'story';
  return NORMAL_KIND;
}

export function normalizeStage(stage, grade) {
  if (typeof stage === 'number') return stage;
  if (typeof stage === 'string') {
    const n = parseInt(stage, 10);
    if (!Number.isNaN(n)) return n;
  }
  if (grade === 'platinum') return 0;
  return null;
}

function normalizeSteps(steps) {
  if (Array.isArray(steps)) return steps.filter((s) => s && typeof s === 'string');
  if (typeof steps === 'string') return [steps];
  return null;
}

function normalizeSources(sources) {
  if (Array.isArray(sources)) {
    return sources.filter((s) => s && (typeof s === 'string' || typeof s === 'object'));
  }
  if (typeof sources === 'string') return [sources];
  return null;
}

function normalizeCount(count) {
  if (typeof count === 'number' && Number.isFinite(count) && count > 0) {
    return { target: count, label: 'targets' };
  }
  if (typeof count === 'string') {
    const n = parseInt(count, 10);
    if (!Number.isNaN(n) && n > 0) return { target: n, label: 'targets' };
  }
  if (count && typeof count === 'object') {
    const target = count.target != null ? Number(count.target) : null;
    if (target && Number.isFinite(target) && target > 0) {
      return { target, label: count.label || 'targets' };
    }
  }
  return null;
}

function normalizeDifficulty(difficulty) {
  if (typeof difficulty === 'string' && difficulty) {
    const n = parseInt(difficulty, 10);
    if (!Number.isNaN(n)) return n;
    return null;
  }
  if (typeof difficulty === 'number' && Number.isFinite(difficulty)) {
    return Math.max(1, Math.min(5, Math.round(difficulty)));
  }
  return null;
}

export function countLabel(count) {
  if (!count || typeof count !== 'object') return null;
  return count.label || 'targets';
}

export function countTarget(count) {
  if (!count || typeof count !== 'object') return null;
  return count.target || null;
}

function fallbackId(raw) {
  const base = (raw.name || '') + (raw.description || '');
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  return h;
}

export function countByGrade(list, grade) {
  return list.filter((t) => t.grade === grade).length;
}