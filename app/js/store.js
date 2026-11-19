const STORE_KEY = 'gta6trophies.v1';

const DEFAULT_SETTINGS = {
  spoiler: false,
};

function loadRaw() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
    if (raw && typeof raw === 'object') return raw;
  } catch {
    /* ignore corrupt storage */
  }
  return null;
}

export function createStore() {
  const raw = loadRaw() ?? { earned: [], settings: { ...DEFAULT_SETTINGS } };
  const earned = new Set(Array.isArray(raw.earned) ? raw.earned : []);
  const settings = { ...DEFAULT_SETTINGS, ...(raw.settings || {}) };

  let listeners = [];

  function persist() {
    const data = { earned: [...earned], settings };
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
    notify();
  }

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
      return () => { listeners = listeners.filter((l) => l !== fn); };
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
      if (Array.isArray(data.earned)) {
        for (const id of data.earned) earned.add(String(id));
      }
      if (data.settings && typeof data.settings === 'object') {
        Object.assign(settings, data.settings);
      }
      persist();
    },
    demo() {
      earned.clear();
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
  const text = await file.text();
  return text;
}