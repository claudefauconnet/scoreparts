import { state, on, emit, resetAll } from '../partitions.state.js';
import { scoreParts } from '../../common/scoreParts.js';
import { saveScoreInfos, generateVoiceScore, createZip } from '../../common/proxy.js';
import { persistVoices } from '../voices/voices.js';
import { Common } from '../../common/common.js';

function getCurrentPage() {
  return scoreParts.currentPage + 1;
}

function buildMovementsFromZones() {
  const pages = scoreParts.allPagesZones.pages;
  // Plage réelle de chaque mouvement, calculée depuis ses zones : start = 1re page,
  // end = dernière page. end est déduit des zones (pas du mvt suivant) car deux
  // mouvements peuvent se recouvrir sur une page frontière (A finit p3, B commence p3).
  const movementRange = {};
  const sortedPageKeys = Object.keys(pages).sort((a, b) => parseInt(a) - parseInt(b));

  for (const pageKey of sortedPageKeys) {
    const pageNumber = parseInt(pageKey) + 1;
    pages[pageKey].forEach((zone) => {
      if (!zone.movement) return;
      const range = movementRange[zone.movement];
      if (!range) {
        movementRange[zone.movement] = { startPage: pageNumber, endPage: pageNumber };
      } else if (pageNumber > range.endPage) {
        range.endPage = pageNumber;
      }
    });
  }

  return Object.entries(movementRange).map(([name, range], idx) => ({
    id: idx + 1,
    name,
    startPage: range.startPage,
    endPage: range.endPage,
  }));
}

// La LISTE des mouvements (noms + ordre) vient de infos.movements (le JSON), pas
// des zones. Les zones ne servent qu'à inférer les PAGES (maître) quand le
// mouvement en a ; sinon endPage reste indéfini pour que mvtRange recalcule une
// plage contiguë à jour. startPage stocké sert à localiser un mouvement sans zone.
function mergeMovements() {
  const inferred = buildMovementsFromZones();
  const inferredByName = {};
  inferred.forEach((mvt) => {
    inferredByName[mvt.name] = mvt;
  });

  let stored = (scoreParts.infos && scoreParts.infos.movements) || [];
  // Migration : ancienne partition sans liste persistée → on la dérive des zones
  // une seule fois (au prochain enregistrement elle sera écrite dans le JSON).
  if (stored.length === 0 && inferred.length > 0) {
    stored = inferred;
  }

  return stored
    .filter((mvt) => mvt.name)
    .map((mvt, idx) => {
      const range = inferredByName[mvt.name];
      return {
        id: idx + 1,
        name: mvt.name,
        startPage: range ? range.startPage : mvt.startPage,
        endPage: range ? range.endPage : undefined,
      };
    });
}

function loadMovements() {
  const movements = mergeMovements();
  if (movements.length === 0) {
    state.MOVEMENTS.splice(0, state.MOVEMENTS.length, { id: 1, name: '', startPage: 1 });
    state.activeMvt = 1;
    emit('movements-changed');
    // Ne force la saisie que si une partition est réellement ouverte (évite de
    // verrouiller l'UI au tout premier chargement du module, sans partition).
    if (scoreParts.pdfName) forceNameMovement();
    return;
  }
  state.MOVEMENTS.splice(0, state.MOVEMENTS.length, ...movements);
  if (!state.MOVEMENTS.find((m) => m.id === state.activeMvt)) {
    state.activeMvt = state.MOVEMENTS[0].id;
  }
  // Indispensable : rafraîchit la header bar (numéro, nom, liste) avec les
  // mouvements chargés. Sans ça l'UI garde l'état initial jusqu'à une interaction.
  emit('movements-changed');
}

// Persiste la liste des mouvements dans infos.movements (noms + ordre + pages
// inférées). Un mouvement sans zone garde son startPage courant, sinon il serait
// introuvable au rechargement.
function persistMovements() {
  if (!scoreParts.pdfName) return;
  // Pages écrites = mêmes que l'affichage (mvtRange) sur une liste triée : zones
  // maître si présentes, sinon plage contiguë. Garde le fichier cohérent avec les
  // zones et évite des endPage=startPage incohérents pour les mouvements sans zone.
  const sorted = [...state.MOVEMENTS].sort((a, b) => a.startPage - b.startPage);
  const payload = [];
  sorted.forEach((mvt, idx) => {
    if (!mvt.name) return;
    const range = mvtRange(sorted, idx);
    payload.push({ name: mvt.name, startPage: range.start, endPage: range.end });
  });
  if (scoreParts.infos) scoreParts.infos.movements = payload;
  saveScoreInfos(scoreParts.pdfName, { movements: payload }, function (err) {
    if (err) console.error('Erreur saveScoreInfos (movements)', err);
  });
}

