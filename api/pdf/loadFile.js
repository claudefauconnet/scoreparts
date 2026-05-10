var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var processResponse = require('../../bin/processResponse');

/**
 * @openapi
 * /api/pdf/file/load:
 *   post:
 *     tags: [PDF]
 *     summary: Load a file from data dir
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [filePath]
 *             properties:
 *               filePath: { type: string }
 *     responses:
 *       200: { description: File content }
 */
router.post('/file/load', function (req, res) {
    var dirPath = path.resolve(__dirname, '../../data/');
    try {
        fs.readFile(dirPath + path.sep + req.body.filePath, null, function (error, result) {
            processResponse(res, error, result);
        });
    } catch (error) {
        processResponse(res, error, null);
    }
});

module.exports = router;
