// headerBar/reset — bouton scindé : « Tout recommencer » (voix+zones+mouvements)
// et « Effacer toutes les pages » (zones uniquement).
import { emit, resetAll } from '../../partitions.state.js';
import { scoreParts } from '../../../common/scoreParts.js';
import { saveScoreInfos } from '../../../common/proxy.js';
import { Voices } from '../../../common/voices.js';

function confirmAndResetAll() {
  if (
    !confirm(
      'Tout recommencer ? Cette action supprime définitivement toutes les voix, zones et mouvements.'
    )
  )
    return;
  resetAll();
  const pages = scoreParts.allPagesZones.pages;
  Object.keys(pages).forEach((pageNum) => {
    pages[pageNum] = [];
  });
  scoreParts.currentZones = [];
  scoreParts.saveZones(function () {});
  Voices.persist();
  if (scoreParts.pdfName) {
    if (scoreParts.infos) scoreParts.infos.movements = [];
    saveScoreInfos(scoreParts.pdfName, { movements: [] }, function (error) {
      if (error) console.error('Erreur saveScoreInfos (reset movements)', error);
    });
  }
  emit('page-changed');
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
