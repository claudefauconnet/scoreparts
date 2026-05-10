var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var processResponse = require('../../bin/processResponse');

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

module.exports = router;
