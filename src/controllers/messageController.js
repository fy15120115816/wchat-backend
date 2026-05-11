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
            image,
            isRead: true  // ✅ 修复：用户发送的消息默认为已读
        });

        await message.save();
        console.log('消息已保存到数据库:', message._id);

        // 获取或创建聊天记录
        let chat = await Chat.findById(chatId);

        // 如果找不到聊天记录，且chatId以ai-开头，则创建一个新的聊天记录
        if (!chat && chatId.startsWith('ai-')) {
            console.log('⚠️ 找不到聊天记录，创建新的AI聊天:', chatId);
            const aiCharacter = await AICharacter.findOne({ userId: chatId });
            if (aiCharacter) {
                chat = new Chat({
                    _id: chatId,
                    participants: [req.user.userId, chatId],
                    type: 'private',
                    lastMessage: message._id,
                    lastMessageAt: Date.now(),
                    updatedAt: Date.now()
                });
                await chat.save();
                console.log('✅ 创建新的AI聊天:', chat._id);
            }
        } else if (!chat) {
            // 更新聊天的最后消息
            await Chat.findByIdAndUpdate(chatId, {
                lastMessage: message._id,
                lastMessageAt: Date.now(),
                updatedAt: Date.now()
            });
        }
        console.log('聊天记录已更新:', chatId);

        // 如果是AI角色聊天，后台异步处理AI回复（不阻塞响应）
        console.log('🔍 检查AI角色聊天: chatId:', chatId, 'chat:', !!chat, 'participants:', chat?.participants);
        if (chat && chat.participants.some(p => p.toString().startsWith('ai-'))) {
            console.log('✅ 检测到AI角色聊天，准备调用processAIReply');
            processAIReply(chatId, actualSenderId, content).catch(console.error);
        } else {
            console.log('❌ 不是AI角色聊天，不调用processAIReply');
        }

        // 发送推送通知给其他参与者
        if (chat) {
            for (const participantId of chat.participants) {
                const participantIdStr = participantId._id ? participantId._id.toString() : participantId.toString();
                if (participantIdStr !== actualSenderId && !participantIdStr.startsWith('ai-')) {
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

        console.log('获取消息:', { chatId, userId: req.user.userId });

        // 获取消息（按时间倒序）
        // 注意：不使用 populate，因为 senderId 可能是 'ai-' 开头的字符串，不是 ObjectId
        const messages = await Message.find({ chatId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        console.log('找到消息:', messages.length, '条');

        // ✅ 修复：不在 getMessages 中自动标记已读！
        // 之前这里会自动把消息标记为已读，导致 ChatsView 列表页加载消息时
        // 未读消息被标记为已读，小红点显示一会就消失了。
        // 已读标记应该只在用户真正进入聊天时通过 markMessagesAsRead 接口触发。

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

        console.log('清空聊天记录请求:', { chatId, userId: req.user.userId });

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

// 获取未读消息数
exports.getUnreadCount = async (req, res) => {
    try {
        const { chatId } = req.params;

        // ✅ 修复：AI消息的senderId是字符串，需要同时排除ObjectId和字符串格式的userId
        const count = await Message.countDocuments({
            chatId,
            isRead: false,
            $and: [
                { senderId: { $ne: req.user.userId } },
                { senderId: { $ne: req.user.userId.toString() } }
            ]
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

// 标记消息为已读
exports.markMessagesAsRead = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.userId;

        console.log('📖 标记已读请求:', { chatId, userId });

        // ✅ 修复：AI消息的senderId是字符串（如 'ai-xxx'），不是ObjectId
        // 需要排除当前用户发送的消息，同时标记所有AI消息为已读
        // 使用 $or 条件：要么senderId不是当前用户，要么senderId是AI（以ai-开头）
        const result = await Message.updateMany(
            {
                chatId,
                isRead: false,
                $and: [
                    { senderId: { $ne: userId } },
                    { senderId: { $ne: userId.toString() } }
                ]
            },
            { isRead: true }
        );

        console.log('✅ 标记已读结果:', result.modifiedCount, '条消息');

        res.status(200).json({
            success: true,
            message: '消息已标记为已读',
            data: { modifiedCount: result.modifiedCount }
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

// 按句子边界分割消息（与前端 splitReply 一致）
function splitReply(content, maxChunks) {
    if (!content) return [];

    const MAX_CHUNK_LENGTH = 50;
    const MAX_TOTAL_LENGTH = 150;

    // 先截断总长度
    const trimmedContent = content.length > MAX_TOTAL_LENGTH
        ? content.substring(0, MAX_TOTAL_LENGTH).replace(/[^。？！\n]+$/, '') + '...'
        : content;

    // 按句子边界分割：句号、问号、感叹号、换行
    const sentences = trimmedContent.split(/(?<=[。？！\n])(?=[^。？！\n])/g);

    const chunks = [];
    let buffer = '';

    for (const s of sentences) {
        const trimmed = s.trim();
        if (!trimmed) continue;

        // 如果加上当前句子会超过单段最大长度
        if (buffer.length + trimmed.length > MAX_CHUNK_LENGTH && buffer.length > 0) {
            // 如果当前buffer不为空，先输出
            chunks.push(buffer.trim());
            buffer = '';
        }

        // 将当前句子添加到buffer
        if (buffer.length > 0) {
            buffer += ' ' + trimmed;
        } else {
            buffer = trimmed;
        }
    }

    // 输出最后一段
    if (buffer.trim()) {
        chunks.push(buffer.trim());
    }

    // 限制最大段数
    if (maxChunks && chunks.length > maxChunks) {
        // 如果超过最大段数，合并最后几段
        const remaining = chunks.slice(maxChunks - 1);
        chunks.splice(maxChunks - 1, chunks.length - maxChunks + 1, remaining.join(' '));
    }

    return chunks;
}

// 处理AI回复（后台异步任务）
async function processAIReply(chatId, senderId, content) {
    // 所有关键变量定义在 try 外面，确保 catch 块也能访问
    let io;
    let chat, aiParticipantStr, aiCharId, aiCharacter, user;
    try {
        io = require('../app').io;
        console.log('🔄 开始处理AI回复, chatId:', chatId, 'senderId:', senderId);

        // ⚠️ 不使用 populate！participants 数组中 ai-xxx 字符串不是 ObjectId，
        // populate 会尝试从 User collection 解析它，导致返回 null。
        // 直接查询 chat，不 populateparticipants。
        chat = await Chat.findById(chatId);
        if (!chat) {
            console.log('❌ 找不到聊天, chatId:', chatId);
            return;
        }
        console.log('✅ 找到聊天:', chat._id, 'participants:', chat.participants);

        // 找出 AI 角色参与者：直接用字符串匹配，不依赖 populate
        // chat.participants 是字符串数组，如 ['userObjectId', 'ai-moxxx']
        aiParticipantStr = chat.participants.find(p => {
            const str = String(p || '');
            return str.startsWith('ai-');
        });
        if (!aiParticipantStr) {
            console.log('❌ 找不到AI角色参与者, participants:', chat.participants);
            return;
        }
        // aiParticipantStr 格式为 'ai-moxxx'，AICharacter.userId 存的是 'moxxx'（无前缀）
        aiCharId = aiParticipantStr.startsWith('ai-') ? aiParticipantStr.replace('ai-', '') : aiParticipantStr;
        console.log('✅ 找到AI角色字符串:', aiParticipantStr, '-> aiCharId:', aiCharId);

        // 获取AI角色信息
        // ⚠️ AICharacter 的主键是 _id（存的就是角色ID，如 'mopuc8womrgft6xbxk'）
        // userId 字段存的是"拥有者"的 userId，不是角色ID
        aiCharacter = await AICharacter.findById(aiCharId);
        if (!aiCharacter) {
            console.log('❌ findById 查不到, aiCharId:', aiCharId);
            // 备选：用 userId 字段查（兼容旧数据，userId 误存为角色ID的情况）
            aiCharacter = await AICharacter.findOne({ userId: aiCharId });
            if (!aiCharacter) {
                // 再备选：用带 ai- 前缀的 _id 查
                aiCharacter = await AICharacter.findById(aiParticipantStr);
            }
            if (aiCharacter) {
                console.log('✅ 备选查询成功:', aiCharacter.name, '_id:', aiCharacter._id, 'userId:', aiCharacter.userId);
            } else {
                console.log('❌ 所有查询方式都找不到该AI角色');
                return;
            }
        }
        console.log('✅ 找到AI角色信息:', aiCharacter.name, 'userId:', aiCharacter.userId);

        // 发送"正在输入"事件
        io.emit('typing', {
            chatId,
            userId: aiParticipantStr,
            typing: true
        });
        console.log('📝 发送正在输入事件');

        // 获取用户的API配置
        user = await User.findById(senderId);
        if (!user) {
            console.log('❌ 找不到用户');
            return;
        }
        console.log('✅ 找到用户:', user.username);

        // 获取用户的API配置（直接取该用户最新创建的配置，忽略 isDefault）
        const apiConfig = await ApiConfig.find({ userId: senderId }).sort({ createdAt: -1 }).limit(1);
        if (!apiConfig || apiConfig.length === 0) {
            console.log('❌ 用户未配置API');
            return;
        }
        const apiConfigData = apiConfig[0];
        console.log('✅ 找到API配置:', apiConfigData.apiUrl, 'createdAt:', apiConfigData.createdAt);

        // 构建消息历史
        // ⚠️ senderId 可能是字符串（AI消息）或 ObjectId（用户消息，populate后变对象）
        const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
        const history = messages.map(msg => {
            // senderId 是字符串（'ai-xxx'）→ AI消息；是 ObjectId → 用户消息
            const senderIdStr = (typeof msg.senderId === 'string') ? msg.senderId : '';
            return {
                role: senderIdStr.startsWith('ai-') ? 'assistant' : 'user',
                content: msg.content
            };
        });

        // 添加角色设定
        const systemMessage = {
            role: 'system',
            content: aiCharacter.persona || '你是一个乐于助人的AI助手。'
        };

        // 调用AI API（自动拼接 /chat/completions，与前端 proxy 行为一致）
        const rawApiUrl = apiConfigData.apiUrl;
        const apiUrl = (rawApiUrl.includes('/chat/completions') || rawApiUrl.includes('/text/chatcompletion'))
            ? rawApiUrl
            : rawApiUrl.replace(/\/$/, '') + '/chat/completions';
        const apiKey = apiConfigData.apiKey;
        const model = apiConfigData.model || 'gpt-3.5-turbo';

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

        // ⚠️ 先检查响应内容是否为 JSON，避免 response.json() 抛异常
        const contentType = response.headers.get('content-type') || '';

        if (!response.ok) {
            // API 返回错误状态码（4xx/5xx），读取错误信息后使用 Mock 兜底
            let errDetail = '';
            try {
                const errData = await response.json();
                errDetail = errData?.error?.message || errData?.message || JSON.stringify(errData).slice(0, 100);
            } catch {
                try { errDetail = (await response.text()).slice(0, 200); } catch { errDetail = `HTTP ${response.status}`; }
            }
            console.error('❌ AI API请求失败:', response.status, errDetail);
            aiReply = null;
        } else if (!contentType.includes('application/json')) {
            // API 返回了非 JSON（如 HTML 错误页面）
            const rawText = await response.text();
            console.error('❌ API返回非JSON内容:', rawText.slice(0, 200));
            aiReply = null;
        } else {
            try {
                const data = await response.json();
                aiReply = data?.choices?.[0]?.message?.content;
                console.log('📦 AI响应内容:', aiReply ? aiReply.slice(0, 50) : '(空)');
            } catch (jsonErr) {
                console.error('❌ JSON解析失败:', jsonErr.message);
                const rawText = await response.text().catch(() => '');
                console.error('   原始内容:', rawText.slice(0, 200));
                aiReply = null;
            }
        }

        if (!aiReply) {
            console.log('❌ AI返回为空，使用Mock兜底');
            io.emit('typing', { chatId, userId: aiParticipantStr, typing: false });
            const mockReplies = ['嗯嗯~', '好的呀~', '怎么啦？', '在呢~'];
            const mockReply = mockReplies[Math.floor(Math.random() * mockReplies.length)];
            const aiMessage = new Message({ chatId, senderId: aiParticipantStr, content: mockReply, type: 'text' });
            await aiMessage.save();
            io.emit('newMessage', { chatId, message: aiMessage });
            console.log('✅ Mock 回复已保存:', mockReply);
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
            const aiMessage = new Message({
                chatId,
                senderId: aiParticipantStr,
                content: chunk,
                type: 'text'
            });

            await aiMessage.save();
            lastAiMessage = aiMessage;
            console.log('✅ AI回复片段已保存:', aiMessage._id, '内容:', chunk.slice(0, 30));
        }

        // 发送"停止输入"事件
        io.emit('typing', {
            chatId,
            userId: aiParticipantStr,
            typing: false
        });
        console.log('📝 发送停止输入事件');

        // ✅ 修复：通过WebSocket发送newMessage事件通知前端
        // 之前只在Mock兜底时发送，正常AI回复没有发送，导致前端只能靠轮询获取消息
        for (const chunk of aiReplyChunks) {
            io.emit('newMessage', {
                chatId,
                message: {
                    chatId,
                    senderId: aiParticipantStr,
                    content: chunk,
                    type: 'text',
                    createdAt: new Date()
                }
            });
        }
        console.log('✅ 已通过WebSocket发送AI回复通知，共', aiReplyChunks.length, '段');

        // 更新聊天的最后消息
        if (lastAiMessage) {
            await Chat.findByIdAndUpdate(chatId, {
                lastMessage: lastAiMessage._id,
                lastMessageAt: Date.now(),
                updatedAt: Date.now()
            });
        }

        // 发送推送通知（支持多设备，兼容旧格式）
        console.log('📨 开始发送推送通知流程');
        console.log('📨 user是否存在:', !!user);

        // 支持多设备订阅：优先使用 pushSubscriptions，兼容旧格式 pushSubscription
        let subscriptions = user?.pushSubscriptions || [];
        // 兼容旧格式：如果 pushSubscriptions 为空但 pushSubscription 存在，转换为数组
        if ((!subscriptions || subscriptions.length === 0) && user?.pushSubscription) {
            subscriptions = [user.pushSubscription];
        }
        console.log('📨 用户订阅数量:', subscriptions.length);

        if (!user) {
            console.log('❌ user未定义，跳过推送通知');
        } else if (subscriptions && subscriptions.length > 0) {
            try {
                console.log('🔔 准备向', subscriptions.length, '个设备发送推送通知');

                const payload = {
                    title: aiCharacter.name || 'AI助手',
                    body: aiReply.slice(0, 50),
                    url: `/chat/${chatId}`
                };

                // 向所有订阅设备发送推送通知
                for (const subscription of subscriptions) {
                    try {
                        await sendPushNotification(subscription, payload);
                        console.log('✅ AI回复推送通知已发送到设备');
                    } catch (pushError) {
                        console.error('❌ AI回复推送失败:', pushError.message);
                        if (pushError.statusCode === 410) {
                            // 订阅过期，从数组中移除
                            const index = subscriptions.indexOf(subscription);
                            if (index > -1) {
                                subscriptions.splice(index, 1);
                            }
                        }
                    }
                }

                // 更新用户的订阅列表
                user.pushSubscription = subscriptions.length > 0 ? subscriptions[0] : null;
                await user.save();
                console.log('✅ AI回复推送通知已发送');
            } catch (pushError) {
                console.error('❌ AI回复推送失败:', pushError.message);
            }
        }

    } catch (error) {
        console.error('❌ 处理AI回复失败:', error.message);
        // ⚠️ 必须发送 typing: false，否则前端一直显示"正在输入"
        if (io) io.emit('typing', { chatId, userId: aiParticipantStr, typing: false });
        // ⚠️ Mock 兜底：当 API 不可用时生成一条模拟回复
        const mockReplies = ['嗯嗯~', '好的呀~', '怎么啦？', '在呢~'];
        const mockReply = mockReplies[Math.floor(Math.random() * mockReplies.length)];
        try {
            const aiMessage = new Message({
                chatId,
                senderId: aiParticipantStr || chatId,
                content: mockReply,
                type: 'text'
            });
            await aiMessage.save();
            if (io) io.emit('newMessage', { chatId, message: aiMessage });
            console.log('✅ Mock 回复已保存:', mockReply);
        } catch (mockError) {
            console.error('❌ Mock 回复保存失败:', mockError.message);
        }
    }
}

// 导出函数供其他模块使用
module.exports = {
    sendMessage: exports.sendMessage,
    getMessages: exports.getMessages,
    deleteMessage: exports.deleteMessage,
    deleteAllMessages: exports.deleteAllMessages,
    getUnreadCount: exports.getUnreadCount,
    markMessagesAsRead: exports.markMessagesAsRead,
    processAIReply
};
