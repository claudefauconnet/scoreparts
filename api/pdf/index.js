var express = require('express');
var router = express.Router();

router.use(require('./upload'));
router.use(require('./saveFile'));
router.use(require('./loadFile'));

module.exports = router;
