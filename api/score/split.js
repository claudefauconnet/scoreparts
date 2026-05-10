var express = require('express');
var router = express.Router();
var scoreSplitter = require('../../bin/scoreSplitter..js');
var processResponse = require('../../bin/processResponse');

/**
 * @openapi
 * /api/score/split:
 *   post:
 *     tags: [Score]
 *     summary: Split a score image into staff zones
 *     description: Analyse une image de partition et retourne les zones détectées (portées).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 description: Chemin ou nom de l'image à analyser
 *                 example: "monScore_page1.png"
 *     responses:
 *       200:
 *         description: Zones détectées
 *       400:
 *         description: Paramètre image manquant
 */
router.post('/split', function (req, res) {
  if (!req.body || !req.body.image) {
    return processResponse(res, 'missing parameter: image', null);
  }
  scoreSplitter.split(req.body.image, function (error, result) {
    processResponse(res, error, result);
  });
});

module.exports = router;
