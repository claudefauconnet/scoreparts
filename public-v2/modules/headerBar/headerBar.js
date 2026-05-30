import { state, on, emit, resetAll } from '../partitions.state.js';
import { scoreParts } from '../../common/scoreParts.js';

// ============== Mouvements
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

function getCurrentPage() {
  return scoreParts.currentPage + 1;
}

function buildMovementsFromZones() {
  const pages = scoreParts.allPagesZones.pages;
  const movementFirstPage = {};
  const sortedPageKeys = Object.keys(pages).sort((a, b) => parseInt(a) - parseInt(b));

  for (const pageKey of sortedPageKeys) {
    const pageNumber = parseInt(pageKey) + 1;
    pages[pageKey].forEach((zone) => {
      if (zone.movement && !(zone.movement in movementFirstPage)) {
        movementFirstPage[zone.movement] = pageNumber;
      }
    });
  }

  return Object.entries(movementFirstPage).map(([name, startPage], idx) => ({
    id: idx + 1,
    name,
    startPage,
  }));
}

function loadMovementsFromZones() {
  const movements = buildMovementsFromZones();
  if (movements.length === 0) {
    state.MOVEMENTS.splice(0, state.MOVEMENTS.length, { id: 1, name: '', startPage: 1 });
    state.activeMvt = 1;
    emit('movements-changed');
    forceNameMovement();
    return;
  }
  state.MOVEMENTS.splice(0, state.MOVEMENTS.length, ...movements);
  if (!state.MOVEMENTS.find((m) => m.id === state.activeMvt)) {
    state.activeMvt = state.MOVEMENTS[0].id;
  }
}

function mvtRange(idx) {
  const movement = state.MOVEMENTS[idx];
  const next = state.MOVEMENTS[idx + 1];
  const end = next ? next.startPage - 1 : scoreParts.totalPages;
  return { start: movement.startPage, end };
}

function renderMvt() {
  state.MOVEMENTS.sort((a, b) => a.startPage - b.startPage);
  const idx = state.MOVEMENTS.findIndex((m) => m.id === state.activeMvt);
  const movement = state.MOVEMENTS[idx >= 0 ? idx : 0];
  if (idx < 0) state.activeMvt = movement.id;
  const order = state.MOVEMENTS.findIndex((x) => x.id === state.activeMvt);
  document.getElementById('mvt-number').innerHTML =
    'Mouvement <span class="roman">' + (ROMAN[order] || order + 1) + '</span>';
  document.getElementById('mvt-name').value = movement.name;

  const popList = document.getElementById('mvt-list');
  popList.innerHTML = '';
  state.MOVEMENTS.forEach((mv, i) => {
    const range = mvtRange(i);
    const item = document.createElement('div');
    item.className = 'mvt-item' + (mv.id === state.activeMvt ? ' active' : '');
    item.innerHTML = `
        <span class="num">${ROMAN[i] || i + 1}</span>
        <span class="name">${mv.name || 'Sans titre'}</span>
        <span class="range">p. ${range.start}–${range.end}</span>
        <button class="del" title="Supprimer ce mouvement">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
        </button>
      `;
    item.addEventListener('click', () => {
      state.activeMvt = mv.id;
      emit('movements-changed');
      closeMvtPop();
    });
    item.querySelector('.del').addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.MOVEMENTS.length <= 1) return;
      const removeIdx = state.MOVEMENTS.findIndex((x) => x.id === mv.id);
      state.MOVEMENTS.splice(removeIdx, 1);
      if (state.activeMvt === mv.id) state.activeMvt = state.MOVEMENTS[0].id;
      emit('movements-changed');
    });
    popList.appendChild(item);
  });

  // Update "Créer un mouvement ici" subtitle
  const sub = document.getElementById('mvt-add-sub');
  if (sub) {
    const exists = state.MOVEMENTS.find((mv) => mv.startPage === getCurrentPage());
    if (exists) {
      sub.textContent = `un mouvement commence déjà à la page ${getCurrentPage()}`;
    } else {
      const sorted = [...state.MOVEMENTS].sort((a, b) => a.startPage - b.startPage);
      const nextMvt = sorted.find((mv) => mv.startPage > getCurrentPage());
      const endPage = nextMvt ? nextMvt.startPage - 1 : scoreParts.totalPages;
      const target = nextMvt ? `avant « ${nextMvt.name} »` : `jusqu'à la fin de la partition`;
      sub.innerHTML = `pages <b>${getCurrentPage()}–${endPage}</b> — ${target}`;
    }
  }
}

