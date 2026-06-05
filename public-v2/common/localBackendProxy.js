// Pont entre l'app et le pipeline client (Web Worker). Expose les traitements qui
// remplacent les anciennes routes serveur : rendu PDF→images (pdfjs), détection de
// portées, génération des parties et téléchargement (PDF seul ou ZIP). Tout le
// calcul vit dans le Worker ; ce module orchestre les appels et le transfert des
// buffers. Aucune route serveur de traitement n'est sollicitée.
import { downloadPdf, downloadZip } from '../localBackend/downloadProcessor.js';

// Worker singleton (créé à la première génération, réutilisé ensuite).
let worker = null;
let nextId = 1;
const pending = new Map();

function getWorker() {
  if (worker) return worker;
  worker = new Worker('/localBackend/worker.js', { type: 'module' });
  worker.onmessage = function (event) {
    const data = event.data || {};
    const entry = pending.get(data.id);
    if (!entry) return; // message obsolète
    if (data.type === 'progress') {
      if (entry.onProgress) entry.onProgress(data);
      return;
    }
    if (data.type === 'done') {
      pending.delete(data.id);
      entry.resolve(data.result);
    } else if (data.type === 'error') {
      pending.delete(data.id);
      entry.reject(new Error(data.message));
    }
  };
  worker.onerror = function (event) {
    // Rejette tout ce qui est en attente : sinon un téléchargement reste bloqué.
    pending.forEach(function (entry) {
      entry.reject(new Error('worker error: ' + (event.message || 'unknown')));
    });
    pending.clear();
  };
  return worker;
}

function callWorker(type, payload, transfer, onProgress) {
  return new Promise(function (resolve, reject) {
    const id = nextId++;
    pending.set(id, { resolve, reject, onProgress: onProgress });
    getWorker().postMessage({ type: type, id: id, payload: payload }, transfer || []);
  });
}

// Rendu PDF→images dans le Worker (pdfjs hors thread principal → UI fluide).
// pdfData (ArrayBuffer) est transféré (zéro-copie). onProgress(pageNum, total).
// Retourne { pages: [{ bytes, width, height }], totalPages }.
export function renderPdfToImages(pdfData, quality, onProgress) {
  return callWorker(
    'pdfToImages',
    { pdfData: pdfData, quality: quality },
    [pdfData],
    function (progress) {
      if (onProgress) onProgress(progress.current, progress.total);
    }
  );
}

async function fetchPageBuffer(pdfName, pageIndex) {
  const res = await fetch('/data/images/' + pdfName + '/' + pageIndex + '.png');
  if (!res.ok) throw new Error('page image introuvable: ' + pageIndex + '.png (' + res.status + ')');
  return await res.arrayBuffer();
}

// Détection des portées d'une page, côté client (remplace l'appel serveur
// proxy.findPageZones). Charge le PNG de la page et le confie au Worker
// (zonesDetectorBrowser). Signature callback identique à l'ancien proxy pour que
// les appelants (actions.js) restent inchangés à l'import près.
// Retourne { topLines, interline, firstVerticalLine, bars }.
export function findPageZones(pdfName, pageNum, callback) {
  fetchPageBuffer(pdfName, pageNum)
    .then((buffer) => callWorker('findPageZones', { imageBuffer: buffer }, [buffer]))
    .then((result) => callback(null, result))
    .catch((err) => callback(err));
}

// Dimensions naturelles (px) d'un PNG depuis son buffer. Sert de filet de sécurité
// quand scoreParts.naturalW/H ne sont pas renseignés (contexte hors éditeur) : les
// zones sont en fractions 0→1, leur conversion en pixels exige la taille réelle du
// PNG. La déduire de l'image elle-même rend la génération indépendante de l'UI.
async function pngNaturalSize(buffer) {
  const bitmap = await createImageBitmap(new Blob([buffer]));
  const size = { w: bitmap.width, h: bitmap.height };
  bitmap.close();
  return size;
}

// Génère le PDF (Uint8Array) d'une partie à partir de ses zones. Charge en amont
// les images des pages concernées (clés de pagesZones.pages).
async function generatePartBytes(opts) {
  const pdfName = opts.pdfName;
  const pagesZones = opts.pagesZones;

  const pageIndexes = Object.keys(pagesZones.pages);
  const pageImageBuffers = {};
  const transfer = [];
  for (const pageIndex of pageIndexes) {
    const buffer = await fetchPageBuffer(pdfName, pageIndex);
    pageImageBuffers[pageIndex] = buffer;
    transfer.push(buffer);
  }

  // Fallback : si l'appelant ne fournit pas les dimensions naturelles, les déduire
  // du premier PNG (avant transfert du buffer au Worker). Sans naturalW/H le
  // pipeline ne saurait pas convertir les zones fractionnaires en pixels.
  let naturalW = opts.naturalW;
  let naturalH = opts.naturalH;
  if (!naturalW || !naturalH) {
    const firstIndex = pageIndexes[0];
    const size = await pngNaturalSize(pageImageBuffers[firstIndex]);
    naturalW = naturalW || size.w;
    naturalH = naturalH || size.h;
  }

  return await callWorker(
    'generatePart',
    {
      pageImageBuffers: pageImageBuffers,
      zonesStr: JSON.stringify(pagesZones),
      options: {
        targetPdfName: opts.targetPdfName,
        part: opts.part,
        margin: opts.margin || 0,
        naturalW: naturalW,
        naturalH: naturalH,
      },
    },
    transfer
  );
}

// Génère UNE partie et la télécharge en PDF.
export async function downloadSinglePart(opts) {
  const pdfBytes = await generatePartBytes(opts);
  const fileName = (opts.fileName || opts.part || 'partition').replace(/[ .]/g, '_') + '.pdf';
  downloadPdf(pdfBytes, fileName);
  return pdfBytes;
}

// Génère plusieurs parties (jobs = [{ part, pagesZones, ... }]) et les télécharge
// empaquetées dans un ZIP. onStep(indexCompleted, total) pour la progression.
export async function downloadPartsZip(common, jobs, zipName, onStep) {
  const files = {};
  for (let jobIndex = 0; jobIndex < jobs.length; jobIndex++) {
    const job = jobs[jobIndex];
    const pdfBytes = await generatePartBytes(Object.assign({}, common, job));
    const entryName = job.part.replace(/[ .]/g, '_') + '.pdf';
    files[entryName] = pdfBytes;
    if (onStep) onStep(jobIndex + 1, jobs.length);
  }
  downloadZip(files, zipName.replace(/[ .]/g, '_') + '.zip');
  return files;
}
