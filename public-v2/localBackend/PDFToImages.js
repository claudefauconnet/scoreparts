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
// quality ∈ {low, medium, high}. onProgress(pageNum, totalPages) optionnel.
// options.maxPages limite le rendu (aperçu / test) sans changer totalPages.
// Retourne { pages: [{ bytes, width, height }], totalPages }.
export async function pdfToImages(pdfData, quality, onProgress, options) {
  options = options || {};
  // options.scale force une échelle précise (sinon dérivée de la qualité).
  const scale = options.scale || QUALITY_SCALE[quality] || QUALITY_SCALE.medium;
  // disableFontFace : dans un Web Worker il n'y a pas de DOM → l'API @font-face
  // utilisée par défaut par pdfjs échoue et les glyphes (notes, texte) sortent en
  // .notdef (carrés vides). Forcer le rendu des contours de glyphes (paths) corrige
  // ça et fonctionne aussi bien thread principal que Worker.
  const loadingTask = pdfjsLib.getDocument({ data: pdfData, disableFontFace: true });
  const pdf = await loadingTask.promise;

  const lastPage = options.maxPages ? Math.min(options.maxPages, pdf.numPages) : pdf.numPages;
  const pages = [];
  for (let pageNum = 1; pageNum <= lastPage; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const rendered = await renderPageToPng(page, scale);
    // Index 0-based dans le tableau = nom de fichier <n>.png côté serveur actuel.
    pages.push(rendered);
    page.cleanup();
    if (onProgress) onProgress(pageNum, pdf.numPages);
  }

  return { pages: pages, totalPages: pdf.numPages };
}
