// backend/src/services/pushService.js
const webpush = require('web-push');

// 配置 VAPID 密钥
webpush.setVapidDetails(
    'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY || 'BFVyDhmW5rlLESvTu0zIIOE28fZ-uV9h4hXPfjP-shb3BwTnLQ76VZcVzVjRWdXai3v7hv0waIMoxToEp15h_Bk',
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