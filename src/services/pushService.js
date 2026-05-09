// backend/src/services/pushService.js
const webpush = require('web-push');

// 配置 VAPID 密钥
webpush.setVapidDetails(
    'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY || 'BGzFvf8l6peZ1V5nxljJ6cS6SY8mof6fJDLSx6EukkQWDw6kayDdnTDaRm8qZGaQOLLD3Q5Edt6ZUiN4zxnEmM0',
    process.env.VAPID_PRIVATE_KEY || 'mo4qOwvxmB3T1LUsnYZIMOH1KS9_DKSgYgutNdqBM1I'
);

exports.sendPushNotification = async (subscription, payload) => {
    try {
        console.log('📤 开始发送推送通知...');
        console.log('📤 订阅对象:', JSON.stringify(subscription).slice(0, 150));
        console.log('📤 推送载荷:', payload);
        
        const result = await webpush.sendNotification(subscription, JSON.stringify(payload));
        console.log('✅ 推送通知发送成功, 结果:', result);
        return { success: true };
    } catch (error) {
        console.error('❌ 推送通知发送失败:', error.message);
        console.error('❌ 错误详情:', error);
        
        // 如果订阅过期，移除订阅
        if (error.statusCode === 410) {
            console.log('❌ 订阅已过期 (statusCode: 410)');
            return { success: false, expired: true };
        }
        
        // 其他错误
        if (error.statusCode) {
            console.log('❌ HTTP状态码:', error.statusCode);
        }
        
        return { success: false, expired: false };
    }
};

// 生成 VAPID 密钥（运行一次即可）
exports.generateVAPIDKeys = () => {
    const keys = webpush.generateVAPIDKeys();
    console.log('🔑 VAPID 公钥:', keys.publicKey);
    console.log('🔑 VAPID 私钥:', keys.privateKey);
    return keys;
};