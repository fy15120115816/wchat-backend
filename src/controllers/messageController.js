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

        console.log('📤 收到消息请求:', { chatId, content: content.slice(0, 20), actualSenderId, senderIdFromBody: senderId });

        // 验证参数
        if (!chatId || !content) {
            return res.status(400).json({
                success: false,
                message: '聊天ID和消息内容不能为空'
            });
        }

        // 创建消息
        // ✅ 用户发送的消息默认标记为已读，AI消息默认未读（由模型默认值处理）
        const message = new Message({
            chatId,
            senderId: actualSenderId,
            content,
            type,
            image,
            isRead: true // 用户发送的消息默认为已读
        });

        await message.save();
        console.log('消息已保存到数据库:', message._id);

        // 获取或创建聊天记录
        let chat = await Chat.findById(chatId);

        // 如果找不到聊天记录，且chatId以ai-开头，则创建一个新的聊天记录
        if (!chat && chatId.startsWith('ai-')) {
            console.log('⚠️ 找不到聊天记录，创建新的AI聊天:', chatId);
            // 从chatId中提取aiId（去掉ai-前缀）
            const aiId = chatId.replace(/^ai-/, '');
            const aiCharacter = await AICharacter.findById(aiId);
            if (aiCharacter) {
                chat = new Chat({
                    _id: chatId,
                    participants: [req.user.userId, `ai-${aiId}`],  // 使用 AI 角色 ID
                    type: 'private',
                    lastMessage: message._id,
                    lastMessageAt: Date.now(),
                    updatedAt: Date.now()
                });
                await chat.save();
                console.log('✅ 创建新的AI聊天:', chat._id);
            } else {
                console.log('❌ 找不到AI角色，aiId:', aiId);
            }
        } else if (!chat) {
            // 更新聊天的最后消息
            await Chat.findByIdAndUpdate(chatId, {
                lastMessage: message._id,
                lastMessageAt: Date.now(),
                updatedAt: Date.now()
            });
        }

        // 如果是AI角色聊天，后台异步处理AI回复（不阻塞响应）
        if (chat) {
            console.log('📋 chat信息:', chat._id, 'participants:', chat.participants?.map(p => p.toString()));
            const hasAIParticipant = chat.participants && chat.participants.some(p => p.toString().startsWith('ai-'));
            console.log('🔍 是否有AI参与者:', hasAIParticipant);

            if (hasAIParticipant) {
                // ✅ 检查发送者是否是AI，如果是AI则不触发回复（避免AI回复自己）
                const isAISender = actualSenderId.toString().startsWith('ai-');
                if (isAISender) {
                    console.log('❌ 发送者是AI，跳过processAIReply');
                } else {
                    console.log('✅ 检测到AI角色聊天，准备调用processAIReply');
                    processAIReply(chatId, actualSenderId, content).catch(err => {
                        console.error('❌ processAIReply 抛出异常:', err.message);
                    });
                }
            } else {
                console.log('❌ 不是AI角色聊天，不调用processAIReply');
                console.log('   - chat类型:', chat.type);
                console.log('   - participants:', chat.participants?.map(p => p.toString()));
            }
        } else {
            console.log('❌ chat为空，无法检测AI角色');
            console.log('   - chatId:', chatId);
        }

        // 发送推送通知给其他参与者
        if (chat) {
            for (const participantId of chat.participants) {
                if (participantId.toString() !== senderId) {
                    const participantIdStr = participantId.toString();
                    // 跳过 AI 角色参与者（senderId 格式为 "ai-{id}"，不是真实 User 文档）
                    if (participantIdStr.startsWith('ai-')) {
                        continue;
                    }
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
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        // 获取消息（按时间升序）
        // ✅ 改用 find() 而非 aggregate，避免 $lookup 对非 ObjectId 字段（AI senderId）报错
        const messages = await Message.find({ chatId })
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limit)
            .lean();

        console.log(`✅ [getMessages] 查询结果: chatId=${chatId}, 找到${messages.length}条消息`);
        if (messages.length > 0) {
            console.log(`📋 [getMessages] 第一条: ${(messages[0].content || '').slice(0, 20)}, 最后一条: ${(messages[messages.length - 1].content || '').slice(0, 20)}`);
        }

        // 转换格式，确保 _id 和 senderId 都是字符串
        const formattedMessages = messages.map(msg => {
            // senderId 可能是字符串（AI消息）或 ObjectId（用户消息）
            let senderIdStr = ''
            if (msg.senderId === null || msg.senderId === undefined) {
                senderIdStr = ''
            } else if (typeof msg.senderId === 'string') {
                senderIdStr = msg.senderId
            } else {
                senderIdStr = msg.senderId.toString()
            }
            return {
                ...msg,
                senderId: senderIdStr,
                originalSenderId: senderIdStr,
                _id: msg._id.toString()
            };
        });

        // ✅ 移除自动标记已读，改为由前端显式调用 markMessagesAsRead 接口
        // 这样聊天列表页面获取消息时不会自动清除未读状态

        res.status(200).json({
            success: true,
            data: formattedMessages
        });
    } catch (err) {
        console.log('❌ [getMessages] 错误:', err.message, err.stack);
        res.status(200).json({ success: true, data: [] });
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

// 记录被清空的聊天ID（防止清空后仍保存AI回复）
const clearedChats = new Set();

// 删除聊天的所有消息（清空聊天记录）
exports.deleteAllMessages = async (req, res) => {
    try {
        let { chatId } = req.params;

        console.log('清空聊天记录请求:', { chatId, userId: req.user.userId });

        // ✅ 标记该聊天已清空，阻止后续AI回复
        clearedChats.add(chatId);
        // 5秒后自动清除标记（允许重新开始对话）
        setTimeout(() => {
            clearedChats.delete(chatId);
            console.log('✅ 清空标记已清除:', chatId);
        }, 5000);

        // 处理带 ai- 前缀的ID
        if (chatId.startsWith('ai-')) {
            // 先查找有多少条消息匹配
            const count = await Message.countDocuments({ chatId });
            console.log('AI聊天消息数量:', count);

            // 删除所有匹配的消息
            const result = await Message.deleteMany({ chatId });
            console.log('✅ AI聊天记录已清空, deletedCount:', result.deletedCount, 'chatId:', chatId);

            res.status(200).json({
                success: true,
                message: '聊天记录已清空',
                deletedCount: result.deletedCount
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
        const result = await Message.deleteMany({ chatId });
        console.log('✅ 聊天记录已清空:', chatId, 'deletedCount:', result.deletedCount);

        // 更新聊天的最后消息
        await Chat.findByIdAndUpdate(chatId, {
            lastMessage: null,
            lastMessageAt: Date.now(),
            updatedAt: Date.now()
        });

        res.status(200).json({
            success: true,
            message: '聊天记录已清空',
            deletedCount: result.deletedCount
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

// 标记消息为已读
exports.markMessagesAsRead = async (req, res) => {
    try {
        const { chatId } = req.params;
        // 将 userId 转换为字符串，确保与数据库中的 senderId 类型一致
        const userIdStr = String(req.user.userId);

        // 标记所有未读消息为已读（排除自己发送的消息）
        await Message.updateMany({
            chatId,
            senderId: { $ne: userIdStr },
            isRead: false
        }, {
            isRead: true
        });

        console.log('✅ 消息已标记为已读:', chatId);

        res.status(200).json({
            success: true,
            message: '消息已标记为已读'
        });
    } catch (err) {
        console.error('标记消息为已读错误:', err);
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
        // 将 userId 转换为字符串，确保与数据库中的 senderId 类型一致
        const userIdStr = String(req.user.userId);

        const count = await Message.countDocuments({
            chatId,
            senderId: { $ne: userIdStr },
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

// 按微信聊天模式分割消息
// 规则：一句话一条消息，去掉句号，每句不超过50字
function splitReply(content, maxChunks) {
    if (!content) return [];

    const MAX_SENTENCE_LENGTH = 50; // 每句不超过50字
    let trimmedContent = content.trim();

    // 去掉所有句号
    trimmedContent = trimmedContent.replace(/。/g, '');

    // 按句子边界分割：问号、感叹号、换行
    const sentences = trimmedContent.split(/(?<=[？！\n])(?=[^？！\n])/g);

    const chunks = [];

    for (const sentence of sentences) {
        let trimmed = sentence.trim();
        if (!trimmed) continue;

        // 如果句子太长，按逗号、顿号、分号分割
        if (trimmed.length > MAX_SENTENCE_LENGTH) {
            const parts = trimmed.split(/[，、；]/g);
            let currentPart = '';
            for (const part of parts) {
                const partTrimmed = part.trim();
                if (!partTrimmed) continue;

                if (currentPart.length + partTrimmed.length + 1 > MAX_SENTENCE_LENGTH && currentPart) {
                    chunks.push(currentPart);
                    currentPart = partTrimmed;
                } else if (currentPart) {
                    currentPart += '，' + partTrimmed;
                } else {
                    currentPart = partTrimmed;
                }
            }
            if (currentPart) {
                chunks.push(currentPart);
            }
        } else {
            chunks.push(trimmed);
        }
    }

    // 限制最大段数
    const actualMaxChunks = maxChunks || 5;
    if (chunks.length > actualMaxChunks) {
        return chunks.slice(0, actualMaxChunks);
    }

    return chunks;
}

// 正在处理的聊天ID集合（防止重复调用）
const processingChats = new Set();

// 处理AI回复（后台异步任务）
async function processAIReply(chatId, senderId, content) {
    // ✅ 确保 senderId 是字符串类型，避免数据库查询类型不匹配
    senderId = senderId.toString();
    console.log('🔄 processAIReply - senderId:', senderId, 'type:', typeof senderId);

    // ✅ 检查聊天是否已被清空
    if (clearedChats.has(chatId)) {
        console.log('❌ 聊天', chatId, '已被清空，跳过AI回复');
        return;
    }

    // 防止重复调用
    if (processingChats.has(chatId)) {
        console.log('⚠️ 聊天', chatId, '正在处理中，跳过重复调用');
        return;
    }
    processingChats.add(chatId);

    try {
        let aiParticipant = null;
        const io = require('../app').io;

        console.log('🔄 开始处理AI回复, chatId:', chatId, 'senderId:', senderId);

        // 获取聊天信息（不populate participants，避免ObjectId转换问题）
        const chat = await Chat.findById(chatId);
        if (!chat) {
            console.log('❌ 找不到聊天, chatId:', chatId);
            return;
        }
        console.log('✅ 找到聊天:', chat._id);

        // 找出AI角色参与者（确保使用字符串比较）
        aiParticipant = chat.participants.find(p => {
            const participantStr = p.toString();
            return participantStr.startsWith('ai-');
        });
        if (!aiParticipant) {
            console.log('❌ 找不到AI角色参与者');
            return;
        }
        // 确保 aiParticipant 是字符串格式
        aiParticipant = aiParticipant.toString();
        console.log('✅ 找到AI角色:', aiParticipant);

        // 获取AI角色信息（去掉ai-前缀）
        const realAiId = aiParticipant.toString().replace(/^ai-/, '');
        const aiCharacter = await AICharacter.findById(realAiId);
        if (!aiCharacter) {
            console.log('❌ 找不到AI角色信息, realAiId:', realAiId);
            if (io && aiParticipant) {
                io.emit('typing', {
                    chatId,
                    userId: aiParticipant,
                    typing: false
                });
            }
            return;
        }
        console.log('✅ 找到AI角色信息:', aiCharacter.name);

        // 发送"正在输入"事件
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
            if (io && aiParticipant) {
                io.emit('typing', {
                    chatId,
                    userId: aiParticipant,
                    typing: false
                });
            }
            return;
        }
        console.log('✅ 找到用户:', user.username);

        // 查询用户的API配置（根据消息类型选择）
        let apiConfig;

        // 获取用户的配置选择（user已经在上面获取过了）
        const userSelections = user ? {
            globalApiConfigId: user.globalApiConfigId,
            textApiConfigId: user.textApiConfigId,
            imageApiConfigId: user.imageApiConfigId
        } : {};

        // 获取最近两条消息
        const recentMessages = await Message.find({ chatId }).sort({ createdAt: -1 }).limit(2);
        const lastMessage = recentMessages[0];
        const secondLastMessage = recentMessages[1];

        // 检测是否为真正的图片消息（排除"文字图片"类型）
        const isTextImageMessage = lastMessage?.content?.startsWith('[文字图片]');
        const isLastRealImage = !isTextImageMessage && (lastMessage?.type === 'image' || lastMessage?.image);

        // 检测上一条消息是否是图片消息（用于处理"图片+文字"的连续对话）
        const isSecondLastRealImage = secondLastMessage?.type === 'image' || secondLastMessage?.image;

        // 判断是否需要使用图片API
        // 1. 当前消息是图片
        // 2. 当前消息是文字，但上一条消息是图片（用户在询问图片内容）
        // 图片API配置指向支持图片理解的模型（如Gemini），文字API可能不支持图片
        const shouldUseImageAPI = isLastRealImage || (lastMessage?.type === 'text' && isSecondLastRealImage);

        // 1. 根据消息类型选择对应的配置（使用用户选择）
        if (shouldUseImageAPI) {
            // 图片消息或图片后的文字消息：优先使用用户选择的图片配置
            if (userSelections.imageApiConfigId) {
                apiConfig = await ApiConfig.findById(userSelections.imageApiConfigId);
                // 根据当前消息类型显示不同的日志
                if (isLastRealImage) {
                    console.log('🖼️ 检测到图片消息，使用用户选择的图片API配置:', userSelections.imageApiConfigId);
                } else {
                    console.log('🖼️ 检测到图片后的文字消息，使用用户选择的图片API配置:', userSelections.imageApiConfigId);
                }
            } else {
                // 兼容旧的type字段配置
                apiConfig = await ApiConfig.findOne({ userId: senderId, type: 'image' });
                if (isLastRealImage) {
                    console.log('🖼️ 检测到图片消息，尝试使用type=image配置');
                } else {
                    console.log('🖼️ 检测到图片后的文字消息，尝试使用type=image配置');
                }
            }
        } else {
            // 普通文字消息：优先使用用户选择的文字配置
            if (userSelections.textApiConfigId) {
                apiConfig = await ApiConfig.findById(userSelections.textApiConfigId);
                if (isTextImageMessage) {
                    console.log('📝 检测到文字图片消息，使用用户选择的文字API配置:', userSelections.textApiConfigId);
                } else {
                    console.log('📝 检测到文字消息，使用用户选择的文字API配置:', userSelections.textApiConfigId);
                }
            } else {
                // 兼容旧的type字段配置
                apiConfig = await ApiConfig.findOne({ userId: senderId, type: 'text' });
                if (isTextImageMessage) {
                    console.log('📝 检测到文字图片消息，尝试使用type=text配置');
                } else {
                    console.log('📝 检测到文字消息，尝试使用type=text配置');
                }
            }
        }

        // 2. 如果没有对应类型的配置，使用用户选择的全局配置
        if (!apiConfig && userSelections?.globalApiConfigId) {
            apiConfig = await ApiConfig.findById(userSelections.globalApiConfigId);
            console.log('🔄 未找到对应类型配置，使用用户选择的全局配置:', userSelections.globalApiConfigId, '结果:', apiConfig ? '找到' : '未找到');
        }

        // 3. 如果没有用户选择的全局配置，使用type=global配置
        if (!apiConfig) {
            apiConfig = await ApiConfig.findOne({ userId: senderId, type: 'global' });
            console.log('🔄 未找到用户选择的全局配置，尝试使用type=global配置, userId:', senderId, '结果:', apiConfig ? '找到' : '未找到');
        }

        // 4. 如果还是没有，使用默认配置
        if (!apiConfig) {
            apiConfig = await ApiConfig.findOne({ userId: senderId, isDefault: true });
            console.log('🔄 未找到全局配置，尝试使用默认配置, userId:', senderId, '结果:', apiConfig ? '找到' : '未找到');
        }

        // 5. 如果都没有，使用任意配置
        if (!apiConfig) {
            apiConfig = await ApiConfig.findOne({ userId: senderId });
            console.log('🔄 未找到默认配置，使用任意配置, userId:', senderId, '结果:', apiConfig ? '找到' : '未找到');
        }

        if (!apiConfig) {
            console.log('❌ 用户未配置API，使用 Mock 回复');
            // 使用 Mock 回复
            const mockReplies = {
                '测试': ['在呢~', '怎么了？', '你好呀~'],
                '助手': ['在呢~', '好的呢~', '怎么啦？'],
                '小猫': ['喵~', '喵呜~', '怎么啦？'],
                '小狗': ['汪汪~', '怎么了？', '汪！']
            };
            const aiName = aiCharacter?.name || '测试';
            const replies = mockReplies[aiName] || ['嗯', '好', '知道了'];
            const mockReply = replies[Math.floor(Math.random() * replies.length)];

            // 保存 Mock 回复
            const aiMessage = new Message({
                chatId,
                senderId: aiParticipant,
                content: mockReply,
                type: 'text'
            });
            await aiMessage.save();
            console.log('✅ Mock 回复已保存:', mockReply);

            // 更新聊天的最后消息
            await Chat.findByIdAndUpdate(chatId, {
                lastMessage: aiMessage._id,
                lastMessageAt: Date.now(),
                updatedAt: Date.now()
            });

            if (io && aiParticipant) {
                io.emit('typing', {
                    chatId,
                    userId: aiParticipant,
                    typing: false
                });
            }
            return;
        }
        console.log('✅ 找到API配置:', apiConfig.apiUrl);

        // 构建消息历史
        const messages = await Message.find({ chatId })
            .sort({ createdAt: 1 })
            .populate('senderId', 'username');

        // 判断 senderId 是否为 AI 消息的辅助函数
        const isAISender = (msg) => {
            const senderIdStr = typeof msg.senderId === 'string'
                ? msg.senderId
                : msg.senderId?._id?.toString() || msg.senderId?.toString() || '';
            return senderIdStr.startsWith('ai-');
        };

        // 检查是否存在用户消息（排除AI消息）
        const userMessages = messages.filter(msg => !isAISender(msg));
        if (userMessages.length === 0) {
            console.log('❌ 没有用户消息，不生成AI回复');
            io.emit('typing', {
                chatId,
                userId: aiParticipant,
                typing: false
            });
            return;
        }

        // 构建消息历史（过滤重复内容，支持图片消息）
        const history = [];
        let lastContent = '';
        for (const msg of messages) {
            const content = msg.content?.trim();
            const image = msg.image?.trim();

            // 跳过空消息
            if (!content && !image) {
                continue;
            }

            // 构建消息内容
            let messageContent;
            if (image && image !== '__image__' && image.startsWith('data:')) {
                // 图片消息：使用OpenAI多模态格式（仅当使用图片API时）
                if (shouldUseImageAPI) {
                    messageContent = [
                        { type: 'text', text: content || '' },
                        { type: 'image_url', image_url: { url: image, detail: 'low' } }
                    ];
                } else {
                    // 使用文字API时，只发送文字内容
                    messageContent = content || '[图片]';
                }
            } else {
                // 文字消息
                messageContent = content;
            }

            // 跳过重复消息
            const contentKey = content + (image ? image.substring(0, 50) : '');
            if (contentKey && contentKey !== lastContent) {
                history.push({
                    role: isAISender(msg) ? 'assistant' : 'user',
                    content: messageContent
                });
                lastContent = contentKey;
            }
        }

        // 构建系统消息（先全局提示词，再角色设定）
        const systemMessages = [];

        // 1. 全局提示词（用户级别的系统提示）
        if (user.globalSystemPrompt && user.globalSystemPrompt.trim()) {
            systemMessages.push({
                role: 'system',
                content: user.globalSystemPrompt
            });
            console.log('📋 使用全局提示词');
        }

        // 2. 角色设定（角色级别的系统提示，包含角色名字）
        const aiName = aiCharacter.name || '助手';
        const personaContent = aiCharacter.persona || '你是一个乐于助人的AI助手。';
        // 将角色名字融入系统提示，让AI认为自己就是这个角色
        const fullPersona = `你的名字是【${aiName}】。${personaContent}`;
        systemMessages.push({
            role: 'system',
            content: fullPersona
        });
        console.log('📋 使用角色设定:', aiName, '-', personaContent.substring(0, 50) + (personaContent.length > 50 ? '...' : ''));

        // 调用AI API
        const apiUrl = apiConfig.apiUrl;
        const apiKey = apiConfig.apiKey;
        const model = apiConfig.model || 'gpt-3.5-turbo';

        const requestBody = {
            model: model,
            messages: [...systemMessages, ...history],
            stream: false
        };

        // 打印完整的消息结构以便调试
        console.log('📋 发送给AI的消息结构:', JSON.stringify({
            systemMessages: systemMessages.length,
            historyMessages: history.length,
            totalMessages: requestBody.messages.length,
            systemContents: systemMessages.map((m, i) => `[${i + 1}] ${m.content.substring(0, 30)}${m.content.length > 30 ? '...' : ''}`)
        }, null, 2));

        // 确保API URL完整
        let finalApiUrl = apiUrl;

        // 强制使用 HTTPS 协议
        if (!finalApiUrl.startsWith('https://')) {
            if (finalApiUrl.startsWith('http://')) {
                finalApiUrl = 'https://' + finalApiUrl.substring(7);
            } else {
                finalApiUrl = 'https://' + finalApiUrl;
            }
        }

        // 确保URL以 /chat/completions 或 /v1/chat/completions 结尾
        if (!finalApiUrl.endsWith('/chat/completions') && !finalApiUrl.endsWith('/v1/chat/completions')) {
            if (finalApiUrl.endsWith('/')) {
                finalApiUrl = finalApiUrl + 'v1/chat/completions';
            } else if (finalApiUrl.endsWith('/v1')) {
                finalApiUrl = finalApiUrl + '/chat/completions';
            } else {
                finalApiUrl = finalApiUrl + '/v1/chat/completions';
            }
        }

        console.log('🔄 调用AI API:', finalApiUrl);

        // 带重试的fetch函数
        const fetchWithRetry = async (url, options, retryCount = 0) => {
            const MAX_RETRIES = 2;
            const RETRY_DELAY = 1000; // 重试间隔1秒

            try {
                const response = await fetchWithRedirect(url, options);
                return response;
            } catch (error) {
                if (retryCount < MAX_RETRIES) {
                    console.log(`⚠️ API调用失败，第 ${retryCount + 1} 次重试...`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    return await fetchWithRetry(url, options, retryCount + 1);
                }
                throw error;
            }
        };

        // 处理重定向的辅助函数
        const fetchWithRedirect = async (url, options, redirectCount = 0, visitedUrls = new Set()) => {
            const MAX_REDIRECTS = 5;

            if (redirectCount >= MAX_REDIRECTS) {
                throw new Error('redirect count exceeded');
            }

            // 检测循环重定向
            const normalizedUrl = url.replace(/\/$/, ''); // 移除尾部斜杠
            if (visitedUrls.has(normalizedUrl)) {
                console.log('⚠️ 检测到循环重定向');
                throw new Error('循环重定向');
            }

            visitedUrls.add(normalizedUrl);

            const controller = new AbortController();
            const timeoutHandler = setTimeout(() => {
                controller.abort();
            }, 30000); // 30秒超时

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                    redirect: 'manual' // 手动处理重定向
                });

                clearTimeout(timeoutHandler);

                // 处理重定向 (3xx 状态码)
                if (response.status >= 300 && response.status < 400) {
                    const location = response.headers.get('Location');
                    if (location) {
                        console.log('🔄 重定向到:', location);
                        // 构建完整URL（处理相对路径）
                        const newUrl = new URL(location, url).href;
                        return await fetchWithRedirect(newUrl, options, redirectCount + 1, visitedUrls);
                    }
                }

                return response;
            } finally {
                clearTimeout(timeoutHandler);
            }
        };

        let response;
        try {
            response = await fetchWithRetry(finalApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
                },
                body: JSON.stringify(requestBody)
            });
        } catch (fetchError) {
            console.error('❌ fetch 调用失败:', fetchError.message);
            console.log('⚠️ API调用失败，使用Mock回复作为后备');

            // 使用智能 Mock 回复（遵循角色人设）
            const persona = aiCharacter?.persona || '你是一个乐于助人的AI助手。';
            const userQuestion = userMessages[userMessages.length - 1]?.content || '';

            // 根据角色人设和用户问题生成更自然的回复
            let mockReply;
            if (persona.includes('温柔') || persona.includes('可爱')) {
                const gentleReplies = {
                    '你是谁': '我是你的AI小伙伴呀~ 很高兴认识你！😊',
                    '在吗': '在呢~ 有什么事吗？💕',
                    '你好': '你好呀~ 今天心情怎么样？😊',
                    '干嘛': '没干嘛呀，在等你找我聊天呢~ 😘',
                    '聊天': '好呀好呀，我们聊点什么呢？✨'
                };
                mockReply = gentleReplies[userQuestion] || ['嗯嗯~', '好的呢~', '我在听呢~', '怎么啦？'][Math.floor(Math.random() * 4)];
            } else if (persona.includes('小猫') || persona.includes('猫')) {
                mockReply = ['喵~', '喵呜~', '喵~ 怎么了？'][Math.floor(Math.random() * 3)];
            } else if (persona.includes('小狗') || persona.includes('狗')) {
                mockReply = ['汪汪~', '汪！', '怎么了？'][Math.floor(Math.random() * 3)];
            } else {
                mockReply = ['好的', '我知道了', '明白'][Math.floor(Math.random() * 3)];
            }

            // 保存 Mock 回复
            const aiMessage = new Message({
                chatId,
                senderId: aiParticipant,
                content: mockReply,
                type: 'text'
            });
            await aiMessage.save();
            console.log('✅ Mock 回复已保存:', mockReply);

            // 更新聊天的最后消息
            await Chat.findByIdAndUpdate(chatId, {
                lastMessage: aiMessage._id,
                lastMessageAt: Date.now(),
                updatedAt: Date.now()
            });

            if (io && aiParticipant) {
                io.emit('typing', {
                    chatId,
                    userId: aiParticipant,
                    typing: false
                });
            }
            return;
        }

        console.log('✅ AI API响应状态:', response.status);

        // 打印完整响应以便调试
        const responseText = await response.text();
        console.log('📦 AI API 原始响应:', responseText.slice(0, 500));

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ JSON 解析失败:', parseError.message, '原始响应:', responseText.slice(0, 200));
            return;
        }

        console.log('📦 AI API 解析后数据:', JSON.stringify(data).slice(0, 300));

        // 检查是否有错误
        if (data.error) {
            console.error('❌ AI API 返回错误:', data.error.message);
            console.log('⚠️ API调用失败，使用Mock回复作为后备');

            // 使用 Mock 回复作为后备
            const mockReplies = {
                '测试': ['在呢~', '怎么了？', '你好呀~'],
                '助手': ['在呢~', '好的呢~', '怎么啦？'],
                '小猫': ['喵~', '喵呜~', '怎么啦？'],
                '小狗': ['汪汪~', '怎么了？', '汪！']
            };
            const aiName = aiCharacter?.name || '测试';
            const replies = mockReplies[aiName] || ['嗯', '好', '知道了'];
            const mockReply = replies[Math.floor(Math.random() * replies.length)];

            // 保存 Mock 回复
            const aiMessage = new Message({
                chatId,
                senderId: aiParticipant,
                content: mockReply,
                type: 'text'
            });
            await aiMessage.save();
            console.log('✅ Mock 回复已保存:', mockReply);

            // 更新聊天的最后消息
            await Chat.findByIdAndUpdate(chatId, {
                lastMessage: aiMessage._id,
                lastMessageAt: Date.now(),
                updatedAt: Date.now()
            });

            if (io && aiParticipant) {
                io.emit('typing', {
                    chatId,
                    userId: aiParticipant,
                    typing: false
                });
            }
            return;
        }

        // 检查 API 是否返回错误
        const apiError = data?.base_resp?.status_msg || data?.error?.message;
        if (apiError) {
            console.log('❌ API返回错误:', apiError);
        }

        let aiReply = data.choices?.[0]?.message?.content;

        if (!aiReply) {
            console.log('❌ AI返回为空');
            // 使用 Mock 回复作为后备
            const mockReplies = ['嗯嗯~', '好的呀~', '怎么啦？', '在呢~'];
            const mockReply = mockReplies[Math.floor(Math.random() * mockReplies.length)];
            const aiMessage = new Message({
                chatId,
                senderId: aiParticipant,
                content: mockReply,
                type: 'text'
            });
            await aiMessage.save();
            console.log('✅ Mock 回复已保存:', mockReply);
            io.emit('typing', { chatId, userId: aiParticipant, typing: false });
            return;
        }

        // 过滤AI返回的特殊标签（如 <thought>）和格式字符
        aiReply = aiReply
            .replace(/<\/?thought[^>]*>/g, '')  // 移除 <thought> 标签
            .replace(/\*\s*/g, '')              // 移除星号
            .replace(/^\s+|\s+$/g, '')          // 移除首尾空格
            .trim();

        console.log('✅ AI回复已过滤:', aiReply.slice(0, 50));

        // 按句子边界拆分AI回复（与前端一致）
        const maxReplyMessages = aiCharacter.maxReplyMessages || 3;
        const aiReplyChunks = splitReply(aiReply, maxReplyMessages);
        console.log('✅ AI回复已拆分:', aiReplyChunks.length, '段');

        // 创建多条AI回复消息
        let lastAiMessage = null;
        for (const chunk of aiReplyChunks) {
            // 在保存前再次检查是否存在用户消息（防止清空聊天记录后仍保存回复）
            // 使用字符串比较，确保正确匹配
            const currentMessages = await Message.find({ chatId });
            const currentUserMessages = currentMessages.filter(msg => {
                const senderIdStr = msg.senderId.toString();
                return !senderIdStr.startsWith('ai-');
            });

            if (currentUserMessages.length === 0) {
                console.log('❌ 用户消息已被清空，不保存AI回复');
                io.emit('typing', {
                    chatId,
                    userId: aiParticipant,
                    typing: false
                });
                return;
            }

            const aiMessage = new Message({
                chatId,
                senderId: aiParticipant,
                content: chunk,
                type: 'text',
                isRead: false // AI消息默认为未读
            });

            await aiMessage.save();
            lastAiMessage = aiMessage;
            console.log('✅ AI回复片段已保存:', aiMessage._id, '内容:', chunk.slice(0, 30), 'isRead:', aiMessage.isRead);
        }

        // 发送"停止输入"事件
        io.emit('typing', {
            chatId,
            userId: aiParticipant,
            typing: false
        });
        console.log('📝 发送停止输入事件');

        // 更新聊天的最后消息
        if (lastAiMessage) {
            await Chat.findByIdAndUpdate(chatId, {
                lastMessage: lastAiMessage._id,
                lastMessageAt: Date.now(),
                updatedAt: Date.now()
            });
        }

        // 发送推送通知
        if (user.pushSubscription) {
            try {
                console.log('🔔 准备发送推送通知给用户:', userId);
                console.log('🔔 推送订阅:', JSON.stringify(user.pushSubscription).slice(0, 100));

                const payload = {
                    title: aiCharacter.name || 'AI助手',
                    body: aiReply.slice(0, 50),
                    url: `/chat/${chatId}`
                };

                console.log('🔔 推送内容:', payload);
                const result = await sendPushNotification(user.pushSubscription, payload);
                console.log('🔔 推送结果:', JSON.stringify(result));

                if (result.success) {
                    console.log('✅ 推送通知发送成功');
                } else {
                    console.log('❌ 推送通知发送失败:', result);
                    console.log('🔍 检查是否需要移除订阅: expired=', result.expired);
                    if (result.expired) {
                        console.log('⚠️ 推送订阅已过期或密钥不匹配，移除订阅');
                        user.pushSubscription = null;
                        await user.save();
                        console.log('✅ 订阅已成功移除');
                    } else {
                        console.log('ℹ️ 订阅未过期，不移除');
                    }
                }
            } catch (pushError) {
                console.error('❌ 发送推送通知时发生异常:', pushError.message, pushError.stack);
                if (pushError.statusCode === 410) {
                    console.log('⚠️ 推送订阅已过期(statusCode=410)，移除订阅');
                    user.pushSubscription = null;
                    await user.save();
                }
            }
        } else {
            console.log('ℹ️ 用户未配置推送订阅，跳过推送通知');
        }

    } catch (error) {
        console.error('❌ 处理AI回复失败:', error.message);
        // 出错时也发送"停止输入"事件
        try {
            const io = require('../app').io;
            if (io && aiParticipant) {
                io.emit('typing', {
                    chatId,
                    userId: aiParticipant,
                    typing: false
                });
            }
        } catch (e) {
            console.error('发送停止输入事件失败:', e.message);
        }
    } finally {
        // 清理处理状态，允许下次调用
        processingChats.delete(chatId);
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
    markMessagesAsRead: exports.markMessagesAsRead,
    processAIReply
};