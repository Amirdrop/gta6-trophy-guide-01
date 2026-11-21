/**
 * main.js - application shell for the Leonida Ledger trophy guide.
 *
 * The app is small and strictly unidirectional:
 *
 *     DOM event ──> Actions method ──> mutate state ──> render()
 *
 * There are exactly two ways a render happens:
 *
 *   1. The store mutates (toggle, settings, import, reset, cross-tab mirror)
 *      and its subscription fires -> App.commit() -> render().
 *   2. Pure UI state changes (tab, filters, selection, reveals) go through
 *      an Action that ends in App.commit() -> render().
 *
 * Pieces:
 *
 *   AppState   one mutable snapshot the UI renders from (tab, filters,
 *              spoiler, selection, per-trophy reveals, memoized results)
 *   Actions    one named method per user intent
 *   App        lifecycle + render pipeline; owns the mount point, the view
 *              registry and the frozen context bag handed to every view
 *   TabRouter  keeps location.hash and the active tab in sync without
 *              stacking bogus back-button entries
 *   Keymap     global shortcuts (1-5 tabs, S spoiler, / search, Esc close)
 *   ToastHost  transient, self-dismissing notifications
 *
 * Views under js/views get the frozen context bag and call back into Actions
 * only; they never touch the store, location, timers or localStorage directly.
 */

import { createStore, downloadProgress, importFromFile, STORE_KEY } from './store.js';
import { loadData } from './data.js';
import { createFilters, applyFilters } from './filters.js';
import { summarizeProgress } from './progress.js';
import { el, cls } from './util.js';
import { renderShell } from './views/shell.js';
import { renderChecklist } from './views/checklist.js';
import { renderDetail, renderDetailPlaceholder } from './views/detail.js';
import { renderRoadmap } from './views/roadmap.js';
import { renderMissables } from './views/missables.js';
import { renderPlanner } from './views/planner.js';
import { renderSettings } from './views/settings.js';

export const TABS = Object.freeze(['checklist', 'roadmap', 'missables', 'planner', 'settings']);
const DEFAULT_TAB = 'checklist';
const SPOILER_KEY = 'spoiler';

const TAB_BY_DIGIT = Object.freeze({
  '1': 'checklist',
  '2': 'roadmap',
  '3': 'missables',
  '4': 'planner',
  '5': 'settings',
});

/** Declarative view registry: tab id -> renderer(ctx). */
const VIEW_RENDERERS = Object.freeze({
  checklist: renderChecklist,
  roadmap: renderRoadmap,
  missables: renderMissables,
  planner: renderPlanner,
  settings: renderSettings,
});

function isTab(value) {
  return TABS.includes(value);
}

function tabFromHash() {
  const raw = (location.hash || '').replace(/^#/, '').split('?')[0];
  return isTab(raw) ? raw : DEFAULT_TAB;
}

/* ------------------------------------------------------------------ *
 * TabRouter - keeps location.hash and the active tab in sync.
 * Programmatic navigation only touches history when the value differs,
 * so tab clicks do not stack bogus back-button entries.
 * ------------------------------------------------------------------ */
class TabRouter {
  constructor(onChange) {
    this.onChange = onChange;
    this.current = tabFromHash();
    this.bound = () => {
      const next = tabFromHash();
      if (next === this.current) return;
      this.current = next;
      this.onChange(next);
    };
    window.addEventListener('hashchange', this.bound);
  }

  go(tab) {
    if (!isTab(tab)) return;
    this.current = tab;
    if (location.hash !== '#' + tab) location.hash = tab;
  }

  destroy() {
    window.removeEventListener('hashchange', this.bound);
  }
}

/* ------------------------------------------------------------------ *
 * Keymap - global keyboard shortcuts, installed once, disposed on
 * destroy. Typing into a field suppresses the tab/letter shortcuts.
 * ------------------------------------------------------------------ */
function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

class Keymap {
  constructor(actions) {
    this.actions = actions;
    this.handle = this.handle.bind(this);
  }

  install() {
    document.addEventListener('keydown', this.handle);
    return () => document.removeEventListener('keydown', this.handle);
  }

  handle(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const typing = isTypingTarget(event.target);

    if (event.key === '/' && !typing) {
      const search = document.querySelector('.search-box');
      if (search) {
        event.preventDefault();
        search.focus();
      }
      return;
    }

    if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
      if (!typing) {
        event.preventDefault();
        this.actions.toggleHelp();
      }
      return;
    }

    if (event.key === 'Escape') {
      if (this.actions.state.selectedName) {
        this.actions.closeDetail();
        return;
      }
      if (this.actions.app.helpOpen) {
        this.actions.toggleHelp(false);
        return;
      }
    }

    if (event.key === 'F' && !typing) {
      const name = this.actions.state.selectedName;
      if (name) {
        event.preventDefault();
        this.actions.toggleFavorite(name);
      }
      return;
    }

    const tab = TAB_BY_DIGIT[event.key];
    if (tab && !typing) {
      event.preventDefault();
      this.actions.setTab(tab);
      return;
    }

    if ((event.key === 's' || event.key === 'S') && !typing) {
      event.preventDefault();
      this.actions.toggleSpoiler();
    }
  }
}

