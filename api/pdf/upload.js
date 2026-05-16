import express from 'express';
import scoreSplitter from '../../bin/scoreSplitter..js';
import fileUpload from '../../bin/fileUpload.js';
import processResponse from '../../bin/processResponse.js';
import { writeScoreInfos } from './scoreInfos.js';

var router = express.Router();

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
  fileUpload.upload(req, 'pdfFile', function (error, file, reqBody) {
    if (error) return processResponse(res, error);
    if (file.size > 10000000) return processResponse(res, null, { bigFile: file.size });
    if (!file || !file.path) return processResponse(res, 'wrong file', null);
    var opts = { socketId: reqBody.socketId };
    scoreSplitter.pdfToImages(file.path, reqBody.imageQuality, opts, function (error, result) {
      if (!error && result) writeScoreInfos(result.pdfName, result.pages);
      processResponse(res, error, result);
    });
  });
});

export default router;
