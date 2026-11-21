/**
 * data.js - the data layer for the Leonida Ledger trophy guide.
 *
 * Responsibilities are deliberately narrow: fetch JSON, validate it, and turn
 * it into one frozen, fully-indexed model. Views never see raw records and
 * never fetch on their own; progress lives in store.js, rendering in main.js.
 *
 * The model is built once at boot and immutable afterwards, so every render
 * is a pure function of (model, store) instead of re-walking many arrays:
 *
 *   {
 *     meta,           // payload metadata (game, platform, ...)
 *     trophies,       // normalized + roadmap-sorted trophy list
 *     stages,         // normalized roadmap stages, each with its trophies
 *     byId, byName,   // id / name -> trophy
 *     byStage,        // stage number -> trophy[]
 *     stageOf,        // trophy name -> owning stage
 *     missables,      // missable trophies in roadmap order
 *     gradeCounts,    // { platinum, gold, silver, bronze }
 *     kindCounts,     // kind -> count
 *     order,          // trophy[] in flat roadmap order
 *     orderIndex,     // trophy name -> position in `order`
 *     hasRoadmap,
 *     totals,         // { count, hours, stages, missables }
 *     warnings,
 *   }
 */

export const GRADES = Object.freeze(['platinum', 'gold', 'silver', 'bronze']);

export const GRADE_RANK = Object.freeze({ platinum: 0, gold: 1, silver: 2, bronze: 3 });

/** Rough perceived weight per grade, used by the weighted completion bar. */
export const GRADE_WEIGHT = Object.freeze({ bronze: 1, silver: 8, gold: 25, platinum: 120 });

/** Categories a trophy can belong to. `story` is hidden by spoiler mode. */
export const KINDS = Object.freeze([
  'story',
  'missions',
  'strangers',
  'activities',
  'collectibles',
  'world',
  'crime',
  'completion',
]);

export const KIND_LABELS = Object.freeze({
  story: 'Story',
  missions: 'Missions',
  strangers: 'Strangers',
  activities: 'Activities',
  collectibles: 'Collectibles',
  world: 'World',
  crime: 'Crime',
  completion: 'Completion',
});

const KIND_ALIASES = Object.freeze({
  stranger: 'strangers',
  mission: 'missions',
  activity: 'activities',
  collectible: 'collectibles',
  criminal: 'crime',
  platinum: 'completion',
});

const DIFFICULTY_WORDS = Object.freeze(['', 'Very Easy', 'Easy', 'Moderate', 'Hard', 'Very Hard']);

/**
 * Named difficulty bands used by the checklist difficulty filter.
 * Each band is an inclusive [min, max] range over the 1-5 difficulty scale.
 */
export const DIFFICULTY_BANDS = Object.freeze([
  { id: 'easy', label: 'Easy', min: 1, max: 2 },
  { id: 'moderate', label: 'Moderate', min: 3, max: 3 },
  { id: 'hard', label: 'Hard', min: 4, max: 4 },
  { id: 'brutal', label: 'Brutal', min: 5, max: 5 },
]);

export function gradeLabel(grade) {
  return typeof grade === 'string' && grade ? grade.charAt(0).toUpperCase() + grade.slice(1) : '';
}

export function normalizeGrade(value) {
  if (typeof value === 'string' && GRADES.includes(value.toLowerCase().trim())) {
    return value.toLowerCase().trim();
  }
  return 'bronze';
}

export function normalizeKind(value, grade) {
  if (typeof value === 'string') {
    const kind = value.toLowerCase().trim();
    if (KINDS.includes(kind)) return kind;
    if (KIND_ALIASES[kind]) return KIND_ALIASES[kind];
  }
  return grade === 'platinum' ? 'completion' : 'missions';
}

