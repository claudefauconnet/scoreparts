// leftPanel/actions — UI de la rangée d'outils. Délègue le calcul des zones à
// scoreParts (couche zones) ; ne gère ici que l'entrée DOM, le redessin et les
// événements. Le bouton « New zone » (#act-new-zone) est câblé côté scorePlayer.
import { state, emit } from '../../partitions.state.js';
import { scoreParts } from '../../../common/scoreParts.js';
import { findPageZones } from '../../../common/localBackendProxy.js';
import { Paper } from '../../../common/paper.js';
import { Movements } from '../../../common/movements.js';
import { ProgressToast } from '../../../common/progressToast.js';

// Chaque groupe de portées détectées représente un système complet. On garde les
// premières portées utiles pour les voix renseignées, puis on ignore les portées
// restantes du système.
function filterZonesByStavesPerSystem(detectedZones, stavesPerSystem, voiceCount) {
  if (!stavesPerSystem || voiceCount === 0) return detectedZones;

  const filteredZones = [];
  const systemCount = Math.ceil(detectedZones.length / stavesPerSystem);
  for (let systemIndex = 0; systemIndex < systemCount; systemIndex++) {
    const systemStartIndex = systemIndex * stavesPerSystem;
    const systemZones = detectedZones.slice(systemStartIndex, systemStartIndex + stavesPerSystem);
    filteredZones.push(...systemZones.slice(0, voiceCount));
  }

  return filteredZones;
}

// Détecte les systèmes de la page courante via l'API puis confie le calcul des
// zones (géométrie) à scoreParts ; ce handler ne gère que l'entrée DOM (hauteur
// personnalisée), le redessin et l'événement.
function autoDetectZones() {
  if (!scoreParts.pdfName) return;
  if (!scoreParts.currentMovement) {
    alert('Sélectionnez ou déclarez un mouvement.');
    return;
  }

  const stavesPerSystem = Movements.ensureStavesPerSystem(scoreParts.currentMovement);
  if (stavesPerSystem === null) return;

  // En double page, vise automatiquement la page à remplir (gauche puis droite).
  // Obligatoire AVANT findPageZones : buildAutoDetectedZones tague les zones avec
  // currentMovement/currentPage lus au moment du build.
  const targetPage = scoreParts.pickAutoFillPage(scoreParts.currentMovement);
  scoreParts.setCurrentPage(targetPage);

  // Détection des portées : tâche longue (chargement du PNG + analyse dans le
  // Worker), d'où le toast indéterminé pour signaler que ça travaille.
  ProgressToast.show('Détection des systèmes…', true);
  findPageZones(scoreParts.pdfName, scoreParts.currentPage, function (err, data) {
    ProgressToast.hide();
    if (err || !data || !data.topLines || data.topLines.length === 0) {
      alert('Aucun système détecté sur cette page.');
      return;
    }

    const heightInputEl = document.getElementById('rect-h');
    const heightInputDisplayPx = heightInputEl ? parseFloat(heightInputEl.value) : NaN;
    const customHeightDisplayPx = isNaN(heightInputDisplayPx) ? null : heightInputDisplayPx;

    const detectedZones = scoreParts.buildAutoDetectedZones(data, customHeightDisplayPx);
    const voiceCount = state.VOICES.length;
    const filteredZones = filterZonesByStavesPerSystem(detectedZones, stavesPerSystem, voiceCount);
    scoreParts.commitCurrentPageZones(filteredZones);
    scoreParts.autoAssignActiveVoices();
    Paper.redrawCurrentPage();
    emit('zones-changed');
  });
}

// Copie les zones de la page précédente vers la page courante (même mouvement).
function duplicatePreviousPage() {
  if (!scoreParts.pdfName) return;
  // En double page, vise automatiquement la page à remplir (gauche puis droite).
  const targetPage = scoreParts.pickAutoFillPage(scoreParts.currentMovement);
  scoreParts.setCurrentPage(targetPage);
  if (scoreParts.currentPage === 0) {
    alert('Aucune page précédente à dupliquer.');
    return;
  }
  const clonedZones = scoreParts.duplicatePreviousPageZones();
  if (clonedZones.length === 0) {
    alert('Aucune zone sur la page précédente pour ce mouvement.');
    return;
  }
  scoreParts.commitCurrentPageZones(clonedZones);
  Paper.redrawCurrentPage();
  emit('zones-changed');
}

const autoDetectBtn = document.getElementById('act-auto-detect');
if (autoDetectBtn) autoDetectBtn.addEventListener('click', autoDetectZones);
const duplicateBtn = document.getElementById('act-duplicate');
if (duplicateBtn) duplicateBtn.addEventListener('click', duplicatePreviousPage);
