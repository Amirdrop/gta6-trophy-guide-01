import { el } from '../util.js';

export function renderRoadmap(ctx) {
  const wrap = el('section', 'view-pane');
  wrap.appendChild(el('h2', '', 'Roadmap'));

  let stages;
  if (Array.isArray(ctx.roadmap) && ctx.roadmap.length) {
    const byId = new Map(ctx.trophies.map((t) => [t.id, t]));
    stages = ctx.roadmap.map((s, i) => ({
      key: i,
      title: s.title || ('Stage ' + (s.stage ?? i + 1)),
      blurb: s.blurb || '',
      stageNum: s.stage ?? i + 1,
      trophies: (s.trophies || [])
        .map((n) => byId.get(n))
        .filter(Boolean),
    }));
  } else {
    const grouped = new Map();
    for (const t of ctx.trophies) {
      const key = t.stage == null ? 0 : t.stage;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(t);
    }
    const keys = [...grouped.keys()].sort((a, b) => a - b);
    stages = keys.map((k) => ({
      key: k,
      title: k === 0 ? 'Other' : 'Stage ' + k,
      blurb: '',
      stageNum: k,
      trophies: grouped.get(k),
    }));
  }

  if (!stages.length) {
    wrap.appendChild(el('div', 'empty', 'No roadmap stages available.'));
    return wrap;
  }

  for (const s of stages) {
    const card = el('div', 'stage');
    const head = el('div', 'stage-head');
    head.appendChild(el('h3', '', s.title));
    const earned = s.trophies.filter((t) => ctx.store.isEarned(t.name)).length;
    head.appendChild(el('span', 'stage-progress', earned + ' / ' + s.trophies.length + ' earned'));
    card.appendChild(head);

    const body = el('div', 'stage-body');
    if (s.blurb) body.appendChild(el('p', 'stage-blurb', s.blurb));

    const chips = el('div', 'chips');
    for (const t of s.trophies) {
      const chip = el('button', 'chip stage-chip');
      chip.type = 'button';
      chip.classList.add('grade-' + t.grade);
      if (ctx.store.isEarned(t.name)) chip.classList.add('earned');
      chip.textContent = t.name;
      if (t.missable) chip.appendChild(el('span', 'missable-dot', '\u2022'));
      chip.addEventListener('click', () => ctx.onSelect(t));
      chips.appendChild(chip);
    }
    body.appendChild(chips);

    const bar = el('div', 'progressbar');
    const fill = el('div', 'progressbar-fill');
    fill.style.width = (s.trophies.length ? Math.round((earned / s.trophies.length) * 100) : 0) + '%';
    bar.appendChild(fill);
    body.appendChild(bar);

    card.appendChild(body);
    wrap.appendChild(card);
  }

  return wrap;
}