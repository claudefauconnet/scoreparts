// Logique de téléchargement (sans DOM). Génère soit UN PDF de la partition
// complète (voix actives empilées), soit un ZIP (un PDF par voix active).
// La barre de progression vit dans la header bar : ce module reçoit un adaptateur
// `ui = { begin, show, setProgress, hide, end, error }` et n'accède jamais au DOM.
//
// POC PWA : la génération PDF + le ZIP se font côté client (Web Worker + fflate),
// plus aucune route serveur de traitement. Voir common/localBackendProxy.js.
import { state } from '../modules/partitions.state.js';
import { scoreParts } from './scoreParts.js';
import { downloadSinglePart, downloadPartsZip } from './localBackendProxy.js';

export const Download = {};

// Empêche de lancer un 2e téléchargement pendant qu'un autre génère.
Download.isDownloading = false;

Download.movementDirName = function () {
  const base =
    scoreParts.allPagesZones && scoreParts.allPagesZones.title
      ? scoreParts.allPagesZones.title
      : scoreParts.pdfName;
  const mvt = scoreParts.currentMovement || '';
  return (base + (mvt ? '_' + mvt : '')).replace(/[ .]/g, '-');
};

// Voix actives ayant au moins une zone affectée (sinon rien à générer).
Download.activeVoicesWithZones = function () {
  return state.VOICES.filter((voice) => voice.on)
    .map((voice) => ({ voice, pagesZones: scoreParts.voicePagesZones(voice.id) }))
    .filter(({ pagesZones }) => Object.keys(pagesZones.pages).length > 0);
};

// Partition complète = UN PDF avec les zones de toutes les voix ACTIVES empilées.
Download.completePdf = function (ui) {
  if (!scoreParts.pdfName || Download.isDownloading) return;
  const activeVoices = state.VOICES.filter((voice) => voice.on);
  if (activeVoices.length === 0) {
    ui.error('Aucune voix active. Activez au moins une voix avant de télécharger.');
    return;
  }
  const pagesZones = scoreParts.combinedPagesZones(activeVoices.map((voice) => voice.id));
  if (Object.keys(pagesZones.pages).length === 0) {
    ui.error("Aucune zone assignée aux voix actives. Utilisez Auto-attribuer d'abord.");
    return;
  }
  const targetPdfName = (Download.movementDirName() + '_complet').replace(/[ .]/g, '-');
  Download.isDownloading = true;
  ui.begin();
  ui.show('Génération de la partition complète…', false);

  downloadSinglePart(
    {
      pdfName: scoreParts.pdfName,
      targetPdfName,
      part: 'Partition complete',
      pagesZones,
      margin: scoreParts.margin,
      naturalW: scoreParts.naturalW,
      naturalH: scoreParts.naturalH,
      fileName: targetPdfName,
    },
    (percent) => ui.setProgress(percent, 'Génération de la partition complète…')
  )
    .then(() => {
      Download.isDownloading = false;
      ui.end();
      ui.setProgress(100, 'Partition prête');
      ui.hide(1000);
    })
    .catch((err) => {
      Download.isDownloading = false;
      ui.end();
      ui.hide();
      ui.error(err.message || err);
    });
};

// ZIP = un PDF par voix ACTIVE, empaquetés dans un ZIP — entièrement côté client.
Download.zip = function (ui) {
  if (!scoreParts.pdfName || Download.isDownloading) return;
  const activeVoices = state.VOICES.filter((voice) => voice.on);
  if (activeVoices.length === 0) {
    ui.error('Aucune voix active. Activez au moins une voix avant de télécharger.');
    return;
  }
  const voiceJobs = Download.activeVoicesWithZones();
  if (voiceJobs.length === 0) {
    ui.error("Aucune zone assignée aux voix actives. Utilisez Auto-attribuer d'abord.");
    return;
  }

  const movementDirName = Download.movementDirName();

  Download.isDownloading = true;
  ui.begin();
  ui.show(`Génération voix 1/${voiceJobs.length}…`, false);

  const common = {
    pdfName: scoreParts.pdfName,
    targetPdfName: movementDirName,
    margin: scoreParts.margin,
    naturalW: scoreParts.naturalW,
    naturalH: scoreParts.naturalH,
  };
  const jobs = voiceJobs.map(({ voice, pagesZones }) => ({ part: voice.name, pagesZones }));

  downloadPartsZip(common, jobs, movementDirName, (completedCount, total) => {
    ui.setProgress(
      (completedCount / (total + 1)) * 100,
      completedCount < total ? `Génération voix ${completedCount + 1}/${total}…` : 'Création du ZIP…'
    );
  })
    .then(() => {
      Download.isDownloading = false;
      ui.end();
      ui.setProgress(100, 'ZIP prêt');
      ui.hide(1000);
    })
    .catch((err) => {
      Download.isDownloading = false;
      ui.end();
      ui.hide();
      ui.error('Erreur création ZIP : ' + (err.message || err));
    });
};

Download.run = function (format, ui) {
  if (format === 'zip') {
    Download.zip(ui);
  } else {
    Download.completePdf(ui);
  }
};
