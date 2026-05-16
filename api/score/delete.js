import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readScoreInfos } from '../pdf/scoreInfos.js';
import processResponse from '../../bin/processResponse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

var router = express.Router();

/**
 * @openapi
 * /api/score/delete/{pdfName}:
 *   delete:
 *     tags: [Score]
 *     summary: Delete an unpublished score and all its associated files
 *     parameters:
 *       - in: path
 *         name: pdfName
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 *       403: { description: Cannot delete published score }
 */
router.delete('/delete/:pdfName', function (req, res) {
  const pdfName = req.params.pdfName;
  if (!pdfName || /[/\\]|\.\./.test(pdfName)) {
    return processResponse(res, 'invalid pdfName', null);
  }

  const scoreInfos = readScoreInfos(pdfName);
  if (!scoreInfos) return processResponse(res, 'score not found', null);
  if (scoreInfos.published) return processResponse(res, 'cannot delete a published score', null);

  const root = path.resolve(__dirname, '../../');

  const targets = [
    path.join(root, 'data/pdf', pdfName + '.pdf'),
    path.join(root, 'data/pdf', pdfName + '.json'),
    path.join(root, 'data/zones', pdfName + '.json'),
    path.join(root, 'public/data/pdfs', pdfName + '.pdf'),
  ];
  const imagesDir = path.join(root, 'public/data/images', pdfName);

  for (const filePath of targets) {
    try { fs.unlinkSync(filePath); } catch (e) {}
  }
  try { fs.rmSync(imagesDir, { recursive: true, force: true }); } catch (e) {}

  processResponse(res, null, { deleted: pdfName });
});

export default router;
