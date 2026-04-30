const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// 添加订阅路由
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