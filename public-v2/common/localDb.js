// Stockage local unique de l'app (remplace le backend Express + le filesystem).
// Tout vit dans IndexedDB sous forme d'enregistrements structurés (objets / Blobs),
// jamais de JSON sérialisé : les zones et les infos sont des objets, le PDF et les
// pages des Blobs.
//
// Stores (DB « scoreparts », v1) :
//   scores  (key pdfName)         → infos de la partition
//                                   { pdfName, totalPages, composer,
//                                     published, movements, voices }
//   zones   (key pdfName)         → { pdfName, allPagesZones }  (objet, pas string)
//   pdfs    (key pdfName)         → { pdfName, blob }           PDF source
//   pages   (key [pdfName, page]) → { pdfName, page, blob }     une image PNG par page
//   backups (key id auto-incr)    → { id, pdfName, createdAt, scoreInfos,
//                                     allPagesZones }            snapshot à l'ouverture
//                                   index 'pdfName' ; max 30 snapshots par partition.

const DB_NAME = 'scoreparts';
const DB_VERSION = 3;
const STORE_SCORES = 'scores';
const STORE_ZONES = 'zones';
const STORE_PDFS = 'pdfs';
const STORE_PAGES = 'pages';
const STORE_BACKUPS = 'backups';

// Nombre maximum de snapshots conservés par partition (les plus anciens sont purgés).
const MAX_BACKUPS_PER_SCORE = 30;

let dbPromise = null;

function withoutCategory(scoreInfos) {
  if (!scoreInfos) return scoreInfos;
  const sanitizedScoreInfos = Object.assign({}, scoreInfos);
  delete sanitizedScoreInfos.category;
  return sanitizedScoreInfos;
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(function (resolve, reject) {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function () {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SCORES)) {
        db.createObjectStore(STORE_SCORES, { keyPath: 'pdfName' });
      }
      if (!db.objectStoreNames.contains(STORE_ZONES)) {
        db.createObjectStore(STORE_ZONES, { keyPath: 'pdfName' });
      }
      if (!db.objectStoreNames.contains(STORE_PDFS)) {
        db.createObjectStore(STORE_PDFS, { keyPath: 'pdfName' });
      }
      if (!db.objectStoreNames.contains(STORE_PAGES)) {
        db.createObjectStore(STORE_PAGES, { keyPath: ['pdfName', 'page'] });
      }
      if (!db.objectStoreNames.contains(STORE_BACKUPS)) {
        const backupStore = db.createObjectStore(STORE_BACKUPS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        backupStore.createIndex('pdfName', 'pdfName', { unique: false });
      }
      const scoreStore = request.transaction.objectStore(STORE_SCORES);
      scoreStore.openCursor().onsuccess = function (event) {
        const cursor = event.target.result;
        if (!cursor) return;
        if (Object.prototype.hasOwnProperty.call(cursor.value, 'category')) {
          cursor.update(withoutCategory(cursor.value));
        }
        cursor.continue();
      };
    };
    request.onsuccess = function () {
      resolve(request.result);
    };
    request.onerror = function () {
      reject(request.error);
    };
  });
  return dbPromise;
}

// Promesse résolue quand la transaction est entièrement flushée sur le disque.
function transactionDone(transaction) {
  return new Promise(function (resolve, reject) {
    transaction.oncomplete = function () {
      resolve();
    };
    transaction.onabort = function () {
      reject(transaction.error);
    };
    transaction.onerror = function () {
      reject(transaction.error);
    };
  });
}

// Promesse pour une requête de lecture unique (get / getAll).
function requestResult(request) {
  return new Promise(function (resolve, reject) {
    request.onsuccess = function () {
      resolve(request.result);
    };
    request.onerror = function () {
      reject(request.error);
    };
  });
}

// Plage de clés couvrant toutes les pages d'un même pdfName. Les clés sont des
// tableaux [pdfName, page] : [pdfName] est inférieur à tout [pdfName, <number>]
// (tableau plus court = plus petit), et [pdfName, []] est supérieur à tout
// [pdfName, <number>] (un tableau trie après un nombre dans l'ordre IndexedDB).
function pagesRangeFor(pdfName) {
  return IDBKeyRange.bound([pdfName], [pdfName, []]);
}

