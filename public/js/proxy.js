var Proxy = (function () {
  self.listScores = function () {
    $('#scoresSelect').find('option').remove();
    var payload = {
      listScores: 1,
    };
    $.ajax({
      type: 'POST',
      url: './api/score/list',
      data: payload,
      dataType: 'json',
      success: function (data, textStatus, jqXHR) {
        data.splice(0, 0, '');
        for (var i = 0; i < data.length; i++) {
          item = data[i].replace('.pdf', '');
          $('#scoresSelect').append(
            $('<option>', {
              text: item,
              value: item,
            })
          );
        }
      },
      error: function (err) {
        console.log(err);
      },
    });
  };

  self.uploadFormData = function () {
    var form = $('#uploadForm')[0];
    var formData = new FormData(form);
    $('#waitImg').css('visibility', 'visible');
    scoreParts.setMessage(
      'import en cours <br>cela peut prendre plusieurs minutes, <br>merci de patienter ...',
      'blue'
    );
    $.ajax({
      url: './api/pdf/upload',
      data: formData,
      type: 'POST',
      contentType: false, // NEEDED, DON'T OMIT THIS (requires jQuery 1.6+)
      processData: false, // NEEDED, DON'T OMIT THIS
      success: function (data, textStatus, jqXHR) {
        $('#waitImg').css('visibility', 'hidden');
        if (data.bigFile) {
          return alert(
            'fichier trop gros ' + Math.round(data.bigFile / 1000000) + ' mo, maximum :10Mo'
          );
          scoreParts.setMessage('big file ' + data.bigFile);
        }
        var durationStr = 'durée :' + Math.round(data.duration / 1000) + 'sec.';
        var message =
          'Import terminé ' + durationStr + ' pages,<br> vous pouvez commencer le découpage';

        scoreParts.setMessage(message, 'blue');
        var xx = data;
        $('#scoresSelect').append(
          $('<option>', {
            text: data.pdfName,
            value: data.pdfName,
            selected: 'selected',
          })
        );

        scoreParts.openFirstPdfPage(message);
        document.getElementById('pdfFileInput').value = '';
      },
      error: function (err) {
        $('#waitImg').css('visibility', 'hidden');
        scoreParts.setMessage("ERREUR lors del'import" + err.responseText, 'red');
        document.getElementById('pdfFileInput').value = '';
      },
    });
  };

  self.generateInstrumentScore = function (part, selectedZones, callback) {
    if (!selectedZones) {
      var page = scoreParts.currentPage;
      var zones = Paper.getPageZones();
      scoreParts.currentZones = zones;
      scoreParts.allPagesZones.pages[page] = zones;
      selectedZones = scoreParts.allPagesZones.pages;
    }

    ZonesChecker.checkZones(function (message) {
      if (message) {
        return alert(message);
      }

      if (!scoreParts.currentMovement) {
        scoreParts.currentMovement = $('#movementSelect').val();
        if (!scoreParts.currentMovement) {
          return alert('selectionnez un mouvement ou declarez le');
        }
      }

      if (!part || part == '') {
        return alert(' selectionnez une voix');
      }
      scoreParts.setMessage(
        '  La partie est en cours de génération , merci de patienter ...',
        ' blue'
      );
      $('body').css('cursor', 'progress');
      var pdfName = $('#scoresSelect').val();

      var movementName = self.getPdfMovementName();
      var zonesStr = JSON.stringify(selectedZones);
      var payload = {
        generatePart: 1,
        part: part,
        margin: scoreParts.margin,
        sourcePdfName: pdfName,
        zonesStr: zonesStr,
        imgScaleCoefV: scoreParts.coefV,
        imgScaleCoefH: scoreParts.coefH,
        targetPdfName: movementName,
      };

      $('#waitImg').css('visibility', 'visible');
      $.ajax({
        type: 'POST',
        url: './api/score/generatePart',
        data: payload,
        dataType: 'json',
        success: function (data, textStatus, jqXHR) {
          $('#waitImg').css('visibility', 'hidden');

          if (callback) {
            return callback(null, data.result);
          }

          $('#duplicateZonesButton2').css('visibility', 'visible');
          var message =
            'la partition ' +
            part +
            " est générée , <a target='_blanck' href='" +
            document.location.href +
            data.result +
            "'>télécharger</a>";
          message +=
            "<br> pour l'imprimer pensez à cocher l'option 'ajuster à la page' dans les paramètres d'impression ";
          scoreParts.setMessage(message, 'blue');

          $('body').css('cursor', 'default');
        },
        error: function (err) {
          alert(err.responseText);
          $('#waitImg').css('visibility', 'hidden');
          scoreParts.setMessage(err, 'red');
          if (callback) {
            return callback(err);
          }
        },
      });
    });
  };
  self.getPdfMovementName = function () {
    var str = scoreParts.allPagesZones.title + '_' + scoreParts.currentMovement;
    return str.replace(/[ \.]/g, '-');
  };

  self.createZip = function (callback) {
    var movementDirName = self.getPdfMovementName();
    var payload = {
      createZip: 1,
      movementDirName: movementDirName,
    };

    $('#waitImg').css('visibility', 'visible');
    $.ajax({
      type: 'POST',
      url: './api/score/createZip',
      data: payload,
      dataType: 'json',
      success: function (data, textStatus, jqXHR) {
        $('#waitImg').css('visibility', 'hidden');

        if (callback) {
          return callback(null, data.zipPath);
        }
        var link =
          "<a target='_blanck' href='" +
          document.location.href +
          data.zipPath +
          "'>télécharger</a>";
        $('#voices_zipLinkDiv').html(link);
      },
      error: function (err) {
        $('#waitImg').css('visibility', 'hidden');
        scoreParts.setMessage(err, 'red');
        if (callback) {
          return callback(err);
        }
      },
    });
  };

  self.autoDetectPageZones = function (callback) {
    if (!scoreParts.currentMovement) {
      return alert('selectionnez ou déclarer un mouvement');
    }

    var pdfName = $('#scoresSelect').val();
    var payload = {
      findPageZones: 1,
      pdfName: pdfName,
      pageNum: scoreParts.currentPage,
    };

    $('#waitImg').css('visibility', 'visible');
    $.ajax({
      type: 'POST',
      url: './api/score/findPageZones',
      data: payload,
      dataType: 'json',
      success: function (data, textStatus, jqXHR) {
        if (callback) {
          return callback(null, data);
        }

        Paper.drawAutoDetectedZones(data);
      },
      error: function (err) {
        $('#waitImg').css('visibility', 'hidden');
        scoreParts.setMessage(err, 'red');
      },
    });
  };
  self.saveZones = function (callback) {
    if (!scoreParts.pdfName || !scoreParts.modified) {
      return callback(null);
    }

    var pdfName = scoreParts.pdfName;

    var margin = parseInt($('#zoneMargin').val());
    var zonesStr = JSON.stringify(scoreParts.allPagesZones);
    var movementStr = '';

    var payload = {
      saveZones: 1,
      fileName: pdfName + '_zones.json',
      zonesStr: zonesStr,
    };

    $('#waitImg').css('visibility', 'visible');
    $.ajax({
      type: 'POST',
      url: './api/score/saveZones',
      data: payload,
      dataType: 'json',
      success: function (data, textStatus, jqXHR) {
        scoreParts.modified = false;
        $('#waitImg').css('visibility', 'hidden');
        if (callback) {
          callback();
        }
      },
      error: function (err) {
        $('#waitImg').css('visibility', 'hidden');
        if (callback) {
          callback(err);
        }
        scoreParts.setMessage(err, 'red');
      },
    });
  };

  self.loadZones = function (callback) {
    var pdfName = scoreParts.pdfName;
    //  var pdfName = $('#scoresSelect').val();
    var payload = {
      loadZones: 1,
      fileName: pdfName + '_zones.json',
    };

    $('#waitImg').css('visibility', 'visible');
    $.ajax({
      type: 'POST',
      url: './api/score/loadZones',
      data: payload,
      dataType: 'json',
      success: function (data, textStatus, jqXHR) {
        $('#waitImg').css('visibility', 'hidden');
        var data = JSON.parse(data.result);
        /*  for (var page in data.pages) {
                      var pageNum=parseInt(page)
                      if(pageNum <10)
                      data.pages[""+pageNum]=data.pages[""+pageNum+1]
                  }*/

        /*   for (var page in data.pages){
                       data.pages[page].forEach(function(zone){
                           var leftMargin=Math.max(zone.x,scoreParts.margin)
                           zone.x=leftMargin;
                           zone.w=Paper.imageWidth-(2*scoreParts.margin);
                       })
                   }*/

        if (callback) {
          return callback(null, data);
        }

        scoreParts.allPagesZones = data;
      },
      error: function (err) {
        $('#waitImg').css('visibility', 'hidden');
        if (callback) {
          return callback(err);
        }
        scoreParts.setMessage(err, 'red');
      },
    });
  };

  return self;
})();
