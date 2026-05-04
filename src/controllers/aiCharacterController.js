const AICharacter = require('../models/AICharacter');

// 创建 AI 角色
exports.createCharacter = async (req, res) => {
    try {
        const { id, name, avatar, persona, description, personality, tags = [], note = '' } = req.body;
        const userId = req.user.userId;

        console.log('📝 收到创建角色请求:', { userId, name, id });

        if (!name) {
            return res.status(400).json({
                success: false,
                message: '角色名称不能为空'
            });
        }

        const character = new AICharacter({
            _id: id || Date.now().toString(36),
            name,
            avatar: avatar || `https://picsum.photos/seed/${Date.now()}/100/100`,
            persona,
            description,
            personality,
            tags,
            note,
            userId
        });

        await character.save();
        console.log('✅ 角色保存成功:', { characterId: character._id, name: character.name });

        res.status(201).json({
            success: true,
            message: '角色创建成功',
            data: character
        });
    } catch (err) {
        console.error('❌ 创建角色错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 获取所有 AI 角色
exports.getCharacters = async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log('📋 获取角色列表:', { userId });
        const characters = await AICharacter.find({ userId, isActive: true })
            .sort({ createdAt: -1 })
            .lean();

        console.log('✅ 找到角色数量:', characters.length);
        res.status(200).json({
            success: true,
            data: characters
        });
    } catch (err) {
        console.error('❌ 获取角色列表错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 获取单个 AI 角色
exports.getCharacterById = async (req, res) => {
    try {
        const { characterId } = req.params;

        const character = await AICharacter.findById(characterId);

        if (!character) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }

        res.status(200).json({
            success: true,
            data: character
        });
    } catch (err) {
        console.error('获取角色详情错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 更新 AI 角色
exports.updateCharacter = async (req, res) => {
    try {
        const { characterId } = req.params;
        const userId = req.user.userId;
        const { name, avatar, persona, description, personality, tags, note, isActive, memory } = req.body;

        console.log('✏️ 更新角色:', { userId, characterId, hasMemory: !!memory });

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (avatar !== undefined) updates.avatar = avatar;
        if (persona !== undefined) updates.persona = persona;
        if (description !== undefined) updates.description = description;
        if (personality !== undefined) updates.personality = personality;
        if (tags !== undefined) updates.tags = tags;
        if (note !== undefined) updates.note = note;
        if (isActive !== undefined) updates.isActive = isActive;
        if (memory !== undefined) updates.memory = memory;
        updates.updatedAt = Date.now();

        const character = await AICharacter.findOneAndUpdate(
            { _id: characterId, userId },
            updates,
            { new: true }
        );

        if (!character) {
            console.log('❌ 角色不存在:', { characterId, userId });
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }

        console.log('✅ 角色更新成功:', { characterId, name: character.name });

        res.status(200).json({
            success: true,
            message: '更新成功',
            data: character
        });
    } catch (err) {
        console.error('❌ 更新角色错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 删除 AI 角色
exports.deleteCharacter = async (req, res) => {
    try {
        const { characterId } = req.params;
        const userId = req.user.userId;

        console.log('🗑️ 删除角色:', { userId, characterId });

        const character = await AICharacter.findOne({ _id: characterId, userId });

        if (!character) {
            console.log('❌ 角色不存在:', { characterId, userId });
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }

        // 软删除
        await AICharacter.findOneAndUpdate(
            { _id: characterId, userId },
            {
                isActive: false,
                updatedAt: Date.now()
            }
        );

        console.log('✅ 角色删除成功:', { characterId, name: character.name });

        res.status(200).json({
            success: true,
            message: '角色已删除'
        });
    } catch (err) {
        console.error('❌ 删除角色错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};;

// AI 生成回复（模拟）
exports.generateReply = async (req, res) => {
    try {
        const { characterId } = req.params;
        const { message } = req.body;
        const userId = req.user.userId;

        const character = await AICharacter.findOne({ _id: characterId, userId });

        if (!character) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }

        // 模拟 AI 回复
        const replies = [
            `你好！我是 ${character.name}，很高兴认识你！`,
            `嗯嗯，我明白了。${character.persona || '这是一个有趣的话题'}`,
            `关于这个问题，我觉得...`,
            `哈哈，你真有趣！`,
            `让我想想...`,
            `${character.name} 正在思考中...`,
            `这个想法很棒！`,
            `谢谢你的分享！`
        ];

        // 随机选择一个回复
        const randomReply = replies[Math.floor(Math.random() * replies.length)];

        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

        res.status(200).json({
            success: true,
            data: {
                characterId: character._id,
                characterName: character.name,
                reply: randomReply,
                timestamp: new Date()
            }
        });
    } catch (err) {
        console.error('AI 生成回复错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// ======== 分段记忆管理 API ========

// 获取角色的所有记忆（三种类型）
exports.getAllMemories = async (req, res) => {
    try {
        const { characterId } = req.params;
        const userId = req.user.userId;

        const character = await AICharacter.findOne({ _id: characterId, userId });

        if (!character) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                shortTerm: character.shortTermMemories || [],
                longTerm: character.longTermMemories || [],
                permanent: character.permanentMemories || []
            }
        });
    } catch (err) {
        console.error('❌ 获取记忆列表错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 获取角色的短期记忆列表
exports.getShortTermMemories = async (req, res) => {
    try {
        const { characterId } = req.params;
        const userId = req.user.userId;

        const character = await AICharacter.findOne({ _id: characterId, userId });

        if (!character) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }

        res.status(200).json({
            success: true,
            data: character.shortTermMemories || []
        });
    } catch (err) {
        console.error('❌ 获取短期记忆列表错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 添加短期记忆（每条20字，最多15条，按序号排列）
exports.addShortTermMemory = async (req, res) => {
    try {
        const { characterId } = req.params;
        const { content, seq } = req.body;
        const userId = req.user.userId;

        if (!content?.trim()) {
            return res.status(400).json({
                success: false,
                message: '记忆内容不能为空'
            });
        }

        const character = await AICharacter.findOne({ _id: characterId, userId });

        if (!character) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }

        // 短期记忆限制15条
        const memories = character.shortTermMemories || [];
        if (memories.length >= 15) {
            return res.status(400).json({
                success: false,
                message: '短期记忆已达上限15条'
            });
        }

        const newMemory = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            seq: seq || (memories.length + 1),
            content: content.trim(),
            createdAt: new Date()
        };

        character.shortTermMemories.push(newMemory);
        await character.save();

        console.log('✅ 添加短期记忆成功:', { characterId, memoryId: newMemory.id, seq: newMemory.seq });

        res.status(201).json({
            success: true,
            message: '短期记忆添加成功',
            data: newMemory
        });
    } catch (err) {
        console.error('❌ 添加短期记忆错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 获取角色的长期记忆列表
exports.getLongTermMemories = async (req, res) => {
    try {
        const { characterId } = req.params;
        const userId = req.user.userId;

        const character = await AICharacter.findOne({ _id: characterId, userId });

        if (!character) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }

        res.status(200).json({
            success: true,
            data: character.longTermMemories || []
        });
    } catch (err) {
        console.error('❌ 获取长期记忆列表错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 添加长期记忆（由15条短期记忆总结成350字+，最多10条，超限开新卷宗）
exports.addLongTermMemory = async (req, res) => {
    try {
        const { characterId } = req.params;
        const { content, shortMemoryIds } = req.body;
        const userId = req.user.userId;

        if (!content?.trim()) {
            return res.status(400).json({
                success: false,
                message: '记忆内容不能为空'
            });
        }

        const character = await AICharacter.findOne({ _id: characterId, userId });

        if (!character) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }

        // 计算新卷宗号
        const currentVolumes = character.longTermMemories || [];
        const maxVolume = currentVolumes.length > 0 
            ? Math.max(...currentVolumes.map(m => m.volume || 1)) 
            : 0;
        const newVolume = currentVolumes.length >= 10 ? maxVolume + 1 : (maxVolume || 1);

        const newMemory = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            volume: newVolume,
            content: content.trim(),
            shortMemoryIds: shortMemoryIds || [],
            createdAt: new Date()
        };

        character.longTermMemories.push(newMemory);
        await character.save();

        console.log('✅ 添加长期记忆成功:', { characterId, memoryId: newMemory.id, volume: newVolume });

        res.status(201).json({
            success: true,
            message: '长期记忆添加成功',
            data: newMemory
        });
    } catch (err) {
        console.error('❌ 添加长期记忆错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 获取角色的永久记忆列表
exports.getPermanentMemories = async (req, res) => {
    try {
        const { characterId } = req.params;
        const userId = req.user.userId;

        const character = await AICharacter.findOne({ _id: characterId, userId });

        if (!character) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }

        res.status(200).json({
            success: true,
            data: character.permanentMemories || []
        });
    } catch (err) {
        console.error('❌ 获取永久记忆列表错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 添加永久记忆（核心记忆）
exports.addPermanentMemory = async (req, res) => {
    try {
        const { characterId } = req.params;
        const { content, eventType } = req.body;
        const userId = req.user.userId;

        if (!content?.trim()) {
            return res.status(400).json({
                success: false,
                message: '记忆内容不能为空'
            });
        }

        const character = await AICharacter.findOne({ _id: characterId, userId });

        if (!character) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }

        const newMemory = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            content: content.trim(),
            eventType: eventType || 'general',
            createdAt: new Date()
        };

        character.permanentMemories.push(newMemory);
        await character.save();

        console.log('✅ 添加永久记忆成功:', { characterId, memoryId: newMemory.id, eventType });

        res.status(201).json({
            success: true,
            message: '永久记忆添加成功',
            data: newMemory
        });
    } catch (err) {
        console.error('❌ 添加永久记忆错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 删除记忆（通用，支持三种类型）
exports.deleteMemory = async (req, res) => {
    try {
        const { characterId, memoryId } = req.params;
        const { type } = req.query; // shortTerm, longTerm, permanent
        const userId = req.user.userId;

        const character = await AICharacter.findOne({ _id: characterId, userId });

        if (!character) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }

        let memories;
        let memoryKey;
        switch (type) {
            case 'longTerm':
                memories = character.longTermMemories;
                memoryKey = 'longTermMemories';
                break;
            case 'permanent':
                memories = character.permanentMemories;
                memoryKey = 'permanentMemories';
                break;
            case 'shortTerm':
            default:
                memories = character.shortTermMemories;
                memoryKey = 'shortTermMemories';
        }

        const memoryIndex = memories.findIndex(m => m.id === memoryId);
        if (memoryIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '记忆不存在'
            });
        }

        memories.splice(memoryIndex, 1);
        await character.save();

        console.log('✅ 删除记忆成功:', { characterId, memoryId, type: memoryKey });

        res.status(200).json({
            success: true,
            message: '记忆已删除'
        });
    } catch (err) {
        console.error('❌ 删除记忆错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 清空角色的所有记忆
exports.clearMemories = async (req, res) => {
    try {
        const { characterId } = req.params;
        const { type } = req.query; // shortTerm, longTerm, permanent, all
        const userId = req.user.userId;

        const character = await AICharacter.findOne({ _id: characterId, userId });

        if (!character) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }

        if (type === 'all' || !type) {
            character.shortTermMemories = [];
            character.longTermMemories = [];
            character.permanentMemories = [];
        } else if (type === 'longTerm') {
            character.longTermMemories = [];
        } else if (type === 'permanent') {
            character.permanentMemories = [];
        } else {
            character.shortTermMemories = [];
        }

        await character.save();

        console.log('✅ 清空记忆成功:', { characterId, type: type || 'all' });

        res.status(200).json({
            success: true,
            message: '记忆已清空'
        });
    } catch (err) {
        console.error('❌ 清空记忆错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};