// ---- Partitions (infos) ----

export async function getAllScores() {
  const db = await openDb();
  const store = db.transaction(STORE_SCORES, 'readonly').objectStore(STORE_SCORES);
  const scores = (await requestResult(store.getAll())) || [];
  return scores.map(withoutCategory);
}

export async function getScore(pdfName) {
  const db = await openDb();
  const store = db.transaction(STORE_SCORES, 'readonly').objectStore(STORE_SCORES);
  return withoutCategory((await requestResult(store.get(pdfName))) || null);
}

export async function putScore(scoreInfos) {
  const db = await openDb();
  const transaction = db.transaction(STORE_SCORES, 'readwrite');
  const sanitizedScoreInfos = withoutCategory(scoreInfos);
  transaction.objectStore(STORE_SCORES).put(sanitizedScoreInfos);
  await transactionDone(transaction);
  return sanitizedScoreInfos;
}

// Fusion partielle des infos (équivalent de l'ancien PUT /scoreInfos, qui ne
// modifiait que les champs fournis : composer, movements, voices).
export async function updateScore(pdfName, partialInfos) {
  const db = await openDb();
  const transaction = db.transaction(STORE_SCORES, 'readwrite');
  const store = transaction.objectStore(STORE_SCORES);
  const existing = withoutCategory(
    (await requestResult(store.get(pdfName))) || {
      pdfName: pdfName,
    }
  );
  const merged = withoutCategory(Object.assign({}, existing, partialInfos, { pdfName: pdfName }));
  store.put(merged);
  await transactionDone(transaction);
  return merged;
}

// Supprime la partition et tous ses fichiers associés (zones, PDF, pages). Refuse
// la suppression d'une partition publiée (parité avec l'ancien backend).
export async function deleteScore(pdfName) {
  const score = await getScore(pdfName);
  if (score && score.published) {
    throw new Error('cannot delete a published score');
  }
  const db = await openDb();
  const transaction = db.transaction(
    [STORE_SCORES, STORE_ZONES, STORE_PDFS, STORE_PAGES],
    'readwrite'
  );
  transaction.objectStore(STORE_SCORES).delete(pdfName);
  transaction.objectStore(STORE_ZONES).delete(pdfName);
  transaction.objectStore(STORE_PDFS).delete(pdfName);
  transaction.objectStore(STORE_PAGES).delete(pagesRangeFor(pdfName));
  await transactionDone(transaction);
  return { deleted: pdfName };
}

// ---- Zones ----

export async function getZones(pdfName) {
  const db = await openDb();
  const store = db.transaction(STORE_ZONES, 'readonly').objectStore(STORE_ZONES);
  const record = await requestResult(store.get(pdfName));
  return record ? record.allPagesZones : null;
}

export async function putZones(pdfName, allPagesZones) {
  const db = await openDb();
  const transaction = db.transaction(STORE_ZONES, 'readwrite');
  transaction.objectStore(STORE_ZONES).put({ pdfName: pdfName, allPagesZones: allPagesZones });
  await transactionDone(transaction);
}

// ---- PDF source ----

export async function putPdf(pdfName, blob) {
  const db = await openDb();
  const transaction = db.transaction(STORE_PDFS, 'readwrite');
  transaction.objectStore(STORE_PDFS).put({ pdfName: pdfName, blob: blob });
  await transactionDone(transaction);
}

export async function getPdf(pdfName) {
  const db = await openDb();
  const store = db.transaction(STORE_PDFS, 'readonly').objectStore(STORE_PDFS);
  const record = await requestResult(store.get(pdfName));
  return record ? record.blob : null;
}

// ---- Pages PNG ----

// Écrit toutes les pages d'une partition en une seule transaction. Purge d'abord
// les pages existantes (cas réimport) pour ne pas conserver d'anciennes pages
// au-delà du nouveau total.
export async function putPages(pdfName, pageBlobs) {
  const db = await openDb();
  const transaction = db.transaction(STORE_PAGES, 'readwrite');
  const store = transaction.objectStore(STORE_PAGES);
  store.delete(pagesRangeFor(pdfName));
  pageBlobs.forEach(function (blob, page) {
    store.put({ pdfName: pdfName, page: page, blob: blob });
  });
  await transactionDone(transaction);
}

