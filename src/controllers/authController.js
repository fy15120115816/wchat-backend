const User = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// 生成 JWT token
const generateToken = (userId, username) => {
    return jwt.sign(
        { userId, username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// 注册
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 验证必填字段
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名、邮箱和密码不能为空'
            });
        }

        // 检查用户是否已存在
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '用户名或邮箱已被注册'
            });
        }

        // 创建新用户
        const user = new User({
            username,
            email,
            password
        });

        await user.save();

        // 生成 token
        const token = generateToken(user._id, user.username);

        res.status(201).json({
            success: true,
            message: '注册成功',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    nickname: user.nickname,
                    basicInfo: user.basicInfo
                },
                token
            }
        });
    } catch (err) {
        console.error('注册错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 登录
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 验证必填字段
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: '邮箱和密码不能为空'
            });
        }

        // 查找用户
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误'
            });
        }

        // 验证密码
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误'
            });
        }

        // 生成 token
        const token = generateToken(user._id, user.username);

        res.status(200).json({
            success: true,
            message: '登录成功',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    nickname: user.nickname,
                    basicInfo: user.basicInfo
                },
                token
            }
        });
    } catch (err) {
        console.error('登录错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 获取当前用户信息
exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        console.error('获取用户信息错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 更新用户信息
exports.updateUser = async (req, res) => {
    try {
        const { nickname, avatar, basicInfo } = req.body;

        const updates = {};
        if (nickname !== undefined) updates.nickname = nickname;
        if (avatar !== undefined) updates.avatar = avatar;
        if (basicInfo !== undefined) updates.basicInfo = basicInfo;
        updates.updatedAt = Date.now();

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            updates,
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        res.status(200).json({
            success: true,
            message: '更新成功',
            data: user
        });
    } catch (err) {
        console.error('更新用户信息错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};

// 修改密码
exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: '旧密码和新密码不能为空'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: '新密码长度不能少于6位'
            });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 验证旧密码
        const isMatch = await user.comparePassword(oldPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: '旧密码错误'
            });
        }

        // 更新密码
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: '密码修改成功'
        });
    } catch (err) {
        console.error('修改密码错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: err.message
        });
    }
};