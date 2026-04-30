// backend/src/services/pushService.js
const webpush = require('web-push');

// 配置 VAPID 密钥
webpush.setVapidDetails(
    'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY || 'BNc4aF2w5qH9B6e8rT2yU7iO0pI3kL1mN9bM7vC2xZ8cV1bN5mK8jH7gF6dS4aD3sQ2wE1rT0yU9iO8pI7uY6tR5eW4qA3sD2fG1hJ6kL9zX8cV7bN4mK1jH0gF3dS6aD5fG8hJ9kL2xZ7cV4bN1mK3jH6gF2dS5aD8fG9hJ2kL5xZ8cV7bN4mK1jH3gF6dS2aD5fG8hJ',
    process.env.VAPID_PRIVATE_KEY || 'your-private-key-here'
);

exports.sendPushNotification = async (subscription, payload) => {
    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        console.log('✅ 推送通知发送成功');
    } catch (error) {
        console.error('❌ 推送通知发送失败:', error.message);
        // 如果订阅过期，移除订阅
        if (error.statusCode === 410) {
            return { success: false, expired: true };
        }
        return { success: false, expired: false };
    }
    return { success: true };
};

// 生成 VAPID 密钥（运行一次即可）
exports.generateVAPIDKeys = () => {
    const keys = webpush.generateVAPIDKeys();
    console.log('🔑 VAPID 公钥:', keys.publicKey);
    console.log('🔑 VAPID 私钥:', keys.privateKey);
    return keys;
};