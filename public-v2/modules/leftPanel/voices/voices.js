// leftPanel/voices — UI de la liste des voix. La logique (création, persistance,
// suppression) vit dans common/voices.js (Voices) ; ce fichier rend les lignes,
// gère les événements et les popovers (couleur, suppression). Le décompte des
// zones par voix vient de scoreParts (couche zones).
import { state, on, emit } from '../../partitions.state.js';
import { scoreParts } from '../../../common/scoreParts.js';
import { Common } from '../../../common/common.js';
import { downloadSinglePart } from '../../../common/localBackendProxy.js';
import { saveScoreInfos } from '../../../common/proxy.js';
import { Voices } from '../../../common/voices.js';
import { Movements } from '../../../common/movements.js';
import { ProgressToast } from '../../../common/progressToast.js';

const INITIAL_SCORE_SETUP_FIELD = 'initialSetupStep';
const INITIAL_SCORE_SETUP_VOICES = 'voices';
const INITIAL_SCORE_SETUP_SYSTEMS = 'systems';

const list = document.getElementById('voice-list');
const initialScoreSetup = document.getElementById('initial-score-setup');
const initialScoreSetupTitle = document.getElementById('initial-score-setup-title');
const initialScoreSetupDescription = document.getElementById('initial-score-setup-description');
const initialScoreSetupHint = document.getElementById('initial-score-setup-hint');
const initialScoreVoicesStep = document.getElementById('initial-score-voices-step');
const initialScoreVoicesNext = document.getElementById('initial-score-voices-next');
const initialScoreSystemsStep = document.getElementById('initial-score-systems-step');
const initialScoreSystemNumber = document.getElementById('initial-score-system-number');
const initialScoreSetupError = document.getElementById('initial-score-setup-error');
const initialScoreVoicesIndicator = initialScoreSetup.querySelector('[data-setup-step="voices"]');
const initialScoreSystemsIndicator = initialScoreSetup.querySelector('[data-setup-step="systems"]');

let initialScoreSetupStep = null;
let initialMovementName = '';

function hasCompletedVoiceNames() {
  return state.VOICES.length > 0 && state.VOICES.every((voice) => voice.isNamePending !== true);
}

function setInitialScoreSetupLock(isLocked) {
  document.body.classList.toggle('initial-score-setup-active', isLocked);
  [
    document.getElementById('headerbar-host'),
    document.getElementById('lp-actions-host'),
    document.querySelector('.left-panel-footer'),
    document.getElementById('lp-parameters-host'),
    document.getElementById('book'),
    document.getElementById('zoom-controls'),
    document.getElementById('multiselect-toolbar'),
  ].forEach((lockedElement) => {
    if (lockedElement) lockedElement.inert = isLocked;
  });
}

function persistInitialScoreSetupStep(setupStep) {
  if (!scoreParts.pdfName) return;
  if (scoreParts.infos) scoreParts.infos[INITIAL_SCORE_SETUP_FIELD] = setupStep;
  saveScoreInfos(scoreParts.pdfName, { [INITIAL_SCORE_SETUP_FIELD]: setupStep }, function (error) {
    if (error) console.error('Erreur saveScoreInfos (initial setup)', error);
  });
}

