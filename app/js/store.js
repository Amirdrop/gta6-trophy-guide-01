/**
 * store.js — persistent app state for earned trophies and settings.
 *
 * Design:
 *   - One versioned JSON blob in localStorage under STORE_KEY. The version
 *     lives in the blob, so a future migration can read and reshape old saves
 *     instead of silently dropping them.
 *   - Saves are written through synchronously so a click is never lost if the
 *     tab closes immediately afterwards.
 *   - Corrupt / foreign / unreadable saves never throw at startup: we fall back
 *     to an empty state and keep the bad payload under BACKUP_KEY for debugging.
 *   - Trophies are identified by name. Names are NFC-normalised and trimmed on
 *     the way in and out so curly-quoted names survive import/export round trips.
 *   - A tiny subscription lets views re-render after mutations without every
 *     caller having to remember to do it.
 */

const STORE_KEY = 'gta6trophies.v2';
const BACKUP_KEY = 'gta6trophies.corrupt';
const SAVE_VERSION = 2;

export const DEFAULT_SETTINGS = Object.freeze({
  spoiler: false,
  hideEarned: false,
});

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

function normalizeNameSet(value) {
  const out = new Set();
  if (!Array.isArray(value)) return out;
  for (const raw of value) {
    const name = normalizeName(raw);
    if (name) out.add(name);
  }
  return out;
}

function normalizeSettings(value) {
  const src = value && typeof value === 'object' ? value : {};
  const out = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    out[key] = typeof src[key] === typeof DEFAULT_SETTINGS[key] ? src[key] : DEFAULT_SETTINGS[key];
  }
  return out;
}

function safeStorage() {
  try {
    const s = window.localStorage;
    const probe = '__gta6_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function readBlob() {
  const storage = safeStorage();
  if (!storage) return null;
  const raw = storage.getItem(STORE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasSave() {
  const blob = readBlob();
  return !!(blob && Array.isArray(blob.earned) && blob.earned.length > 0);
}

export function createStore() {
  const storage = safeStorage();
  const blob = readBlob();

  const earned = normalizeNameSet(blob && blob.earned);
  const settings = normalizeSettings(blob && blob.settings);
  const listeners = new Set();

  function notify() {
    for (const fn of listeners) {
      try {
        fn();
      } catch (err) {
        console.error('store listener failed', err);
      }
    }
  }

  /** Persist synchronously; surface quota/privacy failures once. */
  function persist() {
    if (!storage) {
      notify();
      return;
    }
    const payload = {
      saveVersion: SAVE_VERSION,
      earned: [...earned],
      settings,
    };
    try {
      storage.setItem(STORE_KEY, JSON.stringify(payload));
    } catch (err) {
      if (!persist.warned) {
        persist.warned = true;
        console.warn('Could not save progress to localStorage', err);
      }
    }
    notify();
  }
