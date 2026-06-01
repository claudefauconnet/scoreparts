import { state, on, emit, resetAll } from '../partitions.state.js';
import { scoreParts } from '../../common/scoreParts.js';
import { saveScoreInfos, generateVoiceScore, findPageZones } from '../../common/proxy.js';
import { Paper } from '../../common/paper.js';

// ============== Voix
const list = document.getElementById('voice-list');

const COLOR_PALETTE = [
  '#c9534b',
  '#d99441',
  '#4a7a8c',
  '#6b6396',
  '#5e8c61',
  '#a86b9b',
  '#3a342b',
  '#b08a3e',
];

// Couleur distincte : 1re couleur de la palette non encore utilisée par une voix ;
// si toutes prises, on boucle sur la palette (taille = nombre de voix).
function nextVoiceColor() {
  const used = new Set(state.VOICES.map((v) => v.color));
  const free = COLOR_PALETTE.find((color) => !used.has(color));
  return free || COLOR_PALETTE[state.VOICES.length % COLOR_PALETTE.length];
}

function nextVoiceId() {
  let index = 1;
  while (state.VOICES.some((v) => v.id === 'v' + index)) index += 1;
  return 'v' + index;
}

// La LISTE des voix (noms + couleurs + actif) vient de infos.voices (le JSON).
function loadVoices() {
  const stored = (scoreParts.infos && scoreParts.infos.voices) || [];
  const voices = stored
    .filter((voice) => voice && voice.name)
    .map((voice, index) => ({
      id: voice.id || 'v' + (index + 1),
      name: voice.name,
      color: voice.color || COLOR_PALETTE[index % COLOR_PALETTE.length],
      on: voice.on !== false,
      count: voice.count || 0,
    }));
  state.VOICES.splice(0, state.VOICES.length, ...voices);
  if (!state.VOICES.find((v) => v.id === state.activeVoice)) {
    state.activeVoice = state.VOICES[0] ? state.VOICES[0].id : null;
  }
  emit('voices-changed');
}

// Persiste la liste des voix dans infos.voices (id + nom + couleur + actif).
export function persistVoices() {
  if (!scoreParts.pdfName) return;
  const payload = state.VOICES.map((voice) => ({
    id: voice.id,
    name: voice.name,
    color: voice.color,
    on: voice.on,
  }));
  if (scoreParts.infos) scoreParts.infos.voices = payload;
  saveScoreInfos(scoreParts.pdfName, { voices: payload }, function (err) {
    if (err) console.error('Erreur saveScoreInfos (voices)', err);
  });
}

// Nombre de zones par voix (clé = voice.id) depuis les zones persistées.
function zoneCountsByVoice() {
  const counts = {};
  const pages = scoreParts.allPagesZones && scoreParts.allPagesZones.pages;
  if (!pages) return counts;
  Object.keys(pages).forEach((pageKey) => {
    pages[pageKey].forEach((zone) => {
      if (zone.voice) counts[zone.voice] = (counts[zone.voice] || 0) + 1;
    });
  });
  return counts;
}

function renderVoices() {
  list.innerHTML = '';
  const counts = zoneCountsByVoice();
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
          <span class="voice-count">${counts[voice.id] || 0} zones</span>
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
    row.querySelector('[data-toggle]').addEventListener('click', (e) => {
      e.stopPropagation();
      voice.on = !voice.on;
      persistVoices();
      emit('voices-changed');
      emit('zones-changed');
    });
    row.querySelector('[data-del]').addEventListener('click', (e) => {
      e.stopPropagation();
      openDeletePopover(e.currentTarget, row, voice);
    });
    row.querySelector('[data-color]').addEventListener('click', (e) => {
      e.stopPropagation();
      openColorPopover(e.target, voice);
    });
    row.querySelector('[data-rename]').addEventListener('click', (e) => e.stopPropagation());
    row.querySelector('[data-rename]').addEventListener('blur', (e) => {
      const value = e.target.textContent.trim();
      voice.name = value || voice.name;
      e.target.textContent = voice.name;
      persistVoices();
    });
    row.querySelector('[data-rename]').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
      }
    });
    row.querySelector('[data-act="erase"]').addEventListener('click', (e) => {
      e.stopPropagation();
      const confirmed = window.confirm(
        `Effacer toutes les zones affectées à « ${voice.name} » ?\n` +
          'La voix reste dans la liste, seules ses zones sont supprimées.'
      );
      if (!confirmed) return;
      scoreParts.deleteVoiceZones(voice.id);
      emit('voices-changed');
      emit('zones-changed');
    });
    row.querySelector('[data-act="download"]').addEventListener('click', (e) => {
      e.stopPropagation();
      downloadVoice(voice);
    });
    row.addEventListener('click', () => {
      state.activeVoice = voice.id;
      emit('voices-changed');
    });
    list.appendChild(row);
  });
}

