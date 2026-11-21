import { el, button } from '../util.js';
import { kindLabel, difficultyLabel, durationText } from '../data.js';
import { isMaskedStory } from '../filters.js';
import { difficultyDots } from './checklist.js';

export function renderDetail(ctx) {
  const t = ctx.selected;
  const earned = ctx.store.isEarned(t.name);
  const reveal = ctx.isRevealed ? ctx.isRevealed(t.name) : false;
  const masked = isMaskedStory(t, ctx.store, ctx.spoiler) && !reveal;
  const stage = t.stage == null ? null : ctx.stages.find((s) => s.stage === t.stage) || null;
  const aside = el('aside', 'detail-pane');
  aside.setAttribute('aria-label', 'Trophy guide');

  const head = el('div', 'detail-head');
  const badge = el('span', 'grade-badge ' + t.grade, t.grade);
  head.appendChild(badge);
  head.appendChild(el('span', 'detail-kind muted', kindLabel(t.kind)));
  const starred = ctx.store.isFavorite(t.name);
  const star = button('star-toggle detail-star' + (starred ? ' active' : ''), starred ? '\u2605' : '\u2606', () =>
    ctx.actions.toggleFavorite(t.name),
  );
  star.setAttribute('aria-label', starred ? 'Unstar ' + t.name : 'Star ' + t.name);
  star.title = starred ? 'Remove star (F)' : 'Star this trophy (F)';
  head.appendChild(star);
  const close = button('detail-close', 'Close', () => ctx.actions.closeDetail());
  close.setAttribute('aria-label', 'Close guide panel');
  head.appendChild(close);
  aside.appendChild(head);

  if (masked) {
    const box = el('div', 'detail-masked');
    box.appendChild(el('h3', 'detail-name', 'Hidden story trophy'));
    box.appendChild(el('p', 'detail-desc',
      'This trophy reveals story details. Turn off spoiler mode to read its name, description and guide.'));
    const revealBtn = button('btn', 'Reveal this trophy', () => ctx.actions.revealTrophy(t.name));
    box.appendChild(revealBtn);
    aside.appendChild(box);
    return aside;
  }

  aside.appendChild(el('h3', 'detail-name', t.name));
  if (t.description) aside.appendChild(el('p', 'detail-desc', t.description));

  const meta = el('div', 'detail-section meta');
  const metaGrid = el('div', 'meta-grid');
  metaGrid.appendChild(metaItem('Grade', t.grade));
  metaGrid.appendChild(metaItem('Category', kindLabel(t.kind)));
  metaGrid.appendChild(metaItem('Stage', t.stage == null ? 'Unassigned' : stage ? stage.title : 'Stage ' + t.stage));
  metaGrid.appendChild(metaItem('Difficulty', t.difficulty == null ? difficultyLabel(null) : difficultyLabel(t.difficulty) + ' (' + t.difficulty + '/5)'));
  if (t.area) metaGrid.appendChild(metaItem('Area', t.area));
  const time = durationText(t);
  if (time && time !== '-') metaGrid.appendChild(metaItem('Est. time', time));
  if (t.count) metaGrid.appendChild(metaItem('Target', t.count.target + ' ' + t.count.label));
  meta.appendChild(metaGrid);
  aside.appendChild(meta);

  if (t.difficulty != null) {
    const diffRow = el('div', 'detail-section diff-section');
    diffRow.appendChild(el('h4', '', 'Difficulty'));
    diffRow.appendChild(difficultyDots(t.difficulty));
    aside.appendChild(diffRow);
  }

  if (t.missable) aside.appendChild(renderMissable(t));

  const steps = t.steps && t.steps.length ? t.steps : t.guide ? [t.guide] : [];
  if (steps.length && t.guide && t.steps.length) {
    const sec = el('div', 'detail-section steps');
    sec.appendChild(el('h4', '', 'How to unlock'));
    const ol = document.createElement('ol');
    for (const s of steps) {
      const li = document.createElement('li');
      li.textContent = s;
      ol.appendChild(li);
    }
    sec.appendChild(ol);
    aside.appendChild(sec);
  }

  if (t.guide && !(t.steps && t.steps.length)) {
    const g = el('div', 'detail-section guide');
    g.appendChild(el('h4', '', 'Guide'));
    g.appendChild(el('p', 'guide-para', t.guide));
    aside.appendChild(g);
  }

  aside.appendChild(renderSources(t));

  const back = button('guide-btn detail-back', 'Back to list', () => ctx.actions.closeDetail());
  aside.appendChild(back);

  if (!earned) {
    const mark = button('btn btn-wide', 'Mark as earned', () => ctx.actions.toggle(t.name));
    aside.appendChild(mark);
  }
  return aside;
}

