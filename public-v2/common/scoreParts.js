import { Paper } from './paper.js';
import { Common } from './common.js';
import { saveZones, loadZones, loadScoreInfos } from './proxy.js';
import { emit } from '../modules/partitions.state.js';

export const scoreParts = {};

scoreParts.allPagesZones = { pages: {}, title: '' };
scoreParts.currentZones = [];
scoreParts.modified = false;

scoreParts.totalPages = null;
scoreParts.naturalW = null; // largeur naturelle de l'image PNG courante (px)
scoreParts.naturalH = null; // hauteur naturelle

// When true, the viewer shows one page at a time (small screens) instead of a
// 2-page spread. Editor (Paper) context never sets this, so it stays a spread.
scoreParts.singlePage = false;

scoreParts.getTotalPages = function () {
  return scoreParts.totalPages;
};

// Contexte éditeur : v1 = canvas #myCanvas, v2 = canvas transparent .zone-canvas
// (un par page). Dans les deux cas Paper.js pilote les zones et la persistance.
scoreParts.isEditorContext = function () {
  return !!document.getElementById('myCanvas') || !!document.querySelector('.zone-canvas');
};

// Pages advanced per navigation step: 1 in single-page mode, 2 for a spread.
scoreParts.pageStep = function () {
  return scoreParts.singlePage ? 1 : 2;
};

var imagesDir = './data/images/';

scoreParts.loadImageIntoContainer = function (src, containerId, callback) {
  var container = document.getElementById(containerId);
  if (!container) {
    if (callback) callback();
    return;
  }
  var img = new Image();
  img.onload = function () {
    if (callback) callback();
  };
  img.onerror = function () {
    if (callback) callback();
  };
  // Vide + insère l'<img> TOUT DE SUITE (avant le chargement) : les observateurs
  // de page (waitForPageImage) se lient à la NOUVELLE image, pas à l'ancienne
  // restée affichée → plus de canvas calé sur l'image périmée au changement de page.
  container.innerHTML = '';
  container.appendChild(img);
  img.src = src;
};

function updatePageIndicators() {
  var displayPage = scoreParts.currentPage + 1;
  $('#page').html(' ' + displayPage);
  $('#page-input').val(displayPage);
}

// Origine du spread = page de gauche, toujours d'index pair. On l'aligne sur la
// paire contenant pageIndex, SANS modifier scoreParts.currentPage qui reste la
// page exacte sélectionnée (tapée / cliquée / page d'un mouvement).
scoreParts.spreadOrigin = function (pageIndex) {
  var page = pageIndex == null ? scoreParts.currentPage : pageIndex;
  return scoreParts.singlePage ? page : page - (page % 2);
};

function loadPageSpread(pageIndex, callback) {
  var spreadOrigin = scoreParts.spreadOrigin(pageIndex);
  var leftSrc = imagesDir + scoreParts.pdfName + '/' + spreadOrigin + '.png';
  scoreParts.loadImageIntoContainer(leftSrc, 'systems-left', callback);
  if (scoreParts.singlePage) {
    var rightContainer = document.getElementById('systems-right');
    if (rightContainer) rightContainer.innerHTML = '';
    return;
  }
  var rightSrc = imagesDir + scoreParts.pdfName + '/' + (spreadOrigin + 1) + '.png';
  scoreParts.loadImageIntoContainer(rightSrc, 'systems-right', null);
}

scoreParts.openFirstPdfPage = function (pdfname, clearAll, onBothSettled) {
  var pdfName = pdfname;
  if (!pdfName) return;
  scoreParts.pdfName = pdfName;
  scoreParts.currentPage = 0;

  // On charge les infos AVANT les pages/zones pour que scoreParts.infos (et la
  // liste des mouvements persistée) soit disponible quand 'score-loaded' est émis.
  loadScoreInfos(pdfName, function (err, infos) {
    scoreParts.infos = !err && infos ? infos : { pdfName: pdfName };
    if (!scoreParts.infos.movements) {
      scoreParts.infos.movements = [];
    }
    if (!scoreParts.infos.voices) {
      scoreParts.infos.voices = [];
    }
    if (scoreParts.infos.totalPages) {
      scoreParts.totalPages = scoreParts.infos.totalPages;
      $('#page-total').text('/ ' + scoreParts.infos.totalPages);
    }
    loadPdfPages(pdfName, clearAll, onBothSettled);
  });
};