// Plage de pages d'un mouvement dans une liste TRIÉE par startPage.
// Maître = les zones : si le mouvement en a (endPage défini), on l'utilise (gère
// aussi le recouvrement page frontière). Sinon (pas encore de zones) on déduit une
// plage contiguë : jusqu'au mouvement suivant - 1, ou la fin de la partition.
function mvtRange(sortedMovements, idx) {
  const movement = sortedMovements[idx];
  if (movement.endPage) {
    return { start: movement.startPage, end: movement.endPage };
  }
  const next = sortedMovements[idx + 1];
  const end = next ? next.startPage - 1 : scoreParts.totalPages;
  return { start: movement.startPage, end };
}

function renderMvt() {
  state.MOVEMENTS.sort((a, b) => a.startPage - b.startPage);
  const idx = state.MOVEMENTS.findIndex((m) => m.id === state.activeMvt);
  const movement = state.MOVEMENTS[idx >= 0 ? idx : 0];
  if (idx < 0) state.activeMvt = movement.id;
  // Sync léger : le mouvement actif devient le mouvement courant côté scoreParts
  // pour que les zones dessinées soient taguées (paper.js). Un nom vide = pas de tag.
  scoreParts.currentMovement = movement.name;
  const order = state.MOVEMENTS.findIndex((x) => x.id === state.activeMvt);
  document.getElementById('mvt-number').innerHTML =
    'Mouvement <span class="roman">' + Common.toRoman(order + 1) + '</span>';
  document.getElementById('mvt-name').value = movement.name;

  const popList = document.getElementById('mvt-list');
  popList.innerHTML = '';
  state.MOVEMENTS.forEach((mv, i) => {
    const range = mvtRange(state.MOVEMENTS, i);
    const item = document.createElement('div');
    item.className = 'mvt-item' + (mv.id === state.activeMvt ? ' active' : '');
    item.innerHTML = `
        <span class="num">${Common.toRoman(i + 1)}</span>
        <span class="name">${mv.name || 'Sans titre'}</span>
        <span class="range">p. ${range.start}–${range.end}</span>
        <button class="del" title="Supprimer ce mouvement">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
        </button>
      `;
    item.addEventListener('click', () => {
      // Sélection d'un mouvement (logique v1) : on sauve les zones de la page
      // courante, on bascule le mouvement courant, on rend la header bar (nom),
      // puis on navigue vers la première page du mouvement.
      state.activeMvt = mv.id;
      scoreParts.fillMovement(mv.name);
      emit('movements-changed');
      scoreParts.changePage(mv.startPage - 1);
      closeMvtPop();
    });
    item.querySelector('.del').addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.MOVEMENTS.length <= 1) return;
      const confirmed = window.confirm(
        `Supprimer le mouvement « ${mv.name || 'Sans titre'} » ?\n` +
          'Toutes les zones qui le constituent seront aussi supprimées.'
      );
      if (!confirmed) return;
      // Supprime d'abord les zones du mouvement (modèle + canvas + sauvegarde),
      // puis retire le mouvement de la liste et persiste infos.movements.
      if (mv.name) scoreParts.deleteMovement(mv.name);
      const removeIdx = state.MOVEMENTS.findIndex((x) => x.id === mv.id);
      state.MOVEMENTS.splice(removeIdx, 1);
      if (state.activeMvt === mv.id) state.activeMvt = state.MOVEMENTS[0].id;
      persistMovements();
      emit('movements-changed');
    });
    popList.appendChild(item);
  });

  // Update "Créer un mouvement ici" subtitle
  const sub = document.getElementById('mvt-add-sub');
  if (sub) {
    const exists = state.MOVEMENTS.find((mv) => mv.startPage === getCurrentPage());
    if (exists) {
      sub.textContent = `un mouvement commence déjà à la page ${getCurrentPage()}`;
    } else {
      const sorted = [...state.MOVEMENTS].sort((a, b) => a.startPage - b.startPage);
      const nextMvt = sorted.find((mv) => mv.startPage > getCurrentPage());
      const endPage = nextMvt ? nextMvt.startPage - 1 : scoreParts.totalPages;
      const target = nextMvt ? `avant « ${nextMvt.name} »` : `jusqu'à la fin de la partition`;
      sub.innerHTML = `pages <b>${getCurrentPage()}–${endPage}</b> — ${target}`;
    }
  }
}