function renderInitialScoreSetup() {
  const isSetupActive = initialScoreSetupStep !== null;
  initialScoreSetup.hidden = !isSetupActive;
  setInitialScoreSetupLock(isSetupActive);
  if (!isSetupActive) return;

  const isVoicesStep = initialScoreSetupStep === INITIAL_SCORE_SETUP_VOICES;
  initialScoreVoicesStep.hidden = !isVoicesStep;
  initialScoreSystemsStep.hidden = isVoicesStep;
  initialScoreVoicesIndicator.classList.toggle('active', isVoicesStep);
  initialScoreVoicesIndicator.classList.toggle('done', !isVoicesStep);
  initialScoreSystemsIndicator.classList.toggle('active', !isVoicesStep);
  if (isVoicesStep) {
    initialScoreVoicesIndicator.setAttribute('aria-current', 'step');
    initialScoreSystemsIndicator.removeAttribute('aria-current');
  } else {
    initialScoreVoicesIndicator.removeAttribute('aria-current');
    initialScoreSystemsIndicator.setAttribute('aria-current', 'step');
  }

  if (isVoicesStep) {
    initialScoreSetupTitle.textContent = 'Ajoutez vos voix utiles';
    initialScoreSetupDescription.textContent =
      'Ajoutez uniquement les voix que vous voulez extraire, puis donnez un nom à chacune.';
    initialScoreVoicesNext.disabled = !hasCompletedVoiceNames();
    if (state.VOICES.length === 0) {
      initialScoreSetupHint.textContent = 'Cliquez sur « Ajouter une voix » pour commencer.';
    } else if (!hasCompletedVoiceNames()) {
      initialScoreSetupHint.textContent =
        'Renommez chaque nouvelle voix, puis validez avec Entrée.';
    } else {
      initialScoreSetupHint.textContent =
        state.VOICES.length === 1
          ? '1 voix renseignée. Vous pouvez continuer.'
          : `${state.VOICES.length} voix renseignées. Vous pouvez continuer.`;
    }
    return;
  }

  initialScoreSetupTitle.textContent = 'Comptez les systèmes';
  initialScoreSetupDescription.textContent = `Indiquez le nombre total de systèmes du mouvement « ${initialMovementName} ».`;
}

function setInitialScoreSetupStep(setupStep, shouldPersist = true) {
  initialScoreSetupStep = setupStep;
  if (shouldPersist) persistInitialScoreSetupStep(setupStep);
  renderInitialScoreSetup();
}

function focusVoiceName(voiceId) {
  const voiceName = list.querySelector(`[data-voice-id="${voiceId}"] [data-rename]`);
  if (!voiceName) return;
  voiceName.focus();
  const selectionRange = document.createRange();
  selectionRange.selectNodeContents(voiceName);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(selectionRange);
}

function addVoiceFromInterface() {
  const shouldRequireName = initialScoreSetupStep !== null;
  if (initialScoreSetupStep === INITIAL_SCORE_SETUP_SYSTEMS) {
    setInitialScoreSetupStep(INITIAL_SCORE_SETUP_VOICES);
  }
  const voice = Voices.add(undefined, shouldRequireName);
  if (shouldRequireName) focusVoiceName(voice.id);
}

function startInitialScoreWorkflow(event) {
  initialMovementName = event.detail.movementName;
  setInitialScoreSetupStep(INITIAL_SCORE_SETUP_VOICES);
}

function resumeInitialScoreWorkflow() {
  const storedSetupStep = scoreParts.infos && scoreParts.infos[INITIAL_SCORE_SETUP_FIELD];
  if (
    storedSetupStep !== INITIAL_SCORE_SETUP_VOICES &&
    storedSetupStep !== INITIAL_SCORE_SETUP_SYSTEMS
  ) {
    return;
  }
  const activeMovement =
    state.MOVEMENTS.find((movement) => movement.id === state.activeMvt) || state.MOVEMENTS[0];
  if (!activeMovement || !activeMovement.name) return;
  initialMovementName = activeMovement.name;
  setInitialScoreSetupStep(storedSetupStep, false);
  if (storedSetupStep === INITIAL_SCORE_SETUP_SYSTEMS) {
    window.setTimeout(() => initialScoreSystemNumber.focus(), 0);
  }
}

function loadVoicesForScore() {
  initialScoreSetupStep = null;
  initialMovementName = '';
  renderInitialScoreSetup();
  Voices.load();
  initialScoreSystemNumber.value = '';
  initialScoreSystemNumber.removeAttribute('aria-invalid');
  initialScoreSetupError.hidden = true;
  window.setTimeout(resumeInitialScoreWorkflow, 0);
}

