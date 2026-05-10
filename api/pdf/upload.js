var express = require('express');
var router = express.Router();
var scoreSplitter = require('../../bin/scoreSplitter..js');
var fileUpload = require('../../bin/fileUpload.js');
var processResponse = require('../../bin/processResponse');

/**
 * @openapi
 * /api/pdf/upload:
 *   post:
 *     tags: [PDF]
 *     summary: Upload a PDF and convert to images
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               pdfFile:
 *                 type: string
 *                 format: binary
 *               imageQuality:
 *                 type: string
 *     responses:
 *       200: { description: Upload + conversion result }
 */
router.post('/upload', function (req, res) {
    fileUpload.upload(req, "pdfFile", function (error, file, reqBody) {
        if (error) return processResponse(res, error);
        if (file.size > 10000000) return processResponse(res, null, {bigFile: file.size});
        if (!file || !file.path) return processResponse(res, "wrong file", null);
        scoreSplitter.pdfToImages(file.path, reqBody.imageQuality, {}, function (error, result) {
            processResponse(res, error, result);
        });
    });
});

module.exports = router;