function loadPdfPages(pdfName, clearAll, onBothSettled) {
  var isEditorContext = scoreParts.isEditorContext();

  if (!isEditorContext) {
    loadPageSpread(0, function () {
      emit('score-loaded');
      if (onBothSettled) onBothSettled();
    });
    return;
  }

  document.addEventListener('contextmenu', (event) => event.preventDefault());

  // À l'ouverture, on CHARGE les zones persistées (pas de save préalable : le
  // modèle en mémoire est encore vide à ce stade, le sauver écraserait le backend).
  // La persistance se fait ensuite à la navigation / aux gestes d'édition.
  Paper.deleteZones();

  loadZones(scoreParts, function (err, data) {
    if (err || clearAll) {
      scoreParts.allPagesZones = {
        pages: {},
        title: '',
        pdfName: scoreParts.pdfName,
        date: new Date(),
        author: 'cf',
      };
    } else {
      scoreParts.allPagesZones = data;
    }

    scoreParts.voices = [];
    scoreParts.currentPage = 0;
    // 'score-loaded' DOIT être émis une fois l'image présente dans le DOM
    // (l'éditeur y attache le canvas Paper). On émet donc dans le callback de
    // chargement d'image, pas de façon synchrone.
    loadPageSpread(0, function () {
      updatePageIndicators();
      emit('score-loaded');
      if (onBothSettled) onBothSettled();
    });
  });
}

// Propage mesure/texte de la 1re zone d'un système sur les zones suivantes
// de la même page (les voix d'un même système partagent mesure + annotation).
scoreParts.copyAnnotationsOnAllVoices = function (targetPage) {
  var numberOfVoices = scoreParts.allPagesZones.numberOfVoices;
  var currentMeasure = null;
  var currentText = null;
  for (var pageKey in scoreParts.allPagesZones.pages) {
    if (targetPage == -1 || targetPage == pageKey) {
      var zones = scoreParts.allPagesZones.pages[parseInt(pageKey)];
      for (var zoneIndex = 0; zoneIndex < zones.length; zoneIndex++) {
        if (zoneIndex == 0 || zoneIndex == numberOfVoices) {
          if (zones[zoneIndex].measure) currentMeasure = zones[zoneIndex].measure;
          if (zones[zoneIndex].text) currentText = zones[zoneIndex].text;
        } else {
          if (currentMeasure) zones[zoneIndex].measure = currentMeasure;
          if (currentText) zones[zoneIndex].text = currentText;
        }
      }
    }
  }
};

scoreParts.writeCurrentPageZones = function () {
  var zones = Paper.getPageZones();
  if (zones.length == 0) {
    return;
  }
  scoreParts.currentZones = zones;
  scoreParts.allPagesZones.pages[scoreParts.currentPage] = zones;
  scoreParts.copyAnnotationsOnAllVoices(scoreParts.currentPage);
};

scoreParts.changePage = function (newPage) {
  if (newPage < 0) return;
  if (scoreParts.totalPages !== null && newPage >= scoreParts.totalPages) return;

  if (scoreParts.isEditorContext()) {
    // Capture les zones de la page courante (canvas actif) puis persiste avant de
    // changer de page. Le (re)dessin du canvas de la nouvelle page courante est
    // assuré par scorePlayer (écoute 'page-changed'), pas par un raster Paper.
    scoreParts.writeCurrentPageZones();
    saveZones(scoreParts, function (err) {
      if (err) alert(err.responseText || err);
      scoreParts.currentPage = newPage;
      loadPageSpread(newPage, function () {
        updatePageIndicators();
        emit('page-changed');
      });
    });
  } else {
    scoreParts.currentPage = newPage;
    loadPageSpread(newPage, null);
    updatePageIndicators();
    emit('page-changed');
  }
};

// Définit la page courante exacte (page tapée / cliquée) sans recharger le spread :
// la paire affichée ne change pas tant que la page reste dans le même spread.
// Met à jour l'indicateur et notifie (les mouvements démarrent/finissent ici).
scoreParts.setCurrentPage = function (pageIndex) {
  if (pageIndex < 0) return;
  if (scoreParts.totalPages !== null && pageIndex >= scoreParts.totalPages) return;
  if (scoreParts.currentPage === pageIndex) return;
  // En édition : sauve les zones de la page courante avant de basculer la page
  // courante (Paper lit le canvas actif, qui va changer).
  if (scoreParts.isEditorContext()) {
    scoreParts.writeCurrentPageZones();
    scoreParts.saveZones(function () {});
  }
  // Si la page cible n'est pas dans le spread affiché, on recharge le spread.
  var sameSpread = scoreParts.spreadOrigin(pageIndex) === scoreParts.spreadOrigin();
  scoreParts.currentPage = pageIndex;
  if (!sameSpread) loadPageSpread(pageIndex, null);
  updatePageIndicators();
  emit('page-changed');
};