/* ------------------------------------------------------------------ *
 * ToastHost - stacked, self-dismissing notifications. Timers are
 * tracked so dispose() can clear every pending timeout.
 * ------------------------------------------------------------------ */
class ToastHost {
  constructor(host) {
    this.host = host;
    this.timers = new Set();
  }

  show(message, tone) {
    if (!this.host) return;
    const toast = el('div', 'toast' + (tone ? ' toast-' + tone : ''), String(message));
    this.host.appendChild(toast);
    const hide = setTimeout(() => toast.classList.add('toast-out'), 2200);
    const drop = setTimeout(() => {
      toast.remove();
      this.timers.delete(hide);
      this.timers.delete(drop);
    }, 2700);
    this.timers.add(hide);
    this.timers.add(drop);
  }

  dispose() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    if (this.host) this.host.replaceChildren();
  }
}

/* ------------------------------------------------------------------ *
 * AppState - the single mutable snapshot the UI renders from. Views
 * read it through the frozen context bag; only Actions mutate it.
 * ------------------------------------------------------------------ */
class AppState {
  constructor(model, store) {
    this.model = model;
    this.store = store;
    this.tab = tabFromHash();
    this.filters = createFilters();
    this.spoiler = !!store.getSetting(SPOILER_KEY);
    this.selectedName = null;
    this.revealed = new Set();
    this.summaryCache = null;
    this.visibleCache = null;
    this.visibleKey = null;
  }

  get selected() {
    return this.selectedName ? this.model.byName.get(this.selectedName) || null : null;
  }

  select(trophy) {
    this.selectedName = trophy ? trophy.name : null;
  }

  isRevealed(name) {
    return this.revealed.has(name);
  }

  reveal(name) {
    if (name) this.revealed.add(name);
  }

  /** Progress summary shared by header, checklist, roadmap and planner. */
  summary() {
    if (!this.summaryCache) this.summaryCache = summarizeProgress(this.model, this.store);
    return this.summaryCache;
  }

  /** Filtered + sorted trophies for the checklist, memoized on a data key. */
  visible() {
    const key = [
      this.filters.query,
      this.filters.kind,
      this.filters.grade,
      this.filters.status,
      this.filters.missable,
      this.filters.sort,
      this.filters.orderAsc,
      this.spoiler,
      !!this.store.getSetting('hideEarned'),
      this.store.size(),
    ].join('|');
    if (this.visibleKey === key && this.visibleCache) return this.visibleCache;
    const list = applyFilters(this.model.trophies, this.filters, {
      store: this.store,
      spoiler: this.spoiler,
      hideEarned: !!this.store.getSetting('hideEarned'),
      orderIndex: this.model.orderIndex,
    });
    this.visibleKey = key;
    this.visibleCache = list;
    return list;
  }

