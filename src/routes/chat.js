const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');

// 创建聊天
router.post('/', authMiddleware, chatController.createChat);

// 获取用户的聊天列表
router.get('/', authMiddleware, chatController.getUserChats);

// 获取聊天详情
router.get('/:chatId', authMiddleware, chatController.getChatById);

// 更新聊天信息
router.put('/:chatId', authMiddleware, chatController.updateChat);

// 删除聊天
router.delete('/:chatId', authMiddleware, chatController.deleteChat);

// AI 请求代理（解决 CORS 问题）
router.post('/proxy', async (req, res) => {
    try {
        const { apiUrl, apiKey, body, chatId, senderId } = req.body;

        console.log('🔄 收到代理请求:', { apiUrl: apiUrl?.substring(0, 50), hasApiKey: !!apiKey, hasBody: !!body });

        if (!apiUrl || !body) {
            console.log('❌ 缺少必要参数:', { apiUrl: !!apiUrl, body: !!body });
            return res.status(400).json({ success: false, message: '缺少必要参数' });
        }

        console.log('📡 转发请求到:', apiUrl);

        // 创建 AbortController 用于超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, 60000); // 60秒超时

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('✅ 代理响应状态:', response.status);

        // 尝试解析响应
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            
            // 如果有 chatId 和 senderId，保存AI回复消息
            if (chatId && senderId) {
                try {
                    const Message = require('../models/Message');
                    const Chat = require('../models/Chat');
                    const User = require('../models/User');
                    
                    // 找到AI角色
                    const chat = await Chat.findById(chatId);
                    const aiParticipant = chat?.participants?.find(p => p.toString().startsWith('ai-'));
                    
                    if (aiParticipant) {
                        // 保存AI回复消息
                        const aiReply = data.choices?.[0]?.message?.content;
                        if (aiReply) {
                            const aiMessage = new Message({
                                chatId,
                                senderId: aiParticipant,
                                content: aiReply,
                                type: 'text'
                            });
                            await aiMessage.save();
                            console.log('✅ AI回复已保存到数据库:', aiMessage._id);
                            
                            // 更新聊天的最后消息
                            await Chat.findByIdAndUpdate(chatId, {
                                lastMessage: aiMessage._id,
                                lastMessageAt: Date.now(),
                                updatedAt: Date.now()
                            });
                            
                            // 发送推送通知
                            const user = await User.findById(senderId);
                            if (user && user.pushSubscription) {
                                const webpush = require('web-push');
                                webpush.setVapidDetails(
                                    'mailto:admin@example.com',
                                    process.env.VAPID_PUBLIC_KEY,
                                    process.env.VAPID_PRIVATE_KEY
                                );
                                const payload = JSON.stringify({
                                    title: 'AI助手',
                                    body: aiReply.slice(0, 50),
                                    url: `/chat/${chatId}`
                                });
                                await webpush.sendNotification(user.pushSubscription, payload);
                                console.log('✅ AI回复推送通知已发送');
                            }
                        }
                    }
                } catch (saveError) {
                    console.error('❌ 保存AI回复失败:', saveError.message);
                }
            }
            
            res.status(response.status).json(data);
        } else {
            // 非 JSON 响应，返回原始文本
            const text = await response.text();
            console.log('⚠️ 非 JSON 响应:', text.substring(0, 200));
            res.status(response.status).json({
                success: false,
                message: 'API 返回非 JSON 响应',
                originalStatus: response.status,
                responseText: text.substring(0, 500)
            });
        }
    } catch (error) {
        console.error('❌ 代理请求失败:', error.message);
        if (error.name === 'AbortError') {
            res.status(504).json({ success: false, message: '请求超时，请稍后重试' });
        } else {
            res.status(500).json({ success: false, message: error.message });
        }
    }
});

module.exports = router;