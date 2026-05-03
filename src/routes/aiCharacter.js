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

// ======== 分段记忆管理 ========
// 获取角色的分段记忆列表
router.get('/:characterId/memories', authMiddleware, aiCharacterController.getMemories);

// 添加新的记忆片段
router.post('/:characterId/memories', authMiddleware, aiCharacterController.addMemory);

// 删除单个记忆片段
router.delete('/:characterId/memories/:memoryId', authMiddleware, aiCharacterController.deleteMemory);

// 清空角色的所有记忆
router.delete('/:characterId/memories', authMiddleware, aiCharacterController.clearMemories);

module.exports = router;