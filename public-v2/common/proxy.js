export function loadMyScores(callback) {
  $.ajax({
    type: 'POST',
    url: '/api/score/list',
    dataType: 'json',
    success: function (scores) {
      callback(null, Array.isArray(scores) ? scores : []);
    },
    error: function (err) {
      callback(err);
    },
  });
}

export function deleteScore(scoreName, callback) {
  $.ajax({
    type: 'DELETE',
    url: '/api/score/delete/' + encodeURIComponent(scoreName),
    dataType: 'json',
    success: function () {
      callback(null);
    },
    error: function (err) {
      callback(err);
    },
  });
}

export function loadScoreInfos(scoreName, callback) {
  $.ajax({
    type: 'GET',
    url: '/api/pdf/scoreInfos/' + encodeURIComponent(scoreName),
    dataType: 'json',
    success: function (data) {
      callback(null, data);
    },
    error: function (err) {
      callback(err);
    },
  });
}

export function saveScoreInfos(scoreName, infos, callback) {
  $.ajax({
    type: 'PUT',
    url: '/api/pdf/scoreInfos/' + encodeURIComponent(scoreName),
    contentType: 'application/json',
    data: JSON.stringify(infos),
    dataType: 'json',
    success: function () {
      callback(null);
    },
    error: function (err) {
      callback(err);
    },
  });
}

export function saveZones(scoreParts, callback) {
  if (!scoreParts.pdfName || !scoreParts.modified) {
    return callback(null);
  }
  $.ajax({
    type: 'POST',
    url: '/api/score/saveZones',
    data: {
      saveZones: 1,
      fileName: scoreParts.pdfName + '_zones.json',
      zonesStr: JSON.stringify(scoreParts.allPagesZones),
    },
    dataType: 'json',
    success: function () {
      scoreParts.modified = false;
      callback(null);
    },
    error: function (err) {
      callback(err);
    },
  });
}

export function loadZones(scoreParts, callback) {
  $.ajax({
    type: 'POST',
    url: '/api/score/loadZones',
    data: {
      loadZones: 1,
      fileName: scoreParts.pdfName + '_zones.json',
    },
    dataType: 'json',
    success: function (data) {
      callback(null, JSON.parse(data.result));
    },
    error: function (err) {
      callback(err);
    },
  });
}

// Génère le PDF d'UNE voix : le backend (POST /api/score/generatePart) découpe la
// partition source selon les zones de la voix et renvoie le chemin du PDF.
// Version v2 (sans DOM v1) : tous les paramètres sont passés explicitement.
//   part         = libellé de la voix (nom affiché / nom de fichier)
//   pagesZones   = { pages: { <pageIndex>: [zone, ...] } } limité à cette voix
export function generateVoiceScore(
  { sourcePdfName, targetPdfName, part, pagesZones, margin, naturalW, naturalH },
  callback
) {
  $.ajax({
    type: 'POST',
    url: '/api/score/generatePart',
    data: {
      part: part,
      margin: margin,
      sourcePdfName: sourcePdfName,
      zonesStr: JSON.stringify(pagesZones),
      naturalW: naturalW,
      naturalH: naturalH,
      targetPdfName: targetPdfName,
    },
    dataType: 'json',
    success: function (data) {
      callback(null, data.result);
    },
    error: function (err) {
      callback(err);
    },
  });
}

export function createZip(movementDirName, callback) {
  $.ajax({
    type: 'POST',
    url: '/api/score/createZip',
    data: { movementDirName },
    dataType: 'json',
    success: function (data) {
      callback(null, data);
    },
    error: function (err) {
      callback(err);
    },
  });
}

export function findPageZones(pdfName, pageNum, callback) {
  $.ajax({
    type: 'POST',
    url: '/api/score/findPageZones',
    data: { findPageZones: 1, pdfName, pageNum },
    dataType: 'json',
    success: function (data) {
      callback(null, data);
    },
    error: function (err) {
      callback(err);
    },
  });
}

export function uploadPdf({ formData, onUploadProgress }, callback) {
  $.ajax({
    type: 'POST',
    url: '/api/pdf/upload',
    data: formData,
    contentType: false,
    processData: false,
    xhr: function () {
      const xhr = $.ajaxSettings.xhr();
      if (onUploadProgress) {
        xhr.upload.addEventListener('progress', function (e) {
          if (e.lengthComputable) onUploadProgress(e.loaded / e.total);
        });
      }
      return xhr;
    },
    success: function (data) {
      callback(null, data);
    },
    error: function (jqXHR) {
      callback(new Error('HTTP ' + jqXHR.status));
    },
  });
}
