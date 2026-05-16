import express from 'express';
import list from './list.js';
import deleteScore from './delete.js';
import split from './split.js';
import generatePart from './generatePart.js';
import findPageZones from './findPageZones.js';
import createZip from './createZip.js';
import saveZones from './saveZones.js';
import loadZones from './loadZones.js';

var router = express.Router();

router.use(list);
router.use(deleteScore);
router.use(split);
router.use(generatePart);
router.use(findPageZones);
router.use(createZip);
router.use(saveZones);
router.use(loadZones);

export default router;
