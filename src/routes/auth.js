const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// 注册
router.post('/register', authController.register);

// 登录
router.post('/login', authController.login);

// 获取当前用户信息（需要认证）
router.get('/user', authMiddleware, authController.getCurrentUser);

// 更新用户信息（需要认证）
router.put('/user', authMiddleware, authController.updateUser);

// 修改密码（需要认证）
router.put('/password', authMiddleware, authController.changePassword);

// 推送订阅（需要认证）
router.post('/subscribe', authMiddleware, async (req, res) => {
    try {
        const { subscription } = req.body;
        const userId = req.user.userId;

        await User.findByIdAndUpdate(userId, { pushSubscription: subscription });
        console.log('✅ 用户推送订阅已更新:', userId);

        res.json({ success: true, message: '订阅成功' });
    } catch (error) {
        console.error('❌ 保存订阅失败:', error);
        res.status(500).json({ success: false, message: '保存订阅失败' });
    }
});

module.exports = router;