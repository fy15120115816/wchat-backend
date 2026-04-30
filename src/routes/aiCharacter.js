const express = require('express');
const router = express.Router();
const aiCharacterController = require('../controllers/aiCharacterController');
const authMiddleware = require('../middleware/auth');

// 创建 AI 角色
router.post('/', authMiddleware, aiCharacterController.createCharacter);

// 获取所有 AI 角色
router.get('/', authMiddleware, aiCharacterController.getCharacters);

// 获取单个 AI 角色
router.get('/:characterId', authMiddleware, aiCharacterController.getCharacterById);

// 更新 AI 角色
router.put('/:characterId', authMiddleware, aiCharacterController.updateCharacter);

// 删除 AI 角色
router.delete('/:characterId', authMiddleware, aiCharacterController.deleteCharacter);

// AI 生成回复
router.post('/:characterId/reply', authMiddleware, aiCharacterController.generateReply);

module.exports = router;