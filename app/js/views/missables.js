import { el } from '../util.js';

export function renderMissables(ctx) {
  const wrap = el('section', 'view-pane');
  wrap.appendChild(el('h2', '', 'Missable Trophies'));
  wrap.appendChild(el('p', 'missables-intro', 'Flags built from the official descriptions; treat each as missable until confirmed in-game.'));

  const missables = ctx.trophies.filter((t) => t.missable);
  if (!missables.length) {
    wrap.appendChild(el('div', 'empty', 'No missable trophies in this list.'));
    return wrap;
  }

  for (const t of missables) {
    const item = el('div', 'missable-card');
    const head = el('div', 'missable-head');
    head.appendChild(el('span', 'grade-badge ' + t.grade, t.grade));
    const nameBtn = el('button', 'missable-name', t.name);
    nameBtn.type = 'button';
    nameBtn.addEventListener('click', () => ctx.onSelect(t));
    head.appendChild(nameBtn);
    item.appendChild(head);

    if (t.missableNote) item.appendChild(el('p', 'missable-note', t.missableNote));

    const guide = el('button', 'guide-btn', 'Guide');
    guide.type = 'button';
    guide.addEventListener('click', () => ctx.onSelect(t));
    item.appendChild(guide);

    wrap.appendChild(item);
  }

  return wrap;
}