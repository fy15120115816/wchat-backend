const webpush = require('web-push');

console.log('🔑 正在生成 VAPID 密钥...');
const keys = webpush.generateVAPIDKeys();
console.log('✅ VAPID 密钥生成成功');
console.log('');
console.log('📋 请将以下密钥添加到环境变量或代码中：');
console.log('');
console.log('🔑 VAPID_PUBLIC_KEY:', keys.publicKey);
console.log('🔑 VAPID_PRIVATE_KEY:', keys.privateKey);
console.log('');
console.log('⚠️ 请确保前端和后端使用相同的公钥！');