let isNamingRequired = false;

function closeMvtPop() {
  if (isNamingRequired) return;
  document.getElementById('mvt-pop').classList.remove('open');
}

function forceNameMovement() {
  const pop = document.getElementById('mvt-pop');
  const nameInput = document.getElementById('mvt-name');
  if (!pop || !nameInput) return;

  isNamingRequired = true;
  const originalChangePage = scoreParts.changePage;
  scoreParts.changePage = function () {
    nameInput.classList.add('mvt-name--required');
    nameInput.focus();
  };

  pop.classList.add('open');
  nameInput.classList.add('mvt-name--required');
  nameInput.placeholder = 'Nommez ce mouvement…';
  nameInput.focus();
  nameInput.select();

  function onBlur() {
    if (!nameInput.value.trim()) {
      nameInput.focus();
    } else {
      isNamingRequired = false;
      scoreParts.changePage = originalChangePage;
      nameInput.classList.remove('mvt-name--required');
      nameInput.placeholder = '';
      nameInput.removeEventListener('blur', onBlur);
    }
  }
  nameInput.addEventListener('blur', onBlur);
}

document.getElementById('mvt-dd').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('mvt-pop').classList.toggle('open');
});
document.getElementById('mvt-edit').addEventListener('click', () => {
  document.getElementById('mvt-name').focus();
  document.getElementById('mvt-name').select();
});
document.getElementById('mvt-name').addEventListener('input', (e) => {
  const movement = state.MOVEMENTS.find((x) => x.id === state.activeMvt);
  if (movement) movement.name = e.target.value;
});
document.getElementById('mvt-name').addEventListener('blur', renderMvt);
document.getElementById('mvt-add').addEventListener('click', () => {
  // Create a new movement starting at current page (if no conflict)
  if (state.MOVEMENTS.some((m) => m.startPage === getCurrentPage())) {
    // already a movement here — just switch to it
    const existing = state.MOVEMENTS.find((m) => m.startPage === getCurrentPage());
    state.activeMvt = existing.id;
  } else {
    const newId = Math.max(...state.MOVEMENTS.map((m) => m.id)) + 1;
    state.MOVEMENTS.push({ id: newId, name: 'Nouveau mouvement', startPage: getCurrentPage() });
    state.activeMvt = newId;
  }
  emit('movements-changed');
  closeMvtPop();
});
document.addEventListener('click', (e) => {
  const pop = document.getElementById('mvt-pop');
  if (!pop.classList.contains('open')) return;
  if (!document.getElementById('mvt').contains(e.target)) closeMvtPop();
});

on('movements-changed', renderMvt);
on('score-loaded', loadMovementsFromZones);
loadMovementsFromZones();
renderMvt();

// ============== Reset all
const resetBtn = document.getElementById('reset-btn');
if (resetBtn) resetBtn.addEventListener('click', resetAll);

// ============== Download split button
const dlSplit = document.getElementById('dl-split');
const dlMenu = document.getElementById('dl-menu');
const dlCaret = document.getElementById('dl-caret');
// Mark PDF as default
dlMenu.querySelector('[data-fmt="pdf"]').classList.add('default');
dlCaret.addEventListener('click', (e) => {
  e.stopPropagation();
  dlMenu.classList.toggle('open');
  // refresh zip count from active instruments
  const activeCount = state.INSTRUMENTS.filter((i) => i.on).length;
  const badge = document.getElementById('dl-zip-count');
  const sub = document.getElementById('dl-zip-sub');
  badge.textContent = activeCount;
  sub.textContent =
    activeCount === 0
      ? 'aucun instrument actif'
      : activeCount === 1
        ? '1 PDF (instrument actif)'
        : `${activeCount} PDF (un par instrument actif)`;
});
document.addEventListener('click', (e) => {
  if (!dlSplit.contains(e.target)) dlMenu.classList.remove('open');
});
