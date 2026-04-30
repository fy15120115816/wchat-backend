const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');

// 发送消息
exports.sendMessage = async (req, res) => {
    try {
        const { chatId, content, type = 'text', image = '' } = req.body;
        const senderId = req.user.userId;

        console.log('收到消息请求:', { chatId, content, senderId });

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
            senderId,
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

        // 发送推送通知给其他参与者
        const chat = await Chat.findById(chatId);
        if (chat) {
            for (const participantId of chat.participants) {
                if (participantId.toString() !== senderId) {
                    const participant = await User.findById(participantId);
                    if (participant && participant.pushSubscription) {
                        try {
                            const payload = JSON.stringify({
                                title: participant.nickname || participant.username || '新消息',
                                body: content.slice(0, 50),
                                url: `/chat/${chatId}`
                            });
                            
                            // 使用 web-push 发送推送
                            const webpush = require('web-push');
                            webpush.setVapidDetails(
                                'mailto:admin@example.com',
                                process.env.VAPID_PUBLIC_KEY || 'BNc4aF2w5qH9B6e8rT2yU7iO0pI3kL1mN9bM7vC2xZ8cV1bN5mK8jH7gF6dS4aD3sQ2wE1rT0yU9iO8pI7uY6tR5eW4qA3sD2fG1hJ6kL9zX8cV7bN4mK1jH0gF3dS6aD5fG8hJ9kL2xZ7cV4bN1mK3jH6gF2dS5aD8fG9hJ2kL5xZ8cV7bN4mK1jH3gF6dS2aD5fG8hJ',
                                process.env.VAPID_PRIVATE_KEY || 'your-private-key'
                            );
                            await webpush.sendNotification(participant.pushSubscription, payload);
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