// Globals externes attendus : `$` (jQuery), `Proxy` (proxy v1 fournissant
// saveZones / loadZones / autoDetectPageZones — pas encore porté dans common/proxy.js).
import { Paper } from './paper.js';
import { Voices } from './voices.js';
import { Common } from './common.js';

export const scoreParts = {};

scoreParts.allPagesZones = { pages: {}, title: '' };
scoreParts.currentZones = [];
scoreParts.modified = false;

var imagesDir = './data/images/';

scoreParts.openFirstPdfPage = function (clearAll) {
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  scoreParts.writeCurrentPageZones();

  Proxy.saveZones(function (err) {
    if (err) {
      alert(err.responseText || err);
    }

    var pdfName = $('#scoresSelect').val();
    // $("#scoresSelect").val(pdfName);
    if (pdfName == '') {
      return;
    }
    scoreParts.pdfName = pdfName;
    Paper.deleteZones();

    Proxy.loadZones(function (err, data) {
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

      var pageImage = imagesDir + pdfName + '-0.png';
      //  Paper.drawImage(pageImage)

      scoreParts.voices = [];
      scoreParts.currentPage = 0;
      scoreParts.changePage(scoreParts.currentPage);
      $('#page').html(' ' + (scoreParts.currentPage + 1));
      //  $('#controlPanelDiv').css('visibility', 'visible');
      var message = '';
      message +=
        "<ul> <li>pour créer une zone de découpage : clic sur le milieu d'une portée</li>";
      message += '<li>pour effacer une zone : clic+Alt sur la zone</li>';
      message += '<li>pour déplacer une zone : glisser sur la zone avec la souris</li>';
      message += "<li>pour déplacer toutes les zones d'une page  : clic+Ctl sur une zone</li>";
      message +=
        '<li>Une fois le découpage terminé sur toutes les pages, cliquer sur le bouton "générer voix (pdf)"</li>';
      message += '<ul> ';
      scoreParts.setMessage(message, 'blue');
      scoreParts.margin = parseInt($('#zoneMargin').val()) || 10;

      scoreParts.openMovementDialog();
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

scoreParts.changePage = function (newPage, forceSave) {
  // to be done
  scoreParts.writeCurrentPageZones();

  Proxy.saveZones(function (err) {
    if (err) {
      alert(err.responseText || err);
    }

    scoreParts.currentPage = newPage;
    var name = $('#scoresSelect').val() + '-' + scoreParts.currentPage;

    Paper.drawImage(imagesDir + name + '.png');
    var zones = scoreParts.allPagesZones.pages[scoreParts.currentPage];
    if (zones && zones.length > 0) {
      scoreParts.currentZones = zones;
      Paper.drawZones(zones);
    }

    $('#page').html(' ' + (scoreParts.currentPage + 1));
  });
};

scoreParts.nextPage = function () {
  scoreParts.changePage(scoreParts.currentPage + 1);

  $('#duplicateZonesButton').css('visibility', 'visible');
};
scoreParts.previousPage = function () {
  if (scoreParts.currentPage == 0) {
    return;
  }

  scoreParts.changePage(scoreParts.currentPage - 1);
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

    scoreParts.openFirstPdfPage(true);
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
    var movement = prompt('nom du mouvement');
    if (!movement) {
      return;
    }
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

  Proxy.saveZones(function (err) {
    if (err) {
      alert(err.responseText || err);
    }
  });
};

// Délégation jQuery — remplace onchange="scoreParts.onSelectMovement()" de la v1.
$(document).on('change', '#movementSelect', function () {
  scoreParts.onSelectMovement();
});
