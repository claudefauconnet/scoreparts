import express from 'express';
import scoreSplitter from '../../bin/scoreSplitter..js';
import processResponse from '../../bin/processResponse.js';

var router = express.Router();

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

export default router;
