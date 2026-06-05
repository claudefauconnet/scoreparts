import express from 'express';
import processResponse from '../../bin/processResponse.js';

var router = express.Router();

/**
 * @openapi
 * /api/score/generatePart:
 *   post:
 *     tags: [Score]
 *     summary: Generate an instrument part PDF
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sourcePdfName, targetPdfName, part, zonesStr]
 *             properties:
 *               sourcePdfName: { type: string }
 *               targetPdfName: { type: string }
 *               part: { type: string }
 *               zonesStr: { type: string, description: JSON string of zones }
 *               margin: { type: integer }
 *               imgScaleCoefV: { type: number }
 *               imgScaleCoefH: { type: number }
 *     responses:
 *       200: { description: Generated PDF path }
 */
// POC PWA : traitement migré côté client (public-v2/localBackend/).
// La route est conservée mais ne fait plus aucun calcul serveur.
router.post('/generatePart', function (req, res) {
  processResponse(res, null, { partPdfUrl: null, movedToClient: true });
});

export default router;