let isNamingRequired = false;
let changePageBackup = null;

function closeMvtPop() {
  if (isNamingRequired) return;
  document.getElementById('mvt-pop').classList.remove('open');
}

// Verrouille l'UI pendant la saisie obligatoire du nom : la navigation (changePage)
// est neutralisée et ramène le focus sur le champ. Idempotent — un 2e appel ne
// recapture PAS le changePage déjà neutralisé (sinon le déverrouillage le
// restaurerait sur la version neutralisée → lock permanent).
function lockForNaming() {
  if (isNamingRequired) return;
  isNamingRequired = true;
  changePageBackup = scoreParts.changePage;
  scoreParts.changePage = function () {
    const nameInput = document.getElementById('mvt-name');
    nameInput.classList.add('mvt-name--required');
    nameInput.focus();
  };
}

function unlockNaming() {
  if (!isNamingRequired) return;
  isNamingRequired = false;
  if (changePageBackup) scoreParts.changePage = changePageBackup;
  changePageBackup = null;
  const nameInput = document.getElementById('mvt-name');
  nameInput.classList.remove('mvt-name--required');
  nameInput.placeholder = '';
}

// Ouvre le pop et force la saisie. La validation (nom non vide) et le
// déverrouillage sont gérés par le handler blur unique de #mvt-name.
function forceNameMovement() {
  const pop = document.getElementById('mvt-pop');
  const nameInput = document.getElementById('mvt-name');
  if (!pop || !nameInput) return;
  lockForNaming();
  pop.classList.add('open');
  nameInput.classList.add('mvt-name--required');
  nameInput.placeholder = 'Nommez ce mouvement…';
  nameInput.focus();
  nameInput.select();
}

document.getElementById('mvt-dd').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('mvt-pop').classList.toggle('open');
});
document.getElementById('mvt-edit').addEventListener('click', () => {
  document.getElementById('mvt-name').focus();
  document.getElementById('mvt-name').select();
});
// Nom au moment où l'édition commence : sert à retaguer les zones (ancien → nouveau).
let nameBeforeEdit = '';
document.getElementById('mvt-name').addEventListener('focus', () => {
  const movement = state.MOVEMENTS.find((x) => x.id === state.activeMvt);
  nameBeforeEdit = movement ? movement.name : '';
});
document.getElementById('mvt-name').addEventListener('input', (e) => {
  const movement = state.MOVEMENTS.find((x) => x.id === state.activeMvt);
  if (movement) movement.name = e.target.value;
});
// Entrée = valider le nom : on déclenche le blur (enregistrement + déverrouillage
// via forceNameMovement). Sans ça, Entrée laisse les contrôles bloqués.
document.getElementById('mvt-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.target.blur();
  }
});
document.getElementById('mvt-name').addEventListener('blur', () => {
  const movement = state.MOVEMENTS.find((x) => x.id === state.activeMvt);
  if (!movement) return renderMvt();

  const newName = movement.name.trim();
  if (!newName) {
    if (isNamingRequired) {
      // Nom obligatoire (création en cours) : on garde le focus, reste verrouillé.
      document.getElementById('mvt-name').focus();
      return;
    }
    // Édition annulée à vide : on restaure l'ancien nom.
    movement.name = nameBeforeEdit;
    return renderMvt();
  }
  movement.name = newName;

  if (nameBeforeEdit && newName !== nameBeforeEdit) {
    // Renommage d'un mouvement existant : retag des zones + sauve les zones.
    scoreParts.renameMovement(nameBeforeEdit, newName);
  } else {
    // Première nomination (création) : on fixe juste le mouvement courant.
    scoreParts.fillMovement(newName);
  }
  persistMovements();
  nameBeforeEdit = newName;
  unlockNaming();
  renderMvt();
});
document.getElementById('mvt-add').addEventListener('click', () => {
  // Un mouvement commence déjà à cette page → on bascule dessus, pas de doublon.
  if (state.MOVEMENTS.some((m) => m.startPage === getCurrentPage())) {
    const existing = state.MOVEMENTS.find((m) => m.startPage === getCurrentPage());
    state.activeMvt = existing.id;
    emit('movements-changed');
    closeMvtPop();
    return;
  }
  // Nouveau mouvement à la page courante. Nom vide → on force la saisie (comme
  // loadMovements quand la partition n'a aucun mouvement) : focus verrouillé jusqu'à
  // un nom non vide, puis forceNameMovement déverrouille et le blur enregistre.
  const newId = Math.max(...state.MOVEMENTS.map((m) => m.id)) + 1;
  state.MOVEMENTS.push({ id: newId, name: '', startPage: getCurrentPage() });
  state.activeMvt = newId;
  emit('movements-changed');
  forceNameMovement();
});
document.addEventListener('click', (e) => {
  const pop = document.getElementById('mvt-pop');
  if (!pop.classList.contains('open')) return;
  if (!document.getElementById('mvt').contains(e.target)) closeMvtPop();
});