function renderVoices() {
  list.innerHTML = '';
  state.VOICES.forEach((voice) => {
    const row = document.createElement('div');
    row.className =
      'voice' +
      (voice.on ? ' on' : '') +
      (state.activeVoice === voice.id ? ' active' : '') +
      (voice.isNamePending ? ' voice--name-required' : '');
    row.dataset.voiceId = voice.id;
    row.innerHTML = `
        <button class="voice-del" data-del title="Supprimer cette voix" aria-label="Supprimer">
          <svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6"/></svg>
        </button>
        <div class="voice-main">
          <span class="voice-swatch" data-color title="Changer la couleur" style="background:${voice.color}"></span>
          <span class="voice-name" contenteditable="true" spellcheck="false" data-rename>${voice.name}</span>
          <span class="voice-count">${scoreParts.countVoiceZones(voice.id)} zones</span>
          <span class="voice-toggle" data-toggle></span>
        </div>
        <div class="voice-actions">
          <button class="voice-action" data-act="erase" title="Effacer toutes les zones de cette voix">
            <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>
            Effacer
          </button>
          <button class="voice-action" data-act="download" title="Télécharger la voix">
            <svg viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M5 20h14"/></svg>
            Télécharger
          </button>
        </div>
      `;
    row.querySelector('[data-toggle]').addEventListener('click', (event) => {
      event.stopPropagation();
      voice.on = !voice.on;
      Voices.persist();
      emit('voices-changed');
      emit('zones-changed');
    });
    row.querySelector('[data-del]').addEventListener('click', (event) => {
      event.stopPropagation();
      Voices.remove(voice.id);
    });
    row.querySelector('[data-color]').addEventListener('click', (event) => {
      event.stopPropagation();
      openColorPopover(event.target, voice);
    });
    const voiceName = row.querySelector('[data-rename]');
    const voiceNameBeforeEdit = voice.name;
    const shouldRequireRenaming = voice.isNamePending;
    voiceName.addEventListener('click', (event) => event.stopPropagation());
    voiceName.addEventListener('input', (event) => {
      if (!shouldRequireRenaming) return;
      const candidateVoiceName = event.target.textContent.trim();
      voice.isNamePending =
        candidateVoiceName.length === 0 || candidateVoiceName === voiceNameBeforeEdit;
      row.classList.toggle('voice--name-required', voice.isNamePending);
      renderInitialScoreSetup();
    });
    voiceName.addEventListener('blur', (event) => {
      const value = event.target.textContent.trim();
      if (value && value !== voice.name) {
        voice.name = value;
        voice.isNamePending = false;
      } else if (shouldRequireRenaming) {
        voice.isNamePending = true;
      }
      event.target.textContent = voice.name;
      Voices.persist();
      row.classList.toggle('voice--name-required', voice.isNamePending);
      renderInitialScoreSetup();
    });
    voiceName.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.target.blur();
      }
    });
    row.querySelector('[data-act="erase"]').addEventListener('click', (event) => {
      event.stopPropagation();
      const confirmed = window.confirm(
        `Effacer toutes les zones affectées à « ${voice.name} » ?\n` +
          'La voix reste dans la liste, seules ses zones sont supprimées.'
      );
      if (!confirmed) return;
      scoreParts.deleteVoiceZones(voice.id);
      emit('voices-changed');
      emit('zones-changed');
    });
    row.querySelector('[data-act="download"]').addEventListener('click', (event) => {
      event.stopPropagation();
      downloadVoice(voice);
    });
    row.addEventListener('click', () => {
      state.activeVoice = voice.id;
      emit('voices-changed');
    });
    list.appendChild(row);
  });
}

