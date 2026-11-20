/**
 * data.js — the data layer.
 *
 * Responsibilities, in order:
 *   1. Load the trophies + roadmap JSON payloads.
 *   2. Validate / normalize them: drop impossible records, default the rest,
 *      and never let a bad roadmap reference throw.
 *   3. Build one indexed model (by id, by name, roadmap stages, missables) that
 *      the rest of the app consumes.
 *
 * Keeping every "raw JSON" concern here means views and filters only ever see
 * clean, predictable trophy objects.
 */

export const GRADES = ['platinum', 'gold', 'silver', 'bronze'];

export const GRADE_RANK = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

/** Rough weight per grade, used for the weighted completion figure. */
export const GRADE_WEIGHT = { bronze: 1, silver: 8, gold: 25, platinum: 200 };

export const KINDS = [
  'story', 'missions', 'strangers', 'activities',
  'collectibles', 'world', 'crime', 'completion', 'normal',
];

export const KIND_LABELS = {
  story: 'Story',
  missions: 'Missions',
  strangers: 'Strangers',
  activities: 'Activities',
  collectibles: 'Collectibles',
  world: 'World',
  crime: 'Crime',
  completion: 'Completion',
  normal: 'General',
};

export const KIND_ORDER = KINDS.filter((k) => k !== 'normal');

const KIND_ALIASES = {
  stranger: 'strangers',
  mission: 'missions',
  activity: 'activities',
  collectible: 'collectibles',
  criminal: 'crime',
};

const DIFFICULTY_WORDS = ['', 'Very Easy', 'Easy', 'Moderate', 'Hard', 'Very Hard'];

export function normalizeKind(value, grade) {
  if (typeof value === 'string') {
    const k = value.toLowerCase().trim();
    if (KINDS.includes(k)) return k;
    if (KIND_ALIASES[k]) return KIND_ALIASES[k];
  }
  return grade === 'platinum' ? 'completion' : 'normal';
}

export function normalizeGrade(value) {
  if (typeof value === 'string') {
    const g = value.toLowerCase().trim();
    if (GRADES.includes(g)) return g;
  }
  return 'bronze';
}

export function kindLabel(kind) {
  return KIND_LABELS[kind] ?? KIND_LABELS.normal;
}

/** Clamp a difficulty value to an integer 1-5, or null when absent. */
export function normalizeDifficulty(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(1, Math.min(5, Math.round(n)));
}

export function difficultyLabel(value) {
  const v = normalizeDifficulty(value);
  return v == null ? 'Unknown' : DIFFICULTY_WORDS[v];
}

/** Trophy identity. Saves are keyed by name, so the name is the id. */
export function trophyKey(trophy) {
  return trophy == null ? '' : String(trophy.name);
}

/**
 * Parse a free-text duration ("1-3 hrs", "~45 min", "1.5 hrs", "100+ hrs") into
 * a midpoint in hours. Ranges are averaged; minutes are converted.
 */
export function parseDuration(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  if (!text) return null;

  const nums = text.match(/\d+(?:\.\d+)?/g);
  if (!nums || !nums.length) return null;
  const parsed = nums.map(Number).filter((n) => Number.isFinite(n));
  if (!parsed.length) return null;

  if (/min/.test(text) && !/hr|hour/.test(text)) return parsed[0] / 60;
  const pick = parsed.slice(0, 2);
  return pick.length === 2 ? (pick[0] + pick[1]) / 2 : pick[0];
}

export function formatHours(h) {
  const n = Number(h);
  if (!Number.isFinite(n) || n <= 0) return '0h';
  if (n < 1) return Math.round(n * 60) + 'm';
  return (Math.round(n * 10) / 10) + 'h';
}

export function durationText(trophy) {
  if (!trophy) return '—';
  const estimate = trophy.timeEstimate;
  if (typeof estimate === 'string' && estimate.trim()) return estimate.trim();
  if (typeof estimate === 'number' && Number.isFinite(estimate)) return formatHours(estimate);
  return trophy.timeHours ? '~' + formatHours(trophy.timeHours) : '—';
}

function normalizeCount(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const target = Number(raw.target);
  if (!Number.isFinite(target) || target <= 0) return null;
  return { target, label: String(raw.label || 'targets') };
}

function normalizeSources(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const s of raw) {
    if (typeof s === 'string') {
      out.push({ label: s, url: null });
    } else if (s && typeof s === 'object' && typeof s.url === 'string') {
      out.push({ label: s.label || s.url, url: s.url });
    }
  }
  return out;
}

function stringList(raw) {
  if (raw == null) return [];
  if (typeof raw === 'string') return raw.trim() ? [raw.trim()] : [];
  if (!Array.isArray(raw)) return [];
  return raw.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim());
}

