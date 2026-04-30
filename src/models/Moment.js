const mongoose = require('mongoose');

const momentSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userAvatar: {
        type: String,
        default: ''
    },
    content: {
        type: String,
        required: true
    },
    images: [{ type: String }],
    likes: [{ type: String }],
    comments: [{
        userId: String,
        userName: String,
        userAvatar: String,
        content: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    isAI: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Moment', momentSchema);