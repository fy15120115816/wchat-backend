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
// 获取角色的所有记忆（三种类型）
router.get('/:characterId/memories', authMiddleware, aiCharacterController.getAllMemories);

// 获取角色的短期记忆列表
router.get('/:characterId/memories/short-term', authMiddleware, aiCharacterController.getShortTermMemories);

// 添加短期记忆（每条20字，最多15条）
router.post('/:characterId/memories/short-term', authMiddleware, aiCharacterController.addShortTermMemory);

// 获取角色的长期记忆列表
router.get('/:characterId/memories/long-term', authMiddleware, aiCharacterController.getLongTermMemories);

// 添加长期记忆（由15条短期记忆总结成350字+）
router.post('/:characterId/memories/long-term', authMiddleware, aiCharacterController.addLongTermMemory);

// 获取角色的永久记忆列表
router.get('/:characterId/memories/permanent', authMiddleware, aiCharacterController.getPermanentMemories);

// 添加永久记忆（核心记忆）
router.post('/:characterId/memories/permanent', authMiddleware, aiCharacterController.addPermanentMemory);

// 删除记忆（通用，支持三种类型）
router.delete('/:characterId/memories/:memoryId', authMiddleware, aiCharacterController.deleteMemory);

// 清空角色的记忆（可指定类型）
router.delete('/:characterId/memories', authMiddleware, aiCharacterController.clearMemories);

module.exports = router;