import { el } from '../util.js';
import { describeKind } from '../filters.js';
import { difficultyDots } from './checklist.js';

export function renderDetail(ctx) {
  const t = ctx.selected;
  const aside = el('aside', 'detail-pane');

  const head = el('div', 'detail-head');
  head.appendChild(el('span', 'grade-badge ' + t.grade, t.grade));
  const close = el('button', 'detail-close', 'x');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', () => ctx.onClose());
  head.appendChild(close);
  aside.appendChild(head);

  aside.appendChild(el('h3', 'detail-name', t.name));
  aside.appendChild(el('p', 'detail-desc', t.description));

  aside.appendChild(renderMeta(t));

  if (t.missable) {
    const m = el('div', 'detail-section missable');
    m.appendChild(el('p', 'missable-line', 'Can it be missed? Yes.'));
    if (t.missableNote) m.appendChild(el('p', 'missable-note', t.missableNote));
    aside.appendChild(m);
  }

  const steps = t.steps || t.guideSteps || (t.guide ? [t.guide] : null);
  if (steps && steps.length) {
    const sec = el('div', 'detail-section steps');
    sec.appendChild(el('h4', '', 'Guide'));
    const ol = document.createElement('ol');
    for (const s of steps) {
      const li = document.createElement('li');
      li.textContent = s;
      ol.appendChild(li);
    }
    sec.appendChild(ol);
    aside.appendChild(sec);
  }

  if (t.guide && t.guide !== (steps && steps[0])) {
    const g = el('div', 'detail-section guide');
    g.appendChild(el('p', 'guide-para', t.guide));
    aside.appendChild(g);
  }

  aside.appendChild(renderSources(t));

  aside.appendChild(el('p', 'detail-tip', 'Tip: turn Spoiler mode off in Settings to see full story details.'));

  return aside;
}

export function renderDetailPlaceholder(ctx) {
  const aside = el('aside', 'detail-pane placeholder');

  const card = el('div', 'placeholder-card');
  card.appendChild(el('h3', 'placeholder-title', 'How to use this guide'));

  const how = el('div', 'placeholder-section');
  const ol = document.createElement('ol');
  const items = [
    'Track your progress by ticking the checkbox on each trophy card as you earn it.',
    'Use the chips and search above to filter the checklist by kind, grade, or whether a trophy can be missed.',
    'Turn on Spoiler mode to hide the names and descriptions of story trophies you haven\'t earned yet (earned trophies are always shown). Toggle it off anytime in Settings or via the Spoiler chip to reveal them.',
    'Export or import your progress file in Settings to back it up or move it between devices.',
  ];
  for (const it of items) {
    const li = document.createElement('li');
    li.textContent = it;
    ol.appendChild(li);
  }
  how.appendChild(ol);
  card.appendChild(how);

  const next = firstUnearned(ctx);
  if (next) {
    card.appendChild(el('h4', 'placeholder-sub', 'Next up'));
    card.appendChild(renderNextGuide(ctx, next));
  } else {
    card.appendChild(el('p', 'placeholder-all', 'Every trophy is earned. Congratulations on 100%!'));
  }

  aside.appendChild(card);
  return aside;
}

function renderMeta(t) {
  const meta = el('div', 'detail-section meta');
  const metaP = el('div', 'meta-row');
  metaP.appendChild(el('span', 'meta-item', describeKind(t.kind)));
  if (t.stage != null) {
    metaP.appendChild(el('span', 'meta-item', 'Stage ' + t.stage));
  }
  if (t.difficulty) {
    const dWrap = el('span', 'meta-item diff-wrap');
    dWrap.appendChild(document.createTextNode('Difficulty '));
    dWrap.appendChild(difficultyDots(t.difficulty));
    metaP.appendChild(dWrap);
  }
  if (t.count) {
    metaP.appendChild(el('span', 'meta-item', t.count.target + ' ' + t.count.label));
  }
  meta.appendChild(metaP);
  return meta;
}

function renderSources(t) {
  const sources = t.sources || (t.source_note ? [] : null);
  const sec = el('div', 'detail-section sources');
  if (!((sources && sources.length) || t.source_note)) return sec;
  sec.appendChild(el('h4', '', 'Sources'));
  const box = el('div', 'sources-box');
  const ul = document.createElement('ul');
  for (const src of sources || []) {
    const li = document.createElement('li');
    if (src && src.url) {
      const a = document.createElement('a');
      a.href = src.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = src.label || src.url;
      li.appendChild(a);
    } else {
      li.textContent = (typeof src === 'string' ? src : (src && src.label)) || '';
    }
    ul.appendChild(li);
  }
  box.appendChild(ul);
  if (t.source_note) box.appendChild(el('small', 'source-note', t.source_note));
  sec.appendChild(box);
  return sec;
}

function firstUnearned(ctx) {
  const ordered = [...ctx.trophies].sort(
    (a, b) => (a.stage == null ? 99 : a.stage) - (b.stage == null ? 99 : b.stage) || a.id - b.id
  );
  return ordered.find((t) => !ctx.store.isEarned(t.name)) || null;
}

function renderNextGuide(ctx, t) {
  const wrap = el('div', 'placeholder-guide');
  const head = el('div', 'placeholder-guide-head');
  head.appendChild(el('span', 'grade-badge ' + t.grade, t.grade));
  const nameBtn = el('button', 'placeholder-name', t.name);
  nameBtn.type = 'button';
  nameBtn.addEventListener('click', () => ctx.onSelect(t));
  head.appendChild(nameBtn);
  wrap.appendChild(head);

  wrap.appendChild(el('p', 'detail-desc', t.description));

  wrap.appendChild(renderMeta(t));

  if (t.missable) {
    const m = el('div', 'detail-section missable');
    m.appendChild(el('p', 'missable-line', 'Can it be missed? Yes.'));
    if (t.missableNote) m.appendChild(el('p', 'missable-note', t.missableNote));
    wrap.appendChild(m);
  }

  const steps = t.steps || t.guideSteps || (t.guide ? [t.guide] : null);
  if (steps && steps.length) {
    const sec = el('div', 'detail-section steps');
    sec.appendChild(el('h4', '', 'Guide'));
    const ol = document.createElement('ol');
    for (const s of steps) {
      const li = document.createElement('li');
      li.textContent = s;
      ol.appendChild(li);
    }
    sec.appendChild(ol);
    wrap.appendChild(sec);
  }

  if (t.guide && t.guide !== (steps && steps[0])) {
    const g = el('div', 'detail-section guide');
    g.appendChild(el('p', 'guide-para', t.guide));
    wrap.appendChild(g);
  }

  wrap.appendChild(renderSources(t));

  return wrap;
}