// Ajoute une voix avec une couleur distincte, puis persiste.
function addVoice() {
  const voice = {
    id: nextVoiceId(),
    name: 'Voix ' + (state.VOICES.length + 1),
    color: nextVoiceColor(),
    on: true,
    count: 0,
  };
  state.VOICES.push(voice);
  state.activeVoice = voice.id;
  persistVoices();
  emit('voices-changed');
}

// Détecte automatiquement les systèmes musicaux de la page courante via l'API
// et crée une zone par système (sans voix assignée, prêt pour auto-attribuer).
// Algo identique à l'ancien Proxy.autoDetectPageZones + Paper.drawAutoDetectedZones,
// converti en coordonnées fractionnelles (0→1 de natW/natH) pour le v2.
function autoDetectZones() {
  if (!scoreParts.pdfName) return;
  if (!scoreParts.currentMovement) {
    alert('Sélectionnez ou déclarez un mouvement.');
    return;
  }

  const natW = scoreParts.naturalW || 1;
  const natH = scoreParts.naturalH || 1;

  findPageZones(scoreParts.pdfName, scoreParts.currentPage, function (err, data) {
    if (err || !data || !data.topLines || data.topLines.length === 0) {
      alert('Aucun système détecté sur cette page.');
      return;
    }

    const interline = data.interline;
    const xFrac = data.firstVerticalLine / natW;
    const widthFrac = Math.max(0.01, 1 - 2 * xFrac);

    // Auto overflow: half the empty space between consecutive systems (capped to 2 interlines).
    const autoOverflowPx = data.topLines.length > 1
      ? Math.min(2 * interline, Math.max(0, (data.topLines[1] - data.topLines[0] - 6 * interline) / 2))
      : interline;

    const heightInputEl = document.getElementById('rect-h');
    const heightInputDisplayPx = heightInputEl ? parseFloat(heightInputEl.value) : NaN;
    const useCustomHeight = !isNaN(heightInputDisplayPx) && heightInputDisplayPx > 0;
    // coefV = canvasH / natH → fraction = displayPx / (natH * coefV)
    const coefV = scoreParts.coefV || 1;

    const zones = data.topLines.map(function (topY) {
      if (useCustomHeight) {
        return {
          x: xFrac,
          y: Math.max(0, topY / natH),
          width: widthFrac,
          height: heightInputDisplayPx / (natH * coefV),
          voice: null,
          movement: scoreParts.currentMovement,
          page: scoreParts.currentPage,
        };
      }
      return {
        x: xFrac,
        y: Math.max(0, (topY - autoOverflowPx) / natH),
        width: widthFrac,
        height: (6 * interline + 2 * autoOverflowPx) / natH,
        voice: null,
        movement: scoreParts.currentMovement,
        page: scoreParts.currentPage,
      };
    });

    scoreParts.allPagesZones.pages[scoreParts.currentPage] = zones;
    scoreParts.currentZones = zones;
    scoreParts.modified = true;
    Paper.redrawCurrentPage();
    scoreParts.saveZones(function () {});
    emit('zones-changed');
  });
}

