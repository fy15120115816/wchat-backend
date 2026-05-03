require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const momentRoutes = require('./routes/moment');
// 导入路由
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/message');
const chatRoutes = require('./routes/chat');
const aiCharacterRoutes = require('./routes/aiCharacter');
const apiConfigRoutes = require('./routes/apiConfig');
const userRoutes = require('./routes/user');

// 导入模型
const Message = require('./models/Message');
const Chat = require('./models/Chat');

const app = express();
const server = http.createServer(app);

// WebSocket 配置
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// 导出 io 对象供其他模块使用
module.exports.io = io;

// 中间件
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 注册路由
app.use('/api/apiConfig', apiConfigRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/moment', momentRoutes);
app.use('/api/character', aiCharacterRoutes);
app.use('/api/user', userRoutes);

// 健康检查
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: '服务器运行正常'
    });
});

// WebSocket 连接处理
const userSockets = new Map();

io.on('connection', (socket) => {
    console.log('🔌 用户连接:', socket.id);

    // 用户登录注册
    socket.on('login', (userId) => {
        userSockets.set(userId, socket.id);
        console.log('👤 用户登录:', userId);
    });

    // 用户登出
    socket.on('logout', (userId) => {
        userSockets.delete(userId);
        console.log('👤 用户登出:', userId);
    });

    // 发送消息
    socket.on('sendMessage', async (data) => {
        try {
            const { chatId, content, type, image } = data;
            const senderId = socket.userId;

            console.log('📤 发送消息:', { chatId, content });

            // 创建消息
            const message = new Message({
                chatId,
                senderId,
                content,
                type: type || 'text',
                image: image || ''
            });

            await message.save();

            // 更新聊天的最后消息
            await Chat.findByIdAndUpdate(chatId, {
                lastMessage: message._id,
                lastMessageAt: Date.now(),
                updatedAt: Date.now()
            });

            // 获取聊天参与者
            const chat = await Chat.findById(chatId);

            // 发送消息给所有参与者
            chat.participants.forEach(participantId => {
                const participantSocketId = userSockets.get(participantId.toString());
                if (participantSocketId && participantSocketId !== socket.id) {
                    io.to(participantSocketId).emit('newMessage', {
                        chatId,
                        message: {
                            ...message.toObject(),
                            senderId: { _id: senderId }
                        }
                    });
                }
            });

        } catch (err) {
            console.error('WebSocket 发送消息失败:', err);
        }
    });

    // 断开连接
    socket.on('disconnect', () => {
        console.log('🔌 用户断开连接:', socket.id);

        // 移除用户连接映射
        for (const [userId, socketId] of userSockets.entries()) {
            if (socketId === socket.id) {
                userSockets.delete(userId);
                break;
            }
        }
    });
});

// 连接 MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB 连接成功');
    })
    .catch(err => {
        console.error('❌ MongoDB 连接失败:', err.message);
    });

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📡 WebSocket 服务已启动`);
});