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

// 测试推送通知
router.post('/test-notification', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        
        if (!user.pushSubscription) {
            return res.status(400).json({ success: false, message: '用户未开启通知，请先在设置中开启AI通知' });
        }
        
        const webpush = require('web-push');
        webpush.setVapidDetails(
            'mailto:admin@example.com',
            process.env.VAPID_PUBLIC_KEY || 'BO8Hqu9fbcifxKlUqnI_oz_Q5b0Lw5mzdgu99_vxJvixgF6lnuR9c0b7PFqEzkmG33HQxcUXbHlhEuD5BKmDlVs',
            process.env.VAPID_PRIVATE_KEY || 'QpTE7--OnW9vDaa9RYg4Emu3Q44MBSP9xSBjmlYSFlg'
        );
        
        const payload = JSON.stringify({
            title: '🔔 测试通知',
            body: '这是一条测试通知，如果能看到这条消息，说明推送功能正常！',
            url: '/chats'
        });
        
        await webpush.sendNotification(user.pushSubscription, payload);
        console.log('✅ 测试通知已发送');
        
        res.json({ success: true, message: '测试通知已发送' });
    } catch (error) {
        console.error('❌ 发送测试通知失败:', error);
        res.status(500).json({ success: false, message: '发送失败: ' + error.message });
    }
});

module.exports = router;