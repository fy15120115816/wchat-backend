const express = require('express');
const router = express.Router();
const momentController = require('../controllers/momentController');
const authMiddleware = require('../middleware/auth');

// 发布朋友圈
router.post('/', authMiddleware, momentController.createMoment);

// 获取朋友圈列表
router.get('/', authMiddleware, momentController.getMoments);

// 获取用户的朋友圈
router.get('/user/:userId', authMiddleware, momentController.getUserMoments);

// 点赞朋友圈
router.post('/:momentId/like', authMiddleware, momentController.likeMoment);

// 评论朋友圈
router.post('/:momentId/comment', authMiddleware, momentController.commentMoment);

// 删除朋友圈
router.delete('/:momentId', authMiddleware, momentController.deleteMoment);

module.exports = router;