on('movements-changed', renderMvt);
// La page courante a changé : on rafraîchit la header bar (sous-titre « créer
// d'ici » et plages dépendent de la page courante).
on('page-changed', renderMvt);
on('score-loaded', loadMovements);
loadMovements();
renderMvt();

// ============== Reset all
function confirmAndResetAll() {
  if (!confirm('Tout recommencer ? Cette action supprime définitivement toutes les voix, zones et mouvements.')) return;
  resetAll();
  const pages = scoreParts.allPagesZones.pages;
  Object.keys(pages).forEach((pageNum) => { pages[pageNum] = []; });
  scoreParts.currentZones = [];
  scoreParts.saveZones(function () {});
  persistVoices();
  if (scoreParts.pdfName) {
    if (scoreParts.infos) scoreParts.infos.movements = [];
    saveScoreInfos(scoreParts.pdfName, { movements: [] }, function (err) {
      if (err) console.error('Erreur saveScoreInfos (reset movements)', err);
    });
  }
  emit('page-changed');
}

const resetBtn = document.getElementById('reset-btn');
if (resetBtn) resetBtn.addEventListener('click', confirmAndResetAll);

// ============== Download split button
const dlSplit = document.getElementById('dl-split');
const dlMenu = document.getElementById('dl-menu');
const dlCaret = document.getElementById('dl-caret');
const dlMainBtn = dlSplit.querySelector('.dl-main');
const dlPdfItem = dlMenu.querySelector('[data-fmt="pdf"]');
const dlZipItem = dlMenu.querySelector('[data-fmt="zip"]');

// Format déclenché par le bouton principal ; la coche du menu le reflète.
let selectedFormat = 'pdf';
// Empêche de lancer un 2e téléchargement pendant qu'un autre génère.
let isDownloading = false;

function refreshZipMenuCount() {
  const activeCount = state.VOICES.filter((voice) => voice.on).length;
  document.getElementById('dl-zip-count').textContent = activeCount;
  document.getElementById('dl-zip-sub').textContent =
    activeCount === 0
      ? 'aucune voix active'
      : activeCount === 1
        ? '1 PDF (voix active)'
        : `${activeCount} PDF (une par voix active)`;
}

// Déplace la coche sur le format choisi et met à jour le bouton principal.
function selectFormat(format) {
  selectedFormat = format;
  dlPdfItem.classList.toggle('default', format === 'pdf');
  dlZipItem.classList.toggle('default', format === 'zip');
  dlMainBtn.title =
    format === 'zip'
      ? 'Télécharger les voix séparées (.zip)'
      : 'Télécharger la partition complète (PDF)';
}

selectFormat('pdf');

dlCaret.addEventListener('click', (e) => {
  e.stopPropagation();
  dlMenu.classList.toggle('open');
  refreshZipMenuCount();
});
document.addEventListener('click', (e) => {
  if (!dlSplit.contains(e.target)) dlMenu.classList.remove('open');
});

// ============== Barre de progression de génération

const dlToast = document.getElementById('dl-toast');
// Rattacher au body : un ancêtre transformé du header capterait le position:fixed
// et ancrerait le toast en haut au lieu du coin bas-droit du viewport.
if (dlToast && dlToast.parentElement !== document.body) {
  document.body.appendChild(dlToast);
}
const dlToastLabel = document.getElementById('dl-toast-label');
const dlToastPct = document.getElementById('dl-toast-pct');
const dlToastFill = document.getElementById('dl-toast-fill');

function showProgress(label, indeterminate) {
  dlToastLabel.textContent = label;
  dlToast.hidden = false;
  if (indeterminate) {
    dlToast.classList.add('indeterminate');
    dlToastPct.textContent = '';
    dlToastFill.style.width = '';
  } else {
    dlToast.classList.remove('indeterminate');
    setProgress(0);
  }
}

