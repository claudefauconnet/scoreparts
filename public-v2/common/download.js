// Logique de téléchargement (sans DOM). Génère soit UN PDF de la partition
// complète (voix actives empilées), soit un ZIP (un PDF par voix active).
// La barre de progression vit dans la header bar : ce module reçoit un adaptateur
// `ui = { begin, show, setProgress, hide, end, error }` et n'accède jamais au DOM.
import { state } from '../modules/partitions.state.js';
import { scoreParts } from './scoreParts.js';
import { generateVoiceScore, createZip } from './proxy.js';

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
  ui.show('Génération de la partition complète…', true);
  generateVoiceScore(
    {
      sourcePdfName: scoreParts.pdfName,
      targetPdfName,
      part: 'Partition complete',
      pagesZones,
      margin: scoreParts.margin,
      naturalW: scoreParts.naturalW,
      naturalH: scoreParts.naturalH,
    },
    (err, result) => {
      Download.isDownloading = false;
      ui.end();
      if (err) {
        ui.hide();
        return ui.error(err.responseText || err);
      }
      ui.setProgress(100, 'Partition prête');
      ui.hide(1000);
      window.open('/' + result, '_blank');
    }
  );
};

// ZIP = un PDF par voix ACTIVE dans un répertoire partagé, puis zip côté backend.
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
  const totalSteps = voiceJobs.length + 1; // +1 = étape de création du ZIP
  let completedCount = 0;
  let pendingCount = voiceJobs.length;

  Download.isDownloading = true;
  ui.begin();
  ui.show(`Génération voix 1/${voiceJobs.length}…`, false);

  voiceJobs.forEach(({ voice, pagesZones }) => {
    generateVoiceScore(
      {
        sourcePdfName: scoreParts.pdfName,
        targetPdfName: movementDirName,
        part: voice.name,
        pagesZones,
        margin: scoreParts.margin,
        naturalW: scoreParts.naturalW,
        naturalH: scoreParts.naturalH,
      },
      (err) => {
        completedCount += 1;
        pendingCount -= 1;
        if (err) {
          console.error('Erreur génération voix ' + voice.name, err);
        }
        ui.setProgress(
          (completedCount / totalSteps) * 100,
          pendingCount > 0
            ? `Génération voix ${completedCount + 1}/${voiceJobs.length}…`
            : 'Création du ZIP…'
        );
        if (pendingCount === 0) {
          createZip(movementDirName, (zipErr, result) => {
            Download.isDownloading = false;
            ui.end();
            if (zipErr) {
              ui.hide();
              return ui.error('Erreur création ZIP : ' + (zipErr.responseText || zipErr));
            }
            ui.setProgress(100, 'ZIP prêt');
            ui.hide(1000);
            window.open('/' + result.zipPath, '_blank');
          });
        }
      }
    );
  });
};

Download.run = function (format, ui) {
  if (format === 'zip') {
    Download.zip(ui);
  } else {
    Download.completePdf(ui);
  }
};