// Copie les zones de la page précédente vers la page courante (même mouvement).
function duplicatePreviousPage() {
  if (!scoreParts.pdfName) return;
  if (scoreParts.currentPage === 0) {
    alert('Aucune page précédente à dupliquer.');
    return;
  }
  const prevPage = scoreParts.currentPage - 1;
  const prevZones = (scoreParts.allPagesZones.pages[prevPage] || []).filter(
    function (zone) { return zone.movement === scoreParts.currentMovement; }
  );
  if (prevZones.length === 0) {
    alert('Aucune zone sur la page précédente pour ce mouvement.');
    return;
  }
  const cloned = prevZones.map(function (zone) {
    return Object.assign({}, zone, { page: scoreParts.currentPage });
  });
  scoreParts.allPagesZones.pages[scoreParts.currentPage] = cloned;
  scoreParts.currentZones = cloned;
  scoreParts.modified = true;
  Paper.redrawCurrentPage();
  scoreParts.saveZones(function () {});
  emit('zones-changed');
}

// Auto-attribue les voix renseignées aux zones du mouvement courant.
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

// Génère + télécharge le PDF d'une voix à partir de ses zones affectées.
function downloadVoice(voice) {
  if (!scoreParts.pdfName) return;
  const pagesZones = scoreParts.voicePagesZones(voice.id);
  if (Object.keys(pagesZones.pages).length === 0) {
    alert(`Aucune zone affectée à « ${voice.name} ». Utilisez Auto-attribuer d'abord.`);
    return;
  }
  const targetPdfName = (scoreParts.pdfName + '_' + voice.name).replace(/[ .]/g, '-');
  generateVoiceScore(
    {
      sourcePdfName: scoreParts.pdfName,
      targetPdfName,
      part: voice.name,
      pagesZones,
      margin: scoreParts.margin,
      // Zones stockées en fractions 0→1 des dimensions naturelles du PNG.
      // Le backend convertit ces fractions selon naturalW/naturalH.
      naturalW: scoreParts.naturalW,
      naturalH: scoreParts.naturalH,
    },
    (err, result) => {
      if (err) return alert(err.responseText || err);
      window.open('/' + result, '_blank');
    }
  );
}

// Destructive-action popover anchored to the voice's × button.
function openDeletePopover(btn, row, voice) {
  document.querySelectorAll('.voice-pop').forEach((p) => p.remove());
  document
    .querySelectorAll('.voice.has-open-pop')
    .forEach((r) => r.classList.remove('has-open-pop'));
  // Toggle off if same button reopened
  if (btn.classList.contains('open')) {
    btn.classList.remove('open');
    return;
  }
  document.querySelectorAll('.voice-del.open').forEach((b) => b.classList.remove('open'));
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

  pop.querySelector('[data-pop-act="erase-all"]').addEventListener('click', (ev) => {
    ev.stopPropagation();
    const idx = state.VOICES.findIndex((x) => x.id === voice.id);
    if (idx >= 0) state.VOICES.splice(idx, 1);
    state.ZONES_LEFT = state.ZONES_LEFT.filter((z) => z.voice !== voice.id);
    state.ZONES_RIGHT = state.ZONES_RIGHT.filter((z) => z.voice !== voice.id);
    if (state.activeVoice === voice.id) {
      state.activeVoice = state.VOICES[0] ? state.VOICES[0].id : null;
    }
    persistVoices();
    closePop();
    emit('voices-changed');
    emit('zones-changed');
  });
  pop.querySelector('[data-pop-act="reset-all"]').addEventListener('click', (ev) => {
    ev.stopPropagation();
    closePop();
    resetAll();
  });
}

