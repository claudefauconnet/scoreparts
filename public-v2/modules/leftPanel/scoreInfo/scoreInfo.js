// leftPanel/scoreInfo — pied de panneau (UI seule) : affiche la partition courante
// et ouvre le dialog de sélection au clic. Se rafraîchit sur 'score-loaded'.
import { on } from '../../partitions.state.js';
import { scoreParts } from '../../../common/scoreParts.js';
import { emit as emitScoreSelector } from '../../scoreSelector/state.js';

function renderScoreInfo() {
  const infos = scoreParts.infos || {};
  const title = infos.pdfName || '';
  const composer = infos.composer || '';
  const totalPages = scoreParts.totalPages || 0;
  const sub = [composer, totalPages ? totalPages + ' pages' : ''].filter(Boolean).join(' · ');
  document.querySelector('.score-info-title').textContent = title;
  document.querySelector('.score-info-sub').textContent = sub;
}

on('score-loaded', renderScoreInfo);

// Ouvre le dialog de sélection de partition.
document.querySelector('.score-info').addEventListener('click', function (event) {
  event.preventDefault();
  emitScoreSelector('open-score-dialog');
});
