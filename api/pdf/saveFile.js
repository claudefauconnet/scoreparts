var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var processResponse = require('../../bin/processResponse');

/**
 * @openapi
 * /api/pdf/file/save:
 *   post:
 *     tags: [PDF]
 *     summary: Save a file to data dir
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [filePath, contentStr]
 *             properties:
 *               filePath: { type: string }
 *               contentStr: { type: string }
 *     responses:
 *       200: { description: Save result }
 */
router.post('/file/save', function (req, res) {
    try {
        var dirPath = path.resolve(__dirname, '../../data/');
        fs.writeFile(dirPath + path.sep + req.body.filePath, req.body.contentStr, null, function (error, result) {
            processResponse(res, error, result);
        });
    } catch (error) {
        processResponse(res, error, null);
    }
});

module.exports = router;
