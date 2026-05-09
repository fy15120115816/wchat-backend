const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// 添加订阅路由 - 支持多设备
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

// 获取API配置选择
router.get('/api-selection', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        res.json({
            success: true,
            data: {
                globalApiConfigId: user.globalApiConfigId,
                textApiConfigId: user.textApiConfigId,
                imageApiConfigId: user.imageApiConfigId
            }
        });
    } catch (error) {
        console.error('❌ 获取API配置选择失败:', error);
        res.status(500).json({ success: false, message: '获取配置失败' });
    }
});

// 更新API配置选择
router.put('/api-selection', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { globalApiConfigId, textApiConfigId, imageApiConfigId } = req.body;

        await User.findByIdAndUpdate(userId, {
            globalApiConfigId,
            textApiConfigId,
            imageApiConfigId
        });

        console.log('✅ 用户API配置选择已更新:', userId);
        res.json({ success: true, message: '配置更新成功' });
    } catch (error) {
        console.error('❌ 保存API配置选择失败:', error);
        res.status(500).json({ success: false, message: '保存配置失败' });
    }
});

module.exports = router;