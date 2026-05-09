// backend/src/services/pushService.js
const webpush = require('web-push');

// 配置 VAPID 密钥
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BGzFvf8l6peZ1V5nxljJ6cS6SY8mof6fJDLSx6EukkQWDw6kayDdnTDaRm8qZGaQOLLD3Q5Edt6ZUiN4zxnEmM0';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'mo4qOwvxmB3T1LUsnYZIMOH1KS9_DKSgYgutNdqBM1I';

console.log('🔑 VAPID_PUBLIC_KEY (环境变量):', process.env.VAPID_PUBLIC_KEY || '未设置，使用默认值');
console.log('🔑 VAPID_PUBLIC_KEY (实际使用):', VAPID_PUBLIC_KEY);

webpush.setVapidDetails(
    'mailto:admin@example.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
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

        // 调试：打印错误对象的所有属性
        console.log('❌ 错误对象类型:', typeof error);
        console.log('❌ 错误对象keys:', Object.keys(error));
        console.log('❌ 错误完整信息:', JSON.stringify(error, (key, value) => {
            if (key === 'stack') return '[stack]';
            if (key === 'headers') return JSON.stringify(value).slice(0, 200);
            return value;
        }, 2));

        // 如果是 VAPID 密钥不匹配错误（通常是状态码 401/400 或包含相关关键词）
        const errorStr = JSON.stringify(error);
        if (error.statusCode === 401 ||
            error.statusCode === 400 ||
            (error.message && error.message.includes('Unauthorized')) ||
            (error.message && error.message.includes('公钥不匹配')) ||
            errorStr.includes('public key') ||
            errorStr.includes('mismatch') ||
            errorStr.includes('key') && errorStr.includes('match')) {
            console.log('❌ VAPID密钥不匹配或无效，订阅需要重新注册');
            return { success: false, expired: true, keyMismatch: true };
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