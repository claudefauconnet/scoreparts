import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fileUpload from '../../bin/fileUpload.js';
import processResponse from '../../bin/processResponse.js';
import { writeScoreInfos } from './scoreInfos.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

var router = express.Router();

/**
 * @openapi
 * /api/pdf/uploadImages:
 *   post:
 *     tags: [PDF]
 *     summary: Store a PDF and its page images rendered client-side (pdfjs)
 *     description: >
 *       Remplace la conversion serveur GraphicsMagick. Le client rend le PDF en
 *       PNG (pdfPipeline/pdfToImagesBrowser) et envoie le PDF source (champ
 *       pdfFile) + les pages (champs page_0, page_1, …). Le serveur ne fait
 *       qu'écrire les fichiers — aucun traitement d'image.
 *     responses:
 *       200: { description: "Stored — returns pages count and pdfName" }
 */
// Le serveur n'effectue plus aucune conversion : il persiste le PDF + les PNG
// fournis. La donnée reste côté serveur ; seul le traitement (GM) a migré client.
router.post('/uploadImages', function (req, res) {
  fileUpload.uploadAny(req, function (err, files, body) {
    if (err) return processResponse(res, err, null);
    if (!files || !files.length) return processResponse(res, 'no files received', null);

    var pdfFileEntry = files.find(function (file) {
      return file.fieldname === 'pdfFile';
    });
    if (!pdfFileEntry) return processResponse(res, 'missing pdfFile', null);

    var pageEntries = files
      .filter(function (file) {
        return file.fieldname.indexOf('page_') === 0;
      })
      .sort(function (entryA, entryB) {
        return parseInt(entryA.fieldname.slice(5)) - parseInt(entryB.fieldname.slice(5));
      });
    if (!pageEntries.length) return processResponse(res, 'no page images received', null);

    var pdfName = pdfFileEntry.originalname.replace(/\.[^.]+$/, '').replace(/ /g, '_');

    try {
      var pdfDir = path.resolve(__dirname, '../../data/pdf');
      fs.mkdirSync(pdfDir, { recursive: true });
      fs.writeFileSync(path.join(pdfDir, pdfName + '.pdf'), pdfFileEntry.buffer);

      var imagesDir = path.resolve(__dirname, '../../public/data/images', pdfName);
      fs.mkdirSync(imagesDir, { recursive: true });
      // Nettoie les anciennes pages avant d'écrire les nouvelles (réimport).
      fs.readdirSync(imagesDir).forEach(function (existingFile) {
        if (/^\d+\.png$/i.test(existingFile)) {
          try {
            fs.unlinkSync(path.join(imagesDir, existingFile));
          } catch (e) {}
        }
      });
      pageEntries.forEach(function (entry, pageIndex) {
        fs.writeFileSync(path.join(imagesDir, pageIndex + '.png'), entry.buffer);
      });

      writeScoreInfos(pdfName, pageEntries.length);
      processResponse(res, null, { pages: pageEntries.length, pdfName: pdfName });
    } catch (writeError) {
      processResponse(res, String(writeError), null);
    }
  });
});

export default router;
