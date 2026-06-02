// leftPanel/progress — barre de progression du découpage (UI seule). Lit l'état
// des zones (scoreParts) et des voix (state), et les erreurs de cohérence
// (ZonesChecker). Se re-rend sur 'voices-changed', 'zones-changed', 'score-loaded'.
import { state, on } from '../../partitions.state.js';
import { scoreParts } from '../../../common/scoreParts.js';
import { ZonesChecker } from '../../../common/zonesChecker.js';

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
  const voiceCount = state.VOICES.filter((voice) => voice.on).length;

  document.querySelector('.progress-pct').textContent = pct + '%';
  document.querySelector('.progress-fill').style.width = pct + '%';
  document.querySelector('.progress-detail').innerHTML =
    `<span>${totalZones} zone${totalZones !== 1 ? 's' : ''} · ${voiceCount} voix</span>` +
    `<span>${pagesWithZones} / ${totalPages || '?'} p.</span>`;

  renderProgressWarning();
}

function renderProgressWarning() {
  const errors = ZonesChecker.getErrors();
  const progressCard = document.querySelector('.progress-card');
  let warningEl = progressCard.querySelector('.progress-warning');

  if (errors.length === 0) {
    if (warningEl) warningEl.remove();
    return;
  }

  const badPages = errors.map((error) => `p. ${error.page + 1}`).join(', ');
  const tooltipLines = errors.map((error) => `p. ${error.page + 1} : ${error.message}`).join('\n');

  if (!warningEl) {
    warningEl = document.createElement('div');
    warningEl.className = 'progress-warning';
    progressCard.appendChild(warningEl);
  }

  warningEl.title = tooltipLines;
  warningEl.innerHTML =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12">` +
    `<path d="M12 9v4M12 16.5v.5M10.268 4.5L3 17h18L13.732 4.5a2 2 0 0 0-3.464 0z"/>` +
    `</svg>` +
    `<span>${badPages} : zones incohérentes</span>`;
}

on('voices-changed', renderProgress);
on('zones-changed', renderProgress);
on('score-loaded', renderProgress);
