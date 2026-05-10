var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var processResponse = require('../../bin/processResponse');

/**
 * @openapi
 * /api/score/loadZones:
 *   post:
 *     tags: [Score]
 *     summary: Load zones JSON for a PDF
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileName]
 *             properties:
 *               fileName: { type: string }
 *     responses:
 *       200: { description: Zones JSON content }
 */
router.post('/loadZones', function (req, res) {
    var dirPath = path.resolve(__dirname, '../../data/zones/');
    var filePath = dirPath + req.body.fileName;
    try {
        var data = "" + fs.readFileSync(filePath);
        processResponse(res, null, data);
    } catch (error) {
        processResponse(res, error, null);
    }
});

module.exports = router;
