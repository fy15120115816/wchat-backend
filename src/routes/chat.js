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

        console.log('🔄 收到代理请求:', { apiUrl: apiUrl?.substring(0, 50), hasApiKey: !!apiKey, hasBody: !!body, chatId, senderId });

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
            console.log('🔍 检查保存AI回复的条件: chatId:', !!chatId, 'senderId:', !!senderId);
            if (chatId && senderId) {
                try {
                    const Message = require('../models/Message');
                    const Chat = require('../models/Chat');
                    const User = require('../models/User');

                    // 找到聊天记录
                    let chat;

                    // 如果 chatId 是 ai-xxx 格式，通过参与者查找
                    if (chatId.startsWith('ai-')) {
                        const aiId = chatId.replace('ai-', '');
                        chat = await Chat.findOne({
                            participants: {
                                $all: [senderId, aiId]
                            }
                        });
                    } else {
                        // 否则尝试通过 ID 查找
                        chat = await Chat.findById(chatId);
                    }

                    console.log('🔍 找到聊天:', !!chat, 'participants:', chat?.participants);
                    const aiParticipant = chat?.participants?.find(p => p.toString().startsWith('ai-'));
                    console.log('🔍 找到AI角色:', !!aiParticipant);

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
                            console.log('✅ 聊天记录已更新');

                            // 发送推送通知
                            console.log('🔍 senderId:', senderId);
                            if (!senderId) {
                                console.log('❌ senderId 为空，无法发送推送通知');
                            } else {
                                const user = await User.findById(senderId);
                                console.log('🔍 检查用户:', !!user, '推送订阅:', !!user?.pushSubscription);
                                if (user && user.pushSubscription) {
                                    // 使用统一的 pushService
                                    const { sendPushNotification } = require('../services/pushService');
                                    const payload = {
                                        title: 'AI助手',
                                        body: aiReply.slice(0, 50),
                                        url: `/chat/${chatId}`
                                    };
                                    console.log('📤 准备发送推送通知');
                                    const result = await sendPushNotification(user.pushSubscription, payload);
                                    if (result.success) {
                                        console.log('✅ AI回复推送通知已发送');
                                    } else {
                                        console.log('❌ 推送通知发送失败');
                                        // 如果订阅过期，移除订阅
                                        if (result.expired) {
                                            user.pushSubscription = null;
                                            await user.save();
                                            console.log('✅ 已移除过期的推送订阅');
                                        }
                                    }
                                } else {
                                    console.log('❌ 用户没有推送订阅，不发送推送通知');
                                }
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