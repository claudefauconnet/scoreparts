import express from 'express';
import upload from './upload.js';
import saveFile from './saveFile.js';
import loadFile from './loadFile.js';
import scoreInfos from './scoreInfos.js';

var router = express.Router();

router.use(upload);
router.use(saveFile);
router.use(loadFile);
router.use(scoreInfos);

export default router;
