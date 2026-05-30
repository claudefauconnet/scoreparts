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
