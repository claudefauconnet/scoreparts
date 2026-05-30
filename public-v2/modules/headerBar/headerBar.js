import { state, on, emit, resetAll } from '../partitions.state.js';
import { scoreParts } from '../../common/scoreParts.js';
import { saveScoreInfos } from '../../common/proxy.js';

// ============== Mouvements
function toRoman(n) {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let result = '';
  vals.forEach((val, i) => { while (n >= val) { result += syms[i]; n -= val; } });
  return result;
}

function getCurrentPage() {
  return scoreParts.currentPage + 1;
}

function buildMovementsFromZones() {
  const pages = scoreParts.allPagesZones.pages;
  // Plage réelle de chaque mouvement, calculée depuis ses zones : start = 1re page,
  // end = dernière page. end est déduit des zones (pas du mvt suivant) car deux
  // mouvements peuvent se recouvrir sur une page frontière (A finit p3, B commence p3).
  const movementRange = {};
  const sortedPageKeys = Object.keys(pages).sort((a, b) => parseInt(a) - parseInt(b));

  for (const pageKey of sortedPageKeys) {
    const pageNumber = parseInt(pageKey) + 1;
    pages[pageKey].forEach((zone) => {
      if (!zone.movement) return;
      const range = movementRange[zone.movement];
      if (!range) {
        movementRange[zone.movement] = { startPage: pageNumber, endPage: pageNumber };
      } else if (pageNumber > range.endPage) {
        range.endPage = pageNumber;
      }
    });
  }

  return Object.entries(movementRange).map(([name, range], idx) => ({
    id: idx + 1,
    name,
    startPage: range.startPage,
    endPage: range.endPage,
  }));
}

// La LISTE des mouvements (noms + ordre) vient de infos.movements (le JSON), pas
// des zones. Les zones ne servent qu'à inférer les PAGES (maître) quand le
// mouvement en a ; sinon endPage reste indéfini pour que mvtRange recalcule une
// plage contiguë à jour. startPage stocké sert à localiser un mouvement sans zone.
function mergeMovements() {
  const inferred = buildMovementsFromZones();
  const inferredByName = {};
  inferred.forEach((mvt) => {
    inferredByName[mvt.name] = mvt;
  });

  let stored = (scoreParts.infos && scoreParts.infos.movements) || [];
  // Migration : ancienne partition sans liste persistée → on la dérive des zones
  // une seule fois (au prochain enregistrement elle sera écrite dans le JSON).
  if (stored.length === 0 && inferred.length > 0) {
    stored = inferred;
  }

  return stored
    .filter((mvt) => mvt.name)
    .map((mvt, idx) => {
      const range = inferredByName[mvt.name];
      return {
        id: idx + 1,
        name: mvt.name,
        startPage: range ? range.startPage : mvt.startPage,
        endPage: range ? range.endPage : undefined,
      };
    });
}

function loadMovements() {
  const movements = mergeMovements();
  if (movements.length === 0) {
    state.MOVEMENTS.splice(0, state.MOVEMENTS.length, { id: 1, name: '', startPage: 1 });
    state.activeMvt = 1;
    emit('movements-changed');
    // Ne force la saisie que si une partition est réellement ouverte (évite de
    // verrouiller l'UI au tout premier chargement du module, sans partition).
    if (scoreParts.pdfName) forceNameMovement();
    return;
  }
  state.MOVEMENTS.splice(0, state.MOVEMENTS.length, ...movements);
  if (!state.MOVEMENTS.find((m) => m.id === state.activeMvt)) {
    state.activeMvt = state.MOVEMENTS[0].id;
  }
  // Indispensable : rafraîchit la header bar (numéro, nom, liste) avec les
  // mouvements chargés. Sans ça l'UI garde l'état initial jusqu'à une interaction.
  emit('movements-changed');
}

// Persiste la liste des mouvements dans infos.movements (noms + ordre + pages
// inférées). Un mouvement sans zone garde son startPage courant, sinon il serait
// introuvable au rechargement.
function persistMovements() {
  if (!scoreParts.pdfName) return;
  // Pages écrites = mêmes que l'affichage (mvtRange) sur une liste triée : zones
  // maître si présentes, sinon plage contiguë. Garde le fichier cohérent avec les
  // zones et évite des endPage=startPage incohérents pour les mouvements sans zone.
  const sorted = [...state.MOVEMENTS].sort((a, b) => a.startPage - b.startPage);
  const payload = [];
  sorted.forEach((mvt, idx) => {
    if (!mvt.name) return;
    const range = mvtRange(sorted, idx);
    payload.push({ name: mvt.name, startPage: range.start, endPage: range.end });
  });
  if (scoreParts.infos) scoreParts.infos.movements = payload;
  saveScoreInfos(scoreParts.pdfName, { movements: payload }, function (err) {
    if (err) console.error('Erreur saveScoreInfos (movements)', err);
  });
}

