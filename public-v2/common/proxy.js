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
