var express = require('express');
var router = express.Router();
var scoreSplitter = require('../../bin/scoreSplitter..js');
var processResponse = require('../../bin/processResponse');

/**
 * @openapi
 * /api/score/split:
 *   post:
 *     tags: [Score]
 *     summary: Split a score image
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *     responses:
 *       200: { description: Split result }
 */
router.post('/split', function (req, res) {
    scoreSplitter.split(req.body.image, function (error, result) {
        processResponse(res, error, result);
    });
});

module.exports = router;
