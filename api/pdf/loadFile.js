var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var processResponse = require('../../bin/processResponse');

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

module.exports = router;
