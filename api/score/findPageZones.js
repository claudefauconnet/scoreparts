var express = require('express');
var router = express.Router();
var ZonesDetector = require('../../bin/zonesDetector.js');
var processResponse = require('../../bin/processResponse');

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
router.post('/findPageZones', function (req, res) {
    ZonesDetector.findPageZones(req.body.pdfName, req.body.pageNum, function (error, result) {
        processResponse(res, error, result);
    });
});

module.exports = router;
