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

async function boot() {
  const store = createStore();

  let rawTrophies = [];
  let roadmap = null;
  try {
    const res = await fetch('./data/trophies.json');
    const data = await res.json();
    rawTrophies = data.trophies || data;
  } catch (e) {
    console.error('Failed to load trophies', e);
  }

  try {
    const res = await fetch('./data/roadmap.json');
    if (res.ok) roadmap = await res.json();
  } catch (e) {
    roadmap = null;
  }

  const trophies = normalizeTrophies(rawTrophies);

  const state = {
    trophies,
    roadmap,
    filters: createFilters(),
    spoiler: !!store.getSetting('spoiler'),
    selected: null,
    tab: TABS.includes(location.hash.replace('#', '')) ? location.hash.replace('#', '') : 'checklist',
  };

  const root = document.getElementById('app');
  const shellEl = document.createElement('div');
  shellEl.className = 'app';
  root.appendChild(shellEl);
  const viewHost = document.createElement('div');
  viewHost.className = 'view-host';
  shellEl.appendChild(viewHost);

  function render() {
    shellEl.innerHTML = '';
    const active = TABS.includes(state.tab) ? state.tab : 'checklist';
    shellEl.appendChild(renderShell(trophies, store, active, (tab) => {
      state.tab = tab;
      location.hash = '#' + tab;
      render();
    }));

    const main = document.createElement('div');
    main.className = 'main-layout';

    const ctx = {
      trophies,
      roadmap,
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

    shellEl.appendChild(main);
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

  window.addEventListener('hashchange', () => {
    const h = location.hash.replace('#', '');
    if (TABS.includes(h)) { state.tab = h; state.selected = null; render(); }
  });

  document.addEventListener('keydown', (e) => {
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
    if (e.key === 'Escape') {
      state.selected = null;
      render();
    }
  });

  render();
}

boot();