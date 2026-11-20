import { el } from '../util.js';

export function renderMissables(ctx) {
  const wrap = el('section', 'view-pane');
  wrap.appendChild(el('h2', '', 'Missables'));
  wrap.appendChild(el('p', 'missables-intro', 'Flags built from the official descriptions; treat each as missable until confirmed in-game. Nail these while their quest is still live.'));

  const missables = ctx.trophies.filter((t) => t.missable);
  if (!missables.length) {
    wrap.appendChild(el('div', 'empty', 'No missable trophies in this list.'));
    return wrap;
  }

  const titleEl = wrap.querySelector('h2');
  if (titleEl) titleEl.textContent = 'Missables (' + missables.length + ')';

  const stageTitles = new Map(
    (Array.isArray(ctx.roadmap) ? ctx.roadmap : [])
      .map((s) => [s.stage, s.title])
      .filter(([, title]) => title)
  );

  const groups = new Map();
  for (const t of missables) {
    const key = t.stage == null ? 0 : t.stage;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  const keys = [...groups.keys()].sort((a, b) => a - b);

  for (const key of keys) {
    const title = key === 0 ? 'Unassigned' : 'Stage ' + key;
    const note = stageTitles.get(key);
    wrap.appendChild(el('h3', 'missables-heading', title + (note ? ': ' + note : '')));

    for (const t of groups.get(key)) {
      const item = el('div', 'missable-card');
      if (ctx.store.isEarned(t.name)) item.classList.add('earned');

      const head = el('div', 'missable-head');
      head.appendChild(el('span', 'grade-badge ' + t.grade, t.grade));
      const nameBtn = el('button', 'missable-name', t.name);
      nameBtn.type = 'button';
      nameBtn.addEventListener('click', () => ctx.onSelect(t));
      head.appendChild(nameBtn);
      item.appendChild(head);

      if (t.description) item.appendChild(el('p', 'trophy-desc clamp', t.description));

      if (t.missableNote) item.appendChild(el('p', 'missable-note', t.missableNote));

      const row = el('div', 'missable-row');
      if (ctx.store.isEarned(t.name)) row.appendChild(el('span', 'earn-chip', 'Earned'));
      const guide = el('button', 'guide-btn', 'Guide');
      guide.type = 'button';
      guide.addEventListener('click', () => ctx.onSelect(t));
      row.appendChild(guide);
      item.appendChild(row);

      wrap.appendChild(item);
    }
  }

  return wrap;
}