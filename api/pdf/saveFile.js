import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import processResponse from '../../bin/processResponse.js';

var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);

var router = express.Router();

/**
 * @openapi
 * /api/pdf/file/save:
 *   post:
 *     tags: [PDF]
 *     summary: Save a file to data directory
 *     description: Écrit un contenu texte dans un fichier sous data/.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [filePath, contentStr]
 *             properties:
 *               filePath:
 *                 type: string
 *                 description: Chemin relatif sous data/ (incluant le nom de fichier)
 *                 example: "zones/monScore.json"
 *               contentStr:
 *                 type: string
 *                 description: Contenu texte à écrire
 *                 example: "{\"pages\":{}}"
 *     responses:
 *       200:
 *         description: Fichier écrit
 *       400:
 *         description: Paramètres filePath ou contentStr manquants
 */
router.post('/file/save', function (req, res) {
  if (!req.body || !req.body.filePath || typeof req.body.contentStr === 'undefined') {
    return processResponse(res, 'missing parameters: filePath, contentStr', null);
  }
  try {
    var dirPath = path.resolve(__dirname, '../../data/');
    fs.writeFile(
      dirPath + path.sep + req.body.filePath,
      req.body.contentStr,
      null,
      function (error, result) {
        processResponse(res, error, result);
      }
    );
  } catch (error) {
    processResponse(res, error, null);
  }
});

export default router;
