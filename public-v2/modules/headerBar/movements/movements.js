// headerBar/movements — UI du sélecteur de mouvement. La logique (liste, plages,
// renommage, suppression) vit dans common/movements.js (Movements) ; ce fichier
// rend la pilule + le popover, et gère le verrouillage de la saisie obligatoire
// du nom (interception de la navigation tant que le mouvement n'est pas nommé).
import { state, on, emit } from '../../partitions.state.js';
import { scoreParts } from '../../../common/scoreParts.js';
import { Common } from '../../../common/common.js';
import { Movements } from '../../../common/movements.js';

function getCurrentPage() {
  return scoreParts.currentPage + 1;
}

// ============== Rendu de la liste des mouvements

function renderMvt() {
  state.MOVEMENTS.sort((a, b) => a.startPage - b.startPage);
  const activeIndex = state.MOVEMENTS.findIndex((movement) => movement.id === state.activeMvt);
  const movement = state.MOVEMENTS[activeIndex >= 0 ? activeIndex : 0];
  if (activeIndex < 0) state.activeMvt = movement.id;
  // Sync léger : le mouvement actif devient le mouvement courant côté scoreParts
  // pour que les zones dessinées soient taguées (paper.js). Un nom vide = pas de tag.
  scoreParts.currentMovement = movement.name;
  const order = state.MOVEMENTS.findIndex((candidate) => candidate.id === state.activeMvt);
  document.getElementById('mvt-number').innerHTML =
    'Mouvement <span class="roman">' + Common.toRoman(order + 1) + '</span>';
  document.getElementById('mvt-name').value = movement.name;

  const popList = document.getElementById('mvt-list');
  popList.innerHTML = '';
  state.MOVEMENTS.forEach((listedMovement, movementIndex) => {
    const range = Movements.range(state.MOVEMENTS, movementIndex);
    const item = document.createElement('div');
    item.className = 'mvt-item' + (listedMovement.id === state.activeMvt ? ' active' : '');
    item.innerHTML = `
        <span class="num">${Common.toRoman(movementIndex + 1)}</span>
        <span class="name">${listedMovement.name || 'Sans titre'}</span>
        <span class="range">p. ${range.start}–${range.end}</span>
        <button class="del" title="Supprimer ce mouvement">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
        </button>
      `;
    item.addEventListener('click', () => {
      // Sélection : on sauve le mouvement actif (logique), on rend, puis on navigue
      // vers sa première page (navigation = UI).
      Movements.select(listedMovement.id);
      scoreParts.changePage(listedMovement.startPage - 1);
      closeMvtPop();
    });
    item.querySelector('.del').addEventListener('click', (event) => {
      event.stopPropagation();
      if (state.MOVEMENTS.length <= 1) return;
      const confirmed = window.confirm(
        `Supprimer le mouvement « ${listedMovement.name || 'Sans titre'} » ?\n` +
          'Toutes les zones qui le constituent seront aussi supprimées.'
      );
      if (!confirmed) return;
      Movements.remove(listedMovement.id);
    });
    popList.appendChild(item);
  });

  // Titre « Créer un mouvement à la page X » : la page courante est précisée dynamiquement.
  const title = document.getElementById('mvt-add-title');
  if (title) {
    title.textContent = `Créer un mouvement à la page ${getCurrentPage()}`;
  }
}

// ============== Verrouillage de la saisie du nom (UI + interception navigation)

let isNamingRequired = false;
let isInitialScoreNaming = false;
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

// ============== Handlers de la barre de mouvements

document.getElementById('mvt-dd').addEventListener('click', (event) => {
  event.stopPropagation();
  document.getElementById('mvt-pop').classList.toggle('open');
});
document.getElementById('mvt-edit').addEventListener('click', () => {
  document.getElementById('mvt-name').focus();
  document.getElementById('mvt-name').select();
});
// Nom au moment où l'édition commence : sert à retaguer les zones (ancien → nouveau).
let nameBeforeEdit = '';
document.getElementById('mvt-name').addEventListener('focus', () => {
  const movement = state.MOVEMENTS.find((candidate) => candidate.id === state.activeMvt);
  nameBeforeEdit = movement ? movement.name : '';
});
document.getElementById('mvt-name').addEventListener('input', (event) => {
  const movement = state.MOVEMENTS.find((candidate) => candidate.id === state.activeMvt);
  if (movement) movement.name = event.target.value;
});
// Entrée = valider le nom : on déclenche le blur (enregistrement + déverrouillage).
// Sans ça, Entrée laisse les contrôles bloqués.
document.getElementById('mvt-name').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    event.target.blur();
  }
});
document.getElementById('mvt-name').addEventListener('blur', () => {
  const movement = state.MOVEMENTS.find((candidate) => candidate.id === state.activeMvt);
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

  Movements.applyRename(nameBeforeEdit, newName);
  nameBeforeEdit = newName;
  const wasNaming = isNamingRequired;
  const shouldStartInitialScoreWorkflow = wasNaming && isInitialScoreNaming;
  unlockNaming();
  renderMvt();
  if (wasNaming) closeMvtPop();
  if (shouldStartInitialScoreWorkflow) {
    isInitialScoreNaming = false;
    emit('initial-movement-named', { movementName: newName });
  }
});
document.getElementById('mvt-add').addEventListener('click', () => {
  // Logique côté Movements : crée à la page courante ou bascule sur l'existant.
  // Nouveau mouvement → on force la saisie du nom ; sinon on referme le pop.
  if (Movements.add(getCurrentPage()).created) {
    forceNameMovement();
  } else {
    closeMvtPop();
  }
});
document.addEventListener('click', (event) => {
  const pop = document.getElementById('mvt-pop');
  if (!pop.classList.contains('open')) return;
  if (!document.getElementById('mvt').contains(event.target)) closeMvtPop();
});

on('movements-changed', renderMvt);
// La page courante a changé : on rafraîchit la header bar (sous-titre « créer
// d'ici » et plages dépendent de la page courante).
on('page-changed', renderMvt);
function loadMovementsForScore() {
  const movementLoadResult = Movements.load();
  isInitialScoreNaming = movementLoadResult.needsNaming;
  if (isInitialScoreNaming) forceNameMovement();
}

on('score-loaded', loadMovementsForScore);
loadMovementsForScore();
renderMvt();
