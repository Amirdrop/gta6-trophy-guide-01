import { el, button } from '../util.js';
import { hasSave } from '../store.js';

export function renderSettings(ctx) {
  const pane = el('section', 'view-pane settings-pane');

  const head = el('div', 'checklist-header');
  const titleWrap = el('div');
  titleWrap.appendChild(el('h2', '', 'Settings'));
  titleWrap.appendChild(el('p', 'pane-sub', 'Spoiler protection and a portable copy of your progress.'));
  head.appendChild(titleWrap);
  pane.appendChild(head);

  pane.appendChild(renderSpoilerBlock(ctx));
  pane.appendChild(renderDisplayBlock(ctx));
  pane.appendChild(renderDataBlock(ctx));
  pane.appendChild(renderAboutBlock(ctx));
  return pane;
}

function renderDisplayBlock(ctx) {
  const block = el('section', 'settings-block');
  block.appendChild(el('h3', '', 'Display'));

  const row = el('div', 'settings-row');
  const label = el('label', 'settings-label', 'Hide earned trophies in the checklist');
  label.htmlFor = 'hide-earned-toggle';
  label.appendChild(el('p', 'settings-hint',
    'Keeps the checklist focused on what is left to do. Earned trophies stay visible in Roadmap, Missables and Planner.'));
  row.appendChild(label);

  const box = document.createElement('input');
  box.id = 'hide-earned-toggle';
  box.type = 'checkbox';
  box.className = 'switch';
  box.checked = !!ctx.hideEarned;
  box.setAttribute('aria-label', 'Hide earned trophies in the checklist');
  box.addEventListener('change', () => ctx.actions.setHideEarned(box.checked));
  row.appendChild(box);
  block.appendChild(row);
  return block;
}

function renderSpoilerBlock(ctx) {
  const block = el('section', 'settings-block');
  block.appendChild(el('h3', '', 'Spoilers'));

  const row = el('div', 'settings-row');
  const label = el('label', 'settings-label', 'Hide story trophy names and descriptions');
  label.htmlFor = 'spoiler-toggle';
  label.appendChild(el('p', 'settings-hint',
    'Masks the name, description and guide of story trophies you have not earned yet. Earned trophies are always revealed.'));
  label.appendChild(el('p', 'settings-hint', 'Shortcut: press S anywhere to toggle.'));
  row.appendChild(label);

  const sbox = document.createElement('input');
  sbox.id = 'spoiler-toggle';
  sbox.type = 'checkbox';
  sbox.className = 'switch';
  sbox.checked = !!ctx.spoiler;
  sbox.addEventListener('change', () => ctx.actions.setSpoiler(sbox.checked));
  row.appendChild(sbox);
  block.appendChild(row);
  return block;
}

function renderDataBlock(ctx) {
  const block = el('section', 'settings-block');
  block.appendChild(el('h3', '', 'Progress data'));

  const row1 = el('div', 'settings-row');
  row1.appendChild(el('span', 'settings-label', 'Back up your progress to a JSON file.'));
  const exportBtn = button('btn', 'Export progress', () => ctx.actions.exportProgress());
  row1.appendChild(exportBtn);
  block.appendChild(row1);

  const row2 = el('div', 'settings-row');
  row2.appendChild(el('span', 'settings-label', 'Restore progress from a backup file.'));
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = '.json,application/json';
  file.className = 'file-input';
  file.addEventListener('change', () => {
    if (file.files && file.files[0]) ctx.actions.importProgress(file.files[0]);
    file.value = '';
  });
  row2.appendChild(file);
  block.appendChild(row2);

  const row3 = el('div', 'settings-row');
  row3.appendChild(el('span', 'settings-label', hasSave() ? 'Clear all earned progress.' : 'No saved progress yet.'));
  if (hasSave()) row3.appendChild(el('p', 'settings-hint', 'This cannot be undone.'));
  const resetBtn = button('btn btn-danger', 'Reset', () => ctx.actions.resetProgress());
  row3.appendChild(resetBtn);
  block.appendChild(row3);
  return block;
}

function renderAboutBlock(ctx) {
  const block = el('section', 'settings-block');
  block.appendChild(el('h3', '', 'About'));
  block.appendChild(el('p', 'hint-text',
    'All progress is stored locally in your browser (localStorage). Nothing is uploaded or tracked. Clearing your browser data will erase your progress.'));
  const meta = ctx.meta || {};
  if (meta.game) block.appendChild(el('p', 'hint-text', meta.game + ' - ' + (meta.platform || 'PlayStation 5')));
  if (meta.makeup) block.appendChild(el('p', 'hint-text', meta.makeup));
  return block;
}
