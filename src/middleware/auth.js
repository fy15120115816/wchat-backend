const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const authMiddleware = (req, res, next) => {
    try {
        // 从请求头获取 token
        const authHeader = req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: '未授权，请先登录'
            });
        }

        const token = authHeader.replace('Bearer ', '');

        // 验证 token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 验证 userId 必须是有效的 MongoDB ObjectId（防止旧 token 或错误 token）
        if (!decoded.userId || !mongoose.Types.ObjectId.isValid(decoded.userId)) {
            console.error('❌ Token 中的 userId 无效:', decoded.userId);
            return res.status(401).json({
                success: false,
                message: 'Token 无效，请重新登录'
            });
        }

        // 将用户信息添加到请求对象
        req.user = {
            userId: decoded.userId,
            username: decoded.username
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '登录已过期，请重新登录'
            });
        }

        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token 无效，请重新登录'
            });
        }

        return res.status(401).json({
            success: false,
            message: '认证失败'
        });
    }
};

module.exports = authMiddleware;