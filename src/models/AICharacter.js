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
    // 分段记忆列表
    memories: {
        type: [{ 
            id: String,
            content: String,
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