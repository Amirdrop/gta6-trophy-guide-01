import { el } from '../util.js';
import { describeKind } from '../filters.js';
import { difficultyDots } from './checklist.js';

export function renderPlanner(ctx) {
  const wrap = el('section', 'view-pane');

  const ordered = [...ctx.trophies].sort(
    (a, b) => (a.stage == null ? 99 : a.stage) - (b.stage == null ? 99 : b.stage) || a.id - b.id
  );
  const remaining = ordered.filter((t) => !ctx.store.isEarned(t.name));
  const PLAN_LIMIT = 8;
  const next = remaining.slice(0, PLAN_LIMIT);
  const planFull = remaining.length > PLAN_LIMIT;

  wrap.appendChild(el('h2', '', 'Planner'));
  wrap.appendChild(el('p', 'planner-count', 'Remaining: ' + remaining.length + ' · Estimated time left: ~' + formatHours(remainingTotal(remaining))));

  const sessions = groupSessions(next, ctx);
  for (const s of sessions) {
    const group = el('div', 'session-group');
    group.appendChild(el('h3', '', s.title));
    group.appendChild(el('p', 'session-meta', s.meta));
    const list = el('div', 'planner-list');
    for (const t of s.items) {
      list.appendChild(renderItem(ctx, t));
    }
    group.appendChild(list);
    wrap.appendChild(group);
  }

  if (!next.length) {
    wrap.appendChild(el('div', 'empty', 'You have earned every trophy. Congratulations!'));
  }

  if (planFull) {
    wrap.appendChild(el(
      'p', 'planner-note',
      'Showing your next ' + PLAN_LIMIT + ' trophies — ' + (remaining.length - PLAN_LIMIT) +
      ' more remain. This list fills as you earn the ones above.'
    ));
  }

  const tip = el('div', 'planner-advice');
  const tipText = next.length
    ? 'Work top to bottom in stage order. Nail any missable trophy while its quest is still live.'
    : 'Every trophy earned — run the final completion sweep to close out 100%.';
  tip.appendChild(el('p', 'hint-text', tipText));
  wrap.appendChild(tip);

  return wrap;
}

function renderItem(ctx, t) {
  const item = el('div', 'planner-item');
  const left = el('div', 'planner-left');
  left.appendChild(el('span', 'grade-badge ' + t.grade, t.grade));
  const nameBtn = el('button', 'planner-name', t.name);
  nameBtn.type = 'button';
  nameBtn.addEventListener('click', () => ctx.onSelect(t));
  left.appendChild(nameBtn);
  item.appendChild(left);

  const right = el('div', 'planner-right');
  const stageMeta = el('span', 'planner-when', 'Stage ' + (t.stage == null ? '?' : t.stage));
  right.appendChild(stageMeta);
  const prog = el('span', 'planner-prog', t.count ? t.count.target + ' ' + t.count.label : '');
  if (t.count) right.appendChild(prog);
  if (t.timeEstimate != null) right.appendChild(el('span', 'planner-time', '~' + t.timeEstimate + 'h'));
  right.appendChild(difficultyDots(t.difficulty));
  item.appendChild(right);

  return item;
}

function groupSessions(list, ctx) {
  if (!list.length) return [];
  const groups = [];
  let current = null;
  for (const t of list) {
    const stage = t.stage == null ? '?' : t.stage;
    if (!current || current.stage !== stage) {
      if (current) groups.push(current);
      current = { stage, items: [], title: 'Stage ' + stage, meta: '' };
    }
    current.items.push(t);
  }
  if (current) groups.push(current);
  for (const g of groups) {
    const miss = g.items.filter((t) => t.missable).length;
    const time = g.items.reduce((acc, t) => acc + (t.timeEstimate || 0), 0);
    g.meta = g.items.length + ' trophy' + (g.items.length === 1 ? '' : 's') +
      (miss ? ' · ' + miss + ' missable' : '') +
      (time ? ' · ~' + formatHours(time) : '');
  }
  return groups;
}

function remainingTotal(list) {
  return list.reduce((acc, t) => acc + (t.timeEstimate || 0), 0);
}

function formatHours(h) {
  const n = Number(h);
  if (!n) return '0h';
  if (n < 1) return Math.round(n * 60) + 'min';
  return (Math.round(n * 10) / 10) + 'h';
}