  /** Drop every memo before a render that must see fresh data. */
  invalidate() {
    this.summaryCache = null;
    this.visibleCache = null;
    this.visibleKey = null;
  }
}

/* ------------------------------------------------------------------ *
 * Actions - one named method per user intent. Store mutations flow
 * back through the store subscription; local UI mutations end in
 * app.commit(). Views receive this object and nothing lower.
 * ------------------------------------------------------------------ */
class Actions {
  constructor(app) {
    this.app = app;
  }

  get state() {
    return this.app.state;
  }

  get store() {
    return this.app.store;
  }

  setTab(tab) {
    if (!isTab(tab) || tab === this.state.tab) return;
    this.state.tab = tab;
    this.state.select(null);
    this.app.router.go(tab);
    this.app.commit();
  }

  toggle(name) {
    const nowEarned = this.store.toggle(name); // subscription re-renders
    if (this.state.selectedName === name) this.app.revealDetail();
    return nowEarned;
  }

  select(trophy) {
    if (!trophy) return;
    this.state.select(trophy);
    this.app.commit();
    this.app.revealDetail();
  }

  closeDetail() {
    if (!this.state.selectedName) return;
    this.state.select(null);
    this.app.commit();
  }

  setFilters(patch) {
    this.state.filters = createFilters({ ...this.state.filters, ...patch });
    this.app.commit();
    this.app.refocusSearch();
  }

  resetFilters() {
    this.state.filters = createFilters();
    this.app.commit();
    this.app.refocusSearch();
  }

  jumpToMissables() {
    this.setFilters({ missable: true, status: 'all' });
  }

  /** Star/unstar a trophy for the favorites quick filter. */
  toggleFavorite(name) {
    const on = this.store.toggleFavorite(name); // subscription re-renders
    this.app.toast(on ? 'Starred ' + name + '.' : 'Removed star from ' + name + '.', on ? 'ok' : '');
  }

  /** Open or close the keyboard-shortcuts help overlay. */
  toggleHelp(force) {
    const show = force == null ? !this.app.helpOpen : !!force;
    if (show === this.app.helpOpen) return;
    this.app.helpOpen = show;
    this.app.commit();
  }

  setSpoiler(value) {
    const next = !!value;
    if (next === this.state.spoiler) return;
    this.state.spoiler = next;
    this.store.setSetting(SPOILER_KEY, next); // subscription re-renders
  }

  toggleSpoiler() {
    this.setSpoiler(!this.state.spoiler);
  }

  setHideEarned(value) {
    this.store.setSetting('hideEarned', !!value); // subscription re-renders
  }

  /** Reveal a single masked trophy despite spoiler mode (per-card override). */
  revealTrophy(name) {
    if (!name) return;
    this.state.reveal(name);
    this.app.commit();
  }

  exportProgress() {
    downloadProgress(this.store);
    this.app.toast('Progress exported.', 'ok');
  }

  async importProgress(file) {
    try {
      const text = await importFromFile(file);
      const result = this.store.importJSON(text); // subscription re-renders
      this.app.toast(
        result.added === 0
          ? 'Backup merged - no new trophies.'
          : 'Imported ' + result.added + ' new troph' + (result.added === 1 ? 'y' : 'ies') + '.',
        'ok',
      );
    } catch (error) {
      this.app.toast(error.message || 'Import failed.', 'err');
    }
  }

  resetProgress() {
    if (!window.confirm('Reset all trophy progress? This cannot be undone.')) return;
    this.state.select(null);
    this.store.clear();
    this.app.commit();
    this.app.toast('Progress reset.', 'warn');
  }
}

/* ------------------------------------------------------------------ *
 * App - owns the mount point, router, actions and the render pipeline.
 * The shell and active view are rebuilt from state on every render;
 * only things a user perceives (search caret, guide pane position) are
 * restored afterwards.
 * ------------------------------------------------------------------ */
