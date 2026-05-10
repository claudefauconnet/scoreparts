var express = require('express');
var router = express.Router();
var scoreSplitter = require('../../bin/scoreSplitter..js');
var processResponse = require('../../bin/processResponse');

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
router.post('/generatePart', function (req, res) {
  scoreSplitter.generatePart(
    req.body.sourcePdfName,
    req.body.targetPdfName,
    req.body.part,
    req.body.zonesStr,
    parseInt(req.body.margin),
    parseFloat(req.body.imgScaleCoefV),
    parseFloat(req.body.imgScaleCoefH),
    function (error, result) {
      processResponse(res, error, result);
    }
  );
});

module.exports = router;