export async function getPageBlob(pdfName, page) {
  const db = await openDb();
  const store = db.transaction(STORE_PAGES, 'readonly').objectStore(STORE_PAGES);
  const record = await requestResult(store.get([pdfName, Number(page)]));
  return record ? record.blob : null;
}

export async function getPageBuffer(pdfName, page) {
  const blob = await getPageBlob(pdfName, page);
  if (!blob) {
    throw new Error('page image introuvable: ' + page + ' (' + pdfName + ')');
  }
  return await blob.arrayBuffer();
}

// ---- Backups (snapshots zones + infos) ----

// Capture l'état persisté actuel (infos + zones) d'une partition dans un nouvel
// enregistrement de backup, puis purge les plus anciens au-delà de la limite.
// Retourne null si la partition n'a encore aucune donnée à sauvegarder.
export async function createBackup(pdfName) {
  if (!pdfName) return null;
  const scoreInfos = await getScore(pdfName);
  const allPagesZones = await getZones(pdfName);
  if (!scoreInfos && !allPagesZones) return null;

  const db = await openDb();
  const transaction = db.transaction(STORE_BACKUPS, 'readwrite');
  transaction.objectStore(STORE_BACKUPS).add({
    pdfName: pdfName,
    createdAt: Date.now(),
    scoreInfos: scoreInfos,
    allPagesZones: allPagesZones,
  });
  await transactionDone(transaction);
  await pruneBackups(pdfName);
  return true;
}

// Conserve uniquement les MAX_BACKUPS_PER_SCORE backups les plus récents d'une
// partition ; supprime les plus anciens.
async function pruneBackups(pdfName) {
  const db = await openDb();
  const transaction = db.transaction(STORE_BACKUPS, 'readwrite');
  const store = transaction.objectStore(STORE_BACKUPS);
  const backups = (await requestResult(store.index('pdfName').getAll(pdfName))) || [];
  if (backups.length > MAX_BACKUPS_PER_SCORE) {
    backups.sort(function (firstBackup, secondBackup) {
      return firstBackup.createdAt - secondBackup.createdAt;
    });
    const excessCount = backups.length - MAX_BACKUPS_PER_SCORE;
    for (var removedIndex = 0; removedIndex < excessCount; removedIndex++) {
      store.delete(backups[removedIndex].id);
    }
  }
  await transactionDone(transaction);
}

// Tous les backups d'une partition, du plus récent au plus ancien.
export async function getBackups(pdfName) {
  const db = await openDb();
  const store = db.transaction(STORE_BACKUPS, 'readonly').objectStore(STORE_BACKUPS);
  const backups = (await requestResult(store.index('pdfName').getAll(pdfName))) || [];
  backups.sort(function (firstBackup, secondBackup) {
    return secondBackup.createdAt - firstBackup.createdAt;
  });
  return backups;
}

// Réécrit infos + zones de la partition depuis le backup choisi. Retourne le
// backup restauré (contient pdfName pour la réouverture par l'appelant).
export async function restoreBackup(backupId) {
  const db = await openDb();
  const readStore = db.transaction(STORE_BACKUPS, 'readonly').objectStore(STORE_BACKUPS);
  const backup = await requestResult(readStore.get(backupId));
  if (!backup) {
    throw new Error('backup introuvable: ' + backupId);
  }

  const transaction = db.transaction([STORE_SCORES, STORE_ZONES], 'readwrite');
  if (backup.scoreInfos) {
    transaction.objectStore(STORE_SCORES).put(withoutCategory(backup.scoreInfos));
  }
  if (backup.allPagesZones) {
    transaction
      .objectStore(STORE_ZONES)
      .put({ pdfName: backup.pdfName, allPagesZones: backup.allPagesZones });
  }
  await transactionDone(transaction);
  return backup;
}
