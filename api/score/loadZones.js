import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import processResponse from '../../bin/processResponse.js';

var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);

var router = express.Router();

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
    var data = '' + fs.readFileSync(filePath);
    processResponse(res, null, data);
  } catch (error) {
    processResponse(res, error, null);
  }
});

export default router;
