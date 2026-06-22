// headerBar/download — UI du bouton scindé de téléchargement. La logique de
// génération vit dans common/download.js (Download) ; ce fichier gère le menu de
// formats, la coche, et expose un adaptateur de progression (progressUI) — les
// seules fonctions DOM que Download déclenche, qui reste ainsi sans accès au DOM.
import { state } from '../../partitions.state.js';
import { Download } from '../../../common/download.js';
import { ProgressToast } from '../../../common/progressToast.js';

const dlSplit = document.getElementById('dl-split');
const dlMenu = document.getElementById('dl-menu');
const dlCaret = document.getElementById('dl-caret');
const dlMainBtn = dlSplit.querySelector('.dl-main');
const dlPdfItem = dlMenu.querySelector('[data-fmt="pdf"]');
const dlZipItem = dlMenu.querySelector('[data-fmt="zip"]');

// Format déclenché par le bouton principal ; la coche du menu le reflète.
let selectedFormat = 'pdf';

function refreshZipMenuCount() {
  const activeCount = state.VOICES.filter((voice) => voice.on).length;
  document.getElementById('dl-zip-count').textContent = activeCount;
  document.getElementById('dl-zip-sub').textContent =
    activeCount === 0
      ? 'aucune voix active'
      : activeCount === 1
        ? '1 PDF (voix active)'
        : `${activeCount} PDF (une par voix active)`;
}

// Déplace la coche sur le format choisi et met à jour le bouton principal.
function selectFormat(format) {
  selectedFormat = format;
  dlPdfItem.classList.toggle('default', format === 'pdf');
  dlZipItem.classList.toggle('default', format === 'zip');
  dlMainBtn.title =
    format === 'zip'
      ? 'Télécharger les voix séparées (.zip)'
      : 'Télécharger la partition complète (PDF)';
}

selectFormat('pdf');

dlCaret.addEventListener('click', (event) => {
  event.stopPropagation();
  dlMenu.classList.toggle('open');
  refreshZipMenuCount();
});
document.addEventListener('click', (event) => {
  if (!dlSplit.contains(event.target)) dlMenu.classList.remove('open');
});

// ============== Barre de progression de génération

// begin/end désactivent le bouton scindé le temps de la génération (spécifique au
// téléchargement). L'affichage de la progression est délégué au toast partagé.
function beginDownload() {
  dlMainBtn.disabled = true;
  dlCaret.disabled = true;
}

function endDownload() {
  dlMainBtn.disabled = false;
  dlCaret.disabled = false;
}

// Adaptateur passé à Download : la logique de téléchargement reste sans accès
// direct au DOM, elle ne déclenche que ces fonctions.
const progressUI = {
  begin: beginDownload,
  show: ProgressToast.show,
  setProgress: ProgressToast.setProgress,
  hide: ProgressToast.hide,
  end: endDownload,
  error: ProgressToast.error,
};

// ============== Download handlers

// Bouton principal : lance le format sélectionné.
dlMainBtn.addEventListener('click', () => Download.run(selectedFormat, progressUI));

// Items du menu : sélectionnent le format (déplacent la coche) puis lancent.
dlPdfItem.addEventListener('click', () => {
  selectFormat('pdf');
  dlMenu.classList.remove('open');
  Download.completePdf(progressUI);
});
dlZipItem.addEventListener('click', () => {
  selectFormat('zip');
  dlMenu.classList.remove('open');
  Download.zip(progressUI);
});
