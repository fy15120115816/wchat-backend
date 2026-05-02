const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/auth');

// 发送消息
router.post('/', authMiddleware, messageController.sendMessage);

// 获取聊天消息
router.get('/:chatId', authMiddleware, messageController.getMessages);

// 清空聊天记录
router.delete('/chat/:chatId', authMiddleware, messageController.deleteAllMessages);

// 删除消息
router.delete('/:messageId', authMiddleware, messageController.deleteMessage);

// 获取未读消息数
router.get('/:chatId/unread', authMiddleware, messageController.getUnreadCount);

module.exports = router;