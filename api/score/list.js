import express from 'express';
import scoreSplitter from '../../bin/scoreSplitter..js';
import processResponse from '../../bin/processResponse.js';

var router = express.Router();

/**
 * @openapi
 * /api/score/list:
 *   post:
 *     tags: [Score]
 *     summary: List available scores
 *     responses:
 *       200:
 *         description: Array of score PDF names
 */
router.post('/list', function (req, res) {
  scoreSplitter.listScores(function (error, result) {
    processResponse(res, error, result);
  });
});

export default router;
