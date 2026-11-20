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

/** Suggested trophy points per grade when the payload omits them. */
const DEFAULT_POINTS = { platinum: 180, gold: 90, silver: 30, bronze: 15 };
/** Suggested rarity ranks (0..100) per grade when the payload omits them. */
const DEFAULT_RARITY = { platinum: 5, gold: 40, silver: 65, bronze: 80 };

export { GRADES, GRADE_ORDER, KINDS, KIND_LABELS, NORMAL_KIND };

/**
 * Normalize a raw trophies payload into a sorted, validated array of trophy
 * records. Invalid entries are dropped; ordering is by stage (platinum first)
 * then id.
 *
 * Tolerates missing fields: only `name` (or a usable id) is required to keep a
 * record. Every other field is validated and given a safe default when absent.
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

/**
 * Validate and normalize a single raw trophy record. Returns `null` when the
 * entry is unusable (not an object, or missing both a name and an id).
 */
export function normalizeOne(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = normalizeId(raw);
  const name = typeof raw.name === 'string' && raw.name.trim()
    ? raw.name.trim()
    : fallbackName(raw);

  const grade = normalizeGrade(raw.grade);
  const kind = normalizeKind(raw.kind ?? raw.category ?? raw.type, grade);
  const missable = !!(raw.missable || raw.kind === 'missable' || raw.category === 'missable');
  const hidden = !!(raw.hidden);
  const stage = normalizeStage(raw.stage, grade);

  const rarity = normalizeRarity(raw.rarity, grade);
  const timeEstimate = normalizeTime(raw.timeEstimate ?? raw.estimatedTime);
  const points = normalizePoints(raw.points ?? raw.trophyPoints, grade);

  const steps = normalizeSteps(raw.steps ?? raw.guideSteps);
  const sources = normalizeSources(raw.sources);
  const count = normalizeCount(raw.count);
  const difficulty = normalizeDifficulty(raw.difficulty);

  return {
    id,
    name,
    description: typeof raw.description === 'string' ? raw.description : '',
    guide: typeof raw.guide === 'string' ? raw.guide : '',
    grade,
    kind,
    rarity,
    hidden,
    missable,
    stage,
    steps,
    sources,
    source_note: raw.source_note ?? raw.sourceNote ?? null,
    count,
    difficulty,
    timeEstimate,
    points,
    missableNote: raw.missableNote ?? raw.missable_note ?? null,
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
  if (typeof stage === 'number' && Number.isFinite(stage)) return Math.max(0, Math.round(stage));
  if (typeof stage === 'string') {
    const n = parseInt(stage, 10);
    if (!Number.isNaN(n)) return Math.max(0, n);
  }
  if (grade === 'platinum') return 0;
  return null;
}

function normalizeRarity(rarity, grade) {
  if (typeof rarity === 'number' && Number.isFinite(rarity)) {
    return Math.max(0, Math.min(100, Math.round(rarity)));
  }
  if (typeof rarity === 'string') {
    const n = parseFloat(rarity);
    if (!Number.isNaN(n)) return Math.max(0, Math.min(100, Math.round(n)));
  }
  return DEFAULT_RARITY[grade] ?? 50;
}

function normalizeTime(time) {
  if (typeof time === 'number' && Number.isFinite(time) && time > 0) {
    return Math.round(time * 10) / 10;
  }
  if (typeof time === 'string') {
    const n = parseFloat(time);
    if (!Number.isNaN(n) && n > 0) return Math.round(n * 10) / 10;
  }
  return null;
}

function normalizePoints(points, grade) {
  if (typeof points === 'number' && Number.isFinite(points) && points >= 0) {
    return Math.round(points);
  }
  if (typeof points === 'string') {
    const n = parseInt(points, 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return DEFAULT_POINTS[grade] ?? 0;
}

function normalizeSteps(steps) {
  if (Array.isArray(steps)) return steps.filter((s) => s && typeof s === 'string');
  if (typeof steps === 'string' && steps.trim()) return [steps.trim()];
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

function normalizeId(raw) {
  if (raw.id != null) {
    const n = Number(raw.id);
    if (Number.isFinite(n)) return n;
    const s = String(raw.id);
    if (s.trim()) return s;
  }
  const base = String(raw.name ?? '') + String(raw.description ?? '');
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  return h || 'untitled';
}

function fallbackName(raw) {
  if (typeof raw.description === 'string' && raw.description.trim()) {
    return raw.description.trim().slice(0, 80) || 'Untitled Trophy';
  }
  return 'Untitled Trophy';
}

export function countByGrade(list, grade) {
  return list.filter((t) => t.grade === grade).length;
}