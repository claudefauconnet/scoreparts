import express from 'express';
import scoreSplitter from '../../bin/scoreSplitter..js';
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
router.post('/createZip', function (req, res) {
  scoreSplitter.createZip(req.body.movementDirName, function (err, result) {
    try {
      processResponse(res, null, result);
    } catch (error) {
      processResponse(res, error, null);
    }
  });
});

export default router;
