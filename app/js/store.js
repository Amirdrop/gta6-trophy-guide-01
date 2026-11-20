const STORE_KEY = 'gta6trophies.v1';
const SAVE_VERSION = 1;

const DEFAULT_SETTINGS = {
  spoiler: false,
};

/**
 * Deferred save helper. The first call writes through immediately so a quick
 * toggle is never lost; rapid follow-ups are coalesced into one trailing
 * write, keeping localStorage traffic low during bursts of toggles.
 */
function debounce(fn, wait) {
  let timer = null;
  let first = true;
  return function () {
    if (first) {
      first = false;
      fn();
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(fn, wait);
  };
}

function loadRaw() {
  let raw;
  try {
    raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
  } catch {
    return null; /* corrupt storage */
  }
  if (!raw || typeof raw !== 'object') return null;
  if (raw.saveVersion !== SAVE_VERSION) return null; /* stale/unknown format */
  return raw;
}

export function hasSave() {
  const raw = loadRaw();
  return !!(raw && Array.isArray(raw.earned));
}

function sanitizeEarned(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((id) => typeof id === 'string');
}

export function createStore() {
  const raw = loadRaw() ?? { earned: [], settings: {} };
  const earned = new Set(sanitizeEarned(raw.earned));
  const settings = { ...DEFAULT_SETTINGS, ...(raw.settings && typeof raw.settings === 'object' ? raw.settings : {}) };

  const persist = debounce(() => {
    const data = { saveVersion: SAVE_VERSION, earned: [...earned], settings };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable or full: keep in-memory state */
    }
    notify();
  }, 200);

  let listeners = [];
  function notify() {
    for (const fn of listeners) {
      try { fn(); } catch { /* ignore listener errors */ }
    }
  }

  return {
    isEarned(name) {
      return earned.has(name);
    },
    earnedSize() {
      return earned.size;
    },
    earnedList() {
      return [...earned];
    },
    toggle(name) {
      if (earned.has(name)) earned.delete(name);
      else earned.add(name);
      persist();
    },
    setEarned(name, value) {
      if (value) earned.add(name);
      else earned.delete(name);
      persist();
    },
    reset() {
      earned.clear();
      persist();
    },
    getSetting(key) {
      return settings[key];
    },
    setSetting(key, value) {
      settings[key] = value;
      persist();
    },
    subscribe(fn) {
      listeners.push(fn);
      return () => {
        listeners = listeners.filter((l) => l !== fn);
      };
    },
    exportJSON() {
      return JSON.stringify({ earned: [...earned], settings }, null, 2);
    },
    importJSON(json) {
      let data;
      try {
        data = JSON.parse(json);
      } catch {
        throw new Error('Invalid JSON file.');
      }
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid progress file format.');
      }
      earned.clear();
      for (const id of sanitizeEarned(data.earned)) earned.add(id);
      if (data.settings && typeof data.settings === 'object') {
        Object.assign(settings, data.settings);
      }
      persist();
    },
    demo() {
      const names = [
        'Just Like Paradise',
        'Paradise Lost',
        'T**s Ass Drug Money',
        'Vice City, Baby!',
        'Top Of The World, Ma',
        'Trust',
        'Break the Bank',
        'Family Matters',
        'DWNFALL',
        'Hi-Jacked',
        'Snow Storm',
        'You WAiNKer!',
        'Positive Mental Attitude',
        'Cunning Stunts',
      ];
      earned.clear();
      for (const n of names) earned.add(n);
      persist();
    },
  };
}

export function downloadProgress(store) {
  const blob = new Blob([store.exportJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophies-progress.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importFromFile(file) {
  return file.text();
}