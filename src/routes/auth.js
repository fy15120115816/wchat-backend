const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// 注册
router.post('/register', authController.register);

// 登录
router.post('/login', authController.login);

// 获取当前用户信息（需要认证）
router.get('/user', authMiddleware, authController.getCurrentUser);

// 更新用户信息（需要认证）
router.put('/user', authMiddleware, authController.updateUser);

// 修改密码（需要认证）
router.put('/password', authMiddleware, authController.changePassword);

module.exports = router;