// Color picker popover anchored to the voice swatch.
function openColorPopover(swatch, voice) {
  document.querySelectorAll('.color-pop').forEach((p) => p.remove());
  const pop = document.createElement('div');
  pop.className = 'color-pop';
  COLOR_PALETTE.forEach((color) => {
    const button = document.createElement('button');
    button.style.background = color;
    button.addEventListener('click', (ev) => {
      ev.stopPropagation();
      voice.color = color;
      persistVoices();
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

function renderScoreInfo() {
  const infos = scoreParts.infos || {};
  const title = infos.pdfName || '';
  const composer = infos.composer || '';
  const totalPages = scoreParts.totalPages || 0;
  const sub = [composer, totalPages ? totalPages + ' pages' : ''].filter(Boolean).join(' · ');
  document.querySelector('.score-info-title').textContent = title;
  document.querySelector('.score-info-sub').textContent = sub;
}

function renderProgress() {
  const pages = scoreParts.allPagesZones && scoreParts.allPagesZones.pages;
  const totalPages = scoreParts.totalPages || 0;
  const pagesWithZones = pages
    ? Object.values(pages).filter((pageZones) => pageZones.length > 0).length
    : 0;
  const pct = totalPages > 0 ? Math.round((pagesWithZones / totalPages) * 100) : 0;
  const totalZones = pages
    ? Object.values(pages).reduce((sum, pageZones) => sum + pageZones.length, 0)
    : 0;
  const voiceCount = state.VOICES.filter((v) => v.active !== false).length;
  const currentPage = (scoreParts.currentPage || 0) + 1;

  document.querySelector('.progress-pct').textContent = pct + '%';
  document.querySelector('.progress-fill').style.width = pct + '%';
  document.querySelector('.progress-detail').innerHTML =
    `<span>${totalZones} zone${totalZones !== 1 ? 's' : ''} · ${voiceCount} voix</span>` +
    `<span>${pagesWithZones} / ${totalPages || '?'} p.</span>`;
}

on('voices-changed', renderVoices);
on('voices-changed', renderProgress);
on('zones-changed', renderProgress);
on('score-loaded', loadVoices);
on('score-loaded', renderScoreInfo);
on('score-loaded', renderProgress);
const addVoiceBtn = document.querySelector('.add-voice');
if (addVoiceBtn) addVoiceBtn.addEventListener('click', addVoice);
const autoAssignBtn = document.getElementById('act-auto-assign');
if (autoAssignBtn) autoAssignBtn.addEventListener('click', autoAssignVoices);
const autoDetectBtn = document.getElementById('act-auto-detect');
if (autoDetectBtn) autoDetectBtn.addEventListener('click', autoDetectZones);
const duplicateBtn = document.getElementById('act-duplicate');
if (duplicateBtn) duplicateBtn.addEventListener('click', duplicatePreviousPage);
loadVoices();
renderVoices();

// ============== Score info footer — ouvre le dialog de sélection
document.querySelector('.score-info').addEventListener('click', function (e) {
  e.preventDefault();
  $('#dialog-overlay').css('display', 'grid');
});

// ============== Global tooltip (body-attached, escapes overflow clipping)
(function setupGlobalTooltip() {
  let tip = null;
  let timer = null;
  function show(el) {
    const title = el.getAttribute('data-tooltip');
    const sub = el.getAttribute('data-tooltip-sub') || '';
    if (!title) return;
    tip = document.createElement('div');
    tip.className = 'global-tooltip';
    tip.innerHTML = sub ? `<strong>${title}</strong>${sub}` : `<strong>${title}</strong>`;
    document.body.appendChild(tip);
    const rect = el.getBoundingClientRect();
    // measure
    const tipWidth = tip.offsetWidth;
    const tipHeight = tip.offsetHeight;
    const centerX = rect.left + rect.width / 2;
    let top = rect.top - tipHeight - 10;
    let placeBelow = false;
    if (top < 8) {
      top = rect.bottom + 10;
      placeBelow = true;
    }
    // clamp horizontal
    const margin = 8;
    let left = centerX - tipWidth / 2;
    left = Math.max(margin, Math.min(window.innerWidth - tipWidth - margin, left));
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    tip.style.transform = 'none';
    // reposition arrow
    const arrowX = centerX - left;
    tip.style.setProperty('--arrow-x', arrowX + 'px');
    tip.classList.toggle('below', placeBelow);
    requestAnimationFrame(() => tip.classList.add('show'));
  }
  function hide() {
    clearTimeout(timer);
    if (tip) {
      tip.remove();
      tip = null;
    }
  }
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    hide();
    timer = setTimeout(() => show(target), 350);
  });
  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    hide();
  });
  window.addEventListener('scroll', hide, true);
})();
