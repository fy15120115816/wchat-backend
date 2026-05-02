const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const AICharacter = require('../models/AICharacter');
const ApiConfig = require('../models/ApiConfig');
const { sendPushNotification } = require('../services/pushService');

// 发送消息
exports.sendMessage = async (req, res) => {
    try {
        const { chatId, content, type = 'text', image = '', senderId } = req.body;
        // 如果请求中没有指定senderId，则使用当前登录用户的ID
        const actualSenderId = senderId || req.user.userId;

        console.log('收到消息请求:', { chatId, content, actualSenderId, senderIdFromBody: senderId });

        // 验证参数
        if (!chatId || !content) {
            return res.status(400).json({
                success: false,
                message: '聊天ID和消息内容不能为空'
            });
        }

        // 创建消息
        const message = new Message({
            chatId,
            senderId: actualSenderId,
            content,
            type,
            image
        });

        await message.save();
        console.log('消息已保存到数据库:', message._id);

        // 更新聊天的最后消息
        await Chat.findByIdAndUpdate(chatId, {
            lastMessage: message._id,
            lastMessageAt: Date.now(),
            updatedAt: Date.now()
        });
        console.log('聊天记录已更新:', chatId);

        // 获取聊天信息
        const chat = await Chat.findById(chatId);

        // 如果是AI角色聊天，后台异步处理AI回复（不阻塞响应）
        console.log('🔍 检查AI角色聊天: chatId:', chatId, 'chat:', !!chat, 'participants:', chat?.participants);
        if (chat && chat.participants.some(p => p.toString().startsWith('ai-'))) {
            console.log('✅ 检测到AI角色聊天，准备调用processAIReply');
            processAIReply(chatId, senderId, content).catch(console.error);
        } else {
            console.log('❌ 不是AI角色聊天，不调用processAIReply');
        }

        // 发送推送通知给其他参与者
        if (chat) {
            for (const participantId of chat.participants) {
                if (participantId.toString() !== senderId) {
                    const participant = await User.findById(participantId);
                    if (participant && participant.pushSubscription) {
                        try {
                            const payload = {
                                title: participant.nickname || participant.username || '新消息',
                                body: content.slice(0, 50),
                                url: `/chat/${chatId}`
                            };
                            await sendPushNotification(participant.pushSubscription, payload);
                            console.log('✅ 推送通知已发送给:', participant.username);
                        } catch (pushError) {
                            console.error('❌ 推送通知发送失败:', pushError.message);
                            // 如果订阅过期，移除订阅
                            if (pushError.statusCode === 410) {
                                participant.pushSubscription = null;
                                await participant.save();
                            }
                        }
                    }
                }
            }
        }

        res.status(201).json({
            success: true,
            message: '消息发送成功',
            data: message
        });
    } catch (err) {
        console.error('发送消息错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 获取聊天消息
exports.getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const skip = (page - 1) * limit;

        // 获取消息（按时间倒序）
        const messages = await Message.find({ chatId })
            .populate('senderId', 'username avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // 标记消息为已读
        await Message.updateMany(
            { chatId, senderId: { $ne: req.user.userId }, isRead: false },
            { isRead: true }
        );

        res.status(200).json({
            success: true,
            data: messages.reverse()
        });
    } catch (err) {
        console.error('获取消息错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 删除消息
exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: '消息不存在'
            });
        }

        // 只有发送者可以删除消息
        if (message.senderId.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '无权删除此消息'
            });
        }

        await Message.findByIdAndDelete(messageId);

        res.status(200).json({
            success: true,
            message: '消息已删除'
        });
    } catch (err) {
        console.error('删除消息错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 删除聊天的所有消息（清空聊天记录）
exports.deleteAllMessages = async (req, res) => {
    try {
        let { chatId } = req.params;

        console.log('清空聊天记录:', { chatId, userId: req.user.userId });

        // 处理带 ai- 前缀的ID
        if (chatId.startsWith('ai-')) {
            // AI聊天可能使用不同的存储方式
            // 直接删除所有匹配的消息
            await Message.deleteMany({ chatId });
            console.log('✅ AI聊天记录已清空:', chatId);

            res.status(200).json({
                success: true,
                message: '聊天记录已清空'
            });
            return;
        }

        // 验证聊天存在
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: '聊天不存在'
            });
        }

        // 验证用户是否是聊天参与者
        const isParticipant = chat.participants.some(p => p.toString() === req.user.userId);
        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: '无权清空此聊天记录'
            });
        }

        // 删除所有消息
        await Message.deleteMany({ chatId });
        console.log('✅ 聊天记录已清空:', chatId);

        // 更新聊天的最后消息
        await Chat.findByIdAndUpdate(chatId, {
            lastMessage: null,
            lastMessageAt: Date.now(),
            updatedAt: Date.now()
        });

        res.status(200).json({
            success: true,
            message: '聊天记录已清空'
        });
    } catch (err) {
        console.error('清空聊天记录错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 获取未读消息数
exports.getUnreadCount = async (req, res) => {
    try {
        const { chatId } = req.params;

        const count = await Message.countDocuments({
            chatId,
            senderId: { $ne: req.user.userId },
            isRead: false
        });

        res.status(200).json({
            success: true,
            data: { count }
        });
    } catch (err) {
        console.error('获取未读消息数错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 处理AI回复（后台异步任务）
async function processAIReply(chatId, senderId, content) {
    try {
        console.log('🔄 开始处理AI回复, chatId:', chatId, 'senderId:', senderId);

        // 获取聊天信息
        const chat = await Chat.findById(chatId).populate('participants');
        if (!chat) {
            console.log('❌ 找不到聊天, chatId:', chatId);
            return;
        }
        console.log('✅ 找到聊天:', chat._id);

        // 找出AI角色参与者
        const aiParticipant = chat.participants.find(p => p.toString().startsWith('ai-'));
        if (!aiParticipant) {
            console.log('❌ 找不到AI角色参与者');
            return;
        }
        console.log('✅ 找到AI角色:', aiParticipant);

        // 获取AI角色信息
        const aiCharacter = await AICharacter.findOne({ userId: aiParticipant });
        if (!aiCharacter) {
            console.log('❌ 找不到AI角色信息');
            return;
        }
        console.log('✅ 找到AI角色信息:', aiCharacter.name);

        // 发送"正在输入"事件
        const io = require('../app').io;
        io.emit('typing', {
            chatId,
            userId: aiParticipant,
            typing: true
        });
        console.log('📝 发送正在输入事件');

        // 获取用户的API配置
        const user = await User.findById(senderId);
        if (!user) {
            console.log('❌ 找不到用户');
            return;
        }
        console.log('✅ 找到用户:', user.username);

        const apiConfig = await ApiConfig.findOne({ userId: senderId, isDefault: true }) ||
            await ApiConfig.findOne({ userId: senderId });
        if (!apiConfig) {
            console.log('❌ 用户未配置API');
            return;
        }
        console.log('✅ 找到API配置:', apiConfig.apiUrl);

        // 构建消息历史
        const messages = await Message.find({ chatId })
            .sort({ createdAt: 1 })
            .populate('senderId', 'username');

        const history = messages.map(msg => ({
            role: msg.senderId.username?.startsWith('ai-') ? 'assistant' : 'user',
            content: msg.content
        }));

        // 添加角色设定
        const systemMessage = {
            role: 'system',
            content: aiCharacter.persona || '你是一个乐于助人的AI助手。'
        };

        // 调用AI API
        const apiUrl = apiConfig.apiUrl;
        const apiKey = apiConfig.apiKey;
        const model = apiConfig.model || 'gpt-3.5-turbo';

        const requestBody = {
            model: model,
            messages: [systemMessage, ...history],
            stream: false
        };

        console.log('🔄 调用AI API:', apiUrl);

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
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('✅ AI API响应状态:', response.status);

        const data = await response.json();
        let aiReply = data.choices?.[0]?.message?.content;

        if (!aiReply) {
            console.log('❌ AI返回为空');
            return;
        }

        // 过滤AI返回的特殊标签（如 <thought>）和格式字符
        aiReply = aiReply
            .replace(/<\/?thought[^>]*>/g, '')  // 移除 <thought> 标签
            .replace(/\*\s*/g, '')              // 移除星号
            .replace(/^\s+|\s+$/g, '')          // 移除首尾空格
            .trim();

        console.log('✅ AI回复已过滤:', aiReply.slice(0, 50));

        // 创建AI回复消息
        const aiMessage = new Message({
            chatId,
            senderId: aiParticipant,
            content: aiReply,
            type: 'text'
        });

        await aiMessage.save();
        console.log('✅ AI回复已保存:', aiMessage._id);

        // 发送"停止输入"事件
        io.emit('typing', {
            chatId,
            userId: aiParticipant,
            typing: false
        });
        console.log('📝 发送停止输入事件');

        // 更新聊天的最后消息
        await Chat.findByIdAndUpdate(chatId, {
            lastMessage: aiMessage._id,
            lastMessageAt: Date.now(),
            updatedAt: Date.now()
        });

        // 发送推送通知
        console.log('🔍 检查用户推送订阅:', user._id, 'pushSubscription:', !!user.pushSubscription);
        if (user.pushSubscription) {
            console.log('📤 准备发送推送通知给用户:', user._id);
            console.log('📤 推送订阅信息:', JSON.stringify(user.pushSubscription));
            try {
                const payload = {
                    title: aiCharacter.name || 'AI助手',
                    body: aiReply.slice(0, 50),
                    url: `/chat/${chatId}`
                };
                await sendPushNotification(user.pushSubscription, payload);
                console.log('✅ AI回复推送通知已发送');
            } catch (pushError) {
                console.error('❌ AI回复推送失败:', pushError.message);
                if (pushError.statusCode === 410) {
                    user.pushSubscription = null;
                    await user.save();
                }
            }
        }

    } catch (error) {
        console.error('❌ 处理AI回复失败:', error.message);
    }
}

// 导出函数供其他模块使用
module.exports = {
// 导出函数供其他模块使用
    sendMessage: exports.sendMessage,
    getMessages: exports.getMessages,
    deleteMessage: exports.deleteMessage,
    deleteAllMessages: exports.deleteAllMessages,
    getUnreadCount: exports.getUnreadCount,
    processAIReply
};