// public/service-worker.js
self.addEventListener('push', (event) => {
    console.log('🔔 收到推送事件:', event)
    try {
        const data = event.data?.json() || {}
        console.log('📄 推送数据:', data)
        console.log('🔑 通知权限:', self.Notification?.permission)
        console.log('📱 Service Worker 注册:', self.registration)

        const title = data.title || '新消息'
        const options = {
            body: data.body || '',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            data: { url: data.url || '/' },
            vibrate: [200, 100, 200],
            tag: 'ai-notification',
            renotify: true
        }

        console.log('📱 准备显示通知:', title, options)
        // 无论是否在前台都显示通知
        if (self.Notification && self.Notification.permission === 'granted') {
            event.waitUntil(
                self.registration.showNotification(title, options).then(() => {
                    console.log('✅ 通知显示成功')
                }).catch(error => {
                    console.error('❌ 通知显示失败:', error)
                })
            )
        } else {
            console.log('❌ 通知权限未授予')
        }
    } catch (error) {
        console.error('❌ 处理推送事件失败:', error)
    }
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    )
})

self.addEventListener('install', () => {
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        clients.claim()
    )
})