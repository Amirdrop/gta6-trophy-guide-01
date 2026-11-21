/**
 * store.js - persistent progress for the Leonida Ledger trophy guide.
 *
 * One versioned JSON blob in localStorage holds:
 *   - the set of earned trophy names,
 *   - a small set of starred "favorites" (trophies you want to track),
 *   - display settings,
 *   - a lightweight lifetime stats ledger (total earned ticks, last activity).
 *
 * Trophies are keyed by name (not id) so a save survives data renumbering,
 * and names are trimmed plus NFC-normalised on the way in and out so
 * "  Trust " and "Trust" are the same trophy.
 *
 * Guarantees:
 *   - corrupt or foreign payloads never throw at boot; they degrade to empty
 *     and the offending blob is parked under a backup key for recovery,
 *   - legacy blob shapes (bare name arrays, progress maps, old storage keys)
 *     migrate quietly on read,
 *   - writes are synchronous, so ticking a box survives an instant tab close,
 *   - every mutation fires subscribers once, with a small change summary,
 *   - imports merge into the existing progress and touch known settings only.
 */

export const STORE_KEY = 'gta6trophies.v2';
export const LEGACY_KEYS = Object.freeze(['gta6trophies.v1', 'gta6trophies']);
const BACKUP_KEY = 'gta6trophies.corrupt';
export const SAVE_VERSION = 2;

export const DEFAULT_SETTINGS = Object.freeze({
  spoiler: false,
  hideEarned: false,
});

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

/** Normalise a trophy name: trim + NFC. Returns '' for anything unusable. */
export function normalizeName(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    return trimmed.normalize('NFC');
  } catch {
    return trimmed;
  }
}

/** Build a clean Set of names from an array or Set, dropping junk entries. */
export function normalizeNameSet(value) {
  const out = new Set();
  if (!value) return out;
  const items = value instanceof Set ? value : Array.isArray(value) ? value : [];
  for (const raw of items) {
    const name = normalizeName(raw);
    if (name) out.add(name);
  }
  return out;
}

/** Keep only known settings, with defaults for anything missing or mistyped. */
function normalizeSettings(value) {
  const src = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const out = {};
  for (const key of SETTING_KEYS) {
    out[key] = typeof src[key] === typeof DEFAULT_SETTINGS[key] ? src[key] : DEFAULT_SETTINGS[key];
  }
  return out;
}

/** localStorage when it actually works (private mode can refuse writes). */
function safeStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = '__gta6_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Turn any known historical payload shape into { earned, favorites, settings, stats }.
 * Returns null when the value clearly is not a progress blob.
 */
export function coerceBlob(raw) {
  if (Array.isArray(raw)) return { earned: raw, settings: {} };
  if (!raw || typeof raw !== 'object') return null;
  if (Array.isArray(raw.earned)) {
    return { earned: raw.earned, favorites: raw.favorites, settings: raw.settings, stats: raw.stats };
  }
  const map = raw.progress || raw.earnedMap; // alternative legacy shapes
  if (map && typeof map === 'object' && !Array.isArray(map)) {
    return {
      earned: Object.keys(map).filter((key) => map[key]),
      favorites: raw.favorites,
      settings: raw.settings,
      stats: raw.stats,
    };
  }
  return null;
}

