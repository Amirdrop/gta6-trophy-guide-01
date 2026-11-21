import { el, button } from '../util.js';
import { kindLabel, durationText } from '../data.js';
import { difficultyDots } from './checklist.js';

export function renderPlanner(ctx) {
  const summary = ctx.summary;
  const pane = el('section', 'view-pane planner-pane');

  const head = el('div', 'checklist-header');
  const titleWrap = el('div');
  titleWrap.appendChild(el('h2', '', 'Planner'));
  titleWrap.appendChild(el('p', 'pane-sub', 'Your remaining trophies in roadmap order, grouped into sessions.'));
  head.appendChild(titleWrap);
  pane.appendChild(head);

  const stats = el('div', 'planner-stats');
  stats.appendChild(statCard('Trophies left', String(summary.total - summary.earned)));
  stats.appendChild(statCard('Stages left', String(summary.stageCount - summary.completeStages)));
  stats.appendChild(statCard('Missables left', String(summary.missables.remaining)));
  stats.appendChild(statCard('Time remaining', '~' + summary.hours.remainingText));
  pane.appendChild(stats);

  if (summary.isComplete) {
    const done = el('div', 'planner-done');
    done.appendChild(el('h3', '', 'Platinum earned'));
    done.appendChild(el('p', '', 'Every trophy is checked off. Congratulations, Leonida Legend!'));
    pane.appendChild(done);
    return pane;
  }

  const remaining = summary.stages
    .filter((s) => s.percent < 100)
    .map((s) => ({ stage: s, trophies: s.trophies.filter((t) => !ctx.store.isEarned(t.name)) }))
    .filter((g) => g.trophies.length > 0);

  for (const group of remaining) pane.appendChild(renderSession(ctx, group.stage, group.trophies));

  const tip = el('div', 'planner-advice');
  tip.appendChild(el('p', 'hint-text',
    'Work top to bottom in roadmap order. Clear any missable trophy while its set piece is still live, before it slips away.'));
  pane.appendChild(tip);

  return pane;
}

function statCard(label, value) {
  const card = el('div', 'planner-stat');
  card.appendChild(el('strong', 'planner-stat-value', value));
  card.appendChild(el('span', 'planner-stat-label', label));
  return card;
}

function renderSession(ctx, stage, trophies) {
  const group = el('div', 'session-group');
  const head = el('div', 'session-head');
  head.appendChild(el('span', 'stage-num small', String(stage.stage)));
  head.appendChild(el('h3', '', stage.title));
  const time = trophies.reduce((acc, t) => acc + (t.timeHours || 0), 0);
  const miss = trophies.filter((t) => t.missable).length;
  head.appendChild(el('span', 'session-meta',
    trophies.length + ' left' + (miss ? ' - ' + miss + ' missable' : '') + (time ? ' - ~' + formatRemaining(time) : '')));
  group.appendChild(head);

  const list = el('ul', 'planner-list');
  for (const t of trophies) list.appendChild(renderItem(ctx, stage, t));
  group.appendChild(list);
  return group;
}

function renderItem(ctx, stage, t) {
  const item = el('li', 'planner-item' + (t.missable ? ' missable' : '') + ' grade-' + t.grade);

  const check = el('label', 'planner-check');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = false;
  cb.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
  cb.addEventListener('change', () => ctx.actions.toggle(t.name));
  check.appendChild(cb);
  item.appendChild(check);

  const left = el('div', 'planner-left');
  const nameBtn = el('button', 'planner-name', t.name);
  nameBtn.type = 'button';
  nameBtn.addEventListener('click', () => ctx.actions.select(t));
  left.appendChild(nameBtn);
  item.appendChild(left);

  const right = el('div', 'planner-right');
  if (t.missable) right.appendChild(el('span', 'chip missable', 'Missable'));
  for (const tag of t.tags || []) right.appendChild(el('span', 'chip tag', tag));
  right.appendChild(el('span', 'planner-kind', kindLabel(t.kind)));
  const time = durationText(t);
  if (time && time !== '-') right.appendChild(el('span', 'planner-time', time));
  if (t.difficulty != null) right.appendChild(difficultyDots(t.difficulty, true));
  item.appendChild(right);
  return item;
}

function formatRemaining(hours) {
  const n = Number(hours) || 0;
  if (n < 1) return Math.max(5, Math.round(n * 60)) + 'm';
  return (Math.round(n * 10) / 10) + 'h';
}