class App {
  constructor(model, store) {
    this.model = model;
    this.store = store;
    this.state = new AppState(model, store);
    this.router = new TabRouter((tab) => {
      this.state.tab = tab;
      this.state.select(null);
      this.commit();
    });
    this.state.tab = this.router.current;
    this.actions = new Actions(this);
    this.keymap = new Keymap(this.actions);

    this.root = document.getElementById('app');
    this.viewHost = null;
    this.toasts = null;
    this.toastHost = null;
    this.helpOpen = false;
    this.unsubscribeStore = null;
    this.disposeKeys = null;

    this.context = this.buildContext();
  }

  /**
   * Frozen context bag handed to every view renderer. Built once: stable
   * object identity, live getters, so views always read current state.
   */
  buildContext() {
    const app = this;
    const context = {
      model: app.model,
      trophies: app.model.trophies,
      stages: app.model.stages,
      missables: app.model.missables,
      meta: app.model.meta,
      gradeCounts: app.model.gradeCounts,
      kindCounts: app.model.kindCounts,
      byStage: app.model.byStage,
      order: app.model.order,
      orderIndex: app.model.orderIndex,
      totals: app.model.totals,
      total: app.model.trophies.length,
      hasRoadmap: app.model.hasRoadmap,
      store: app.store,
      actions: app.actions,
      notify: (message, tone) => app.toast(message, tone),
      isRevealed: (name) => app.state.isRevealed(name),
    };
    Object.defineProperties(context, {
      tab: { get: () => app.state.tab },
      filters: { get: () => app.state.filters },
      spoiler: { get: () => app.state.spoiler },
      hideEarned: { get: () => !!app.store.getSetting('hideEarned') },
      selected: { get: () => app.state.selected },
      visible: { get: () => app.state.visible() },
      summary: { get: () => app.state.summary() },
    });
    return Object.freeze(context);
  }

  toast(message, tone) {
    if (this.toastHost) this.toastHost.show(message, tone);
  }

  /** Invalidate memos and repaint. The single render entry point. */
  commit() {
    this.state.invalidate();
    this.render();
  }

  mount() {
    if (!this.root) throw new Error('Missing #app mount point.');
    this.root.replaceChildren();
    this.root.removeAttribute('aria-busy');

    const shell = el('div', 'app');
    this.viewHost = el('div', 'view-host');
    this.toasts = el('div', 'toasts');
    this.toasts.setAttribute('aria-live', 'polite');
    this.toasts.setAttribute('aria-atomic', 'false');
    shell.appendChild(this.viewHost);
    shell.appendChild(this.toasts);
    this.root.appendChild(shell);
    this.toastHost = new ToastHost(this.toasts);
  }

  render() {
    if (!this.viewHost) return;
    const ctx = this.context;
    try {
      this.viewHost.replaceChildren();
      this.viewHost.appendChild(renderShell(ctx));

      const layout = el('div', cls('main-layout', ctx.selected && 'split'));
      const renderer = VIEW_RENDERERS[ctx.tab] || renderChecklist;
      layout.appendChild(renderer(ctx));

      if (ctx.selected) {
        layout.appendChild(renderDetail(ctx));
      } else if (ctx.tab === 'checklist') {
        const placeholder = renderDetailPlaceholder(ctx);
        if (placeholder) layout.appendChild(placeholder);
      }

      this.viewHost.appendChild(layout);
      const help = this.renderHelp();
      if (help) this.viewHost.appendChild(help);
    } catch (error) {
      this.renderError(error);
    }
  }

