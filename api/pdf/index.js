import express from 'express';
import upload from './upload.js';
import saveFile from './saveFile.js';
import loadFile from './loadFile.js';

var router = express.Router();

router.use(upload);
router.use(saveFile);
router.use(loadFile);

export default router;
