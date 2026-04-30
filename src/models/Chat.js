const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['private', 'group'],
        required: true
    },
    name: {
        type: String,
        default: ''
    },
    avatar: {
        type: String,
        default: ''
    },
    participants: [{ type: String }],
    lastMessage: {
        type: String,
        default: ''
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
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

module.exports = mongoose.model('Chat', chatSchema);