// Plage de pages d'un mouvement dans une liste TRIÉE par startPage.
// Maître = les zones : si le mouvement en a (endPage défini), on l'utilise (gère
// aussi le recouvrement page frontière). Sinon (pas encore de zones) on déduit une
// plage contiguë : jusqu'au mouvement suivant - 1, ou la fin de la partition.
function mvtRange(sortedMovements, idx) {
  const movement = sortedMovements[idx];
  if (movement.endPage) {
    return { start: movement.startPage, end: movement.endPage };
  }
  const next = sortedMovements[idx + 1];
  const end = next ? next.startPage - 1 : scoreParts.totalPages;
  return { start: movement.startPage, end };
}

function renderMvt() {
  state.MOVEMENTS.sort((a, b) => a.startPage - b.startPage);
  const idx = state.MOVEMENTS.findIndex((m) => m.id === state.activeMvt);
  const movement = state.MOVEMENTS[idx >= 0 ? idx : 0];
  if (idx < 0) state.activeMvt = movement.id;
  // Sync léger : le mouvement actif devient le mouvement courant côté scoreParts
  // pour que les zones dessinées soient taguées (paper.js). Un nom vide = pas de tag.
  scoreParts.currentMovement = movement.name;
  const order = state.MOVEMENTS.findIndex((x) => x.id === state.activeMvt);
  document.getElementById('mvt-number').innerHTML =
    'Mouvement <span class="roman">' + toRoman(order + 1) + '</span>';
  document.getElementById('mvt-name').value = movement.name;

  const popList = document.getElementById('mvt-list');
  popList.innerHTML = '';
  state.MOVEMENTS.forEach((mv, i) => {
    const range = mvtRange(state.MOVEMENTS, i);
    const item = document.createElement('div');
    item.className = 'mvt-item' + (mv.id === state.activeMvt ? ' active' : '');
    item.innerHTML = `
        <span class="num">${toRoman(i + 1)}</span>
        <span class="name">${mv.name || 'Sans titre'}</span>
        <span class="range">p. ${range.start}–${range.end}</span>
        <button class="del" title="Supprimer ce mouvement">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
        </button>
      `;
    item.addEventListener('click', () => {
      // Sélection d'un mouvement (logique v1) : on sauve les zones de la page
      // courante, on bascule le mouvement courant, on rend la header bar (nom),
      // puis on navigue vers la première page du mouvement.
      state.activeMvt = mv.id;
      scoreParts.fillMovement(mv.name);
      emit('movements-changed');
      scoreParts.changePage(mv.startPage - 1);
      closeMvtPop();
    });
    item.querySelector('.del').addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.MOVEMENTS.length <= 1) return;
      const confirmed = window.confirm(
        `Supprimer le mouvement « ${mv.name || 'Sans titre'} » ?\n` +
          'Toutes les zones qui le constituent seront aussi supprimées.'
      );
      if (!confirmed) return;
      // Supprime d'abord les zones du mouvement (modèle + canvas + sauvegarde),
      // puis retire le mouvement de la liste et persiste infos.movements.
      if (mv.name) scoreParts.deleteMovement(mv.name);
      const removeIdx = state.MOVEMENTS.findIndex((x) => x.id === mv.id);
      state.MOVEMENTS.splice(removeIdx, 1);
      if (state.activeMvt === mv.id) state.activeMvt = state.MOVEMENTS[0].id;
      persistMovements();
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
let changePageBackup = null;

function closeMvtPop() {
  if (isNamingRequired) return;
  document.getElementById('mvt-pop').classList.remove('open');
}

// Verrouille l'UI pendant la saisie obligatoire du nom : la navigation (changePage)
// est neutralisée et ramène le focus sur le champ. Idempotent — un 2e appel ne
// recapture PAS le changePage déjà neutralisé (sinon le déverrouillage le
// restaurerait sur la version neutralisée → lock permanent).
function lockForNaming() {
  if (isNamingRequired) return;
  isNamingRequired = true;
  changePageBackup = scoreParts.changePage;
  scoreParts.changePage = function () {
    const nameInput = document.getElementById('mvt-name');
    nameInput.classList.add('mvt-name--required');
    nameInput.focus();
  };
}

function unlockNaming() {
  if (!isNamingRequired) return;
  isNamingRequired = false;
  if (changePageBackup) scoreParts.changePage = changePageBackup;
  changePageBackup = null;
  const nameInput = document.getElementById('mvt-name');
  nameInput.classList.remove('mvt-name--required');
  nameInput.placeholder = '';
}

// Ouvre le pop et force la saisie. La validation (nom non vide) et le
// déverrouillage sont gérés par le handler blur unique de #mvt-name.
function forceNameMovement() {
  const pop = document.getElementById('mvt-pop');
  const nameInput = document.getElementById('mvt-name');
  if (!pop || !nameInput) return;
  lockForNaming();
  pop.classList.add('open');
  nameInput.classList.add('mvt-name--required');
  nameInput.placeholder = 'Nommez ce mouvement…';
  nameInput.focus();
  nameInput.select();
}

document.getElementById('mvt-dd').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('mvt-pop').classList.toggle('open');
});
document.getElementById('mvt-edit').addEventListener('click', () => {
  document.getElementById('mvt-name').focus();
  document.getElementById('mvt-name').select();
});
// Nom au moment où l'édition commence : sert à retaguer les zones (ancien → nouveau).
let nameBeforeEdit = '';
document.getElementById('mvt-name').addEventListener('focus', () => {
  const movement = state.MOVEMENTS.find((x) => x.id === state.activeMvt);
  nameBeforeEdit = movement ? movement.name : '';
});
document.getElementById('mvt-name').addEventListener('input', (e) => {
  const movement = state.MOVEMENTS.find((x) => x.id === state.activeMvt);
  if (movement) movement.name = e.target.value;
});
// Entrée = valider le nom : on déclenche le blur (enregistrement + déverrouillage
// via forceNameMovement). Sans ça, Entrée laisse les contrôles bloqués.
document.getElementById('mvt-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.target.blur();
  }
});
document.getElementById('mvt-name').addEventListener('blur', () => {
  const movement = state.MOVEMENTS.find((x) => x.id === state.activeMvt);
  if (!movement) return renderMvt();

  const newName = movement.name.trim();
  if (!newName) {
    if (isNamingRequired) {
      // Nom obligatoire (création en cours) : on garde le focus, reste verrouillé.
      document.getElementById('mvt-name').focus();
      return;
    }
    // Édition annulée à vide : on restaure l'ancien nom.
    movement.name = nameBeforeEdit;
    return renderMvt();
  }
  movement.name = newName;

  if (nameBeforeEdit && newName !== nameBeforeEdit) {
    // Renommage d'un mouvement existant : retag des zones + sauve les zones.
    scoreParts.renameMovement(nameBeforeEdit, newName);
  } else {
    // Première nomination (création) : on fixe juste le mouvement courant.
    scoreParts.fillMovement(newName);
  }
  persistMovements();
  nameBeforeEdit = newName;
  unlockNaming();
  renderMvt();
});
document.getElementById('mvt-add').addEventListener('click', () => {
  // Un mouvement commence déjà à cette page → on bascule dessus, pas de doublon.
  if (state.MOVEMENTS.some((m) => m.startPage === getCurrentPage())) {
    const existing = state.MOVEMENTS.find((m) => m.startPage === getCurrentPage());
    state.activeMvt = existing.id;
    emit('movements-changed');
    closeMvtPop();
    return;
  }
  // Nouveau mouvement à la page courante. Nom vide → on force la saisie (comme
  // loadMovements quand la partition n'a aucun mouvement) : focus verrouillé jusqu'à
  // un nom non vide, puis forceNameMovement déverrouille et le blur enregistre.
  const newId = Math.max(...state.MOVEMENTS.map((m) => m.id)) + 1;
  state.MOVEMENTS.push({ id: newId, name: '', startPage: getCurrentPage() });
  state.activeMvt = newId;
  emit('movements-changed');
  forceNameMovement();
});
document.addEventListener('click', (e) => {
  const pop = document.getElementById('mvt-pop');
  if (!pop.classList.contains('open')) return;
  if (!document.getElementById('mvt').contains(e.target)) closeMvtPop();
});

on('movements-changed', renderMvt);
// La page courante a changé : on rafraîchit la header bar (sous-titre « créer
// d'ici » et plages dépendent de la page courante).
on('page-changed', renderMvt);
on('score-loaded', loadMovements);
loadMovements();
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
