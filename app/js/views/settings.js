import { el } from '../util.js';

export function renderSettings(ctx) {
  const wrap = el('section', 'view-pane');
  wrap.appendChild(el('h2', '', 'Settings'));

  const spoilerBlock = el('div', 'settings-block');
  spoilerBlock.appendChild(el('h3', '', 'Spoilers'));
  const spoilerRow = el('div', 'settings-row');
  const label = el('label', 'settings-label', 'Hide story trophy names and descriptions');
  label.htmlFor = 'spoiler-toggle';
  label.appendChild(el('p', 'settings-hint', 'Masks the name and description of any trophy that reveals story, mission, or plot details.'));
  label.appendChild(el('p', 'settings-hint', 'Earned trophies are always revealed.'));
  spoilerRow.appendChild(label);
  const sbox = document.createElement('input');
  sbox.id = 'spoiler-toggle';
  sbox.type = 'checkbox';
  sbox.checked = !!ctx.spoiler;
  sbox.addEventListener('change', () => ctx.onSpoiler(sbox.checked));
  spoilerRow.appendChild(sbox);
  spoilerBlock.appendChild(spoilerRow);
  wrap.appendChild(spoilerBlock);

  const dataBlock = el('div', 'settings-block');
  dataBlock.appendChild(el('h3', '', 'Progress data'));

  const row1 = el('div', 'settings-row');
  row1.appendChild(el('span', 'settings-label', 'Back up your progress to a file.'));
  const exportBtn = el('button', 'btn', 'Export progress');
  exportBtn.type = 'button';
  exportBtn.addEventListener('click', () => ctx.onExport());
  row1.appendChild(exportBtn);
  dataBlock.appendChild(row1);

  const row2 = el('div', 'settings-row');
  row2.appendChild(el('span', 'settings-label', 'Restore progress from a backup file.'));
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = '.json,application/json';
  file.addEventListener('change', () => {
    if (file.files && file.files[0]) ctx.onImport(file.files[0]);
    file.value = '';
  });
  row2.appendChild(file);
  dataBlock.appendChild(row2);

  const row3 = el('div', 'settings-row');
  row3.appendChild(el('span', 'settings-label', 'Clear all earned progress.'));
  const resetBtn = el('button', 'btn btn-danger', 'Reset');
  resetBtn.type = 'button';
  resetBtn.addEventListener('click', () => {
    if (confirm('Reset all trophy progress? This cannot be undone.')) ctx.onReset();
  });
  row3.appendChild(resetBtn);
  dataBlock.appendChild(row3);
  wrap.appendChild(dataBlock);

  wrap.appendChild(el('p', 'hint-text', 'All progress is stored locally in your browser (localStorage). Nothing is uploaded or tracked. Clearing your browser data will erase your progress.'));

  return wrap;
}