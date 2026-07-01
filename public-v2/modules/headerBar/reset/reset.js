// headerBar/reset — bouton scindé : « Tout recommencer » (voix+zones+mouvements)
// et « Effacer toutes les pages » (zones uniquement).
import { resetAll } from '../../partitions.state.js';
import { scoreParts } from '../../../common/scoreParts.js';
import { saveScoreInfos } from '../../../common/proxy.js';

function confirmAndResetAll() {
  if (
    !confirm(
      'Tout recommencer ? Cette action supprime définitivement toutes les voix, zones et mouvements.'
    )
  )
    return;

  const pdfName = scoreParts.pdfName;
  if (!pdfName) return;

  // Vide immédiatement le state en mémoire (voix, zones, mouvements) pour que
  // l'UI se resynchronise tout de suite (panneau voix, badge zip, etc.).
  resetAll();

  // Vide le backend (zones, voix, mouvements) puis recharge la partition par
  // le même chemin qu'à l'ouverture (openFirstPdfPage → 'score-loaded'). Tout
  // se resynchronise ainsi : compteur de voix, mouvements, zones, exports zip,
  // etc. — aucun risque d'oubli d'un composant.
  scoreParts.modified = true;
  if (scoreParts.allPagesZones) scoreParts.allPagesZones.pages = {};
  scoreParts.currentZones = [];
  scoreParts.saveZones(function () {});

  saveScoreInfos(pdfName, { voices: [], movements: [] }, function (error) {
    if (error) console.error('Erreur saveScoreInfos (reset)', error);
    scoreParts.openFirstPdfPage(pdfName, true, null);
  });
}

function confirmAndClearAllPages() {
  if (
    !confirm(
      'Effacer toutes les pages ? Cette action supprime définitivement toutes les zones de toutes les pages.'
    )
  )
    return;
  const pages = scoreParts.allPagesZones.pages;
  Object.keys(pages).forEach((pageNum) => {
    pages[pageNum] = [];
  });
  scoreParts.currentZones = [];
  scoreParts.saveZones(function () {});
  emit('page-changed');
}

function toggleMenu() {
  $('#rs-menu').toggleClass('open');
}

function closeMenu() {
  $('#rs-menu').removeClass('open');
}

const resetBtn = document.getElementById('reset-btn');
const caretBtn = document.getElementById('rs-caret');
const clearPagesBtn = document.getElementById('rs-clear-pages');

if (resetBtn) resetBtn.addEventListener('click', confirmAndResetAll);

if (caretBtn) {
  caretBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    toggleMenu();
  });
}

if (clearPagesBtn) {
  clearPagesBtn.addEventListener('click', function () {
    closeMenu();
    confirmAndClearAllPages();
  });
}

document.addEventListener('click', function (event) {
  if (!event.target.closest('#rs-split')) closeMenu();
});