// Re-render the current page(s) without navigating — used when the layout mode
// (spread <-> single page) changes on resize. Not gated like changePage.
scoreParts.reloadCurrentPage = function () {
  if (scoreParts.pdfName == null) return;
  loadPageSpread(scoreParts.currentPage, null);
};

scoreParts.nextPage = function () {
  scoreParts.changePage(scoreParts.currentPage + scoreParts.pageStep());
  $('#duplicateZonesButton').css('visibility', 'visible');
};

scoreParts.previousPage = function () {
  if (scoreParts.currentPage === 0) return;
  scoreParts.changePage(Math.max(0, scoreParts.currentPage - scoreParts.pageStep()));
  $('#duplicateZonesButton').css('visibility', 'visible');
};

scoreParts.goToPage = function () {
  var page = prompt('Aller à page numero');
  if (page) {
    var page = parseInt(page);
    scoreParts.changePage(page);
  }
};

scoreParts.restartAll = function () {
  if (confirm('recommencer tout ?')) {
    for (var pageNum in scoreParts.allPagesZones.pages) {
      scoreParts.deletePageZones(pageNum);
    }

    scoreParts.openFirstPdfPage(null, true, null);
  }
};

scoreParts.deletePageZones = function (page) {
  //  var page = $("#currentPage").val()
  scoreParts.modified = true;
  scoreParts.allPagesZones.pages[page || scoreParts.currentPage] = [];
  Paper.deleteZones();
};

// Affecte les zones données à la page courante (modèle + sélection courante) puis
// persiste. Point de commit commun aux opérations qui régénèrent une page entière
// (auto-détection, duplication). Le (re)dessin et l'émission d'événement restent UI.
scoreParts.commitCurrentPageZones = function (zones) {
  scoreParts.allPagesZones.pages[scoreParts.currentPage] = zones;
  scoreParts.currentZones = zones;
  scoreParts.modified = true;
  scoreParts.saveZones(function () {});
};

// Construit les zones d'une page à partir des systèmes détectés par l'API
// (data.topLines / interline / firstVerticalLine), en coordonnées fractionnelles
// 0→1 des dimensions naturelles du PNG. Si customHeightDisplayPx est fourni (> 0),
// la hauteur vient de ce réglage écran (converti via coefV) ; sinon elle est déduite
// de l'interligne plus un débord automatique (moitié de l'espace inter-systèmes,
// plafonné à 2 interlignes). Calcul pur, sans DOM ni mutation du modèle.
scoreParts.buildAutoDetectedZones = function (data, customHeightDisplayPx) {
  const naturalW = scoreParts.naturalW || 1;
  const naturalH = scoreParts.naturalH || 1;
  const interline = data.interline;
  const xFrac = data.firstVerticalLine / naturalW;
  const widthFrac = Math.max(0.01, 1 - 2 * xFrac);

  const autoOverflowPx =
    data.topLines.length > 1
      ? Math.min(2 * interline, Math.max(0, (data.topLines[1] - data.topLines[0] - 6 * interline) / 2))
      : interline;

  const useCustomHeight = typeof customHeightDisplayPx === 'number' && customHeightDisplayPx > 0;
  // coefV = canvasH / naturalH → fraction = displayPx / (naturalH * coefV)
  const coefV = scoreParts.coefV || 1;

  return data.topLines.map(function (topY) {
    if (useCustomHeight) {
      return {
        x: xFrac,
        y: Math.max(0, topY / naturalH),
        width: widthFrac,
        height: customHeightDisplayPx / (naturalH * coefV),
        voice: null,
        movement: scoreParts.currentMovement,
        page: scoreParts.currentPage,
      };
    }
    return {
      x: xFrac,
      y: Math.max(0, (topY - autoOverflowPx) / naturalH),
      width: widthFrac,
      height: (6 * interline + 2 * autoOverflowPx) / naturalH,
      voice: null,
      movement: scoreParts.currentMovement,
      page: scoreParts.currentPage,
    };
  });
};

