import express from 'express';
import processResponse from '../../bin/processResponse.js';

var router = express.Router();

/**
 * @openapi
 * /api/score/createZip:
 *   post:
 *     tags: [Score]
 *     summary: Create a zip from a movement directory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [movementDirName]
 *             properties:
 *               movementDirName: { type: string }
 *     responses:
 *       200: { description: Zip path }
 */
// POC PWA : zip migré côté client (localBackend/downloadProcessor.js, fflate).
// Route conservée, sans traitement serveur.
router.post('/createZip', function (req, res) {
  processResponse(res, null, { zipPath: null, movedToClient: true });
});

export default router;
