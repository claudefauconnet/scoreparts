// headerBar/scoreInfo — affiche la partition courante et ouvre le dialog de sélection au clic.
import { on } from '../../partitions.state.js';
import { scoreParts } from '../../../common/scoreParts.js';

function renderScoreInfo() {
  const infos = scoreParts.infos || {};
  const title = infos.pdfName || '';
  const composer = infos.composer || '';
  const totalPages = scoreParts.totalPages || 0;
  const sub = [composer, totalPages ? totalPages + ' pages' : ''].filter(Boolean).join(' · ');
  document.getElementById('hb-score-info-title').textContent = title;
  document.getElementById('hb-score-info-sub').textContent = sub;
}

on('score-loaded', renderScoreInfo);

document.getElementById('hb-score-info').addEventListener('click', function () {
  $('#dialog-overlay').css('display', 'grid');
});
