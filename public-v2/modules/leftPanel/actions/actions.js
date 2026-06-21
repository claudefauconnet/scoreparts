// leftPanel/actions — UI de la rangée d'outils. Délègue le calcul des zones à
// scoreParts (couche zones) ; ne gère ici que l'entrée DOM, le redessin et les
// événements. Le bouton « New zone » (#act-new-zone) est câblé côté scorePlayer.
import { state, emit } from '../../partitions.state.js';
import { scoreParts } from '../../../common/scoreParts.js';
import { findPageZones } from '../../../common/localBackendProxy.js';
import { Paper } from '../../../common/paper.js';
import { Movements } from '../../../common/movements.js';

// Pour chaque groupe de systemNumber zones détectées (= un système), garde les
// voiceCount premières (une par voix) et supprime les suivantes (sans voix).
function filterZonesBySystemNumber(zones, systemNumber, voiceCount) {
  if (!systemNumber || voiceCount === 0) return zones;
  const filteredZones = [];
  const groupCount = Math.ceil(zones.length / systemNumber);
  for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
    const groupStartIndex = groupIndex * systemNumber;
    const groupZones = zones.slice(groupStartIndex, groupStartIndex + systemNumber);
    filteredZones.push(...groupZones.slice(0, voiceCount));
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

  const currentMovement = state.MOVEMENTS.find((movement) => movement.name === scoreParts.currentMovement);

  if (currentMovement && !currentMovement.systemNumber) {
    const input = prompt('Combien de systèmes y a-t-il dans ce mouvement ?');
    if (input === null) return;
    const parsedSystemNumber = parseInt(input, 10);
    if (!Number.isInteger(parsedSystemNumber) || parsedSystemNumber <= 0) {
      alert('Veuillez entrer un entier positif.');
      return;
    }
    currentMovement.systemNumber = parsedSystemNumber;
    Movements.persist();
  }

  // En double page, vise automatiquement la page à remplir (gauche puis droite).
  // Obligatoire AVANT findPageZones : buildAutoDetectedZones tague les zones avec
  // currentMovement/currentPage lus au moment du build.
  const targetPage = scoreParts.pickAutoFillPage(scoreParts.currentMovement);
  scoreParts.setCurrentPage(targetPage);

  findPageZones(scoreParts.pdfName, scoreParts.currentPage, function (err, data) {
    if (err || !data || !data.topLines || data.topLines.length === 0) {
      alert('Aucun système détecté sur cette page.');
      return;
    }

    const heightInputEl = document.getElementById('rect-h');
    const heightInputDisplayPx = heightInputEl ? parseFloat(heightInputEl.value) : NaN;
    const customHeightDisplayPx = isNaN(heightInputDisplayPx) ? null : heightInputDisplayPx;

    const detectedZones = scoreParts.buildAutoDetectedZones(data, customHeightDisplayPx);
    const systemNumber = currentMovement ? currentMovement.systemNumber : null;
    const voiceCount = state.VOICES.length;
    const zones = filterZonesBySystemNumber(detectedZones, systemNumber, voiceCount);
    scoreParts.commitCurrentPageZones(zones);
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

// Auto-attribue les voix actives aux zones du mouvement courant.
function autoAssignVoices() {
  if (!scoreParts.pdfName) return;
  if (state.VOICES.length === 0) {
    alert('Renseignez au moins une voix avant d’attribuer les zones.');
    return;
  }
  const activeVoices = state.VOICES.filter((voice) => voice.on);
  if (activeVoices.length === 0) {
    alert('Aucune voix active. Activez au moins une voix avant d\'attribuer les zones.');
    return;
  }
  scoreParts.assignVoicesToZones(
    activeVoices.map((voice) => voice.id),
    scoreParts.currentMovement
  );
  emit('voices-changed');
  emit('zones-changed');
}

const autoAssignBtn = document.getElementById('act-auto-assign');
if (autoAssignBtn) autoAssignBtn.addEventListener('click', autoAssignVoices);
const autoDetectBtn = document.getElementById('act-auto-detect');
if (autoDetectBtn) autoDetectBtn.addEventListener('click', autoDetectZones);
const duplicateBtn = document.getElementById('act-duplicate');
if (duplicateBtn) duplicateBtn.addEventListener('click', duplicatePreviousPage);
