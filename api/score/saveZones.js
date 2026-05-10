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
 * /api/score/saveZones:
 *   post:
 *     tags: [Score]
 *     summary: Save zones JSON for a PDF
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileName, zonesStr]
 *             properties:
 *               fileName: { type: string }
 *               zonesStr: { type: string }
 *     responses:
 *       200: { description: Saved confirmation }
 */
router.post('/saveZones', function (req, res) {
  var dirPath = path.resolve(__dirname, '../../data/zones/');
  var filePath = dirPath + req.body.fileName;
  try {
    fs.writeFileSync(filePath, req.body.zonesStr);
    processResponse(res, null, 'zones Saved');
  } catch (error) {
    processResponse(res, error, null);
  }
});

export default router;
