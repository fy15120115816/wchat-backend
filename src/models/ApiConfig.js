const mongoose = require('mongoose');

const apiConfigSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, default: '默认配置' },
    apiUrl: { type: String, required: true },
    apiKey: { type: String, required: true },
    model: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
    userId: { type: String, required: true },
    // 配置类型：global=全局(所有消息), text=仅文字, image=仅图片
    type: { type: String, default: 'global' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ApiConfig', apiConfigSchema);