  /** Help overlay listing the keyboard shortcuts. Rendered into the shell. */
  renderHelp() {
    if (!this.helpOpen) return null;
    const box = el('div', 'help-overlay');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Keyboard shortcuts');
    const card = el('div', 'help-card');
    const head = el('div', 'help-head');
    head.appendChild(el('h2', '', 'Keyboard shortcuts'));
    const close = el('button', 'btn help-close', 'Close');
    close.type = 'button';
    close.addEventListener('click', () => this.actions.toggleHelp(false));
    close.setAttribute('aria-label', 'Close keyboard shortcuts');
    head.appendChild(close);
    card.appendChild(head);
    const rows = [
      ['1-5', 'Switch tabs'],
      ['S', 'Toggle spoiler mode'],
      ['F', 'Star / unstar selected trophy'],
      ['/', 'Focus the search box'],
      ['?', 'Show this help'],
      ['Esc', 'Close the guide panel or this help'],
    ];
    const list = el('dl', 'help-list');
    for (const [key, desc] of rows) {
      const dt = el('dt', 'help-key', key);
      const dd = el('dd', 'help-desc', desc);
      list.appendChild(dt);
      list.appendChild(dd);
    }
    card.appendChild(list);
    box.appendChild(card);
    box.addEventListener('click', (event) => {
      if (event.target === box) this.actions.toggleHelp(false);
    });
    return box;
  }

  /** Scroll the guide pane into view after a trophy is selected. */
  revealDetail() {
    const pane = document.querySelector('.detail-pane');
    if (pane && typeof pane.scrollIntoView === 'function') {
      pane.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /** Keep the search box focused (with caret at end) across re-renders. */
  refocusSearch() {
    const active = document.activeElement;
    if (!active || !active.classList || !active.classList.contains('search-box')) return;
    const input = document.querySelector('.search-box');
    if (!input) return;
    input.focus();
    const end = input.value.length;
    if (typeof input.setSelectionRange === 'function') input.setSelectionRange(end, end);
  }

  renderError(error) {
    console.error('Render failed', error);
    if (!this.root) return;
    this.root.replaceChildren();
    const box = el('div', 'fatal render-fatal');
    box.setAttribute('data-render-error', error && error.message ? error.message : 'unknown');
    box.appendChild(el('h1', '', 'Something went wrong while drawing the guide'));
    box.appendChild(el('p', '', error && error.message ? error.message : 'Unknown render error'));
    const reset = el('button', 'btn', 'Reset filters and retry');
    reset.type = 'button';
    reset.addEventListener('click', () => {
      this.state.filters = createFilters();
      this.state.select(null);
      this.render();
    });
    box.appendChild(reset);
    this.root.appendChild(box);
  }

  start() {
    this.mount();
    this.disposeKeys = this.keymap.install();
    this.unsubscribeStore = this.store.subscribe(() => this.commit());
    this.render();
  }

  destroy() {
    if (this.unsubscribeStore) this.unsubscribeStore();
    if (this.disposeKeys) this.disposeKeys();
    this.router.destroy();
    if (this.toastHost) this.toastHost.dispose();
  }
}

/* ------------------------------------------------------------------ *
 * Boot - load data, wire the app, mirror cross-tab progress changes.
 * ------------------------------------------------------------------ */
async function boot() {
  const root = document.getElementById('app');
  try {
    const model = await loadData();
    for (const warning of model.warnings) console.warn('[data] ' + warning);

    const store = createStore();
    const app = new App(model, store);
    app.start();
    window.__ledger = app;

    document.body.classList.add('app-ready');
    document.documentElement.dataset.appReady = 'true';

    // Cross-tab sync: mirror progress written by another tab of this app.
    window.addEventListener('storage', (event) => {
      if (event.key !== STORE_KEY) return;
      const mirror = createStore();
      store.replaceAll(mirror.exportSnapshot());
    });
  } catch (error) {
    console.error('Failed to start Leonida Ledger', error);
    if (root) {
      root.replaceChildren();
      const box = el('div', 'fatal');
      box.appendChild(el('h1', '', 'Could not load the trophy guide'));
      box.appendChild(el('p', '', error && error.message ? error.message : 'Unknown error'));
      box.appendChild(el('p', '', 'Serve the files over HTTP (for example: node serve.ts) and reload.'));
      root.appendChild(box);
    }
    document.body.setAttribute('data-boot-error', String(error && error.message ? error.message : error));
  }
}

boot();
