import { createStore, downloadProgress, importFromFile } from './store.js';
import { normalizeTrophies } from './data.js';
import { createFilters } from './filters.js';
import { renderShell } from './views/shell.js';
import { renderChecklist } from './views/checklist.js';
import { renderDetail, renderDetailPlaceholder } from './views/detail.js';
import { renderRoadmap } from './views/roadmap.js';
import { renderMissables } from './views/missables.js';
import { renderPlanner } from './views/planner.js';
import { renderSettings } from './views/settings.js';

const TABS = ['checklist', 'roadmap', 'missables', 'planner', 'settings'];
const TAB_DIGITS = { '1': 'checklist', '2': 'roadmap', '3': 'missables', '4': 'planner', '5': 'settings' };

function hashTab() {
  const h = location.hash.replace('#', '');
  return TABS.includes(h) ? h : 'checklist';
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load ' + url);
  return res.json();
}

async function boot() {
  const store = createStore();

  let trophies = [];
  let roadmap = null;
  try {
    const data = await fetchJSON('./data/trophies.json');
    trophies = normalizeTrophies(data.trophies || data);
  } catch (e) {
    console.error('Failed to load trophies', e);
    trophies = [];
  }

  try {
    roadmap = await fetchJSON('./data/roadmap.json');
  } catch (e) {
    console.error('Failed to load roadmap', e);
    roadmap = null;
  }

  const state = {
    trophies,
    roadmap,
    filters: createFilters(),
    spoiler: !!store.getSetting('spoiler'),
    selected: null,
    tab: hashTab(),
  };

  const root = document.getElementById('app');
  const shellEl = document.createElement('div');
  shellEl.className = 'app';
  root.appendChild(shellEl     );

  const viewHost = document.createElement('div');
  viewHost.className = 'view-host';
  shellEl.appendChild(viewHost);

  function activeTab() {
    return TABS.includes(state.tab) ? state.tab : 'checklist';
  }

  function renderTab(active, ctx) {
    switch (active) {
      case 'roadmap': return renderRoadmap(ctx);
      case 'missables': return renderMissables(ctx);
      case 'planner': return renderPlanner(ctx);
      case 'settings': return renderSettings(ctx);
      default: return renderChecklist(ctx);
    }
  }

  function render() {
    const active = activeTab();

    viewHost.innerHTML = '';
    viewHost.appendChild(renderShell(state.trophies, store, active, (tab) => {
      state.tab = tab;
      location.hash = '#' + tab;
      render();
    }));

    const main = document.createElement('div');
    main.className = 'main-layout';

    const ctx = {
      trophies: state.trophies,
      roadmap: state.roadmap,
      filters: state.filters,
      store,
      spoiler: state.spoiler,
      selected: state.selected,
      onToggle(name) { store.toggle(name); render(); },
      onSelect(t) { state.selected = t; render(); },
      onClose() { state.selected = null; render(); },
      onFilter(f) { state.filters = f; render(); },
      onSpoiler(v) { state.spoiler = v; store.setSetting('spoiler', v); render(); },
      onExport() { downloadProgress(store); },
      async onImport(file) {
        try {
          const text = await importFromFile(file);
          store.importJSON(text);
        } catch (e) {
          alert(e.message);
        }
        render();
      },
      onReset() { store.reset(); state.selected = null; render(); },
    };

    const splitView = (active === 'checklist') || !!state.selected;
    if (splitView) main.classList.add('split');

    try {
      main.appendChild(renderTab(active, ctx));
      if (active === 'checklist' && !state.selected) {
        main.appendChild(renderDetailPlaceholder(ctx));
      } else if (state.selected) {
        main.appendChild(renderDetail(ctx));
      }
    } catch (e) {
      console.error('render error', e);
      document.body.setAttribute('data-render-error', e.message);
    }

    viewHost.appendChild(main);
  }

  window.addEventListener('hashchange', () => {
    const h = location.hash.replace('#', '');
    if (TABS.includes(h)) {
      state.tab = h;
      state.selected = null;
      render();
    }
  });

  document.addEventListener('keydown', (e) => {
    const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
    if (e.key === '/') {
      e.preventDefault();
      const input = document.querySelector('.search-box');
      if (input) input.focus();
      return;
    }
    if (TAB_DIGITS[e.key]) {
      state.tab = TAB_DIGITS[e.key];
      location.hash = '#' + state.tab;
      render();
      return;
    }
    if (!typing && (e.key === 's' || e.key === 'S')) {
      state.spoiler = !state.spoiler;
      store.setSetting('spoiler', state.spoiler);
      render();
      return;
    }
    if (e.key === 'Escape') {
      state.selected = null;
      render();
    }
  });

  render();
}

boot();