import { Paper } from './paper.js';
import { Voices } from './voices.js';
import { Common } from './common.js';
import { saveZones, loadZones, loadScoreInfos } from './proxy.js';
import { emit } from '../modules/partitions.state.js';

export const scoreParts = {};

scoreParts.allPagesZones = { pages: {}, title: '' };
scoreParts.currentZones = [];
scoreParts.modified = false;

scoreParts.totalPages = null;

// When true, the viewer shows one page at a time (small screens) instead of a
// 2-page spread. Editor (Paper) context never sets this, so it stays a spread.
scoreParts.singlePage = false;

scoreParts.getTotalPages = function () {
  return scoreParts.totalPages;
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
    container.innerHTML = '';
    container.appendChild(img);
    if (callback) callback();
  };
  img.onerror = function () {
    if (callback) callback();
  };
  img.src = src;
};

function updatePageIndicators() {
  var displayPage = scoreParts.currentPage + 1;
  $('#page').html(' ' + displayPage);
  $('#page-input').val(displayPage);
}

function loadPageSpread(pageIndex, callback) {
  var leftSrc = imagesDir + scoreParts.pdfName + '/' + pageIndex + '.png';
  scoreParts.loadImageIntoContainer(leftSrc, 'systems-left', callback);
  if (scoreParts.singlePage) {
    var rightContainer = document.getElementById('systems-right');
    if (rightContainer) rightContainer.innerHTML = '';
    return;
  }
  var rightSrc = imagesDir + scoreParts.pdfName + '/' + (pageIndex + 1) + '.png';
  scoreParts.loadImageIntoContainer(rightSrc, 'systems-right', null);
}

scoreParts.openFirstPdfPage = function (pdfname, clearAll, onBothSettled) {
  var pdfName = pdfname;
  if (!pdfName) return;
  scoreParts.pdfName = pdfName;
  scoreParts.currentPage = 0;

  loadScoreInfos(pdfName, function (err, infos) {
    if (!err && infos && infos.totalPages) {
      scoreParts.totalPages = infos.totalPages;
      $('#page-total').text('/ ' + infos.totalPages);
    }
  });

  // Editor (v1 canvas) is identified by the paper.js canvas; the v2 viewer has
  // none and renders zones via the DOM, so it uses the simple page-load path.
  var isEditorContext = !!document.getElementById('myCanvas');

  if (!isEditorContext) {
    loadPageSpread(0, function () {
      emit('score-loaded');
      if (onBothSettled) onBothSettled();
    });
    return;
  }

  document.addEventListener('contextmenu', (e) => e.preventDefault());

  scoreParts.writeCurrentPageZones();

  saveZones(scoreParts, function (err) {
    if (err) {
      alert(err.responseText || err);
    }

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
      loadPageSpread(0, onBothSettled);
      updatePageIndicators();
      emit('score-loaded');
    });
  });
};

scoreParts.writeCurrentPageZones = function () {
  var zones = Paper.getPageZones();
  if (zones.length == 0) {
    return;
  }
  scoreParts.currentZones = zones;
  scoreParts.allPagesZones.pages[scoreParts.currentPage] = zones;
  Voices.copyAnnotationsOnAllVoices(scoreParts.currentPage);
};

scoreParts.changePage = function (newPage) {
  if (newPage < 0) return;
  if (scoreParts.totalPages !== null && newPage >= scoreParts.totalPages) return;

  // Editor (v1 canvas) is identified by the paper.js canvas; the v2 viewer has
  // none and renders zones via the DOM, so it uses the simple page-load path.
  var isEditorContext = !!document.getElementById('myCanvas');

  if (isEditorContext) {
    scoreParts.writeCurrentPageZones();
    saveZones(scoreParts, function (err) {
      if (err) alert(err.responseText || err);
      scoreParts.currentPage = newPage;
      Paper.drawImage(imagesDir + scoreParts.pdfName + '/' + scoreParts.currentPage + '.png');
      var zones = scoreParts.allPagesZones.pages[scoreParts.currentPage];
      if (zones && zones.length > 0) {
        scoreParts.currentZones = zones;
        Paper.drawZones(zones);
      }
      loadPageSpread(newPage, null);
      updatePageIndicators();
    });
  } else {
    scoreParts.currentPage = newPage;
    loadPageSpread(newPage, null);
    updatePageIndicators();
    emit('page-changed');
  }
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

scoreParts.repeatZonesFromPreviousPage = function (detect) {
  // from previous page

  Proxy.autoDetectPageZones(function (err, data) {
    var newZones = [];
    var zoneHeights = [];
    var zoneVoices = [];
    scoreParts.currentZones.forEach(function (zone, index) {
      if (data.topLines[index]) {
        zoneHeights.push(zone.height);
        zoneVoices.push(zone.voice || null);
      }
    });
    Paper.drawAutoDetectedZones(data, zoneHeights, zoneVoices);
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

scoreParts.openMovementDialog = function () {
  var html =
    ' <div style=\'backgRound-color:#90d6e4\'> Mouvement: <select id="movementSelect"> </select></html>';
  $('#mainDialogDiv').html(html);

  $('#mainDialogDiv').dialog('open');
  var movements = ['', 'Nouveau'];
  for (var page in scoreParts.allPagesZones.pages) {
    scoreParts.allPagesZones.pages[page].forEach(function (zone) {
      if (zone.movement && movements.indexOf(zone.movement) < 0) {
        movements.push(zone.movement);
      }
    });
  }

  Common.fillSelectOptions('movementSelect', movements, false);
};

scoreParts.onSelectMovement = function () {
  var movement = $('#movementSelect').val();
  if (!movement) {
    return;
  }
  if (movement == 'Nouveau') {
    // Un mouvement doit toujours avoir un nom : on force la saisie jusqu'à
    // obtenir un nom non vide (force mode), sinon on annule la création.
    var movementName = '';
    while (!movementName) {
      movementName = (prompt('nom du mouvement') || '').trim();
      if (movementName === '' && !confirm('Le mouvement doit avoir un nom. Réessayer ?')) {
        $('#movementSelect').val('');
        return;
      }
    }
    movement = movementName;
    $('#movementSelect').append(
      $('<option>', {
        value: movement,
        text: movement,
      })
    );
    $('#movementSelect').val(movement);
  }

  scoreParts.currentMovement = movement;
  var stop = false;
  var movementPage = 0;
  for (var page in scoreParts.allPagesZones.pages) {
    scoreParts.allPagesZones.pages[page].forEach(function (zone) {
      if (!stop && zone.movement == scoreParts.currentMovement) {
        movementPage = zone.page;
        return (stop = true);
      }
    });
  }
  scoreParts.writeCurrentPageZones();
  scoreParts.modified = true;
  scoreParts.changePage(parseInt(movementPage));
  $('#movementSpan').html(scoreParts.currentMovement);
  $('#mainDialogDiv').dialog('close');
};

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

// Délégation jQuery — remplace onchange="scoreParts.onSelectMovement()" de la v1.
$(document).on('change', '#movementSelect', function () {
  scoreParts.onSelectMovement();
});
