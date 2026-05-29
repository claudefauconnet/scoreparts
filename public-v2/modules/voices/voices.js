import { state, on, emit, resetAll } from '../partitions.state.js';

// ============== Instruments
const list = document.getElementById('instr-list');

const COLOR_PALETTE = [
  '#c9534b',
  '#d99441',
  '#4a7a8c',
  '#6b6396',
  '#5e8c61',
  '#a86b9b',
  '#3a342b',
  '#b08a3e',
];

function renderInstruments() {
  list.innerHTML = '';
  state.INSTRUMENTS.forEach((ins) => {
    const row = document.createElement('div');
    row.className =
      'instr' + (ins.on ? ' on' : '') + (state.activeInstr === ins.id ? ' active' : '');
    row.innerHTML = `
        <button class="instr-del" data-del title="Supprimer cet instrument" aria-label="Supprimer">
          <svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6"/></svg>
        </button>
        <div class="instr-main">
          <span class="instr-swatch" data-color title="Changer la couleur" style="background:${ins.color}"></span>
          <span class="instr-name" contenteditable="true" spellcheck="false" data-rename>${ins.name}</span>
          <span class="instr-count">${ins.count} zones</span>
          <span class="instr-toggle" data-toggle></span>
        </div>
        <div class="instr-actions">
          <button class="instr-action" data-act="erase" title="Effacer toutes les zones de cet instrument">
            <svg viewBox="0 0 24 24"><path d="M3 17l8-8 5 5-8 8H3v-5zM14 6l3-3 4 4-3 3"/></svg>
            Effacer
          </button>
          <button class="instr-action" data-act="download" title="Télécharger la voix">
            <svg viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M5 20h14"/></svg>
            Télécharger
          </button>
        </div>
      `;
    row.querySelector('[data-toggle]').addEventListener('click', (e) => {
      e.stopPropagation();
      ins.on = !ins.on;
      emit('instruments-changed');
      emit('zones-changed');
    });
    row.querySelector('[data-del]').addEventListener('click', (e) => {
      e.stopPropagation();
      openDeletePopover(e.currentTarget, row, ins);
    });
    row.querySelector('[data-color]').addEventListener('click', (e) => {
      e.stopPropagation();
      openColorPopover(e.target, ins);
    });
    row.querySelector('[data-rename]').addEventListener('click', (e) => e.stopPropagation());
    row.querySelector('[data-rename]').addEventListener('blur', (e) => {
      const value = e.target.textContent.trim();
      ins.name = value || ins.name;
      e.target.textContent = ins.name;
    });
    row.querySelector('[data-rename]').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
      }
    });
    row.querySelectorAll('.instr-action').forEach((button) => {
      button.addEventListener('click', (e) => e.stopPropagation());
    });
    row.addEventListener('click', () => {
      state.activeInstr = ins.id;
      emit('instruments-changed');
    });
    list.appendChild(row);
  });
}

