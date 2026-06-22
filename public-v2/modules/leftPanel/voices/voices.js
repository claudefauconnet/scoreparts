// leftPanel/voices — UI de la liste des voix. La logique (création, persistance,
// suppression) vit dans common/voices.js (Voices) ; ce fichier rend les lignes,
// gère les événements et les popovers (couleur, suppression). Le décompte des
// zones par voix vient de scoreParts (couche zones).
import { state, on, emit, resetAll } from '../../partitions.state.js';
import { scoreParts } from '../../../common/scoreParts.js';
import { Common } from '../../../common/common.js';
import { downloadSinglePart } from '../../../common/localBackendProxy.js';
import { Voices } from '../../../common/voices.js';
import { ProgressToast } from '../../../common/progressToast.js';

const list = document.getElementById('voice-list');

function renderVoices() {
  list.innerHTML = '';
  state.VOICES.forEach((voice) => {
    const row = document.createElement('div');
    row.className =
      'voice' + (voice.on ? ' on' : '') + (state.activeVoice === voice.id ? ' active' : '');
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
            <svg viewBox="0 0 24 24"><path d="M3 17l8-8 5 5-8 8H3v-5zM14 6l3-3 4 4-3 3"/></svg>
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
      openDeletePopover(event.currentTarget, row, voice);
    });
    row.querySelector('[data-color]').addEventListener('click', (event) => {
      event.stopPropagation();
      openColorPopover(event.target, voice);
    });
    row.querySelector('[data-rename]').addEventListener('click', (event) => event.stopPropagation());
    row.querySelector('[data-rename]').addEventListener('blur', (event) => {
      const value = event.target.textContent.trim();
      voice.name = value || voice.name;
      event.target.textContent = voice.name;
      Voices.persist();
    });
    row.querySelector('[data-rename]').addEventListener('keydown', (event) => {
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

// Destructive-action popover anchored to the voice's × button.
function openDeletePopover(btn, row, voice) {
  document.querySelectorAll('.voice-pop').forEach((popElement) => popElement.remove());
  document
    .querySelectorAll('.voice.has-open-pop')
    .forEach((voiceRow) => voiceRow.classList.remove('has-open-pop'));
  // Toggle off if same button reopened
  if (btn.classList.contains('open')) {
    btn.classList.remove('open');
    return;
  }
  document.querySelectorAll('.voice-del.open').forEach((deleteButton) => deleteButton.classList.remove('open'));
  btn.classList.add('open');
  row.classList.add('has-open-pop');

  const pop = document.createElement('div');
  pop.className = 'voice-pop';
  pop.innerHTML = `
      <button class="voice-pop-item" data-pop-act="erase-all">
        <span class="voice-pop-icon">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>
        </span>
        <span class="voice-pop-text">
          <span class="voice-pop-title">Effacer de toutes les pages</span>
          <span class="voice-pop-sub">Supprime « ${voice.name} » et ses zones sur toutes les pages</span>
        </span>
      </button>
      <button class="voice-pop-item" data-pop-act="reset-all">
        <span class="voice-pop-icon danger">
          <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
        </span>
        <span class="voice-pop-text">
          <span class="voice-pop-title">Tout recommencer</span>
          <span class="voice-pop-sub">Modèle vierge : sans mouvements, sans voix, sans zones</span>
        </span>
      </button>
    `;
  document.body.appendChild(pop);
  const rect = btn.getBoundingClientRect();
  // Anchor to the right edge of the × button so popover doesn't overflow viewport
  const popWidth = pop.offsetWidth;
  let left = rect.right - popWidth;
  if (left < 8) left = 8;
  pop.style.left = left + 'px';
  pop.style.top = rect.bottom + 8 + 'px';

  function closePop() {
    pop.remove();
    btn.classList.remove('open');
    row.classList.remove('has-open-pop');
    document.removeEventListener('click', onDocClick, true);
  }
  function onDocClick(ev) {
    if (pop.contains(ev.target) || btn.contains(ev.target)) return;
    closePop();
  }
  setTimeout(() => document.addEventListener('click', onDocClick, true), 0);

  pop.querySelector('[data-pop-act="erase-all"]').addEventListener('click', (event) => {
    event.stopPropagation();
    Voices.remove(voice.id);
    closePop();
  });
  pop.querySelector('[data-pop-act="reset-all"]').addEventListener('click', (event) => {
    event.stopPropagation();
    closePop();
    resetAll();
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
on('score-loaded', Voices.load);
const addVoiceBtn = document.querySelector('.add-voice');
if (addVoiceBtn) addVoiceBtn.addEventListener('click', Voices.add);
Voices.load();
renderVoices();