// Génère + télécharge le PDF d'une voix à partir de ses zones affectées.
function downloadVoice(voice) {
  if (!scoreParts.pdfName) return;
  const pagesZones = scoreParts.voicePagesZones(voice.id);
  if (Object.keys(pagesZones.pages).length === 0) {
    alert(`Aucune zone affectée à « ${voice.name} ». Utilisez Auto-attribuer d'abord.`);
    return;
  }
  const targetPdfName = (scoreParts.pdfName + '_' + voice.name).replace(/[ .]/g, '-');
  // POC PWA : génération + téléchargement côté client (Web Worker). Zones en
  // fractions 0→1 des dimensions naturelles du PNG, converties dans le pipeline.
  // Tâche longue → barre de progression (%) pour signaler l'avancement.
  const progressLabel = `Génération de « ${voice.name} »…`;
  ProgressToast.show(progressLabel, false);
  downloadSinglePart(
    {
      pdfName: scoreParts.pdfName,
      targetPdfName,
      part: voice.name,
      pagesZones,
      margin: scoreParts.margin,
      naturalW: scoreParts.naturalW,
      naturalH: scoreParts.naturalH,
      fileName: targetPdfName,
    },
    (percent) => ProgressToast.setProgress(percent, progressLabel)
  )
    .then(() => {
      ProgressToast.setProgress(100, progressLabel);
      ProgressToast.hide(800);
    })
    .catch((err) => {
      ProgressToast.hide();
      ProgressToast.error(err.message || err);
    });
}

// Color picker popover anchored to the voice swatch.
function openColorPopover(swatch, voice) {
  document.querySelectorAll('.color-pop').forEach((popElement) => popElement.remove());
  const pop = document.createElement('div');
  pop.className = 'color-pop';
  Common.palette.forEach((color) => {
    const button = document.createElement('button');
    button.style.background = color;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      voice.color = color;
      Voices.persist();
      pop.remove();
      emit('voices-changed');
      emit('zones-changed');
    });
    pop.appendChild(button);
  });
  const rect = swatch.getBoundingClientRect();
  pop.style.left = rect.left + 'px';
  pop.style.top = rect.bottom + 6 + 'px';
  document.body.appendChild(pop);
  setTimeout(() => {
    document.addEventListener('click', () => pop.remove(), { once: true });
  }, 0);
}

on('voices-changed', renderVoices);
on('voices-changed', renderInitialScoreSetup);
on('initial-movement-named', startInitialScoreWorkflow);
on('score-loaded', loadVoicesForScore);
const addVoiceBtn = document.querySelector('.add-voice');
if (addVoiceBtn) addVoiceBtn.addEventListener('click', addVoiceFromInterface);
initialScoreVoicesNext.addEventListener('click', () => {
  if (!hasCompletedVoiceNames()) return;
  initialScoreSetupError.hidden = true;
  setInitialScoreSetupStep(INITIAL_SCORE_SETUP_SYSTEMS);
  window.setTimeout(() => initialScoreSystemNumber.focus(), 0);
});
initialScoreSystemNumber.addEventListener('input', () => {
  initialScoreSetupError.hidden = true;
  initialScoreSystemNumber.removeAttribute('aria-invalid');
});
initialScoreSystemsStep.addEventListener('submit', (event) => {
  event.preventDefault();
  const systemNumber = Number(initialScoreSystemNumber.value);
  if (!Movements.setSystemNumber(initialMovementName, systemNumber)) {
    initialScoreSetupError.hidden = false;
    initialScoreSystemNumber.setAttribute('aria-invalid', 'true');
    initialScoreSystemNumber.focus();
    return;
  }

  initialScoreSetupError.hidden = true;
  initialScoreSystemNumber.removeAttribute('aria-invalid');
  initialScoreSystemNumber.value = '';
  setInitialScoreSetupStep(null);
  const newZoneButton = document.getElementById('act-new-zone');
  if (newZoneButton && !newZoneButton.classList.contains('active')) newZoneButton.click();
});
loadVoicesForScore();
renderVoices();