// Destructive-action popover anchored to the instrument's × button.
function openDeletePopover(btn, row, ins) {
  document.querySelectorAll('.instr-pop').forEach((p) => p.remove());
  document
    .querySelectorAll('.instr.has-open-pop')
    .forEach((r) => r.classList.remove('has-open-pop'));
  // Toggle off if same button reopened
  if (btn.classList.contains('open')) {
    btn.classList.remove('open');
    return;
  }
  document.querySelectorAll('.instr-del.open').forEach((b) => b.classList.remove('open'));
  btn.classList.add('open');
  row.classList.add('has-open-pop');

  const pop = document.createElement('div');
  pop.className = 'instr-pop';
  pop.innerHTML = `
      <button class="instr-pop-item" data-pop-act="erase-all">
        <span class="instr-pop-icon">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>
        </span>
        <span class="instr-pop-text">
          <span class="instr-pop-title">Effacer de toutes les pages</span>
          <span class="instr-pop-sub">Supprime « ${ins.name} » et ses zones sur toutes les pages</span>
        </span>
      </button>
      <button class="instr-pop-item" data-pop-act="reset-all">
        <span class="instr-pop-icon danger">
          <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
        </span>
        <span class="instr-pop-text">
          <span class="instr-pop-title">Tout recommencer</span>
          <span class="instr-pop-sub">Modèle vierge : sans mouvements, sans instruments, sans zones</span>
        </span>
      </button>
    `;
  document.body.appendChild(pop);
  const rect = btn.getBoundingClientRect();
  // Anchor to the right edge of the × button so popover doesn't overflow viewport
  const popWidth = pop.offsetWidth;
  let left = rect.right - popWidth;
  if (left < 8) left = 8;
  pop.style.left = left + 'px';
  pop.style.top = rect.bottom + 8 + 'px';

  function closePop() {
    pop.remove();
    btn.classList.remove('open');
    row.classList.remove('has-open-pop');
    document.removeEventListener('click', onDocClick, true);
  }
  function onDocClick(ev) {
    if (pop.contains(ev.target) || btn.contains(ev.target)) return;
    closePop();
  }
  setTimeout(() => document.addEventListener('click', onDocClick, true), 0);

  pop.querySelector('[data-pop-act="erase-all"]').addEventListener('click', (ev) => {
    ev.stopPropagation();
    const idx = state.INSTRUMENTS.findIndex((x) => x.id === ins.id);
    if (idx >= 0) state.INSTRUMENTS.splice(idx, 1);
    state.ZONES_LEFT = state.ZONES_LEFT.filter((z) => z.instr !== ins.id);
    state.ZONES_RIGHT = state.ZONES_RIGHT.filter((z) => z.instr !== ins.id);
    if (state.activeInstr === ins.id) {
      state.activeInstr = state.INSTRUMENTS[0] ? state.INSTRUMENTS[0].id : null;
    }
    closePop();
    emit('instruments-changed');
    emit('zones-changed');
  });
  pop.querySelector('[data-pop-act="reset-all"]').addEventListener('click', (ev) => {
    ev.stopPropagation();
    closePop();
    resetAll();
  });
}

// Color picker popover anchored to the instrument swatch.
function openColorPopover(swatch, ins) {
  document.querySelectorAll('.color-pop').forEach((p) => p.remove());
  const pop = document.createElement('div');
  pop.className = 'color-pop';
  COLOR_PALETTE.forEach((color) => {
    const button = document.createElement('button');
    button.style.background = color;
    button.addEventListener('click', (ev) => {
      ev.stopPropagation();
      ins.color = color;
      document.documentElement.style.setProperty('--' + ins.id, color);
      pop.remove();
      emit('instruments-changed');
      emit('zones-changed');
    });
    pop.appendChild(button);
  });
  const rect = swatch.getBoundingClientRect();
  pop.style.left = rect.left + 'px';
  pop.style.top = rect.bottom + 6 + 'px';
  document.body.appendChild(pop);
  setTimeout(() => {
    document.addEventListener('click', () => pop.remove(), { once: true });
  }, 0);
}

on('instruments-changed', renderInstruments);
renderInstruments();

// ============== Global tooltip (body-attached, escapes overflow clipping)
(function setupGlobalTooltip() {
  let tip = null;
  let timer = null;
  function show(el) {
    const title = el.getAttribute('data-tooltip');
    const sub = el.getAttribute('data-tooltip-sub') || '';
    if (!title) return;
    tip = document.createElement('div');
    tip.className = 'global-tooltip';
    tip.innerHTML = sub ? `<strong>${title}</strong>${sub}` : `<strong>${title}</strong>`;
    document.body.appendChild(tip);
    const rect = el.getBoundingClientRect();
    // measure
    const tipWidth = tip.offsetWidth;
    const tipHeight = tip.offsetHeight;
    const centerX = rect.left + rect.width / 2;
    let top = rect.top - tipHeight - 10;
    let placeBelow = false;
    if (top < 8) {
      top = rect.bottom + 10;
      placeBelow = true;
    }
    // clamp horizontal
    const margin = 8;
    let left = centerX - tipWidth / 2;
    left = Math.max(margin, Math.min(window.innerWidth - tipWidth - margin, left));
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    tip.style.transform = 'none';
    // reposition arrow
    const arrowX = centerX - left;
    tip.style.setProperty('--arrow-x', arrowX + 'px');
    tip.classList.toggle('below', placeBelow);
    requestAnimationFrame(() => tip.classList.add('show'));
  }
  function hide() {
    clearTimeout(timer);
    if (tip) {
      tip.remove();
      tip = null;
    }
  }
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    hide();
    timer = setTimeout(() => show(target), 350);
  });
  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    hide();
  });
  window.addEventListener('scroll', hide, true);
})();
