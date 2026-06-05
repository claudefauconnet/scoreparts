import express from 'express';
import processResponse from '../../bin/processResponse.js';

var router = express.Router();

/**
 * @openapi
 * /api/pdf/upload:
 *   post:
 *     tags: [PDF]
 *     summary: (déprécié) Upload PDF + conversion GraphicsMagick
 *     description: >
 *       Remplacé par /api/pdf/uploadImages : le PDF est désormais rendu en images
 *       côté client (pdfjs). Cette route ne fait plus aucune conversion.
 *     responses:
 *       200: { description: Moved to client }
 */
// PWA : conversion PDF→images migrée côté client (pdfjs). Route conservée vidée
// pour compat ; plus aucun appel GraphicsMagick côté serveur.
router.post('/upload', function (req, res) {
  processResponse(res, null, { movedToClient: true });
});

export default router;
