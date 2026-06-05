// Web Worker module : exécute le pipeline lourd hors du thread principal.
// Remplace le traitement serveur (routes Express vidées). Progress via postMessage
// au lieu de socket.io. Type 'module' → import ESM des libs depuis CDN.
import ScoreSplitter from './scoreSplitter.js';
import ZonesDetector from './zonesDetector.js';
import * as JimpProxy from './jimpProcessor.js';
import { pdfToImages } from './PDFToImages.js';

function loadImage(inputBuffer) {
  return new Promise(function (resolve, reject) {
    JimpProxy.getImage(inputBuffer, function (err, image) {
      if (err) return reject(err);
      resolve(image);
    });
  });
}

self.onmessage = async function (event) {
  const data = event.data || {};
  const type = data.type;
  const id = data.id;
  const payload = data.payload || {};

  try {
    if (type === 'findPageZones') {
      const image = await loadImage(payload.imageBuffer);
      const zones = ZonesDetector.detectPageScoreLines(image);
      self.postMessage({ type: 'done', id: id, result: zones });
      return;
    }

    if (type === 'pdfToImages') {
      const rendered = await pdfToImages(
        payload.pdfData,
        payload.quality,
        function (pageNum, totalPages) {
          self.postMessage({ type: 'progress', id: id, current: pageNum, total: totalPages });
        },
        payload.options
      );
      // Transfert zéro-copie de tous les buffers PNG vers le thread principal.
      const pngTransfer = rendered.pages.map(function (page) {
        return page.bytes.buffer;
      });
      self.postMessage({ type: 'done', id: id, result: rendered }, pngTransfer);
      return;
    }

    if (type === 'generatePart') {
      const pdfBytes = await ScoreSplitter.generatePart(
        payload.pageImageBuffers,
        payload.zonesStr,
        payload.options,
        function (percent) {
          self.postMessage({ type: 'progress', id: id, value: percent });
        }
      );
      // Transfert du buffer (zéro-copie) vers le thread principal.
      self.postMessage({ type: 'done', id: id, result: pdfBytes }, [pdfBytes.buffer]);
      return;
    }

    self.postMessage({ type: 'error', id: id, message: 'unknown message type: ' + type });
  } catch (err) {
    self.postMessage({ type: 'error', id: id, message: String((err && err.message) || err) });
  }
};
