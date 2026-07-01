// Pont entre l'app et le pipeline client (Web Worker). Expose les traitements qui
// remplacent les anciennes routes serveur : rendu PDF→images (pdfjs), détection de
// portées, génération des parties et téléchargement (PDF seul ou ZIP). Tout le
// calcul vit dans le Worker ; ce module orchestre les appels et le transfert des
// buffers. Aucune route serveur de traitement n'est sollicitée.
import { downloadPdf, downloadZip } from '../localBackend/downloadProcessor.js';
import { getPageBuffer } from './localDb.js';

// Pool de workers (créés à la demande, réutilisés entre imports). Les ids de
// requête sont globaux → un même registre `pending` route les réponses quel que
// soit le worker émetteur.
const workers = [];
let nextId = 1;
const pending = new Map();

function makeWorker() {
  const newWorker = new Worker('/localBackend/worker.js', { type: 'module' });
  newWorker.onmessage = function (event) {
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
  newWorker.onerror = function (event) {
    // Rejette tout ce qui est en attente : sinon un téléchargement reste bloqué.
    pending.forEach(function (entry) {
      entry.reject(new Error('worker error: ' + (event.message || 'unknown')));
    });
    pending.clear();
  };
  return newWorker;
}

// Garantit au moins `size` workers dans le pool.
function ensurePool(size) {
  while (workers.length < size) workers.push(makeWorker());
}

function callWorkerOn(workerIndex, type, payload, transfer, onProgress) {
  ensurePool(workerIndex + 1);
  return new Promise(function (resolve, reject) {
    const id = nextId++;
    pending.set(id, { resolve: resolve, reject: reject, onProgress: onProgress });
    workers[workerIndex].postMessage({ type: type, id: id, payload: payload }, transfer || []);
  });
}

// Appels mono-worker (détection, génération) : toujours worker 0.
function callWorker(type, payload, transfer, onProgress) {
  return callWorkerOn(0, type, payload, transfer, onProgress);
}

// Copie d'un ArrayBuffer : chaque worker du pool a besoin de SA copie, car le
// transfert détache le buffer (impossible de partager le même vers plusieurs).
function copyBuffer(arrayBuffer) {
  return arrayBuffer.slice(0);
}

// Taille du pool de rendu — pilotée par floor(cores / 2), pas par un nombre fixe :
// chaque worker du pool spawn SON worker pdfjs interne (= 2 threads par worker),
// donc l'optimum suit les cœurs *physiques* ≈ hardwareConcurrency / 2. Cette
// formule cale d'elle-même sur le physique sur n'importe quelle machine, sans
// jamais sur-souscrire (cause des régressions au-delà).
//
// Mesuré (36 pages, medium, machine 8 logiques / 4 physiques) :
//   workers 1→6445ms · 2→4236 · 3→3473 · 4→3039 · 5→3093 · 6→3138 → genou net à 4
//   = floor(8/2). Seul ce point machine est mesuré ; la formule est une heuristique
//   raisonnée (à re-vérifier ailleurs via options.poolSize), pas un optimum prouvé
//   sur tout matériel.
//
// MAX_POOL = plafond de sécurité mémoire (chaque worker = une instance pdfjs), pas
// un réglage de perf : floor(cores/2) reste le vrai pilote en dessous.
// < 4 pages → 1 worker (overhead pool inutile). ≤3 logiques → 1 = séquentiel.
const MAX_POOL = 8;

// Plafond de pool par qualité : les paliers élevés (ultra ×12, max ×16) font
// exploser la mémoire de canvas par page (~288 Mo en ×12, ~512 Mo en ×16). Sans
// plafond, un pool de 4 workers rendant en parallèle = ~1.1 Go / ~2 Go de canvas
// simultanés → OOM (le crash qu'on vient de fixer). On borne donc le parallélisme
// sur ces paliers ; high et en dessous gardent le comportement d'origine.
const MAX_POOL_BY_QUALITY = { low: MAX_POOL, medium: MAX_POOL, high: MAX_POOL, ultra: 3, max: 2 };

function renderPoolSize(pageCount, quality) {
  if (pageCount < 4) return 1;
  const cores = navigator.hardwareConcurrency || 2;
  const poolCeiling = MAX_POOL_BY_QUALITY[quality] || MAX_POOL;
  return Math.max(1, Math.min(Math.floor(cores / 2), poolCeiling, pageCount));
}

// Rendu PDF→images parallélisé sur un pool de Workers (pdfjs hors thread principal
// → UI fluide). onProgress(pagesRendues, totalPages). Retourne
// { pages: [{ index, bytes, width, height }], totalPages } trié par page.
export async function renderPdfToImages(pdfData, quality, onProgress, options) {
  options = options || {};

  // 1. Compter les pages (parse léger, sans rendu) pour dimensionner le pool et
  //    répartir le travail. Copie transférée → pdfData reste utilisable ensuite.
  const countCopy = copyBuffer(pdfData);
  const countResult = await callWorkerOn(
    0,
    'pdfToImages',
    { pdfData: countCopy, quality: quality, options: { countOnly: true } },
    [countCopy]
  );
  const totalPages = countResult.totalPages;
  // options.poolSize force une taille précise (benchmark / réglage) ; sinon auto.
  const poolSize = options.poolSize
    ? Math.max(1, Math.min(options.poolSize, totalPages))
    : renderPoolSize(totalPages, quality);

  // 2. Cas mono-worker : transfert direct de pdfData (zéro-copie), pas de découpage.
  if (poolSize === 1) {
    return await callWorkerOn(
      0,
      'pdfToImages',
      { pdfData: pdfData, quality: quality, options: options },
      [pdfData],
      function (progress) {
        if (onProgress) onProgress(progress.current, progress.total);
      }
    );
  }

  // 3. Répartition round-robin des pages sur les workers du pool.
  ensurePool(poolSize);
  const buckets = [];
  for (let bucketIndex = 0; bucketIndex < poolSize; bucketIndex++) buckets.push([]);
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    buckets[(pageNum - 1) % poolSize].push(pageNum);
  }

  // 4. Progress global = somme des pages terminées par chaque worker.
  const completedPerWorker = new Array(poolSize).fill(0);

  // 5. Dispatch parallèle ; chaque worker reçoit sa COPIE du PDF (transférée).
  const bucketResults = await Promise.all(
    buckets.map(function (pageIndices, workerIndex) {
      const pdfCopy = copyBuffer(pdfData);
      return callWorkerOn(
        workerIndex,
        'pdfToImages',
        {
          pdfData: pdfCopy,
          quality: quality,
          options: Object.assign({}, options, { pageIndices: pageIndices }),
        },
        [pdfCopy],
        function (progress) {
          completedPerWorker[workerIndex] = progress.current;
          if (onProgress) {
            const totalDone = completedPerWorker.reduce(function (sum, count) {
              return sum + count;
            }, 0);
            onProgress(totalDone, totalPages);
          }
        }
      );
    })
  );

  // 6. Recombinaison ordonnée par index de page.
  const pages = [];
  bucketResults.forEach(function (result) {
    result.pages.forEach(function (page) {
      pages[page.index] = page;
    });
  });
  return { pages: pages, totalPages: totalPages };
}

// Lit le PNG d'une page depuis IndexedDB (plus aucun appel réseau : les pages sont
// stockées localement à l'import). Retourne l'ArrayBuffer attendu par le Worker.
async function fetchPageBuffer(pdfName, pageIndex) {
  return await getPageBuffer(pdfName, pageIndex);
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
// les images des pages concernées (clés de pagesZones.pages). onProgress(percent)
// relaie l'avancement émis par le Worker (étapes 10/50/80/100).
async function generatePartBytes(opts, onProgress) {
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
    transfer,
    onProgress ? (progress) => onProgress(progress.value) : undefined
  );
}

// Génère UNE partie et la télécharge en PDF. onProgress(percent) suit la génération.
export async function downloadSinglePart(opts, onProgress) {
  const pdfBytes = await generatePartBytes(opts, onProgress);
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