export function kindLabel(kind) {
  return KIND_LABELS[kind] ?? 'General';
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

/** Parse a free-text duration ("1-3 hrs", "~45 min", "30-60 hrs") to midpoint hours. */
export function parseDuration(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  if (!text) return null;

  const nums = text.match(/\d+(?:\.\d+)?/g);
  if (!nums || !nums.length) return null;
  const parsed = nums.map(Number).filter((n) => Number.isFinite(n));
  if (!parsed.length) return null;

  // "min" with no hour word means the numbers are minutes.
  if (/min/.test(text) && !/hr|hour/.test(text)) {
    const mid = parsed.length >= 2 ? (parsed[0] + parsed[1]) / 2 : parsed[0];
    return mid / 60;
  }
  const pick = parsed.slice(0, 2);
  return pick.length === 2 ? (pick[0] + pick[1]) / 2 : pick[0];
}

export function formatHours(hours) {
  const n = Number(hours);
  if (!Number.isFinite(n) || n <= 0) return '0h';
  if (n < 1) {
    const minutes = Math.round(n * 60);
    return minutes < 5 ? '<5m' : minutes + 'm';
  }
  return Math.round(n * 10) / 10 + 'h';
}

/** Human-facing duration text for a trophy, or '-' when unknown. */
export function durationText(trophy) {
  if (!trophy) return '-';
  const estimate = trophy.timeEstimate;
  if (typeof estimate === 'string' && estimate.trim()) return estimate.trim();
  if (typeof estimate === 'number' && Number.isFinite(estimate)) return formatHours(estimate);
  return '-';
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringList(raw) {
  if (raw == null) return [];
  if (typeof raw === 'string') return raw.trim() ? [raw.trim()] : [];
  if (!Array.isArray(raw)) return [];
  return raw.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim());
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
  for (const source of raw) {
    if (typeof source === 'string') out.push({ label: source, url: null });
    else if (source && typeof source === 'object' && typeof source.url === 'string') {
      out.push({ label: source.label || source.url, url: source.url });
    }
  }
  return out;
}

/** Normalize one raw trophy record. Returns null when unusable (no name). */
export function normalizeTrophy(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const name = nonEmpty(raw.name);
  if (!name) return null;

  const grade = normalizeGrade(raw.grade);
  const kind = normalizeKind(raw.kind ?? raw.category ?? raw.type, grade);
  const idNum = Number(raw.id);
  const stageNum = Number(raw.stage);
  const rarity = Number(raw.rarityPercent);

  return {
    id: Number.isFinite(idNum) ? idNum : index + 1,
    name,
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    hint: nonEmpty(raw.hint) || '',
    guide: nonEmpty(raw.guide) || '',
    area: nonEmpty(raw.area),
    grade,
    kind,
    stage: Number.isFinite(stageNum) ? stageNum : null,
    missable: !!raw.missable,
    hidden: !!raw.hidden,
    missableNote: nonEmpty(raw.missableNote) || nonEmpty(raw.missable_note),
    missableWindow: nonEmpty(raw.missableWindow),
    difficulty: normalizeDifficulty(raw.difficulty ?? raw.difficultyRating),
    timeEstimate: nonEmpty(raw.timeEstimate) || (typeof raw.timeEstimate === 'number' ? String(raw.timeEstimate) : ''),
    timeHours: parseDuration(raw.timeEstimate),
    rarityPercent: Number.isFinite(rarity) ? rarity : null,
    count: normalizeCount(raw.count),
    steps: stringList(raw.steps ?? raw.guideSteps),
    sources: normalizeSources(raw.sources),
    sourceNote: nonEmpty(raw.source_note),
    tags: stringList(raw.tags),
    session: nonEmpty(raw.session) || (Number.isFinite(Number(raw.session)) ? String(raw.session) : null),
    run: nonEmpty(raw.run),
  };
}

function asTrophyArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray(raw.trophies)) return raw.trophies;
  return [];
}

/** Dedupe by name and sort by (stage, id) so roadmap order is stable. */
export function normalizeTrophies(raw) {
  const seen = new Set();
  const out = [];
  let index = 0;
  for (const item of asTrophyArray(raw)) {
    const trophy = normalizeTrophy(item, index);
    if (!trophy || seen.has(trophy.name)) continue;
    seen.add(trophy.name);
    out.push(trophy);
    index += 1;
  }
  out.sort((a, b) => (a.stage ?? 99) - (b.stage ?? 99) || (a.id ?? 0) - (b.id ?? 0));
  return out;
}

function asStageArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray(raw.stages)) return raw.stages;
  return [];
}

/**
 * Normalize the roadmap payload. Trophy references (ids or {id} objects)
 * resolve against `byId`; unknown ids are collected in `missing` instead of
 * throwing, so a bad reference degrades to a warning.
 */
export function normalizeRoadmap(raw, byId) {
  return asStageArray(raw).map((stage, index) => {
    const stageNum = Number(stage && stage.stage);
    const number = Number.isFinite(stageNum) ? stageNum : index + 1;
    const entries = stage && Array.isArray(stage.trophies) ? stage.trophies : [];

    const trophies = [];
    const missing = [];
    for (const entry of entries) {
      const id = entry && typeof entry === 'object' ? Number(entry.id) : Number(entry);
      const trophy = byId.get(id);
      if (!trophy) missing.push(id);
      else if (!trophies.includes(trophy)) trophies.push(trophy);
    }

    const description =
      typeof stage?.description === 'string' ? stage.description
        : typeof stage?.blurb === 'string' ? stage.blurb
          : '';

    return {
      id: typeof stage?.id === 'string' && stage.id ? stage.id : 'stage-' + number,
      stage: number,
      title: (typeof stage?.title === 'string' && stage.title) || 'Stage ' + number,
      subtitle: nonEmpty(stage?.subtitle) || '',
      description,
      estimatedHours: nonEmpty(stage?.estimatedHours) || '',
      difficulty: nonEmpty(stage?.difficulty) || '',
      difficultyRating: normalizeDifficulty(stage?.difficultyRating),
      prerequisite: nonEmpty(stage?.prerequisite),
      goals: stringList(stage?.goals),
      focus: stringList(stage?.focus),
      tips: stringList(stage?.tips),
      warnings: stringList(stage?.warnings),
      trophies,
      missing,
    };
  });
}