function metaItem(label, value) {
  const item = el('div', 'meta-item');
  item.appendChild(el('span', 'meta-label', label));
  item.appendChild(el('span', 'meta-value', value));
  return item;
}

function renderMissable(t) {
  const sec = el('div', 'detail-section missable');
  sec.appendChild(el('p', 'missable-line', 'Missable trophy - get this before the window closes.'));
  if (t.missableWindow) sec.appendChild(el('p', 'missable-window', t.missableWindow));
  if (t.missableNote) sec.appendChild(el('p', 'missable-note', t.missableNote));
  else sec.appendChild(el('p', 'missable-note', 'Earn it during its story or side mission; it cannot be repeated afterwards.'));
  return sec;
}

function renderSources(t) {
  const sources = t.sources || [];
  const sec = el('div', 'detail-section sources');
  if (!sources.length && !t.sourceNote) return sec;
  sec.appendChild(el('h4', '', 'Sources'));
  const box = el('div', 'sources-box');
  if (sources.length) {
    const ul = document.createElement('ul');
    for (const src of sources) {
      const li = document.createElement('li');
      if (src && src.url) {
        const a = document.createElement('a');
        a.href = src.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = src.label || src.url;
        li.appendChild(a);
      } else {
        li.textContent = (src && src.label) || String(src);
      }
      ul.appendChild(li);
    }
    box.appendChild(ul);
  }
  if (t.sourceNote) box.appendChild(el('small', 'source-note', t.sourceNote));
  sec.appendChild(box);
  return sec;
}

export function renderDetailPlaceholder(ctx) {
  const aside = el('aside', 'detail-pane placeholder');
  const card = el('div', 'placeholder-card');

  card.appendChild(el('h3', 'placeholder-title', 'How to use this guide'));
  const ol = document.createElement('ol');
  const tips = [
    'Tick the checkbox on any trophy card to mark it earned. Progress is saved in this browser instantly.',
    'Narrow the list with the category, status and grade chips, the missable toggle, the sort menu and the search box (press / to focus it).',
    'Spoiler mode hides the names and descriptions of unearned story trophies. Toggle it with the header pill, in Settings, or with the S key.',
    'Open a trophy name or its Guide button to read the full unlock steps, difficulty, time estimate and sources.',
    'Export a JSON backup from Settings to move your progress to another device.',
  ];
  for (const tip of tips) {
    const li = document.createElement('li');
    li.textContent = tip;
    ol.appendChild(li);
  }
  card.appendChild(ol);
  aside.appendChild(card);

  const next = nextUp(ctx);
  if (next) {
    card.appendChild(el('h4', 'placeholder-sub', 'Next up'));
    card.appendChild(renderNext(ctx, next));
  } else if (ctx.total > 0) {
    card.appendChild(el('p', 'placeholder-all', 'Every trophy is earned. Congratulations on the platinum!'));
  }

  return card;
}

function nextUp(ctx) {
  const stages = ctx.stages || [];
  for (const stage of stages) {
    for (const t of stage.trophies) {
      if (!ctx.store.isEarned(t.name)) return t;
    }
  }
  return null;
}

function renderNext(ctx, t) {
  const wrap = el('div', 'placeholder-guide');
  const head = el('div', 'placeholder-guide-head');
  head.appendChild(el('span', 'grade-badge ' + t.grade, t.grade));
  const nameBtn = el('button', 'placeholder-name', t.name);
  nameBtn.type = 'button';
  nameBtn.addEventListener('click', () => ctx.actions.select(t));
  head.appendChild(nameBtn);
  wrap.appendChild(head);

  if (t.description) wrap.appendChild(el('p', 'detail-desc', t.description));

  const meta = el('div', 'meta-row');
  meta.appendChild(el('span', 'meta-item', kindLabel(t.kind)));
  if (t.stage != null) meta.appendChild(el('span', 'meta-item', 'Stage ' + t.stage));
  if (t.difficulty != null) meta.appendChild(el('span', 'meta-item', difficultyLabel(t.difficulty)));
  const time = durationText(t);
  if (time && time !== '-') meta.appendChild(el('span', 'meta-item', time));
  wrap.appendChild(meta);

  return wrap;
}
