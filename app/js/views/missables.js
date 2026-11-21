import { el } from '../util.js';
import { kindLabel } from '../data.js';

export function renderMissables(ctx) {
  const pane = el('section', 'view-pane missables-pane');
  pane.appendChild(renderHeader(ctx));

  if (!ctx.missables.length) {
    const empty = el('div', 'empty');
    empty.appendChild(el('h3', '', 'No missable trophies'));
    empty.appendChild(el('p', '', 'Every trophy in this list can be earned at any time.'));
    pane.appendChild(empty);
    return pane;
  }

  const summary = ctx.summary;
  const banner = el('div', 'missables-progress');
  const bar = el('div', 'progress-mini');
  const fill = el('div', 'progress-mini-fill');
  fill.style.width = (summary.missables.total ? Math.round((summary.missables.earned / summary.missables.total) * 100) : 0) + '%';
  bar.appendChild(fill);
  banner.appendChild(bar);
  banner.appendChild(el('span', 'missables-progress-text',
    summary.missables.earned + ' / ' + summary.missables.total + ' secured'));
  pane.appendChild(banner);

  const byStage = new Map();
  for (const t of ctx.missables) {
    const key = t.stage == null ? 0 : t.stage;
    if (!byStage.has(key)) byStage.set(key, []);
    byStage.get(key).push(t);
  }
  const keys = [...byStage.keys()].sort((a, b) => a - b);

  for (const key of keys) {
    const stage = ctx.stages.find((s) => s.stage === key) || null;
    const list = byStage.get(key);
    const open = list.filter((t) => !ctx.store.isEarned(t.name)).length;
    const heading = el('h3', 'missables-heading');
    heading.appendChild(el('span', '', stage ? stage.title : (key ? 'Stage ' + key : 'Unassigned')));
    heading.appendChild(el('span', 'missable-count', open === 0 ? 'All secured' : open + ' left'));
    pane.appendChild(heading);

    const grid = el('div', 'missable-grid');
    for (const t of list) grid.appendChild(renderCard(ctx, t, stage));
    pane.appendChild(grid);
  }

  return pane;
}

function renderHeader(ctx) {
  const head = el('div', 'checklist-header');
  const titleWrap = el('div');
  titleWrap.appendChild(el('h2', '', 'Missables'));
  titleWrap.appendChild(el('p', 'pane-sub',
    'Trophies that can be permanently lost if you pass their moment. Deal with these first.'));
  head.appendChild(titleWrap);

  const count = ctx.missables.length;
  const badge = el('span', 'missables-badge', count + ' missable' + (count === 1 ? '' : 's'));
  head.appendChild(badge);
  return head;
}

function renderCard(ctx, t, stage) {
  const earned = ctx.store.isEarned(t.name);
  const card = el('article', 'missable-card grade-' + t.grade + (earned ? ' earned' : ''));
  const head = el('div', 'missable-head');
  head.appendChild(el('span', 'grade-badge ' + t.grade, t.grade));

  const nameBtn = el('button', 'missable-name', t.name);
  nameBtn.type = 'button';
  nameBtn.addEventListener('click', () => ctx.actions.select(t));
  head.appendChild(nameBtn);
  card.appendChild(head);

  if (t.description) card.appendChild(el('p', 'trophy-desc', t.description));

  if (t.missableWindow || t.missableNote) {
    const note = el('div', 'missable-note-box');
    note.appendChild(el('span', 'missable-note-label', 'Missable window'));
    if (t.missableWindow) note.appendChild(el('p', 'missable-window', t.missableWindow));
    if (t.missableNote) note.appendChild(el('p', 'missable-note', t.missableNote));
    card.appendChild(note);
  }

  const row = el('div', 'missable-row');
  const meta = el('span', 'missable-meta');
  if (stage) meta.appendChild(document.createTextNode(stage.title + '  '));
  meta.appendChild(document.createTextNode(kindLabel(t.kind)));
  row.appendChild(meta);

  const right = el('div', 'missable-actions');
  if (t.stage != null) right.appendChild(el('span', 'chip chip-stage', 'Stage ' + t.stage));
  if (earned) {
    right.appendChild(el('span', 'earn-chip', 'Earned'));
  } else {
    const mark = el('button', 'btn btn-small', 'Mark earned');
    mark.type = 'button';
    mark.addEventListener('click', () => ctx.actions.toggle(t.name));
    right.appendChild(mark);
  }
  row.appendChild(right);
  card.appendChild(row);
  return card;
}
