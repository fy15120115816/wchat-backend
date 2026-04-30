const Moment = require('../models/Moment');

exports.createMoment = async (req, res) => {
    try {
        const { content, images = [], userName, userAvatar, isAI = false } = req.body;
        const userId = req.user.userId;

        console.log('📱 收到发布朋友圈请求:', { userId, contentLength: content?.length, isAI });

        if (!content) {
            return res.status(400).json({
                success: false,
                message: '内容不能为空'
            });
        }

        const moment = new Moment({ userId, content, images, userName, userAvatar, isAI });
        await moment.save();
        console.log('✅ 朋友圈发布成功:', { momentId: moment._id, content });

        res.status(201).json({
            success: true,
            message: '发布成功',
            data: moment
        });
    } catch (err) {
        console.error('❌ 发布朋友圈错误:', err);
        res.status(500).json({ success: false, message: '服务器错误', error: err.message });
    }
};

exports.getMoments = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        console.log('📋 获取朋友圈列表:', { page, limit });

        const moments = await Moment.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        console.log('✅ 找到朋友圈数量:', moments.length);
        res.status(200).json({ success: true, data: moments });
    } catch (err) {
        console.error('❌ 获取朋友圈错误:', err);
        res.status(500).json({ success: false, message: '服务器错误', error: err.message });
    }
};

exports.getUserMoments = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const moments = await Moment.find({ userId })
            .populate('userId', 'username avatar')
            .populate({ path: 'comments.userId', select: 'username avatar' })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.status(200).json({ success: true, data: moments });
    } catch (err) {
        res.status(500).json({ success: false, message: '服务器错误', error: err.message });
    }
};

exports.likeMoment = async (req, res) => {
    try {
        const { momentId } = req.params;
        const userId = req.user.userId;

        console.log('❤️ 点赞朋友圈:', { userId, momentId });

        const moment = await Moment.findOne({ _id: momentId });
        if (!moment) {
            console.log('❌ 朋友圈不存在:', { momentId });
            return res.status(404).json({ success: false, message: '朋友圈不存在' });
        }

        const hasLiked = moment.likes.includes(userId);
        if (hasLiked) {
            moment.likes = moment.likes.filter(id => id !== userId);
        } else {
            moment.likes.push(userId);
        }

        await moment.save();
        console.log('✅ 点赞操作成功:', { momentId, action: hasLiked ? '取消点赞' : '点赞' });

        res.status(200).json({
            success: true,
            message: hasLiked ? '已取消点赞' : '点赞成功',
            data: moment
        });
    } catch (err) {
        console.error('❌ 点赞错误:', err);
        res.status(500).json({ success: false, message: '服务器错误', error: err.message });
    }
};

exports.commentMoment = async (req, res) => {
    try {
        const { momentId } = req.params;
        const { content, userName, userAvatar } = req.body;
        const userId = req.user.userId;

        console.log('💬 评论朋友圈:', { userId, momentId, content });

        if (!content) {
            return res.status(400).json({ success: false, message: '评论内容不能为空' });
        }

        const moment = await Moment.findOne({ _id: momentId });
        if (!moment) {
            console.log('❌ 朋友圈不存在:', { momentId });
            return res.status(404).json({ success: false, message: '朋友圈不存在' });
        }

        moment.comments.push({ userId, userName, userAvatar, content, createdAt: Date.now() });
        await moment.save();
        console.log('✅ 评论成功:', { momentId, commentId: moment.comments[moment.comments.length - 1] });

        res.status(200).json({ success: true, message: '评论成功', data: moment });
    } catch (err) {
        console.error('❌ 评论错误:', err);
        res.status(500).json({ success: false, message: '服务器错误', error: err.message });
    }
};

exports.deleteMoment = async (req, res) => {
    try {
        const { momentId } = req.params;
        const userId = req.user.userId;

        console.log('🗑️ 删除朋友圈:', { userId, momentId });

        const moment = await Moment.findOne({ _id: momentId, userId });
        if (!moment) {
            console.log('❌ 朋友圈不存在:', { momentId, userId });
            return res.status(404).json({ success: false, message: '朋友圈不存在' });
        }

        await Moment.findOneAndDelete({ _id: momentId, userId });
        console.log('✅ 朋友圈删除成功:', { momentId });

        res.status(200).json({ success: true, message: '删除成功' });
    } catch (err) {
        console.error('❌ 删除朋友圈错误:', err);
        res.status(500).json({ success: false, message: '服务器错误', error: err.message });
    }
};