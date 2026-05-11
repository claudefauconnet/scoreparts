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
 * /api/pdf/file/load:
 *   post:
 *     tags: [PDF]
 *     summary: Load a file from data directory
 *     description: Lit un fichier situé sous data/ et retourne son contenu.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [filePath]
 *             properties:
 *               filePath:
 *                 type: string
 *                 description: Chemin relatif sous data/ (incluant le nom de fichier)
 *                 example: "zones/monScore.json"
 *     responses:
 *       200:
 *         description: Contenu du fichier
 *       400:
 *         description: Paramètre filePath manquant
 */
router.post('/file/load', function (req, res) {
  if (!req.body || !req.body.filePath) {
    return processResponse(res, 'missing parameter: filePath', null);
  }
  var dirPath = path.resolve(__dirname, '../../data/');
  try {
    fs.readFile(dirPath + path.sep + req.body.filePath, null, function (error, result) {
      processResponse(res, error, result);
    });
  } catch (error) {
    processResponse(res, error, null);
  }
});

export default router;
