const mongoose = require('mongoose');

const apiConfigSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, default: '默认配置' },
    apiUrl: { type: String, required: true },
    apiKey: { type: String, required: true },
    model: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
    userId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ApiConfig', apiConfigSchema);