function parseRaw(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    return coerceBlob(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Read the active blob, falling back to legacy keys. Corrupt payloads are backed up. */
function readBlob(storage) {
  if (!storage) return null;
  const current = storage.getItem(STORE_KEY);
  if (current) {
    const parsed = parseRaw(current);
    if (parsed) return parsed;
    try {
      storage.setItem(BACKUP_KEY, current);
    } catch {
      /* ignore quota errors on the backup */
    }
  }
  for (const key of LEGACY_KEYS) {
    const parsed = parseRaw(storage.getItem(key));
    if (parsed) return parsed;
  }
  return null;
}

/** Whether localStorage currently holds any earned trophy (any known key). */
export function hasSave() {
  const blob = readBlob(safeStorage());
  return !!(blob && normalizeNameSet(blob.earned).size > 0);
}

/** Coerce the stats ledger to a safe shape. */
function normalizeStats(value) {
  const src = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const total = Number(src.totalEarned);
  const at = Number(src.lastEarnedAt);
  return {
    totalEarned: Number.isFinite(total) ? Math.max(0, Math.round(total)) : 0,
    lastEarnedAt: Number.isFinite(at) && at > 0 ? at : null,
  };
}

/**
 * Create the live progress store.
 *
 * Public API (earned, favorites, settings, stats, persistence, subscriptions):
 *   isEarned(name) / size() / list() / all() / lastChange()
 *   toggle(name) / setEarned(name, on) / setMany(names, on) / clear()
 *   isFavorite(name) / toggleFavorite(name) / favoriteNames() / favoriteCount()
 *   getSetting(key) / setSetting(key, value) / allSettings()
 *   stats()
 *   exportSnapshot() / exportJSON()
 *   importJSON(text) -> { added, total }
 *   replaceEarned(names) / replaceAll(snapshot)
 *   subscribe(fn) -> unsubscribe
 *   isPersistent
 */
export function createStore() {
  const storage = safeStorage();
  const blob = readBlob(storage);
  const earned = normalizeNameSet(blob && blob.earned);
  const favorites = normalizeNameSet(blob && blob.favorites);
  const settings = normalizeSettings(blob && blob.settings);
  const stats = normalizeStats(blob && blob.stats);
  const listeners = new Set();
  let lastChange = null;
  let writeWarned = false;

  const snapshot = () => ({
    earned: [...earned].sort(),
    favorites: [...favorites].sort(),
    settings: { ...settings },
    stats: { ...stats },
  });

  /** Persist synchronously, then notify subscribers of the change. */
  function persist(change) {
    if (storage) {
      try {
        storage.setItem(STORE_KEY, JSON.stringify({ saveVersion: SAVE_VERSION, ...snapshot() }));
      } catch (error) {
        if (!writeWarned) {
          writeWarned = true;
          console.warn('Could not save progress to localStorage', error);
        }
      }
    }
    lastChange = { ...change, at: Date.now(), size: earned.size };
    const event = {
      ...lastChange,
      earned: new Set(earned),
      favorites: new Set(favorites),
      settings: { ...settings },
      stats: { ...stats },
    };
    for (const listener of [...listeners]) {
      try {
        listener(event);
      } catch (error) {
        console.error('store listener failed', error);
      }
    }
  }

  /** Set one trophy to on/off; returns the name when it actually changed. */
  function apply(name, on) {
    const key = normalizeName(name);
    if (!key) return null;
    const had = earned.has(key);
    if (on && !had) earned.add(key);
    else if (!on && had) earned.delete(key);
    return had === on ? null : key;
  }

  function bumpEarned(count) {
    stats.totalEarned = (stats.totalEarned || 0) + count;
    stats.lastEarnedAt = Date.now();
  }

  return {
    isPersistent: !!storage,

    isEarned(name) {
      return earned.has(normalizeName(name));
    },

    size() {
      return earned.size;
    },

    list() {
      return [...earned];
    },

    all() {
      return new Set(earned);
    },

    lastChange() {
      return lastChange ? { ...lastChange } : null;
    },

    toggle(name) {
      const key = normalizeName(name);
      if (!key) return false;
      const nowEarned = !earned.has(key);
      if (nowEarned) earned.add(key);
      else earned.delete(key);
      if (nowEarned) bumpEarned(1);
      persist({ type: 'toggle', name: key, earned: nowEarned });
      return nowEarned;
    },

    setEarned(name, on) {
      const key = apply(name, !!on);
      if (key) {
        if (on) bumpEarned(1);
        persist({ type: 'set', name: key, earned: !!on });
      }
    },

    setMany(names, on) {
      const changed = [];
      for (const name of names || []) {
        const key = apply(name, !!on);
        if (key) changed.push(key);
      }
      if (changed.length) {
        if (on) bumpEarned(changed.length);
        persist({ type: 'setMany', names: changed, earned: !!on });
      }
      return changed.length;
    },

    clear() {
      if (!earned.size) return;
      earned.clear();
      stats.totalEarned = 0;
      stats.lastEarnedAt = null;
      persist({ type: 'clear' });
    },

    isFavorite(name) {
      return favorites.has(normalizeName(name));
    },

    toggleFavorite(name) {
      const key = normalizeName(name);
      if (!key) return false;
      const nowFav = !favorites.has(key);
      if (nowFav) favorites.add(key);
      else favorites.delete(key);
      persist({ type: 'favorite', name: key, favorite: nowFav });
      return nowFav;
    },

    favoriteNames() {
      return new Set(favorites);
    },

    favoriteCount() {
      return favorites.size;
    },

    getSetting(key) {
      return key in settings ? settings[key] : DEFAULT_SETTINGS[key];
    },

    setSetting(key, value) {
      if (!(key in DEFAULT_SETTINGS) || settings[key] === value) return;
      settings[key] = value;
      persist({ type: 'setting', key, value });
    },

    allSettings() {
      return { ...settings };
    },

    stats() {
      return { ...stats };
    },

    exportSnapshot() {
      return snapshot();
    },

    exportJSON() {
      return JSON.stringify(
        {
          app: 'leonida-ledger',
          saveVersion: SAVE_VERSION,
          exportedAt: new Date().toISOString(),
          ...snapshot(),
        },
        null,
        2,
      );
    },

    /** Merge a backup file into the current progress. Throws readable Errors. */
    importJSON(text) {
      if (typeof text !== 'string' || !text.trim()) {
        throw new Error('The selected file is empty.');
      }
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('That file is not valid JSON.');
      }
      const coerced = coerceBlob(parsed);
      if (!coerced) throw new Error('No earned trophies were found in that file.');

      const incoming = normalizeNameSet(coerced.earned);
      let added = 0;
      for (const name of incoming) {
        if (!earned.has(name)) {
          earned.add(name);
          added += 1;
        }
      }
      for (const name of normalizeNameSet(coerced.favorites)) favorites.add(name);
      if (coerced.settings && typeof coerced.settings === 'object') {
        const next = normalizeSettings(coerced.settings);
        for (const key of SETTING_KEYS) {
          if (key in coerced.settings) settings[key] = next[key];
        }
      }
      if (added) bumpEarned(added);
      else stats.totalEarned = Math.max(stats.totalEarned || 0, normalizeStats(coerced.stats).totalEarned || 0);
      persist({ type: 'import', added, total: incoming.size });
      return { added, total: incoming.size };
    },

    replaceEarned(names) {
      const next = normalizeNameSet(names);
      earned.clear();
      for (const name of next) earned.add(name);
      stats.totalEarned = next.size;
      stats.lastEarnedAt = Date.now();
      persist({ type: 'replace', size: next.size });
    },

    /** Overwrite earned names and settings from a snapshot (cross-tab mirror, imports). */
    replaceAll(source) {
      const next = normalizeNameSet(source && source.earned);
      earned.clear();
      for (const name of next) earned.add(name);
      const nextFavorites = normalizeNameSet(source && source.favorites);
      favorites.clear();
      for (const name of nextFavorites) favorites.add(name);
      const nextSettings = normalizeSettings(source && source.settings);
      for (const key of SETTING_KEYS) settings[key] = nextSettings[key];
      stats.totalEarned = next.size;
      stats.lastEarnedAt = Date.now();
      persist({ type: 'restore', size: next.size });
    },

    subscribe(fn) {
      if (typeof fn !== 'function') return () => {};
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/** Trigger a browser download of the current progress as JSON. */
export function downloadProgress(store) {
  const data = new Blob([store.exportJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leonida-ledger-progress.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Read a user-selected File as text. */
export function importFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file selected.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Could not read the file.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsText(file);
  });
}