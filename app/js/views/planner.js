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
  wrap.appendChild(el('p', 'planner-count', 'Route: ' + remaining.length + ' of 55 planned'));
  wrap.appendChild(el('h3', '', 'Next up'));
  const list = el('div', 'planner-list');

  if (!next.length) {
    list.appendChild(el('div', 'empty', 'You have earned every trophy. Congratulations!'));
  }

  if (planFull) {
    list.appendChild(el(
      'p', 'planner-note',
      'Showing your next ' + PLAN_LIMIT + ' trophies — ' + (remaining.length - PLAN_LIMIT) +
      ' more remain. This list fills as you earn the ones above.'
    ));
  }

  for (const t of next) {
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
    right.appendChild(difficultyDots(t.difficulty));
    item.appendChild(right);

    list.appendChild(item);
  }
  wrap.appendChild(list);

  const tip = el('div', 'planner-advice');
  const tipText = next.length
    ? 'Work top to bottom in stage order. Nail any missable trophy while its quest is still live.'
    : 'Every trophy earned — run the final completion sweep to close out 100%.';
  tip.appendChild(el('p', 'hint-text', tipText));
  wrap.appendChild(tip);

  return wrap;
}