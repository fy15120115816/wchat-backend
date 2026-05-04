const mongoose = require('mongoose');

const aiCharacterSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    avatar: {
        type: String,
        default: ''
    },
    persona: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    personality: {
        type: String,
        default: ''
    },
    tags: [{ type: String }],
    note: {
        type: String,
        default: ''
    },
    userId: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    memory: {
        type: String,
        default: ''
    },
    // 短期记忆列表（每条20字，最多15条，按序号排列）
    shortTermMemories: {
        type: [{
            id: String,
            seq: Number,      // 序号
            content: String,  // 20字总结
            createdAt: Date
        }],
        default: []
    },
    // 长期记忆列表（由15条短期记忆总结成350字+详细记录，最多10条，超限开新卷宗）
    longTermMemories: {
        type: [{
            id: String,
            volume: Number,   // 卷宗号 1, 2, 3...
            content: String, // 350字+详细记录
            shortMemoryIds: [String], // 引用的短期记忆ID
            createdAt: Date
        }],
        default: []
    },
    // 永久记忆列表（核心记忆：在一起/结婚/生子等重要事件）
    permanentMemories: {
        type: [{
            id: String,
            content: String,  // 核心记忆内容
            eventType: String, // 事件类型：如 first_time, together, married, childbirth 等
            createdAt: Date
        }],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AICharacter', aiCharacterSchema);