function setProgress(percent, label) {
  dlToast.classList.remove('indeterminate');
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  dlToastFill.style.width = clamped + '%';
  dlToastPct.textContent = clamped + '%';
  if (label) dlToastLabel.textContent = label;
}

function hideProgress(delay) {
  window.setTimeout(() => {
    dlToast.hidden = true;
  }, delay || 0);
}

function beginDownload() {
  isDownloading = true;
  dlMainBtn.disabled = true;
  dlCaret.disabled = true;
}

function endDownload() {
  isDownloading = false;
  dlMainBtn.disabled = false;
  dlCaret.disabled = false;
}

// ============== Download handlers

function getMovementDirName() {
  const base = scoreParts.allPagesZones && scoreParts.allPagesZones.title
    ? scoreParts.allPagesZones.title
    : scoreParts.pdfName;
  const mvt = scoreParts.currentMovement || '';
  return (base + (mvt ? '_' + mvt : '')).replace(/[ .]/g, '-');
}

// Voix actives ayant au moins une zone affectée (sinon rien à générer).
function getActiveVoicesWithZones() {
  return state.VOICES
    .filter((voice) => voice.on)
    .map((voice) => ({ voice, pagesZones: scoreParts.voicePagesZones(voice.id) }))
    .filter(({ pagesZones }) => Object.keys(pagesZones.pages).length > 0);
}

// Partition complète = UN PDF avec les zones de toutes les voix ACTIVES empilées.
function downloadCompletePdf() {
  if (!scoreParts.pdfName || isDownloading) return;
  const activeVoices = state.VOICES.filter((voice) => voice.on);
  if (activeVoices.length === 0) {
    alert('Aucune voix active. Activez au moins une voix avant de télécharger.');
    return;
  }
  const pagesZones = scoreParts.combinedPagesZones(activeVoices.map((voice) => voice.id));
  if (Object.keys(pagesZones.pages).length === 0) {
    alert('Aucune zone assignée aux voix actives. Utilisez Auto-attribuer d\'abord.');
    return;
  }
  const targetPdfName = (getMovementDirName() + '_complet').replace(/[ .]/g, '-');
  beginDownload();
  showProgress('Génération de la partition complète…', true);
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
      endDownload();
      if (err) {
        hideProgress();
        return alert(err.responseText || err);
      }
      setProgress(100, 'Partition prête');
      hideProgress(1000);
      window.open('/' + result, '_blank');
    }
  );
}

// ZIP = un PDF par voix ACTIVE dans un répertoire partagé, puis zip côté backend.
function downloadZip() {
  if (!scoreParts.pdfName || isDownloading) return;
  const activeVoices = state.VOICES.filter((voice) => voice.on);
  if (activeVoices.length === 0) {
    alert('Aucune voix active. Activez au moins une voix avant de télécharger.');
    return;
  }
  const voiceJobs = getActiveVoicesWithZones();
  if (voiceJobs.length === 0) {
    alert('Aucune zone assignée aux voix actives. Utilisez Auto-attribuer d\'abord.');
    return;
  }

  const movementDirName = getMovementDirName();
  const totalSteps = voiceJobs.length + 1; // +1 = étape de création du ZIP
  let completedCount = 0;
  let pendingCount = voiceJobs.length;

  beginDownload();
  showProgress(`Génération voix 1/${voiceJobs.length}…`, false);

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
        setProgress(
          (completedCount / totalSteps) * 100,
          pendingCount > 0
            ? `Génération voix ${completedCount + 1}/${voiceJobs.length}…`
            : 'Création du ZIP…'
        );
        if (pendingCount === 0) {
          createZip(movementDirName, (zipErr, result) => {
            endDownload();
            if (zipErr) {
              hideProgress();
              return alert('Erreur création ZIP : ' + (zipErr.responseText || zipErr));
            }
            setProgress(100, 'ZIP prêt');
            hideProgress(1000);
            window.open('/' + result.zipPath, '_blank');
          });
        }
      }
    );
  });
}

function runSelectedDownload() {
  if (selectedFormat === 'zip') {
    downloadZip();
  } else {
    downloadCompletePdf();
  }
}

// Bouton principal : lance le format sélectionné.
dlMainBtn.addEventListener('click', runSelectedDownload);

// Items du menu : sélectionnent le format (déplacent la coche) puis lancent.
dlPdfItem.addEventListener('click', () => {
  selectFormat('pdf');
  dlMenu.classList.remove('open');
  downloadCompletePdf();
});
dlZipItem.addEventListener('click', () => {
  selectFormat('zip');
  dlMenu.classList.remove('open');
  downloadZip();
});
