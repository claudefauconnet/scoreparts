// Stockage local unique de l'app (remplace le backend Express + le filesystem).
// Tout vit dans IndexedDB sous forme d'enregistrements structurés (objets / Blobs),
// jamais de JSON sérialisé : les zones et les infos sont des objets, le PDF et les
// pages des Blobs.
//
// Stores (DB « scoreparts », v1) :
//   scores  (key pdfName)         → infos de la partition
//                                   { pdfName, totalPages, category, composer,
//                                     published, movements, voices }
//   zones   (key pdfName)         → { pdfName, allPagesZones }  (objet, pas string)
//   pdfs    (key pdfName)         → { pdfName, blob }           PDF source
//   pages   (key [pdfName, page]) → { pdfName, page, blob }     une image PNG par page

const DB_NAME = 'scoreparts';
const DB_VERSION = 1;
const STORE_SCORES = 'scores';
const STORE_ZONES = 'zones';
const STORE_PDFS = 'pdfs';
const STORE_PAGES = 'pages';

let dbPromise = null;

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
  return (await requestResult(store.getAll())) || [];
}

export async function getScore(pdfName) {
  const db = await openDb();
  const store = db.transaction(STORE_SCORES, 'readonly').objectStore(STORE_SCORES);
  return (await requestResult(store.get(pdfName))) || null;
}

export async function putScore(scoreInfos) {
  const db = await openDb();
  const transaction = db.transaction(STORE_SCORES, 'readwrite');
  transaction.objectStore(STORE_SCORES).put(scoreInfos);
  await transactionDone(transaction);
  return scoreInfos;
}

// Fusion partielle des infos (équivalent de l'ancien PUT /scoreInfos, qui ne
// modifiait que les champs fournis : category, composer, movements, voices).
export async function updateScore(pdfName, partialInfos) {
  const db = await openDb();
  const transaction = db.transaction(STORE_SCORES, 'readwrite');
  const store = transaction.objectStore(STORE_SCORES);
  const existing = (await requestResult(store.get(pdfName))) || { pdfName: pdfName };
  const merged = Object.assign({}, existing, partialInfos, { pdfName: pdfName });
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
