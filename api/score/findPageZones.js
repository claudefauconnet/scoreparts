import express from 'express';
import processResponse from '../../bin/processResponse.js';

var router = express.Router();

/**
 * @openapi
 * /api/score/findPageZones:
 *   post:
 *     tags: [Score]
 *     summary: Auto-detect zones on a PDF page
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pdfName, pageNum]
 *             properties:
 *               pdfName: { type: string }
 *               pageNum: { type: integer }
 *     responses:
 *       200: { description: Detected zones }
 */
// POC PWA : détection migrée côté client (localBackend/zonesDetector.js).
// Route conservée, sans traitement serveur.
router.post('/findPageZones', function (req, res) {
  processResponse(res, null, {
    topLines: [],
    interline: 0,
    firstVerticalLine: 0,
    bars: {},
    movedToClient: true,
  });
});

export default router;
