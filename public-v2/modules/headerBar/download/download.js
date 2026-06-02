// headerBar/download — UI du bouton scindé de téléchargement. La logique de
// génération vit dans common/download.js (Download) ; ce fichier gère le menu de
// formats, la coche, et expose un adaptateur de progression (progressUI) — les
// seules fonctions DOM que Download déclenche, qui reste ainsi sans accès au DOM.
import { state } from '../../partitions.state.js';
import { Download } from '../../../common/download.js';

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

const dlToast = document.getElementById('dl-toast');
// Rattacher au body : un ancêtre transformé du header capterait le position:fixed
// et ancrerait le toast en haut au lieu du coin bas-droite du viewport.
if (dlToast && dlToast.parentElement !== document.body) {
  document.body.appendChild(dlToast);
}
const dlToastLabel = document.getElementById('dl-toast-label');
const dlToastPct = document.getElementById('dl-toast-pct');
const dlToastFill = document.getElementById('dl-toast-fill');

function showProgress(label, indeterminate) {
  dlToastLabel.textContent = label;
  dlToast.hidden = false;
  if (indeterminate) {
    dlToast.classList.add('indeterminate');
    dlToastPct.textContent = '';
    dlToastFill.style.width = '';
  } else {
    dlToast.classList.remove('indeterminate');
    setProgress(0);
  }
}

function setProgress(percent, label) {
  dlToast.classList.remove('indeterminate');
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  dlToastFill.style.width = clamped + '%';
  dlToastPct.textContent = clamped + '%';
  if (label) dlToastLabel.textContent = label;
}

function hideProgress(delay) {
  window.setTimeout(() => {
    dlToast.hidden = true;
  }, delay || 0);
}

function beginDownload() {
  dlMainBtn.disabled = true;
  dlCaret.disabled = true;
}

function endDownload() {
  dlMainBtn.disabled = false;
  dlCaret.disabled = false;
}

// Adaptateur passé à Download : ce sont les seules fonctions DOM que la logique de
// téléchargement déclenche. Download reste sans accès direct au DOM.
const progressUI = {
  begin: beginDownload,
  show: showProgress,
  setProgress: setProgress,
  hide: hideProgress,
  end: endDownload,
  error: (msg) => alert(msg),
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