/** Count trophies per grade: { platinum, gold, silver, bronze }. */
export function countByGrade(list) {
  const out = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const trophy of list || []) {
    if (out[trophy.grade] != null) out[trophy.grade] += 1;
  }
  return out;
}

function countByKind(list) {
  const out = {};
  for (const trophy of list || []) {
    out[trophy.kind] = (out[trophy.kind] || 0) + 1;
  }
  return out;
}

/** Build the indexed model every view shares. */
export function buildModel(trophiesRaw, roadmapRaw) {
  const meta =
    trophiesRaw && typeof trophiesRaw === 'object' && !Array.isArray(trophiesRaw) && trophiesRaw.meta
      ? { ...trophiesRaw.meta }
      : {};

  const trophies = normalizeTrophies(trophiesRaw);
  const byId = new Map();
  const byName = new Map();
  for (const trophy of trophies) {
    byId.set(trophy.id, trophy);
    byName.set(trophy.name, trophy);
  }

  const stages = normalizeRoadmap(roadmapRaw, byId);

  const warnings = [];
  for (const stage of stages) {
    for (const id of stage.missing) warnings.push(stage.title + ': unknown trophy id ' + id);
    for (const trophy of stage.trophies) {
      if (trophy.stage != null && trophy.stage !== stage.stage) {
        warnings.push(trophy.name + ' is listed in ' + stage.title + ' but tagged stage ' + trophy.stage);
      }
    }
  }

  for (const trophy of trophies) {
    if (!trophy.timeEstimate && trophy.timeHours != null) {
      trophy.timeEstimate = formatHours(trophy.timeHours);
    }
  }

  const stageOf = new Map();
  for (const stage of stages) {
    for (const trophy of stage.trophies) {
      if (!stageOf.has(trophy.name)) stageOf.set(trophy.name, stage);
    }
  }

  const byStage = new Map();
  for (const trophy of trophies) {
    if (trophy.stage == null) continue;
    if (!byStage.has(trophy.stage)) byStage.set(trophy.stage, []);
    byStage.get(trophy.stage).push(trophy);
  }

  const unassigned = trophies.filter((trophy) => !stageOf.has(trophy.name));
  if (stages.length && unassigned.length) {
    warnings.push(unassigned.length + ' trophies are not in the roadmap');
  }

  // Flat, stable roadmap order: stage by stage, trophy by id inside a stage,
  // then anything the roadmap did not claim, by id.
  const order = [];
  const placed = new Set();
  for (const stage of stages) {
    stage.trophies.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    for (const trophy of stage.trophies) {
      if (placed.has(trophy.name)) continue;
      placed.add(trophy.name);
      order.push(trophy);
    }
  }
  for (const trophy of [...trophies].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))) {
    if (placed.has(trophy.name)) continue;
    placed.add(trophy.name);
    order.push(trophy);
  }

  const orderIndex = new Map(order.map((trophy, index) => [trophy.name, index]));

  for (const stage of stages) {
    stage.trophies.sort((a, b) => orderIndex.get(a.name) - orderIndex.get(b.name));
    stage.missables = stage.trophies.filter((trophy) => trophy.missable);
  }

  const missables = order.filter((trophy) => trophy.missable);
  const hours = trophies.reduce((sum, trophy) => sum + (trophy.timeHours || 0), 0);

  // Trophy count that spoiler mode masks (unearned story trophies are hidden).
  const hiddenCount = trophies.filter((trophy) => trophy.kind === 'story').length;

  // Map a stage's own title onto its trophy list for lookups by name.
  const stageById = new Map();
  for (const stage of stages) stageById.set(stage.id, stage);

  // Group trophies by their planner "session" slug when present, else stage.
  const sessions = new Map();
  for (const trophy of order) {
    const key = trophy.session || (trophy.stage == null ? 'misc' : String(trophy.stage));
    if (!sessions.has(key)) sessions.set(key, []);
    sessions.get(key).push(trophy);
  }

  return Object.freeze({
    meta,
    trophies,
    stages,
    byId,
    byName,
    byStage,
    stageOf,
    stageById,
    sessions,
    missables,
    hiddenCount,
    gradeCounts: countByGrade(trophies),
    kindCounts: countByKind(trophies),
    order,
    orderIndex,
    hasRoadmap: stages.length > 0,
    warnings,
    totals: { count: trophies.length, hours, stages: stages.length, missables: missables.length },
  });
}

async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load ' + url + ' (' + res.status + ')');
  return res.json();
}

/**
 * Load both payloads and build the model. A roadmap failure is non-fatal:
 * the checklist still works and the roadmap view renders its empty state.
 */
export async function loadData() {
  const [trophiesRaw, roadmapRaw] = await Promise.all([
    fetchJSON('./data/trophies.json'),
    fetchJSON('./data/roadmap.json').catch((error) => {
      console.error('Failed to load roadmap', error);
      return [];
    }),
  ]);

  const model = buildModel(trophiesRaw, roadmapRaw);
  if (!model.trophies.length) throw new Error('trophies.json contained no usable trophies.');
  return model;
}