// Clone les zones de la page précédente appartenant au mouvement courant, en les
// retaguant sur la page courante. Retourne le tableau cloné (vide si rien à copier).
// Ne mute pas le modèle : le commit reste au choix de l'appelant.
scoreParts.duplicatePreviousPageZones = function () {
  if (scoreParts.currentPage === 0) return [];
  const previousPage = scoreParts.currentPage - 1;
  const previousZones = (scoreParts.allPagesZones.pages[previousPage] || []).filter(
    function (zone) {
      return zone.movement === scoreParts.currentMovement;
    }
  );
  return previousZones.map(function (zone) {
    return Object.assign({}, zone, { page: scoreParts.currentPage });
  });
};

scoreParts.setMessage = function (message, color) {
  $('#message').css('visibility', 'visible');
  if (!color) {
    color = 'black';
  }
  $('#message').css('color', color);
  $('#message').html(message);
};

// Remplit le mouvement courant. Le nom est fourni par le composant headerBar
// (champ mvt-edit) — plus de prompt ni de dialog. Les zones dessinées ensuite
// sont taguées avec ce mouvement via paper.js (scoreParts.currentMovement).
scoreParts.fillMovement = function (movementName) {
  if (!movementName) {
    return;
  }
  scoreParts.currentMovement = movementName;
  scoreParts.writeCurrentPageZones();
  scoreParts.modified = true;
};

// Persiste les zones (wrapper exposé : saveZones est interne au module).
scoreParts.saveZones = function (callback) {
  scoreParts.modified = true;
  saveZones(scoreParts, function (err) {
    if (err) {
      alert(err.responseText || err);
    }
    if (callback) callback(err);
  });
};

// Renomme un mouvement : retague toutes les zones (toutes pages) de l'ancien nom
// vers le nouveau, rafraîchit le canvas courant pour rester cohérent, puis sauve.
scoreParts.renameMovement = function (oldName, newName) {
  if (!oldName || !newName || oldName === newName) {
    return;
  }
  // Capture l'état du canvas courant avant de muter le modèle.
  scoreParts.writeCurrentPageZones();
  retagZonesMovement(oldName, newName);
  scoreParts.currentMovement = newName;
  refreshCurrentPageCanvas();
  scoreParts.saveZones();
};

// Supprime un mouvement : retire toutes ses zones (toutes pages), rafraîchit le
// canvas courant, puis sauve.
scoreParts.deleteMovement = function (movementName) {
  if (!movementName) {
    return;
  }
  scoreParts.writeCurrentPageZones();
  removeZonesOfMovement(movementName);
  if (scoreParts.currentMovement === movementName) {
    scoreParts.currentMovement = '';
  }
  refreshCurrentPageCanvas();
  scoreParts.saveZones();
};

// Supprime toutes les zones affectées à une voix (toutes pages) et sauve.
// Le redraw visuel du spread est délégué à zones-changed (Paper.redrawSpread).
scoreParts.deleteVoiceZones = function (voiceId) {
  if (!voiceId) {
    return;
  }
  scoreParts.writeCurrentPageZones();
  var pages = scoreParts.allPagesZones.pages;
  for (var pageKey in pages) {
    pages[pageKey] = pages[pageKey].filter(function (zone) {
      return zone.voice !== voiceId;
    });
  }
  scoreParts.saveZones();
};

// Auto-attribution des voix aux zones (dérivé v1 : onSelectVoice/getDistinctVoices).
// Sur chaque page, les zones du mouvement (triées haut→bas) sont taguées de façon
// cyclique : zone[j] → voiceIds[j % n] (ordre voix-par-système, comme la v1).
// movementName falsy → on tague toutes les zones quel que soit le mouvement.
scoreParts.assignVoicesToZones = function (voiceIds, movementName) {
  if (!voiceIds || voiceIds.length === 0) {
    return;
  }
  // Flush les deux pages visibles du spread (pas seulement la courante) : sinon
  // les zones dessinées sur l'autre page visible ne sont pas dans le modèle au
  // moment de l'attribution et restent sans voix.
  Paper.writeVisibleSpreadZones();
  var voiceCount = voiceIds.length;
  var pages = scoreParts.allPagesZones.pages;
  for (var pageKey in pages) {
    var movementZones = (pages[pageKey] || [])
      .filter(function (zone) {
        return !movementName || zone.movement === movementName;
      })
      .sort(function (a, b) {
        return a.y - b.y;
      });
    movementZones.forEach(function (zone, zoneIndex) {
      zone.voice = voiceIds[zoneIndex % voiceCount];
    });
  }
  // Le redraw visuel du spread est délégué à zones-changed (Paper.redrawSpread).
  scoreParts.saveZones();
};

