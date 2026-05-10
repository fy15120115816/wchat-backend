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

// 推送订阅（需要认证）- 支持多设备
router.post('/subscribe', authMiddleware, async (req, res) => {
    try {
        const { subscription } = req.body;
        const userId = req.user.userId;

        // 查找用户
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        // 如果还没有订阅数组，初始化
        if (!user.pushSubscriptions) {
            user.pushSubscriptions = [];
        }

        // 检查是否已存在相同的订阅（通过endpoint判断）
        const existingIndex = user.pushSubscriptions.findIndex(
            sub => sub.endpoint === subscription.endpoint
        );

        if (existingIndex >= 0) {
            // 更新现有订阅
            user.pushSubscriptions[existingIndex] = subscription;
            console.log('✅ 用户推送订阅已更新:', userId);
        } else {
            // 添加新订阅
            user.pushSubscriptions.push(subscription);
            console.log('✅ 用户推送订阅已添加（多设备支持）:', userId);
        }

        await user.save();

        res.json({ success: true, message: '订阅成功' });
    } catch (error) {
        console.error('❌ 保存订阅失败:', error);
        res.status(500).json({ success: false, message: '保存订阅失败' });
    }
});

// 测试推送通知 - 支持多设备
router.post('/test-notification', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        
        // 检查是否有订阅（支持多设备，兼容旧格式）
        let subscriptions = user?.pushSubscriptions || [];
        // 兼容旧格式：如果 pushSubscriptions 为空但 pushSubscription 存在，转换为数组
        if ((!subscriptions || subscriptions.length === 0) && user?.pushSubscription) {
            subscriptions = [user.pushSubscription];
        }
        if (!subscriptions || subscriptions.length === 0) {
            return res.status(400).json({ success: false, message: '用户未开启通知，请先在设置中开启AI通知' });
        }
        
        console.log('📨 找到', subscriptions.length, '个推送订阅');
        
        // 使用统一的推送服务
        const { sendPushNotification } = require('../services/pushService');
        
        const payload = {
            title: '测试通知',
            body: '这是一条测试推送通知',
            url: '/'
        };
        
        // 向所有订阅发送通知
        let successCount = 0;
        let failedCount = 0;
        
        for (const sub of subscriptions) {
            const result = await sendPushNotification(sub, payload);
            
            if (result.success) {
                successCount++;
            } else {
                failedCount++;
                // 移除失败的订阅
                user.pushSubscriptions = user.pushSubscriptions.filter(
                    s => s.endpoint !== sub.endpoint
                );
            }
        }
        
        if (failedCount > 0) {
            await user.save();
            console.log('⚠️ 已移除', failedCount, '个失效订阅');
        }
        
        if (successCount > 0) {
            res.json({ success: true, message: `测试通知发送成功（${successCount}个设备）` });
        } else {
            res.status(500).json({ success: false, message: '所有设备发送失败' });
        }
    } catch (error) {
        console.error('❌ 发送测试通知失败:', error);
        res.status(500).json({ success: false, message: '发送通知失败: ' + error.message });
    }
});

// 原有代码继续（如果有更多内容）
router.post('/test-notification-old', authMiddleware, async (req, res) => {
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
            process.env.VAPID_PUBLIC_KEY || 'BGxXA4YCH74ZuMslvhQdcSDBpiJwqIa2cSSEidlEJFkCmmCCrIb5gvAY1HlZbka1btjx3E_MkXcQ7SSKT_O9vfY',
            process.env.VAPID_PRIVATE_KEY || 'XNCgjOzv1EPCLrpc8suxhwZSR88wDFlztQE0HSqLLFY'
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