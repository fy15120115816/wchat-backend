const ApiConfig = require('../models/ApiConfig');

exports.getConfigs = async (req, res) => {
    try {
        const userId = req.user.userId;
        const configs = await ApiConfig.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
        res.status(200).json({ success: true, data: configs });
    } catch (err) {
        console.error('获取API配置失败:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
};

exports.createConfig = async (req, res) => {
    try {
        const { id, name, apiUrl, apiKey, model, isDefault } = req.body;
        const userId = req.user.userId;

        if (isDefault) {
            await ApiConfig.updateMany({ userId }, { isDefault: false });
        }

        const config = new ApiConfig({
            _id: id || Date.now().toString(36),
            name: name || '默认配置',
            apiUrl,
            apiKey,
            model: model || '',
            isDefault: isDefault !== false,
            userId
        });

        await config.save();
        res.status(201).json({ success: true, data: config });
    } catch (err) {
        console.error('创建API配置失败:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
};

exports.updateConfig = async (req, res) => {
    try {
        const { configId } = req.params;
        const { name, apiUrl, apiKey, model, isDefault } = req.body;
        const userId = req.user.userId;

        if (isDefault) {
            await ApiConfig.updateMany({ userId }, { isDefault: false });
        }

        const config = await ApiConfig.findOneAndUpdate(
            { _id: configId, userId },
            { name, apiUrl, apiKey, model, isDefault, updatedAt: Date.now() },
            { new: true }
        );

        if (!config) {
            return res.status(404).json({ success: false, message: '配置不存在' });
        }

        res.status(200).json({ success: true, data: config });
    } catch (err) {
        console.error('更新API配置失败:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
};

exports.deleteConfig = async (req, res) => {
    try {
        const { configId } = req.params;
        const userId = req.user.userId;

        const config = await ApiConfig.findOneAndDelete({ _id: configId, userId });

        if (!config) {
            return res.status(404).json({ success: false, message: '配置不存在' });
        }

        if (config.isDefault) {
            const firstConfig = await ApiConfig.findOne({ userId }).sort({ createdAt: 1 });
            if (firstConfig) {
                firstConfig.isDefault = true;
                await firstConfig.save();
            }
        }

        res.status(200).json({ success: true, message: '删除成功' });
    } catch (err) {
        console.error('删除API配置失败:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
};