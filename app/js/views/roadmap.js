import { el, button } from '../util.js';
import { kindLabel } from '../data.js';
import { difficultyDots } from './checklist.js';

export function renderRoadmap(ctx) {
  const pane = el('section', 'view-pane roadmap-pane');
  pane.appendChild(renderHeader(ctx));

  if (!ctx.stages.length) {
    const empty = el('div', 'empty');
    empty.appendChild(el('h3', '', 'No roadmap yet'));
    empty.appendChild(el('p', '', 'The roadmap data could not be loaded. The checklist tab still works.'));
    pane.appendChild(empty);
    return pane;
  }

  const track = el('div', 'roadmap-track');
  for (const stage of ctx.stages) {
    track.appendChild(renderStage(ctx, stage));
  }
  pane.appendChild(track);
  return pane;
}

function renderHeader(ctx) {
  const summary = ctx.summary;
  const head = el('div', 'checklist-header');
  const titleWrap = el('div');
  titleWrap.appendChild(el('h2', '', 'Platinum Roadmap'));
  titleWrap.appendChild(el('p', 'pane-sub', 'A recommended order of play, from opening mission to platinum.'));
  head.appendChild(titleWrap);

  const progress = el('div', 'roadmap-progress');
  const bar = el('div', 'progress-mini');
  const fill = el('div', 'progress-mini-fill');
  fill.style.width = summary.percent + '%';
  bar.appendChild(fill);
  progress.appendChild(bar);
  progress.appendChild(el('span', 'roadmap-progress-text',
    summary.completeStages + ' / ' + summary.stageCount + ' stages complete'));
  head.appendChild(progress);
  return head;
}

function prerequisiteTitle(ctx, stage) {
  if (!stage.prerequisite) return null;
  const prev = (ctx.stages || []).find((s) => s.id === stage.prerequisite);
  return prev ? prev.title : null;
}

function renderStage(ctx, stage) {
  const card = el('article', 'stage' + (stage.complete ? ' complete' : '') + (stage.missable ? ' has-missables' : ''));
  card.id = 'stage-' + stage.id;
  const header = el('div', 'stage-head');

  const marker = el('div', 'stage-marker');
  marker.appendChild(el('span', 'stage-num', stage.complete ? 'OK' : String(stage.stage)));
  header.appendChild(marker);

  const titles = el('div', 'stage-titles');
  titles.appendChild(el('h3', '', stage.title));
  if (stage.subtitle) titles.appendChild(el('p', 'stage-subtitle', stage.subtitle));
  header.appendChild(titles);

  const meta = el('div', 'stage-meta');
  if (stage.estimatedHours) meta.appendChild(el('span', 'stage-hours', stage.estimatedHours));
  if (stage.difficulty) meta.appendChild(el('span', 'stage-difficulty', stage.difficulty));
  const prereq = prerequisiteTitle(ctx, stage);
  if (prereq) {
    const chip = el('span', 'stage-prereq', 'after: ' + prereq);
    chip.title = 'Recommended to start after ' + prereq;
    meta.appendChild(chip);
  }
  meta.appendChild(el('span', 'stage-progress',
    stage.earned + ' / ' + stage.total + ' earned'));
  if (stage.missables) {
    const open = stage.trophies.filter((t) => t.missable).filter((t) => !ctx.store.isEarned(t.name)).length;
    meta.appendChild(el('span', 'stage-missables' + (open ? '' : ' done'),
      stage.missables + ' missable' + (stage.missables === 1 ? '' : 's')));
  }
  header.appendChild(meta);
  card.appendChild(header);

  const body = el('div', 'stage-body');
  if (stage.description) body.appendChild(el('p', 'stage-blurb', stage.description));

  if (stage.goals && stage.goals.length) {
    const goals = el('div', 'stage-goals');
    goals.appendChild(el('span', 'stage-side-label', 'Stage goals'));
    for (const goal of stage.goals) goals.appendChild(el('p', 'stage-goal-item', goal));
    body.appendChild(goals);
  }

  const bar = el('div', 'progressbar');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuenow', String(stage.percent));
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.setAttribute('aria-label', stage.title + ': ' + stage.earned + ' of ' + stage.total + ' earned');
  const fill = el('div', 'progressbar-fill');
  fill.style.width = stage.percent + '%';
  bar.appendChild(fill);
  body.appendChild(bar);

  if (stage.focus.length) {
    const focus = el('div', 'stage-focus');
    for (const item of stage.focus) focus.appendChild(el('p', 'stage-focus-item', item));
    body.appendChild(focus);
  }

  if (stage.tips.length) {
    const tips = el('div', 'stage-tips');
    tips.appendChild(el('span', 'stage-side-label', 'Tips'));
    for (const item of stage.tips) tips.appendChild(el('p', 'stage-tip-item', item));
    body.appendChild(tips);
  }

  if (stage.warnings.length) {
    const warns = el('div', 'stage-warnings');
    warns.appendChild(el('span', 'stage-side-label', 'Watch out'));
    for (const item of stage.warnings) warns.appendChild(el('p', 'stage-warning-item', item));
    body.appendChild(warns);
  }

  if (stage.trophies.length) {
    const list = el('ul', 'stage-trophies');
    const trophies = [...stage.trophies].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    for (const t of trophies) list.appendChild(renderTrophy(ctx, t));
    body.appendChild(list);
  } else {
    body.appendChild(el('p', 'stage-empty', 'No trophies assigned to this stage.'));
  }

  card.appendChild(body);
  return card;
}

function renderTrophy(ctx, t) {
  const earned = ctx.store.isEarned(t.name);
  const item = el('li', 'stage-trophy' + (earned ? ' earned' : '') + (t.missable ? ' missable' : '') + ' grade-' + t.grade);

  const toggleLabel = el('label', 'stage-check');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = earned;
  cb.setAttribute('aria-label', (earned ? 'Unmark ' : 'Mark ') + t.name + ' as earned');
  cb.addEventListener('change', () => ctx.actions.toggle(t.name));
  toggleLabel.appendChild(cb);
  item.appendChild(toggleLabel);

  const nameBtn = el('button', 'stage-trophy-name', t.name);
  nameBtn.type = 'button';
  nameBtn.addEventListener('click', () => ctx.actions.select(t));
  if (earned) nameBtn.classList.add('is-earned');
  item.appendChild(nameBtn);

  const flags = el('div', 'stage-trophy-flags');
  if (t.missable) flags.appendChild(el('span', 'chip missable', 'Missable'));
  if (t.kind) flags.appendChild(el('span', 'chip kind', kindLabel(t.kind)));
  const diff = t.difficulty;
  if (diff != null) flags.appendChild(difficultyDots(diff, true));
  item.appendChild(flags);

  if (t.description) item.appendChild(el('p', 'stage-trophy-desc', t.description));
  return item;
}
