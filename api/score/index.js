var express = require('express');
var router = express.Router();

router.use(require('./list'));
router.use(require('./split'));
router.use(require('./generatePart'));
router.use(require('./findPageZones'));
router.use(require('./createZip'));
router.use(require('./saveZones'));
router.use(require('./loadZones'));

module.exports = router;
