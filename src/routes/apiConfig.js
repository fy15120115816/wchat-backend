const express = require('express');
const router = express.Router();
const apiConfigController = require('../controllers/apiConfigController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, apiConfigController.getConfigs);
router.post('/', authMiddleware, apiConfigController.createConfig);
router.put('/:configId', authMiddleware, apiConfigController.updateConfig);
router.delete('/:configId', authMiddleware, apiConfigController.deleteConfig);

module.exports = router;