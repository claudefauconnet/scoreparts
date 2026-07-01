// Accès aux données de l'app. Le backend Express a été retiré : tout est stocké
// localement dans IndexedDB (voir localDb.js). Les signatures (callback Node-style
// err-first) restent identiques aux anciennes routes pour que les appelants ne
// changent pas — seule l'implémentation passe du réseau au stockage local.
import {
  getAllScores,
  getScore,
  updateScore,
  putScore,
  deleteScore as dbDeleteScore,
  getZones,
  putZones,
  putPdf,
  putPages,
} from './localDb.js';

// Nom canonique d'une partition dérivé du nom de fichier : extension retirée,
// espaces → underscores. Sert d'identité unique (clé IndexedDB) ET de nom utilisé
// par l'UI à l'ouverture — les deux DOIVENT coïncider, sinon les pages/zones sont
// introuvables. Source unique pour l'import et le stockage.
export function toScoreName(fileName) {
  return fileName.replace(/\.[^.]+$/, '').replace(/ /g, '_');
}

export function loadMyScores(callback) {
  getAllScores()
    .then(function (scores) {
      callback(null, Array.isArray(scores) ? scores : []);
    })
    .catch(function (error) {
      callback(error);
    });
}

export function deleteScore(scoreName, callback) {
  dbDeleteScore(scoreName)
    .then(function () {
      callback(null);
    })
    .catch(function (error) {
      callback(error);
    });
}

export function loadScoreInfos(scoreName, callback) {
  getScore(scoreName)
    .then(function (infos) {
      callback(null, infos);
    })
    .catch(function (error) {
      callback(error);
    });
}

export function saveScoreInfos(scoreName, infos, callback) {
  updateScore(scoreName, infos)
    .then(function () {
      callback(null);
    })
    .catch(function (error) {
      callback(error);
    });
}

export function saveZones(scoreParts, callback) {
  if (!scoreParts.pdfName || !scoreParts.modified) {
    return callback(null);
  }
  putZones(scoreParts.pdfName, scoreParts.allPagesZones)
    .then(function () {
      scoreParts.modified = false;
      callback(null);
    })
    .catch(function (error) {
      callback(error);
    });
}

export function loadZones(scoreParts, callback) {
  getZones(scoreParts.pdfName)
    .then(function (allPagesZones) {
      // Pas de zones persistées → signalé en erreur pour que l'appelant initialise
      // un modèle vierge (comportement de l'ancienne route quand le fichier manquait).
      if (!allPagesZones) {
        return callback(new Error('zones not found'));
      }
      callback(null, allPagesZones);
    })
    .catch(function (error) {
      callback(error);
    });
}

// Persiste le PDF source + les PNG rendus côté client (pdfjs) dans IndexedDB, et
// crée l'enregistrement d'infos de la partition. Remplace l'upload réseau vers le
// serveur. Le nom de la partition est dérivé du fichier (extension retirée,
// espaces → underscores), à l'identique de l'ancienne route /api/pdf/uploadImages.
export function uploadRenderedScore({ pdfFile, pageBlobs, onUploadProgress }, callback) {
  const pdfName = toScoreName(pdfFile.name);

  Promise.all([
    putPdf(pdfName, pdfFile),
    putPages(pdfName, pageBlobs),
    putScore({
      pdfName: pdfName,
      totalPages: pageBlobs.length,
      composer: null,
      published: false,
      movements: [],
    }),
  ])
    .then(function () {
      if (onUploadProgress) onUploadProgress(1);
      callback(null, { pages: pageBlobs.length, pdfName: pdfName });
    })
    .catch(function (error) {
      callback(error);
    });
}
