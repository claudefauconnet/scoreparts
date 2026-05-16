import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import processResponse from '../../bin/processResponse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCORE_INFOS_DIR = path.resolve(__dirname, '../../data/pdf');

export function getScoreInfosPath(pdfName) {
  return path.join(SCORE_INFOS_DIR, pdfName + '.json');
}

export function readScoreInfos(pdfName) {
  const scoreInfosPath = getScoreInfosPath(pdfName);
  if (!fs.existsSync(scoreInfosPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(scoreInfosPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

export function writeScoreInfos(pdfName, totalPages) {
  fs.mkdirSync(SCORE_INFOS_DIR, { recursive: true });
  const scoreInfos = { pdfName, totalPages, category: null, composer: null, published: false };
  fs.writeFileSync(getScoreInfosPath(pdfName), JSON.stringify(scoreInfos, null, 2), 'utf8');
  return scoreInfos;
}

var router = express.Router();

/**
 * @openapi
 * /api/pdf/scoreInfos/{pdfName}:
 *   get:
 *     tags: [PDF]
 *     summary: Get score infos for a PDF
 *     parameters:
 *       - in: path
 *         name: pdfName
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Score infos }
 *       404: { description: Not found }
 */
router.get('/scoreInfos/:pdfName', function (req, res) {
  const scoreInfos = readScoreInfos(req.params.pdfName);
  if (!scoreInfos) return processResponse(res, 'score infos not found', null);
  processResponse(res, null, scoreInfos);
});

/**
 * @openapi
 * /api/pdf/scoreInfos/{pdfName}:
 *   put:
 *     tags: [PDF]
 *     summary: Update category and composer for a PDF
 *     parameters:
 *       - in: path
 *         name: pdfName
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category: { type: string }
 *               composer: { type: string }
 *     responses:
 *       200: { description: Updated score infos }
 *       404: { description: Not found }
 */
router.put('/scoreInfos/:pdfName', function (req, res) {
  const scoreInfos = readScoreInfos(req.params.pdfName);
  if (!scoreInfos) return processResponse(res, 'score infos not found', null);

  if (req.body.category !== undefined) scoreInfos.category = req.body.category;
  if (req.body.composer !== undefined) scoreInfos.composer = req.body.composer;

  fs.writeFileSync(getScoreInfosPath(req.params.pdfName), JSON.stringify(scoreInfos, null, 2), 'utf8');
  processResponse(res, null, scoreInfos);
});

export default router;