// Nombre de zones affectées à une voix (toutes pages). Lecture seule sur le
// modèle : ne PAS flush le canvas ici. Ce compteur est appelé sur 'voices-changed'
// (renderVoices/renderProgress), parfois AVANT que le canvas reflète une mutation
// faite directement sur le modèle (ex. assignVoicesToZones). Un flush canvas→modèle
// à ce moment relirait un canvas périmé et écraserait l'attribution. Le modèle est
// déjà à jour : chaque geste (création/déplacement/suppression) fait commit().
scoreParts.countVoiceZones = function (voiceId) {
  var pages = scoreParts.allPagesZones.pages;
  var total = 0;
  for (var pageKey in pages) {
    pages[pageKey].forEach(function (zone) {
      if (zone.voice === voiceId) total += 1;
    });
  }
  return total;
};

// Toutes les zones d'une voix, groupées par page : { pages: { <pageIndex>: [...] } }.
// Format attendu par generateVoiceScore / le backend generatePart.
scoreParts.voicePagesZones = function (voiceId) {
  scoreParts.writeCurrentPageZones();
  var pages = scoreParts.allPagesZones.pages;
  var result = { pages: {} };
  for (var pageKey in pages) {
    var voiceZones = pages[pageKey].filter(function (zone) {
      return zone.voice === voiceId;
    });
    if (voiceZones.length) result.pages[pageKey] = voiceZones;
  }
  return result;
};

// Zones de PLUSIEURS voix combinées (partition complète des voix actives),
// groupées par page en conservant l'ordre naturel des zones dans chaque page.
scoreParts.combinedPagesZones = function (voiceIds) {
  scoreParts.writeCurrentPageZones();
  var voiceIdSet = {};
  voiceIds.forEach(function (voiceId) {
    voiceIdSet[voiceId] = true;
  });
  var pages = scoreParts.allPagesZones.pages;
  var result = { pages: {} };
  for (var pageKey in pages) {
    var combinedZones = pages[pageKey].filter(function (zone) {
      return voiceIdSet[zone.voice];
    });
    if (combinedZones.length) result.pages[pageKey] = combinedZones;
  }
  return result;
};

function retagZonesMovement(oldName, newName) {
  var pages = scoreParts.allPagesZones.pages;
  for (var pageKey in pages) {
    pages[pageKey].forEach(function (zone) {
      if (zone.movement === oldName) {
        zone.movement = newName;
      }
    });
  }
}

function removeZonesOfMovement(movementName) {
  var pages = scoreParts.allPagesZones.pages;
  for (var pageKey in pages) {
    pages[pageKey] = pages[pageKey].filter(function (zone) {
      return zone.movement !== movementName;
    });
  }
}

// Redessine les zones de la page courante depuis allPagesZones (éditeur seulement).
// Sans ça, le canvas garderait les anciennes zones et writeCurrentPageZones les
// réécrirait par-dessus la mutation du modèle.
function refreshCurrentPageCanvas() {
  if (!scoreParts.isEditorContext()) {
    return;
  }
  Paper.redrawCurrentPage();
}

scoreParts.getInfos = function () {
  scoreParts.setMessage(
    "logiciel open source de découpage de partition sous licence MIT <br><a href='mailto://claude.fauconnet@neuf.fr'>Claude Fauconnet</a><br><a href='https://github.com/claudefauconnet/scoreparts'>Source</a>"
  );
};

scoreParts.clearMeasures = function () {
  var zonesWithMeasures = [];
  scoreParts.modified = true;
  for (var page in scoreParts.allPagesZones.pages) {
    scoreParts.allPagesZones.pages[parseInt(page)].forEach(function (zone) {
      if (zone.movement == scoreParts.currentMovement) {
        delete zone.measure;
      }
    });
  }

  saveZones(scoreParts, function (err) {
    if (err) {
      alert(err.responseText || err);
    }
  });
};
