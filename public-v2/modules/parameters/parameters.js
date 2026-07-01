import { Paper } from '../../common/paper.js';
import { scoreParts } from '../../common/scoreParts.js';
import { getScore, getZones, getPdf, getBackups, restoreBackup } from '../../common/localDb.js';
import { zipPdfs, downloadBytes } from '../../localBackend/downloadProcessor.js';
import { getImportQuality, setImportQuality } from '../../common/settings.js';

const DEFAULT_ZONE_HEIGHT = 20;

// ============== Rectangle height
const rectInput = document.getElementById('rect-h');
function applyRectH() {
  const height = Math.max(10, Math.min(200, parseInt(rectInput.value) || DEFAULT_ZONE_HEIGHT));
  Paper.defaultZoneHeight = height;
  document.documentElement.style.setProperty('--zone-h', height + 'px');
  document.querySelectorAll('.zone').forEach((zone) => {
    zone.style.minHeight = height + 'px';
  });
}
rectInput.addEventListener('input', applyRectH);
document.getElementById('rect-minus').addEventListener('click', () => {
  rectInput.value = (parseInt(rectInput.value) || DEFAULT_ZONE_HEIGHT) - 1;
  applyRectH();
});
document.getElementById('rect-plus').addEventListener('click', () => {
  rectInput.value = (parseInt(rectInput.value) || DEFAULT_ZONE_HEIGHT) + 1;
  applyRectH();
});

// ============== Dialog toggle
const dialog = document.getElementById('params-dialog');
document.getElementById('tweaks-pill').addEventListener('click', () => {
  dialog.showModal();
  populateBackupsSelect();
});
document.getElementById('params-close').addEventListener('click', () => dialog.close());
// Clic sur le backdrop ferme le dialog
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

// ============== Export index zip
async function exportScoreIndex() {
  const pdfName = scoreParts.pdfName;
  if (!pdfName) return;

  const exportBtn = document.getElementById('params-export-btn');
  exportBtn.disabled = true;
  exportBtn.textContent = 'Export en cours…';

  try {
    const [scoreInfos, allPagesZones, pdfBlob] = await Promise.all([
      getScore(pdfName),
      getZones(pdfName),
      getPdf(pdfName),
    ]);

    const zipFiles = {};
    zipFiles['scoreInfo.json'] = new TextEncoder().encode(JSON.stringify(scoreInfos, null, 2));
    zipFiles['zones.json'] = new TextEncoder().encode(JSON.stringify(allPagesZones, null, 2));
    if (pdfBlob) {
      const pdfArrayBuffer = await pdfBlob.arrayBuffer();
      zipFiles[pdfName + '.pdf'] = new Uint8Array(pdfArrayBuffer);
    }

    const zipBytes = zipPdfs(zipFiles);
    const zipName = pdfName.replace(/[ .]/g, '_') + '_index.zip';
    downloadBytes(zipBytes, zipName, 'application/zip');
  } finally {
    exportBtn.disabled = false;
    exportBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export complet';
  }
}

document.getElementById('params-export-btn').addEventListener('click', exportScoreIndex);

// ============== Backups
const backupsSelect = document.getElementById('params-backups-select');
const backupsRestoreButton = document.getElementById('params-backups-restore');

function formatBackupDate(createdAt) {
  return new Date(createdAt).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function setBackupsPlaceholder(message) {
  backupsSelect.innerHTML = '<option value="">' + message + '</option>';
  backupsSelect.disabled = true;
  backupsRestoreButton.disabled = true;
}

async function populateBackupsSelect() {
  const pdfName = scoreParts.pdfName;
  if (!pdfName) {
    setBackupsPlaceholder('Aucune partition ouverte');
    return;
  }
  const backups = await getBackups(pdfName);
  if (backups.length === 0) {
    setBackupsPlaceholder('Aucun backup');
    return;
  }
  backupsSelect.innerHTML = '';
  backups.forEach((backup) => {
    const option = document.createElement('option');
    option.value = String(backup.id);
    option.textContent = formatBackupDate(backup.createdAt);
    backupsSelect.appendChild(option);
  });
  backupsSelect.disabled = false;
  backupsRestoreButton.disabled = false;
}

async function restoreSelectedBackup() {
  const backupId = Number(backupsSelect.value);
  if (!backupId) return;
  const selectedLabel = backupsSelect.options[backupsSelect.selectedIndex].textContent;
  if (!confirm('Restaurer le backup du ' + selectedLabel + ' ?')) return;

  const backup = await restoreBackup(backupId);
  // Réouvre la partition pour refléter les infos + zones restaurées.
  scoreParts.openFirstPdfPage(backup.pdfName, false, function () {
    dialog.close();
  });
}

backupsRestoreButton.addEventListener('click', restoreSelectedBackup);

// ============== Book style
document.querySelectorAll('#tw-book-style button').forEach((button) => {
  button.addEventListener('click', () => {
    document
      .querySelectorAll('#tw-book-style button')
      .forEach((styleButton) => styleButton.classList.remove('active'));
    button.classList.add('active');
    document.getElementById('stage').dataset.bookStyle = button.dataset.val;
  });
});

// ============== Import quality
// Définit la qualité de rendu pdfjs (low ×2 / medium ×4) à l'import d'un PDF ou d'un
// ZIP. Persistance localStorage : survit aux rechargements. Par défaut medium (bon
// compromis qualité / rapidité d'affichage) ; low pour les machines lentes.
const importQualityButtons = document.querySelectorAll('#tw-import-quality button');
function syncImportQualityButtons() {
  const currentQuality = getImportQuality();
  importQualityButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.val === currentQuality);
  });
}
importQualityButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setImportQuality(button.dataset.val);
    syncImportQualityButtons();
  });
});
syncImportQualityButtons();
