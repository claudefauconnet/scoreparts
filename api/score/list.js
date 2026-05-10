var express = require('express');
var router = express.Router();
var scoreSplitter = require('../../bin/scoreSplitter..js');
var processResponse = require('../../bin/processResponse');

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

module.exports = router;
