const Chat = require('../models/Chat');
const Message = require('../models/Message');

// 创建聊天
exports.createChat = async (req, res) => {
    try {
        const { participants, type = 'private', name = '' } = req.body;

        // 验证参与者
        if (!participants || participants.length < 2) {
            return res.status(400).json({
                success: false,
                message: '至少需要两个参与者'
            });
        }

        // 检查是否已存在相同的聊天
        const existingChat = await Chat.findOne({
            type,
            participants: { $all: participants }
        });

        if (existingChat) {
            return res.status(200).json({
                success: true,
                message: '聊天已存在',
                data: existingChat
            });
        }

        // 创建新聊天
        const chat = new Chat({
            _id: require('crypto').randomUUID(),
            type,
            name,
            participants: participants
        });

        await chat.save();

        // 填充参与者信息
        const populatedChat = await chat.populate('participants', 'username avatar');

        res.status(201).json({
            success: true,
            message: '聊天创建成功',
            data: populatedChat
        });
    } catch (err) {
        console.error('创建聊天错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 获取用户的聊天列表
exports.getUserChats = async (req, res) => {
    try {
        const userId = req.user.userId;

        const chats = await Chat.find({
            participants: userId
        })
            .populate('participants', 'username avatar')
            .populate({
                path: 'lastMessage',
                populate: {
                    path: 'senderId',
                    select: 'username avatar'
                }
            })
            .sort({ updatedAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            data: chats
        });
    } catch (err) {
        console.error('获取聊天列表错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 获取聊天详情
exports.getChatById = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findById(chatId)
            .populate('participants', 'username avatar')
            .populate({
                path: 'lastMessage',
                populate: {
                    path: 'senderId',
                    select: 'username avatar'
                }
            })
            .lean();

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: '聊天不存在'
            });
        }

        res.status(200).json({
            success: true,
            data: chat
        });
    } catch (err) {
        console.error('获取聊天详情错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 更新聊天信息
exports.updateChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { name, avatar } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (avatar !== undefined) updates.avatar = avatar;
        updates.updatedAt = Date.now();

        const chat = await Chat.findByIdAndUpdate(chatId, updates, { new: true })
            .populate('participants', 'username avatar')
            .lean();

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: '聊天不存在'
            });
        }

        res.status(200).json({
            success: true,
            message: '更新成功',
            data: chat
        });
    } catch (err) {
        console.error('更新聊天错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 删除聊天
exports.deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: '聊天不存在'
            });
        }

        // 删除相关消息
        await Message.deleteMany({ chatId });

        // 删除聊天
        await Chat.findByIdAndDelete(chatId);

        res.status(200).json({
            success: true,
            message: '聊天已删除'
        });
    } catch (err) {
        console.error('删除聊天错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};