/** Normalize a single raw trophy record, or null when unusable. */
export function normalizeTrophy(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;

  const grade = normalizeGrade(raw.grade);
  const kind = normalizeKind(raw.kind ?? raw.category ?? raw.type, grade);
  const idNum = Number(raw.id);
  const stageNum = Number(raw.stage);
  const timeEstimate = typeof raw.timeEstimate === 'string' ? raw.timeEstimate.trim() : '';
  const missableNote = typeof raw.missableNote === 'string' ? raw.missableNote
    : typeof raw.missable_note === 'string' ? raw.missable_note
      : null;

  return {
    id: Number.isFinite(idNum) ? idNum : null,
    name,
    description: typeof raw.description === 'string' ? raw.description : '',
    hint: typeof raw.hint === 'string' ? raw.hint : '',
    guide: typeof raw.guide === 'string' ? raw.guide : '',
    grade,
    kind,
    stage: Number.isFinite(stageNum) ? stageNum : null,
    missable: !!raw.missable,
    hidden: !!raw.hidden,
    missableNote,
    difficulty: normalizeDifficulty(raw.difficulty ?? raw.difficultyRating),
    timeEstimate,
    timeHours: parseDuration(timeEstimate),
    count: normalizeCount(raw.count),
    steps: stringList(raw.steps ?? raw.guideSteps),
    sources: normalizeSources(raw.sources),
    sourceNote: typeof raw.source_note === 'string' ? raw.source_note : null,
  };
}

export function normalizeTrophies(raw) {
  const list = Array.isArray(raw)
    ? raw
    : raw && Array.isArray(raw.trophies)
      ? raw.trophies
      : [];

  const seen = new Set();
  const out = [];
  for (const item of list) {
    const trophy = normalizeTrophy(item);
    if (!trophy) continue;
    if (seen.has(trophy.name)) continue;
    seen.add(trophy.name);
    out.push(trophy);
  }

  out.sort((a, b) => (a.stage ?? 99) - (b.stage ?? 99) || (a.id ?? 0) - (b.id ?? 0));
  return out;
}

/**
 * Normalize the roadmap payload. Accepts a bare array of stages or an object
 * with a `stages` array. Trophy references resolve against `byId`; unknown ids
 * land in `stage.missing` rather than throwing.
 */
export function normalizeRoadmap(raw, byId) {
  const stagesRaw = Array.isArray(raw)
    ? raw
    : raw && Array.isArray(raw.stages)
      ? raw.stages
      : [];

  return stagesRaw.map((stage, index) => {
    const stageNum = Number(stage && stage.stage);
    const number = Number.isFinite(stageNum) ? stageNum : index + 1;
    const entries = Array.isArray(stage && stage.trophies) ? stage.trophies : [];

    const trophies = [];
    const missing = [];
    for (const entry of entries) {
      const id = entry && typeof entry === 'object' ? Number(entry.id) : Number(entry);
      const trophy = byId.get(id);
      if (trophy) {
        if (!trophies.includes(trophy)) trophies.push(trophy);
      } else {
        missing.push(id);
      }
    }

    return {
      id: typeof stage?.id === 'string' ? stage.id : null,
      stage: number,
      title: typeof stage?.title === 'string' && stage.title ? stage.title : 'Stage ' + number,
      subtitle: typeof stage?.subtitle === 'string' ? stage.subtitle : '',
      description: typeof stage?.description === 'string' ? stage.description
        : typeof stage?.blurb === 'string' ? stage.blurb : '',
      estimatedHours: typeof stage?.estimatedHours === 'string' ? stage.estimatedHours : '',
      missable: !!stage?.missable,
      focus: Array.isArray(stage?.focus) ? stage.focus.filter((f) => typeof f === 'string') : [],
      trophies,
      missing,
    };
  });
}

export function countByGrade(list) {
  const out = Object.fromEntries(GRADES.map((g) => [g, 0]));
  for (const t of list || []) {
    if (out[t.grade] != null) out[t.grade] += 1;
  }
  return out;

}

export function gradeWeight(list, isEarned) {
  let total = 0;
  let earned = 0;
  for (const t of list || []) {
    const w = GRADE_WEIGHT[t.grade] ?? 1;
    total += w;
    if (isEarned(t)) earned += w;
  }
  return total ? Math.round((earned / total) * 100) : 0;
}

/** Build the indexed model every view shares. */
export function buildModel(trophiesRaw, roadmapRaw) {
  const trophies = normalizeTrophies(trophiesRaw);
  const byId = new Map();
  const byName = new Map();
  for (const t of trophies) {
    if (t.id != null) byId.set(t.id, t);
    byName.set(t.name, t);
  }

  const stages = normalizeRoadmap(roadmapRaw, byId);

  const stageOf = new Map();
  for (const stage of stages) {
    for (const t of stage.trophies) {
      if (!stageOf.has(t.name)) stageOf.set(t.name, stage);
    }
  }

  return {
    trophies,
    stages,
    byId,
    byName,
    missables: trophies.filter((t) => t.missable),
    stageOf,
    hasRoadmap: stages.length > 0,
  };
}

async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load ' + url + ' (' + res.status + ')');
  return res.json();
}

/**
 * Load both payloads and build the model. A roadmap failure is non-fatal: the
 * checklist still works, the roadmap tab just renders its empty state.
 */
export async function loadData() {
  const [trophiesRaw, roadmapRaw] = await Promise.all([
    fetchJSON('./data/trophies.json'),
    fetchJSON('./data/roadmap.json').catch((e) => {
      console.error('Failed to load roadmap', e);
      return [];
    }),
  ]);

  return buildModel(trophiesRaw, roadmapRaw);
}
