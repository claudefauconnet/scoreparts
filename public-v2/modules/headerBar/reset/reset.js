// headerBar/reset — bouton « Tout recommencer » : vide voix, zones et mouvements
// (modèle + persistance) après confirmation, puis émet 'page-changed' pour re-rendre.
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
    saveScoreInfos(scoreParts.pdfName, { movements: [] }, function (err) {
      if (err) console.error('Erreur saveScoreInfos (reset movements)', err);
    });
  }
  emit('page-changed');
}

const resetBtn = document.getElementById('reset-btn');
if (resetBtn) resetBtn.addEventListener('click', confirmAndResetAll);
