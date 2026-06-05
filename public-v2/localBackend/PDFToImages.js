// PDF → images PNG côté client (remplace GraphicsMagick + Ghostscript).
// pdfjs-dist rend chaque page sur un canvas, exporté en PNG. Parité de taille avec
// l'ancien `gm convert -density` : GM utilisait density = imageWidth/pageWidth*72,
// soit une échelle effective = imageWidth/pageWidth = multiplicateur de qualité
// (low ×2, medium ×4, high ×8). On applique donc ce même facteur en viewport pdfjs
// → pixels identiques à la sortie GM.
import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/+esm';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs';

const QUALITY_SCALE = { low: 2, medium: 4, high: 8 };

// Rend une page sur un canvas hors écran et renvoie le PNG en Uint8Array.
async function renderPageToPng(page, scale) {
  const viewport = page.getViewport({ scale: scale });
  const width = Math.ceil(viewport.width);
  const height = Math.ceil(viewport.height);

  // OffscreenCanvas : utilisable aussi bien sur le thread principal que dans un
  // Web Worker (la conversion lourde peut donc être déportée ultérieurement).
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  await page.render({ canvasContext: context, viewport: viewport }).promise;

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const arrayBuffer = await blob.arrayBuffer();
  return { bytes: new Uint8Array(arrayBuffer), width: width, height: height };
}

// Convertit un PDF (ArrayBuffer/Uint8Array) en PNG, une entrée par page.
// quality ∈ {low, medium, high}. onProgress(rendu, àRendre) optionnel.
// options :
//   - countOnly   : ne rend rien, retourne juste { totalPages } (le pool s'en sert
//                   pour répartir les pages avant rendu).
//   - pageIndices : sous-ensemble de pages (1-based) à rendre — un worker du pool
//                   ne traite que sa tranche. Absent → toutes les pages.
//   - maxPages    : borne le rendu (aperçu / test) sans changer totalPages.
//   - scale       : force une échelle précise (sinon dérivée de la qualité).
// Chaque page rendue porte son `index` 0-based (= nom de fichier <n>.png), ce qui
// permet de recombiner dans l'ordre les résultats de plusieurs workers.
// Retourne { pages: [{ index, bytes, width, height }], totalPages }.
export async function pdfToImages(pdfData, quality, onProgress, options) {
  options = options || {};
  const scale = options.scale || QUALITY_SCALE[quality] || QUALITY_SCALE.medium;
  // disableFontFace : dans un Web Worker il n'y a pas de DOM → l'API @font-face
  // utilisée par défaut par pdfjs échoue et les glyphes (notes, texte) sortent en
  // .notdef (carrés vides). Forcer le rendu des contours de glyphes (paths) corrige
  // ça et fonctionne aussi bien thread principal que Worker.
  const loadingTask = pdfjsLib.getDocument({ data: pdfData, disableFontFace: true });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  // Comptage seul : le pool appelle ça d'abord pour dimensionner/répartir.
  if (options.countOnly) {
    return { pages: [], totalPages: totalPages };
  }

  // Pages à rendre : tranche fournie par le pool, ou toutes (borné par maxPages).
  let pageNumbers;
  if (options.pageIndices && options.pageIndices.length) {
    pageNumbers = options.pageIndices;
  } else {
    const lastPage = options.maxPages ? Math.min(options.maxPages, totalPages) : totalPages;
    pageNumbers = [];
    for (let pageNum = 1; pageNum <= lastPage; pageNum++) pageNumbers.push(pageNum);
  }

  const pages = [];
  let renderedCount = 0;
  for (const pageNum of pageNumbers) {
    const page = await pdf.getPage(pageNum);
    const rendered = await renderPageToPng(page, scale);
    rendered.index = pageNum - 1;
    pages.push(rendered);
    page.cleanup();
    renderedCount++;
    if (onProgress) onProgress(renderedCount, pageNumbers.length);
  }

  return { pages: pages, totalPages: totalPages };
}
